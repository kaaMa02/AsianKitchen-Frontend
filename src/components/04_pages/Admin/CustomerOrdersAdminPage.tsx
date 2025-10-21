// frontend/src/components/04_pages/Admin/CustomerOrdersAdminPage.tsx
import * as React from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TableContainer,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PrintIcon from "@mui/icons-material/Print";
import {
  listAllCustomerOrders,
  updateCustomerOrderStatus,
} from "../../../services/customerOrders";
import {
  autoPrintNewPaid,
  printCustomerOrderReceipt,
} from "../../../services/printing";
import { notifyError, notifySuccess } from "../../../services/toast";
import { OrderStatus, CustomerOrderReadDTO } from "../../../types/api-types";
import { formatZurich } from "../../../utils/datetime";
import CellPopover from "../../common/CellPopover";

const AK_DARK = "#0B2D24";

const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

function prettyPaymentLabel(o: {
  paymentMethod?: string;
  paymentStatus?: string;
}) {
  const pm = o.paymentMethod;
  const ps = o.paymentStatus;
  if (pm === "CASH" || pm === "TWINT" || pm === "POS_CARD") return pm || "N/A";
  if (pm === "CARD") return ps ? `CARD · ${ps}` : "CARD";
  if (ps && ps !== "NOT_REQUIRED") return ps;
  return "N/A";
}

export default function CustomerOrdersAdminPage() {
  const [rows, setRows] = React.useState<CustomerOrderReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllCustomerOrders();
      setRows(data ?? []);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);
  React.useEffect(() => {
    if (rows.length) void autoPrintNewPaid(rows);
  }, [rows]);

  const onChangeStatus = async (id: string, next: OrderStatus) => {
    try {
      setSavingId(id);
      await updateCustomerOrderStatus(id, next);
      setRows((prev) =>
        prev.map((o) => (String(o.id) === id ? { ...o, status: next } : o))
      );
      notifySuccess("Order status updated");
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to update status");
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const nonNew = rows.filter((o) => o.status !== OrderStatus.NEW);
  const active = nonNew.filter(
    (o) =>
      o.status === OrderStatus.CONFIRMED ||
      o.status === OrderStatus.PREPARING ||
      o.status === OrderStatus.ON_THE_WAY
  );
  const done = nonNew.filter((o) => o.status === OrderStatus.DELIVERED);
  const cancelled = nonNew.filter((o) => o.status === OrderStatus.CANCELLED);

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
    >
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Menu Orders
      </Typography>

      <Section title={`Active (${active.length})`} defaultExpanded>
        <OrdersTable
          rows={active}
          savingId={savingId}
          onChangeStatus={onChangeStatus}
        />
      </Section>

      <Section title={`Done / Delivered (${done.length})`}>
        <OrdersTable
          rows={done}
          savingId={savingId}
          onChangeStatus={onChangeStatus}
        />
      </Section>

      <Section title={`Cancelled (${cancelled.length})`}>
        <OrdersTable
          rows={cancelled}
          savingId={savingId}
          onChangeStatus={onChangeStatus}
        />
      </Section>
    </Paper>
  );
}

function Section({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{ mb: 2, border: "1px solid #E2D9C2" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function OrdersTable({
  rows,
  savingId,
  onChangeStatus,
}: {
  rows: CustomerOrderReadDTO[];
  savingId: string | null;
  onChangeStatus: (id: string, next: OrderStatus) => void | Promise<void>;
}) {
  return (
    <TableContainer
      sx={{
        maxHeight: "calc(100vh - 280px)", // flexible viewport height
          border: "1px solid #E2D9C2",
          bgcolor: "#fff",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Created</TableCell>
            <TableCell>Requested</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell align="right">Progress / Print</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9}>No orders</TableCell>
            </TableRow>
          )}
          {rows.map((o) => {
            const id = String(o.id);
            const canPrint =
              o.paymentStatus === "SUCCEEDED" ||
              o.paymentStatus === "NOT_REQUIRED" ||
              o.paymentMethod === "CASH" ||
              o.paymentMethod === "TWINT" ||
              o.paymentMethod === "POS_CARD";

            const requestedAt: string | undefined =
              (o as any).requestedAt || (o as any).timing?.requestedAt;
            const asap: boolean =
              Boolean((o as any).timing?.asap) || !requestedAt;

            return (
              <TableRow key={id}>
                <TableCell>{formatZurich(String(o.createdAt))}</TableCell>
                <TableCell>
                  {asap ? "ASAP" : formatZurich(String(requestedAt))}
                </TableCell>
                <TableCell>
                  <CellPopover
                    label={`${o.customerInfo?.firstName} ${o.customerInfo?.lastName}`}
                  >
                    <div>
                      <strong>
                        {o.customerInfo?.firstName} {o.customerInfo?.lastName}
                      </strong>
                    </div>
                    <div>{o.customerInfo?.email}</div>
                    <div>{o.customerInfo?.phone}</div>
                    {o.customerInfo?.address && (
                      <div>
                        {o.customerInfo.address.street}{" "}
                        {o.customerInfo.address.streetNo},{" "}
                        {o.customerInfo.address.plz}{" "}
                        {o.customerInfo.address.city}
                      </div>
                    )}
                  </CellPopover>
                </TableCell>
                <TableCell>
                  <CellPopover label="View items">
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(o.orderItems ?? []).map((it, i) => (
                        <li key={i}>
                          {it.menuItemName ?? "—"} · x {it.quantity}
                        </li>
                      ))}
                    </ul>
                  </CellPopover>
                </TableCell>
                <TableCell>{o.orderType}</TableCell>
                <TableCell>
                  CHF {Number(o.totalPrice || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip label={o.status} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={prettyPaymentLabel(o)}
                    size="small"
                    color={canPrint ? "success" : "default"}
                  />
                </TableCell>
                <TableCell align="right">
                  <FormControl size="small" sx={{ minWidth: 180, mr: 1 }}>
                    <Select
                      value={o.status as string}
                      onChange={(e: SelectChangeEvent<string>) => {
                        const next = e.target.value as OrderStatus;
                        if (next && next !== o.status)
                          void onChangeStatus(id, next);
                      }}
                      disabled={savingId === id}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    aria-label="Print receipt"
                    size="small"
                    onClick={() => printCustomerOrderReceipt(o)}
                    disabled={!canPrint}
                    title={
                      canPrint ? "Print receipt" : "Print enabled after payment"
                    }
                  >
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
