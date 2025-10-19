// src/components/04_pages/Admin/ReservationsAdminPage.tsx
import * as React from "react";
import {
  Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Chip, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { listReservations, setReservationStatus, deleteReservation } from "../../../services/reservations";
import { notifyError, notifySuccess } from "../../../services/toast";
import { ReservationReadDTO, ReservationStatus } from "../../../types/api-types";
import { formatZurich } from "../../../utils/datetime";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

export default function ReservationsAdminPage() {
  const [rows, setRows] = React.useState<ReservationReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyIds, setBusy] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try { setRows(await listReservations() ?? []); }
      catch (err) { notifyError(anyMsg(err)); }
      finally { setLoading(false); }
    })();
  }, []);

  const mark = (id: string, v: boolean) => setBusy(prev => ({ ...prev, [id]: v }));

  const onSetStatus = async (id: string, status: ReservationStatus) => {
    // optimistic
    setRows(prev => prev.map(r => String(r.id) === id ? { ...r, status } : r));
    mark(id, true);
    try { await setReservationStatus(id, status); notifySuccess(`Reservation ${status.toLowerCase()}`); }
    catch (err) { notifyError(anyMsg(err)); /* reload */ }
    finally { mark(id, false); }
  };

  const onDelete = async (id: string) => {
    mark(id, true);
    try { await deleteReservation(id); setRows(prev => prev.filter(r => String(r.id) !== id)); notifySuccess("Reservation deleted"); }
    catch (err) { notifyError(anyMsg(err)); }
    finally { mark(id, false); }
  };

  // hide REQUESTED (those are cards on Incoming)
  const nonReq = rows.filter(r => r.status !== ReservationStatus.REQUESTED);

  const active = nonReq.filter(r => r.status === ReservationStatus.CONFIRMED);
  const done = nonReq.filter(r => r.status === ReservationStatus.NO_SHOW);
  const cancelled = nonReq.filter(r => r.status === ReservationStatus.CANCELLED || r.status === ReservationStatus.REJECTED);

  return (
    <Paper elevation={0} sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}>
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Reservations
      </Typography>

      <Section title={`Active (${active.length})`} defaultExpanded>
        <ResTable rows={active} busyIds={busyIds} onSetStatus={onSetStatus} onDelete={onDelete} />
      </Section>

      <Section title={`Done (${done.length})`}>
        <ResTable rows={done} busyIds={busyIds} onSetStatus={onSetStatus} onDelete={onDelete} />
      </Section>

      <Section title={`Cancelled / Rejected (${cancelled.length})`}>
        <ResTable rows={cancelled} busyIds={busyIds} onSetStatus={onSetStatus} onDelete={onDelete} />
      </Section>
    </Paper>
  );
}

function Section(props:any){ return (
  <Accordion defaultExpanded={props.defaultExpanded} disableGutters sx={{ mb:2, border: "1px solid #E2D9C2" }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ fontWeight: 700 }}>{props.title}</Typography></AccordionSummary>
    <AccordionDetails>{props.children}</AccordionDetails>
  </Accordion>
);}

function ResTable({ rows, busyIds, onSetStatus, onDelete }:{
  rows: ReservationReadDTO[]; busyIds: Record<string, boolean>;
  onSetStatus: (id: string, s: ReservationStatus) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Phone</TableCell>
          <TableCell>Date/Time</TableCell>
          <TableCell>People</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={6}>No reservations</TableCell></TableRow>}
        {rows.map(r => {
          const id = String(r.id);
          const busy = !!busyIds[id];
          const decided = r.status !== ReservationStatus.REQUESTED;

          return (
            <TableRow key={id}>
              <TableCell>{r.customerInfo?.firstName} {r.customerInfo?.lastName}</TableCell>
              <TableCell>{r.customerInfo?.phone}</TableCell>
              <TableCell>{formatZurich(String(r.reservationDateTime))}</TableCell>
              <TableCell>{r.numberOfPeople}</TableCell>
              <TableCell><Chip label={r.status} size="small" /></TableCell>
              <TableCell align="right">
                {decided ? (
                  <>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.CONFIRMED)} size="small" disabled={busy}>Confirm</Button>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.REJECTED)} size="small" disabled={busy}>Reject</Button>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.CANCELLED)} size="small" disabled={busy}>Cancel</Button>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.NO_SHOW)} size="small" disabled={busy}>No-show</Button>
                    <Button onClick={() => onDelete(id)} size="small" disabled={busy} color="error">Delete</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.CONFIRMED)} size="small" disabled={busy}
                      variant="contained" sx={{ bgcolor: AK_GOLD, color: AK_DARK, "&:hover": { bgcolor: "#E2B437" } }}>
                      Confirm
                    </Button>
                    <Button onClick={() => onSetStatus(id, ReservationStatus.REJECTED)} size="small" disabled={busy} variant="outlined">Reject</Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function anyMsg(err:any){
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || "Something went wrong";
}
