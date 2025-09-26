// src/services/printing.ts
import type {
  CustomerOrderReadDTO,
  OrderItemReadDTO,
} from "../types/api-types";

const COLS = 42; // 80mm / Font A ≈ 42 chars

const line = (ch = "-") => ch.repeat(COLS);
const padR = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) : s + " ".repeat(n - s.length);
const money = (v: unknown) => `CHF ${Number(v || 0).toFixed(2)}`;

function wrap(text: string, width: number): string[] {
  const words = String(text).split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= width) cur = next;
    else {
      if (cur) out.push(cur);
      // very long word
      cur = w.length > width ? w.slice(0, width) : w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function buildCustomerOrderReceipt(o: CustomerOrderReadDTO): string {
  const rows: string[] = [];

  rows.push("ASIAN KITCHEN");
  rows.push(line());
  rows.push(`Order:  ${o.id}`);
  rows.push(`Placed: ${String(o.createdAt).replace("T", " ").slice(0, 16)}`);
  rows.push(`Type:   ${o.orderType}`);
  rows.push(line());

  // Customer / address
  const ci = o.customerInfo;
  rows.push(`${ci?.firstName ?? ""} ${ci?.lastName ?? ""}`.trim());
  if (ci?.phone) rows.push(ci.phone);
  const addr = ci?.address as any;
  if (addr?.street) rows.push(`${addr.street} ${addr.streetNo ?? ""}`.trim());
  if (addr?.plz || addr?.city)
    rows.push(`${addr?.plz ?? ""} ${addr?.city ?? ""}`.trim());
  rows.push(line());

  // Items
  rows.push(padR("Item", COLS - 12) + padR("Qty", 4) + "Amount");
  rows.push(line());

  for (const it of (o.orderItems || []) as OrderItemReadDTO[]) {
    const name =
      (it as any).menuItemName ??
      (it as any).name ??
      `#${it.menuItemId ?? ""}`.trim();
    const qty = it.quantity ?? 1;
    const unit = (it as any).unitPrice;
    const total = typeof unit !== "undefined" ? Number(unit) * qty : undefined;

    const wrapped = wrap(name, COLS - 12);
    // first line with totals
    rows.push(
      padR(wrapped[0], COLS - 12) +
        padR(String(qty), 4) +
        (typeof total !== "undefined" ? money(total) : "")
    );
    // overflow lines
    for (let i = 1; i < wrapped.length; i++) rows.push(padR(wrapped[i], COLS));
  }

  rows.push(line());
  rows.push(padR("TOTAL", COLS - 10) + money(o.totalPrice));
  if (o.paymentStatus) rows.push(`Payment: ${o.paymentStatus}`);
  rows.push(`Status:  ${o.status}`);
  rows.push(line());
  rows.push("Thank you!");
  rows.push(""); // feed a bit
  rows.push("");

  return rows.join("\n");
}

/** Share text to RawBT (or any print/share target). */
export async function shareTextToPrinter(text: string, title = "Receipt") {
  // 1) Web Share – best UX on Android
  const navAny = navigator as any;
  if (navAny.share) {
    try {
      await navAny.share({ title, text });
      return;
    } catch {
      /* fall through */
    }
  }

  // 2) Try RawBT URL scheme (works only after a user tap, some browsers block)
  try {
    window.location.href = `rawbt://print?text=${encodeURIComponent(text)}`;
    return;
  } catch {
    /* fall through */
  }

  // 3) Fallback: download .txt (user can "Open with" RawBT)
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

export async function printCustomerOrderReceipt(o: CustomerOrderReadDTO) {
  const text = buildCustomerOrderReceipt(o);
  await shareTextToPrinter(text, `Order_${o.id}`);
}

/** Remember which orders we already printed (avoid duplicates). */
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

/** Best-effort auto print: call this after you fetched/updated rows. */
export async function autoPrintNewPaid(
  rows: CustomerOrderReadDTO[]
): Promise<void> {
  const printed = loadPrintedSet();

  for (const o of rows) {
    const id = String(o.id);
    if (o.paymentStatus === "SUCCEEDED" && !printed.has(id)) {
      try {
        await printCustomerOrderReceipt(o);
        printed.add(id);
      } catch {
        // ignore, try again next load
      }
    }
  }
  savePrintedSet(printed);
}
