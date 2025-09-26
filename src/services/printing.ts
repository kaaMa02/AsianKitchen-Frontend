import type { CustomerOrderReadDTO, BuffetOrderReadDTO } from "../types/api-types";

// ── ESC/POS helpers ───────────────────────────────────────────────────────────
function bytes(...arrs: (Uint8Array | number[])[]) {
  const flat = arrs.flatMap((a) => (a instanceof Uint8Array ? Array.from(a) : a));
  return new Uint8Array(flat);
}
function cmd(...n: number[]) { return new Uint8Array(n); }
function txt(s: string) { return new TextEncoder().encode(s); }

function init()       { return cmd(0x1B, 0x40); }
function centerOn()   { return cmd(0x1B, 0x61, 0x01); }
function centerOff()  { return cmd(0x1B, 0x61, 0x00); }
function boldOn()     { return cmd(0x1B, 0x45, 0x01); }
function boldOff()    { return cmd(0x1B, 0x45, 0x00); }
function dblHOn()     { return cmd(0x1D, 0x21, 0x01); }
function resetSize()  { return cmd(0x1D, 0x21, 0x00); }
function lf(n=1)      { return new Uint8Array(Array(n).fill(0x0A)); }
function cut()        { return cmd(0x1D, 0x56, 0x41, 0x10); } // partial cut

// QR (model 2, size 4, error M)
function qr(data: string) {
  const enc = new TextEncoder().encode(data);
  const pL = (enc.length + 3) & 0xff;
  const pH = ((enc.length + 3) >> 8) & 0xff;
  return bytes(
    cmd(0x1D,0x28,0x6B, 0x04,0x00, 0x31,0x41,0x32,0x00),
    cmd(0x1D,0x28,0x6B, 0x03,0x00, 0x31,0x43,0x04),
    cmd(0x1D,0x28,0x6B, 0x03,0x00, 0x31,0x45,0x31),
    cmd(0x1D,0x28,0x6B, pL,pH, 0x31,0x50,0x30), enc,
    cmd(0x1D,0x28,0x6B, 0x03,0x00, 0x31,0x51,0x30)
  );
}

function line48(s: string) {
  const line = s.normalize("NFKD").replace(/\r?\n/g, " ");
  return line.length > 48 ? line.slice(0,48) : line;
}

function itemLine48(left: string, right: string) {
  const L = line48(left);
  const space = 48 - L.length - right.length;
  return `${L}${" ".repeat(Math.max(1, space))}${right}`;
}

function itemLines(order: any) {
  const items: any[] = Array.isArray(order.orderItems) ? order.orderItems : [];
  return items.map((oi) => {
    const name = (oi.menuItemName ?? `#${oi.menuItemId ?? ""}`).toString();
    const qty  = Number(oi.quantity ?? 1);
    const unit = typeof oi.unitPrice !== "undefined" ? Number(oi.unitPrice) : undefined;
    const right = typeof unit !== "undefined" ? `CHF ${(unit * qty).toFixed(2)}` : "";
    return itemLine48(`${qty} x ${name}`, right);
  });
}

export type PrintKind = "MENU" | "BUFFET";

function buildReceipt(order: CustomerOrderReadDTO | BuffetOrderReadDTO, kind: PrintKind) {
  const cust = order.customerInfo || ({} as any);
  const addr = cust.address || ({} as any);

  const trackUrl =
    kind === "MENU"
      ? `https://asian-kitchen.online/track?orderId=${order.id}&email=${encodeURIComponent(cust.email || "")}`
      : `https://asian-kitchen.online/track-buffet?orderId=${order.id}&email=${encodeURIComponent(cust.email || "")}`;

  return bytes(
    init(),
    centerOn(), boldOn(), dblHOn(), txt("ASIAN KITCHEN\n"), resetSize(), boldOff(), centerOff(),
    boldOn(), txt(kind === "MENU" ? "Customer Order\n" : "Buffet Order\n"), boldOff(),
    txt(`Order: ${order.id}\n`),
    txt(`Placed: ${String(order.createdAt).replace("T"," ").slice(0,16)}\n`),
    txt(`Type: ${order.orderType}\n\n`),

    txt(`${cust.firstName ?? ""} ${cust.lastName ?? ""}\n`),
    txt(`${cust.phone ?? ""}\n`),
    txt(`${[addr.street, addr.streetNo].filter(Boolean).join(" ")}\n`),
    txt(`${[addr.plz, addr.city].filter(Boolean).join(" ")}\n`),

    txt("-".repeat(48) + "\n"),
    ...itemLines(order).map((s) => txt(s + "\n")),
    txt("-".repeat(48) + "\n"),
    txt(`TOTAL: CHF ${Number(order.totalPrice || 0).toFixed(2)}\n\n`),

    centerOn(), qr(trackUrl), lf(), centerOff(),
    txt("Track your order:\n"),
    txt(trackUrl + "\n\n"),
    txt("Thank you!\n"),
    lf(4),
    cut()
  );
}

export function printOrderViaRawBT(order: CustomerOrderReadDTO | BuffetOrderReadDTO, kind: PrintKind) {
  const data = buildReceipt(order, kind);
  let bin = ""; data.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  // Hands off to the RawBT app:
  window.location.href = `rawbt:${b64}`;
}
