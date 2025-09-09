import * as React from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem as MItem, Select, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { listAllUsers, createUser, updateUser, deleteUser } from '../../../services/users';
import { Role, UserReadDTO, UserWriteDTO, UserProfileUpdateDTO } from '../../../types/api-types';

const card = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

export default function UsersAdminPage() {
  const [rows, setRows] = React.useState<UserReadDTO[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserReadDTO | null>(null);

  const [createForm, setCreateForm] = React.useState<UserWriteDTO>({ username: '', password: '', role: Role.CUSTOMER });
  const [updateForm, setUpdateForm] = React.useState<UserProfileUpdateDTO>({ firstName: '', lastName: '', email: '', phoneNumber: '', address: undefined, password: undefined });

  const load = React.useCallback(async () => setRows(await listAllUsers()), []);
  React.useEffect(() => { load(); }, [load]);

  const onNew = () => { setEditing(null); setCreateForm({ username:'', password:'', role: Role.CUSTOMER }); setOpen(true); };
  const onEdit = (u: UserReadDTO) => {
    setEditing(u);
    setUpdateForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phoneNumber: u.phoneNumber });
    setOpen(true);
  };

  const onSave = async () => {
    if (editing) await updateUser(String(editing.id), updateForm);
    else await createUser(createForm);
    setOpen(false); await load();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    await deleteUser(id); await load();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: '#0B2D24' }}>Users</Typography>
      <Paper elevation={0} sx={card}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={onNew} variant="contained" sx={{ bgcolor: '#D1A01F', color: '#0B2D24', fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}>
            New User
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>First</TableCell>
              <TableCell>Last</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell width={100} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(u => (
              <TableRow key={String(u.id)}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.firstName}</TableCell>
                <TableCell>{u.lastName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phoneNumber}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => onEdit(u)}>Edit</Button>
                  <IconButton color="error" onClick={() => onDelete(String(u.id))}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit User' : 'New User'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          {editing ? (
            <>
              <TextField label="First name" value={updateForm.firstName ?? ''} onChange={e => setUpdateForm({ ...updateForm, firstName: e.target.value })} />
              <TextField label="Last name" value={updateForm.lastName ?? ''} onChange={e => setUpdateForm({ ...updateForm, lastName: e.target.value })} />
              <TextField label="Email" value={updateForm.email ?? ''} onChange={e => setUpdateForm({ ...updateForm, email: e.target.value })} />
              <TextField label="Phone" value={updateForm.phoneNumber ?? ''} onChange={e => setUpdateForm({ ...updateForm, phoneNumber: e.target.value })} />
              <TextField label="Password (optional)" type="password" value={updateForm.password ?? ''} onChange={e => setUpdateForm({ ...updateForm, password: e.target.value || undefined })} />
            </>
          ) : (
            <>
              <TextField label="Username" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} />
              <TextField label="Password" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
              <FormControl>
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value as any })}>
                  <MItem value={Role.CUSTOMER}>CUSTOMER</MItem>
                  <MItem value={Role.ADMIN}>ADMIN</MItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
