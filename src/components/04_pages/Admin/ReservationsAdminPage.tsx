import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
} from "@mui/material";
import { listReservations, setReservationStatus, deleteReservation } from "../../../services/reservations";
import { notifyError, notifySuccess } from "../../../services/toast";
import { ReservationReadDTO, ReservationStatus } from "../../../types/api-types";
import { useEffect, useState } from "react";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

function getErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.response?.data?.error ||
    anyErr?.message ||
    "Something went wrong"
  );
}

export default function ReservationsAdminPage() {
  const [rows, setRows] = useState<ReservationReadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listReservations();
        setRows(data ?? []);
      } catch (err) {
        console.error("Failed to load reservations", err);
        notifyError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mark = (id: string, v: boolean) => setBusyIds(prev => ({ ...prev, [id]: v }));

  const onSetStatus = async (id: string, status: ReservationStatus) => {
    try {
      mark(id, true);
      const updated = await setReservationStatus(id, status);
      setRows(prev => prev.map(r => String(r.id) === String(updated.id) ? updated : r));
      notifySuccess(`Reservation ${status.toLowerCase()}!`);
    } catch (err) {
      console.error("Failed to update reservation status", err);
      notifyError(getErrorMessage(err));
    } finally {
      mark(id, false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      mark(id, true);
      await deleteReservation(id);
      setRows(prev => prev.filter(r => String(r.id) !== String(id)));
      notifySuccess("Reservation deleted");
    } catch (err) {
      console.error("Failed to delete reservation", err);
      notifyError(getErrorMessage(err));
    } finally {
      mark(id, false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}>
      <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, mb: 2 }}>
        Reservations
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Phone No.</TableCell>
            <TableCell>Date/Time</TableCell>
            <TableCell>People</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>No reservations</TableCell>
            </TableRow>
          )}

          {rows.map(r => {
            const id = String(r.id);
            const busy = !!busyIds[id];
            return (
              <TableRow key={id}>
                <TableCell>{r.customerInfo?.firstName} {r.customerInfo?.lastName}</TableCell>
                <TableCell>{r.customerInfo?.phone}</TableCell>
                <TableCell>{String(r.reservationDateTime).replace("T", " ")}</TableCell>
                <TableCell>{r.numberOfPeople}</TableCell>
                <TableCell><Chip label={r.status} size="small" /></TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "inline-flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      onClick={() => onSetStatus(id, ReservationStatus.CONFIRMED)}
                      size="small"
                      disabled={busy}
                      variant="contained"
                      sx={{ bgcolor: AK_GOLD, color: AK_DARK, "&:hover": { bgcolor: "#E2B437" } }}
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => onSetStatus(id, ReservationStatus.REJECTED)}
                      size="small"
                      disabled={busy}
                      variant="outlined"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => onDelete(id)}
                      size="small"
                      disabled={busy}
                      variant="text"
                      color="error"
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}