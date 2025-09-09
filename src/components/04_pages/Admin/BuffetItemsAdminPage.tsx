import * as React from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, FormControlLabel, Switch
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { BuffetItemReadDTO, BuffetItemWriteDTO } from '../../../types/api-types';
import { listBuffetItems, createBuffetItem, updateBuffetItem, deleteBuffetItem } from '../../../services/buffetItems';

const card = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

export default function BuffetItemsAdminPage() {
  const [rows, setRows] = React.useState<BuffetItemReadDTO[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BuffetItemWriteDTO>({ foodItemId: '' as any, available: true, price: '0.00' });

  const load = React.useCallback(async () => setRows(await listBuffetItems()), []);
  React.useEffect(() => { load(); }, [load]);

  const onEdit = (r: BuffetItemReadDTO) => {
    setEditingId(String(r.id));
    setForm({ foodItemId: r.foodItemId, available: r.available, price: String(r.price) });
    setOpen(true);
  };
  const onCreate = () => { setEditingId(null); setForm({ foodItemId: '' as any, available: true, price: '0.00' }); setOpen(true); };

  const onSave = async () => {
    if (editingId) await updateBuffetItem(editingId, form);
    else await createBuffetItem(form);
    setOpen(false); await load();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this buffet item?')) return;
    await deleteBuffetItem(id); await load();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: '#0B2D24' }}>Buffet Items</Typography>

      <Paper elevation={0} sx={card}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={onCreate} variant="contained" sx={{ bgcolor: '#D1A01F', color: '#0B2D24', fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}>
            New Buffet Item
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>FoodItemId</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Price</TableCell>
              <TableCell width={120} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={String(r.id)}>
                <TableCell>{r.foodItemId}</TableCell>
                <TableCell>{r.available ? 'Yes' : 'No'}</TableCell>
                <TableCell>CHF {r.price}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => onEdit(r)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => onDelete(String(r.id))}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Buffet Item' : 'New Buffet Item'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Food Item ID" value={form.foodItemId as any} onChange={(e) => setForm({ ...form, foodItemId: e.target.value as any })} />
          <FormControlLabel control={<Switch checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} />} label="Available" />
          <TextField label="Price (CHF)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}