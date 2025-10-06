import type {
  CustomerOrderReadDTO,
  OrderItemReadDTO,
  BuffetOrderReadDTO,
  BuffetOrderItemReadDTO,
  PaymentMethod,
} from "../types/api-types";

const COLS = 42; // 80mm Font A ~42 chars

const line = (ch = "-") => ch.repeat(COLS);
const padR = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) : s + " ".repeat(n - s.length);
const money = (v: unknown) => `CHF ${Number(v || 0).toFixed(2)}`;

function wrap(text: string, width: number): string[] {
  const words = String(text ?? "").split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
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

function headerLines(o: { id: any; createdAt: any; orderType: any }) {
  return [
    "ASIAN KITCHEN",
    line(),
    `Order:  ${o.id}`,
    `Placed: ${String(o.createdAt).replace("T", " ").slice(0, 16)}`,
    `Type:   ${o.orderType}`,
    line(),
  ];
}

function customerLines(ci: any) {
  const rows: string[] = [];
  rows.push(`${ci?.firstName ?? ""} ${ci?.lastName ?? ""}`.trim());
  if (ci?.phone) rows.push(String(ci.phone));
  const a = ci?.address;
  if (a?.street) rows.push(`${a.street} ${a.streetNo ?? ""}`.trim());
  if (a?.plz || a?.city) rows.push(`${a?.plz ?? ""} ${a?.city ?? ""}`.trim());
  rows.push(line());
  return rows;
}

function itemsTableHeader() {
  return [padR("Item", COLS - 12) + padR("Qty", 4) + "Amount", line()];
}

function itemLines(name: string, qty: number, unit?: number) {
  const wrapped = wrap(name, COLS - 12);
  const total = typeof unit === "number" ? unit * qty : undefined;
  const rows: string[] = [];
  rows.push(
    padR(wrapped[0] ?? "", COLS - 12) +
      padR(String(qty), 4) +
      (typeof total !== "undefined" ? money(total) : "")
  );
  for (let i = 1; i < wrapped.length; i++) rows.push(padR(wrapped[i], COLS));
  return rows;
}

function footerLines(totalPrice: any, paymentStatus?: string, paymentMethod?: PaymentMethod, orderStatus?: string) {
  const rows: string[] = [];
  rows.push(line());
  rows.push(padR("TOTAL", COLS - 10) + money(totalPrice));
  if (paymentMethod) rows.push(`Method:  ${paymentMethod}`);
  if (paymentStatus) rows.push(`Payment: ${paymentStatus}`);
  if (orderStatus) rows.push(`Status:  ${orderStatus}`);
  rows.push(line());
  rows.push("Thank you!");
  rows.push("");
  rows.push("");
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu order printing

export function buildCustomerOrderReceipt(o: CustomerOrderReadDTO): string {
  const rows: string[] = [];
  rows.push(...headerLines(o));
  rows.push(...customerLines(o.customerInfo));

  rows.push(...itemsTableHeader());

  for (const it of (o.orderItems || []) as OrderItemReadDTO[]) {
    const name =
      it.menuItemName ??
      (it as any).name ??
      `#${it.menuItemId ?? ""}`.trim();
    const qty = it.quantity ?? 1;
    const unit = typeof it.unitPrice !== "undefined" ? Number(it.unitPrice) : undefined;
    rows.push(...itemLines(name, qty, unit));
  }

  rows.push(
    ...footerLines(o.totalPrice, o.paymentStatus, o.paymentMethod, o.status)
  );
  return rows.join("\n");
}

export function buildBuffetOrderReceipt(o: BuffetOrderReadDTO): string {
  const rows: string[] = [];
  rows.push(...headerLines(o));
  rows.push(...customerLines(o.customerInfo));

  rows.push(...itemsTableHeader());

  for (const it of (o.orderItems || []) as BuffetOrderItemReadDTO[]) {
    const name = it.name ?? `#${it.buffetItemId ?? ""}`.trim();
    const qty = it.quantity ?? 1;
    const unit =
      typeof it.unitPrice !== "undefined" ? Number(it.unitPrice) : undefined;
    rows.push(...itemLines(name, qty, unit));
  }

  rows.push(
    ...footerLines(o.totalPrice, o.paymentStatus, o.paymentMethod, o.status)
  );
  return rows.join("\n");
}

/** Share text to RawBT (or any print/share target). */
export async function shareTextToPrinter(text: string, title = "Receipt") {
  const navAny = navigator as any;

  // 1) Web Share (best UX on Android)
  if (navAny?.share) {
    try {
      await navAny.share({ title, text });
      return;
    } catch {
      // fall through
    }
  }

  // 2) RawBT URL scheme
  try {
    window.location.href = `rawbt://print?text=${encodeURIComponent(text)}`;
    return;
  } catch {
    // fall through
  }

  // 3) Download txt
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

export async function printBuffetOrderReceipt(o: BuffetOrderReadDTO) {
  const text = buildBuffetOrderReceipt(o);
  await shareTextToPrinter(text, `Buffet_${o.id}`);
}

/** Is this order ready to print? (Stripe paid OR manual cash) */
export function canPrintNow(order: {
  paymentStatus?: string;
  paymentMethod?: PaymentMethod;
}) {
  return order.paymentStatus === "SUCCEEDED" || order.paymentMethod === "CASH";
}

/** Best-effort auto print: call after rows are loaded/updated. */
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

export async function autoPrintNewPaidMenu(rows: CustomerOrderReadDTO[]): Promise<void> {
  const printed = loadPrintedSet();
  for (const o of rows) {
    const id = String(o.id);
    if (canPrintNow(o) && !printed.has(id)) {
      try {
        await printCustomerOrderReceipt(o);
        printed.add(id);
      } catch {
        // ignore; try later
      }
    }
  }
  savePrintedSet(printed);
}

export async function autoPrintNewPaidBuffet(rows: BuffetOrderReadDTO[]): Promise<void> {
  const printed = loadPrintedSet();
  for (const o of rows) {
    const id = String(o.id);
    if (canPrintNow(o) && !printed.has(id)) {
      try {
        await printBuffetOrderReceipt(o);
        printed.add(id);
      } catch {
        // ignore; try later
      }
    }
  }
  savePrintedSet(printed);
}
