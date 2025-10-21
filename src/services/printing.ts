// frontend/src/services/printing.ts
import type { CustomerOrderReadDTO } from "../types/api-types";
import { formatZurich } from "../utils/datetime";

const COLS = 42; // 80mm / Font A ≈ 42 chars
const line = (ch = "-") => ch.repeat(COLS);
const padR = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) : s + " ".repeat(n - s.length);
const money = (v: unknown) => `CHF ${Number(v || 0).toFixed(2)}`;

/** Word wrap that preserves whole words and fits a given width. */
function wrap(text: string, width: number): string[] {
  const words = String(text ?? "").split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    const next = cur ? cur + " " + w : w;
    if (next.length <= width) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w.length > width ? w.slice(0, width) : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Normalize safe access across older/newer DTOs (menu & buffet). */
function resolveTimes(o: any): {
  createdAt?: string;
  requestedAt?: string;
  committedReadyAt?: string;
  asap: boolean;
} {
  const createdAt = o?.createdAt ? String(o.createdAt) : undefined;

  const requestedAt =
    (o?.requestedAt && String(o.requestedAt)) ||
    (o?.timing?.requestedAt && String(o.timing.requestedAt)) ||
    undefined;

  const committedReadyAt =
    (o?.committedReadyAt && String(o.committedReadyAt)) ||
    (o?.timing?.committedReadyAt && String(o.timing.committedReadyAt)) ||
    undefined;

  // ASAP only if explicitly ASAP or we truly lack a scheduled time
  const asap = Boolean(o?.timing?.asap) || (!requestedAt && !committedReadyAt);

  return { createdAt, requestedAt, committedReadyAt, asap };
}

/** Format as Europe/Zurich (delegates to your shared util). */
function fmtCH(value?: string): string {
  if (!value) return "—";
  return formatZurich(value);
}

/** Payment line: "<METHOD>, Paid/Not Paid" */
function paymentLine(o: { paymentMethod?: string; paymentStatus?: string }) {
  const pm = (o.paymentMethod || "").toUpperCase();
  const ps = (o.paymentStatus || "").toUpperCase();

  const paid = ps === "SUCCEEDED";
  const method = pm || (ps ? "CARD" : "PAYMENT");

  return `${method}, ${paid ? "Paid" : "Not Paid"}`;
}

/** Resolve an item display name across Menu/Buffet DTOs. */
function itemName(it: any): string {
  return (
    it?.menuItem?.foodItem?.name ||
    it?.menuItemName ||
    it?.name ||
    (it?.menuItemId ? `#${it.menuItemId}` : "Item")
  );
}

export function buildCustomerOrderReceipt(o: CustomerOrderReadDTO): string {
  const rows: string[] = [];

  // Times
  const times = resolveTimes(o as any);
  const placedLocal = fmtCH(times.createdAt);
  const deliverLocal = times.asap
    ? times.committedReadyAt
      ? fmtCH(times.committedReadyAt)
      : "ASAP"
    : fmtCH(times.committedReadyAt || times.requestedAt);

  // Header
  rows.push("ASIAN KITCHEN");
  rows.push(line());
  rows.push(`Order:  ${o.id}`);
  rows.push(`Placed: ${placedLocal}`);
  rows.push(`Deliver: ${deliverLocal}`);
  rows.push(`Type:   ${String(o.orderType || "").toUpperCase()}`);
  rows.push(line());

  // Customer block
  const ci: any = (o as any).customerInfo || {};
  const addr: any = ci.address || {};
  const fullName = `${ci.firstName ?? ""} ${ci.lastName ?? ""}`.trim();

  if (fullName) rows.push(fullName);
  if (ci.phone) rows.push(ci.phone);
  if (addr.street) rows.push(`${addr.street} ${addr.streetNo ?? ""}`.trim());
  if (addr.plz || addr.city)
    rows.push(`${addr.plz ?? ""} ${addr.city ?? ""}`.trim());
  rows.push(line());

  // Items header
  rows.push(padR("Item", COLS - 12) + padR("Qty", 4) + "Amount");
  rows.push(line());

  // Items
  const items: any[] = ((o as any).orderItems ?? []) as any[];
  for (const it of items) {
    const nm = itemName(it);
    const qty = Number(it?.quantity ?? 1);
    const unit = Number(it?.unitPrice ?? it?.price ?? 0);
    const total = unit * qty;

    const wrapped = wrap(nm, COLS - 12);
    rows.push(
      padR(wrapped[0], COLS - 12) + padR(String(qty), 4) + money(total)
    );
    for (let i = 1; i < wrapped.length; i++) rows.push(padR(wrapped[i], COLS));
  }

  // Totals
  const pre = Number((o as any).itemsSubtotalBeforeDiscount ?? 0);
  const pct = Number((o as any).discountPercent ?? 0);
  const disc = Number((o as any).discountAmount ?? 0);
  const post = Number((o as any).itemsSubtotalAfterDiscount ?? 0);
  const vat = Number((o as any).vatAmount ?? 0);
  const deliv = Number((o as any).deliveryFee ?? 0);
  const grand = Number((o as any).totalPrice ?? 0);

  rows.push(line());
  rows.push(padR("Items", COLS - 10) + money(pre));
  if (pct > 0) {
    rows.push(padR(`Discount (${pct}%)`, COLS - 10) + `- ${money(disc)}`);
    rows.push(padR("Items after discount", COLS - 10) + money(post));
  }
  const vatPct = (o as any).vatPercent ?? 2.6;
  rows.push(
    padR(`VAT (${Number(vatPct).toFixed(1)}%)`, COLS - 10) + money(vat)
  );
  if (String(o.orderType || "").toUpperCase() === "DELIVERY") {
    rows.push(padR("Delivery fee", COLS - 10) + money(deliv));
  }
  rows.push(line());
  rows.push(padR("TOTAL", COLS - 10) + money(grand));

  // Payment line
  rows.push(`Payment: ${paymentLine(o as any)}`);
  rows.push(line());
  rows.push("Thank you!");
  rows.push("");

  return rows.join("\n");
}

/** Share text to RawBT (or any print/share target). */
export async function shareTextToPrinter(text: string, title = "Receipt") {
  const navAny = navigator as any;
  if (navAny.share) {
    try {
      await navAny.share({ title, text });
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    window.location.href = `rawbt://print?text=${encodeURIComponent(text)}`;
    return;
  } catch {
    /* fall through */
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${title.replace(/\s+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Print one order. */
export async function printCustomerOrderReceipt(o: CustomerOrderReadDTO) {
  const text = buildCustomerOrderReceipt(o);
  await shareTextToPrinter(text, `Order_${o.id}`);
}

/** Best-effort auto print. */
const LS_KEY = "ak.printed.orderIds";
function loadPrintedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}
function savePrintedSet(s: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(s)));
}

export async function autoPrintNewPaid(
  rows: CustomerOrderReadDTO[]
): Promise<void> {
  const printed = loadPrintedSet();

  for (const o of rows) {
    const id = String((o as any).id);
    const paymentStatus = String((o as any).paymentStatus || "").toUpperCase();
    const paymentMethod = String((o as any).paymentMethod || "").toUpperCase();

    const paid =
      paymentStatus === "SUCCEEDED" ||
      paymentStatus === "NOT_REQUIRED" ||
      ["CASH", "TWINT", "POS_CARD"].includes(paymentMethod);

    if (paid && !printed.has(id)) {
      try {
        await printCustomerOrderReceipt(o);
        printed.add(id);
      } catch {
        // ignore; try again next load
      }
    }
  }

  savePrintedSet(printed);
}
