import * as React from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  Box,
} from "@mui/material";
import {
  listAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../../services/users";
import {
  UserReadDTO,
  Role,
  UserWriteDTO,
  AdminUserUpdateDTO,
} from "../../../types/api-types";
import { notifyError, notifySuccess } from "../../../services/toast";
import type { SelectChangeEvent } from "@mui/material/Select";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

type FormState = {
  id?: string;
  username: string;
  email: string;
  role: Role;
  password?: string;
};

export default function UsersAdminPage() {
  const [rows, setRows] = React.useState<UserReadDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    username: "",
    email: "",
    role: Role.ADMIN,
    password: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAllUsers();
      setRows(data);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const onEdit = (u?: UserReadDTO) => {
    if (u) {
      setForm({
        id: String(u.id),
        username: u.username,
        email: u.email,
        role: u.role,
      });
    } else {
      setForm({ username: "", email: "", role: Role.ADMIN, password: "" });
    }
    setOpen(true);
  };

  const save = async () => {
    try {
      if (form.id) {
        const payload: AdminUserUpdateDTO = {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        await updateUser(form.id, payload as any);
      } else {
        const payload: UserWriteDTO = {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role,
          password: String(form.password || "").trim(),
        };
        await createUser(payload);
      }
      notifySuccess("Saved");
      setOpen(false);
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      notifySuccess("Deleted");
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #E2D9C2", bgcolor: "#f5efdf" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            sx={{ color: AK_DARK, fontWeight: 800, flex: 1 }}
          >
            Users
          </Typography>
          <Button
            onClick={() => onEdit()}
            variant="contained"
            sx={{
              bgcolor: AK_GOLD,
              color: AK_DARK,
              fontWeight: 800,
              "&:hover": { bgcolor: "#E2B437" },
            }}
          >
            Add
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No users</TableCell>
              </TableRow>
            )}
            {rows.map((u) => (
              <TableRow key={String(u.id)}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell align="right">
                  <Button
                    onClick={() => onEdit(u)}
                    size="small"
                    variant="outlined"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => onDelete(String(u.id))}
                    size="small"
                    variant="text"
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{form.id ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          <TextField
            label="Username"
            value={form.username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
          />

          {!form.id && (
            <TextField
              label="Password"
              type="password"
              value={form.password || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          )}

          <Box>
            <InputLabel id="role-label">Role</InputLabel>

            <Select
              labelId="role-label"
              value={form.role}
              onChange={(e: SelectChangeEvent<Role>) =>
                setForm((f) => ({ ...f, role: e.target.value as Role }))
              }
              fullWidth
            >
              <MenuItem value={Role.ADMIN}>ADMIN</MenuItem>
              <MenuItem value={Role.CUSTOMER}>CUSTOMER</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={save}
            variant="contained"
            sx={{
              bgcolor: AK_GOLD,
              color: AK_DARK,
              fontWeight: 800,
              "&:hover": { bgcolor: "#E2B437" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
