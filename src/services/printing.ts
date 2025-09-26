// src/services/printing.ts
import type {
  BuffetOrderReadDTO,
  CustomerOrderReadDTO,
  OrderItemReadDTO,
} from "../types/api-types";

/** A minimal ESC/POS builder */
class EscPos {
  // Must be mutable to build the byte array efficiently (push).
  // NOSONAR (S2933): property is intentionally mutable; we're mutating contents, not reassigning the reference.
  private out: number[] = [];

  private readonly ESC = 0x1b;
  private readonly GS = 0x1d;

  private push(...n: number[]) {
    this.out.push(...n);
    return this;
  }

  init() {
    return this.push(this.ESC, 0x40);
  } // Initialize
  alignLeft() {
    return this.push(this.ESC, 0x61, 0);
  }
  alignCenter() {
    return this.push(this.ESC, 0x61, 1);
  }
  alignRight() {
    return this.push(this.ESC, 0x61, 2);
  }
  bold(on: boolean) {
    return this.push(this.ESC, 0x45, on ? 1 : 0);
  }
  // Double width & height (ESC/POS 0x1D 0x21 n)
  dbl(on: boolean) {
    return this.push(this.GS, 0x21, on ? 0x11 : 0x00);
  }
  lf(n = 1) {
    while (n-- > 0) this.push(0x0a);
    return this;
  }
  // Partial cut
  cut() {
    return this.push(this.GS, 0x56, 0x41, 30);
  }

  text(s: string) {
    const bytes = new TextEncoder().encode(s);
    // Use forEach to avoid for..of (keeps ES5 friendly & quiets Sonar S4138).
    bytes.forEach((b) => this.out.push(b));
    return this;
  }

  rule(w = 32) {
    // hyphen x w, then LF
    this.text(new Array(w + 1).join("-")).lf();
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.out);
  }
}

/** Convert bytes to base64 without for..of */
function toBase64(u8: Uint8Array) {
  let bin = "";
  u8.forEach((b) => {
    bin += String.fromCharCode(b);
  }); // S4138 satisfied
  return btoa(bin);
}

/** Launch RawBT (Android) with ESC/POS payload */
export function printWithRawBT(bytes: Uint8Array) {
  const b64 = toBase64(bytes);
  const url = `rawbt://print?format=escpos&data=${encodeURIComponent(b64)}`;
  window.location.href = url;
}

/** Helpers */
function fmtMoney(n?: string | number) {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return `CHF ${v.toFixed(2)}`;
}

// A safe item shape our receipts understand (no `any` intersections)
type AnyOrderItem = OrderItemReadDTO & {
  unitPrice?: number | string;
  menuItemName?: string;
  name?: string;
};

function itemName(oi?: AnyOrderItem | null): string {
  if (!oi) return "Item";
  return (
    oi.menuItemName || oi.name || (oi.menuItemId ? `#${oi.menuItemId}` : "Item")
  );
}

function lineItem(oi: AnyOrderItem): string {
  const nm = itemName(oi);
  const qty = oi.quantity ?? 1;
  const unit =
    typeof oi.unitPrice !== "undefined" ? Number(oi.unitPrice) : undefined;
  const total = typeof unit !== "undefined" ? unit * qty : undefined;

  return typeof total !== "undefined"
    ? `${nm}  x${qty}   ${fmtMoney(total)}`
    : `${nm}  x${qty}`;
}

/** Customer order receipt */
export function buildCustomerReceipt(order: CustomerOrderReadDTO) {
  const p = new EscPos().init();

  p.alignCenter().bold(true).dbl(true).text("ASIAN KITCHEN").lf();
  p.bold(false).dbl(false).text("Order Receipt").lf().lf();

  p.alignLeft()
    .text(`Order ID: ${order.id}`)
    .lf()
    .text(`Placed  : ${String(order.createdAt).replace("T", " ").slice(0, 16)}`)
    .lf()
    .text(`Type    : ${order.orderType}`)
    .lf()
    .text(`Status  : ${order.status}`)
    .lf()
    .text(`Payment : ${order.paymentStatus ?? "N/A"}`)
    .lf()
    .rule();

  const items: AnyOrderItem[] = Array.isArray(order.orderItems)
    ? (order.orderItems as AnyOrderItem[])
    : [];
  p.text("Items").lf();
  items.forEach((oi) => p.text("• " + lineItem(oi)).lf());
  p.rule();

  p.alignRight()
    .bold(true)
    .text(`Total: ${fmtMoney(order.totalPrice)}`)
    .lf();
  p.alignLeft()
    .bold(false)
    .lf()
    .text(
      `Name : ${order.customerInfo?.firstName ?? ""} ${
        order.customerInfo?.lastName ?? ""
      }`
    )
    .lf()
    .text(`Phone: ${order.customerInfo?.phone ?? ""}`)
    .lf();

  p.lf().alignCenter().text("Thank you!").lf().cut();
  return p.toBytes();
}

/** Buffet order receipt */
export function buildBuffetReceipt(order: BuffetOrderReadDTO) {
  const p = new EscPos().init();

  p.alignCenter().bold(true).dbl(true).text("ASIAN KITCHEN").lf();
  p.bold(false).dbl(false).text("Buffet Order").lf().lf();

  p.alignLeft()
    .text(`Order ID: ${order.id}`)
    .lf()
    .text(`Placed  : ${String(order.createdAt).replace("T", " ").slice(0, 16)}`)
    .lf()
    .text(`Type    : ${order.orderType}`)
    .lf()
    .text(`Status  : ${order.status}`)
    .lf()
    .text(`Payment : ${order.paymentStatus ?? "N/A"}`)
    .lf()
    .rule();

  const items: Array<{ buffetItemId?: string; quantity?: number }> =
    Array.isArray(order.orderItems) ? (order.orderItems as any[]) : [];

  p.text("Guests / Items").lf();
  items.forEach((oi) => {
    const idTxt = oi.buffetItemId ? `#${oi.buffetItemId}` : "Item";
    const qty = oi.quantity ?? 1;
    p.text(`• ${idTxt}  x${qty}`).lf();
  });
  p.rule();

  p.alignRight()
    .bold(true)
    .text(`Total: ${fmtMoney(order.totalPrice)}`)
    .lf();
  p.alignLeft()
    .bold(false)
    .lf()
    .text(
      `Name : ${order.customerInfo?.firstName ?? ""} ${
        order.customerInfo?.lastName ?? ""
      }`
    )
    .lf()
    .text(`Phone: ${order.customerInfo?.phone ?? ""}`)
    .lf();

  p.lf().alignCenter().text("Enjoy your meal!").lf().cut();
  return p.toBytes();
}

export function printCustomerOrder(order: CustomerOrderReadDTO) {
  printWithRawBT(buildCustomerReceipt(order));
}
export function printBuffetOrder(order: BuffetOrderReadDTO) {
  printWithRawBT(buildBuffetReceipt(order));
}
