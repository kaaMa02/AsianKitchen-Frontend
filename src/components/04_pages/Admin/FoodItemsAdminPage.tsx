import * as React from 'react';
import {
  Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box
} from '@mui/material';
import { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem } from '../../../services/foodItems';
import { notifyError, notifySuccess } from '../../../services/toast';
import { FoodItemDTO } from '../../../types/api-types';

const AK_DARK = '#0B2D24';
const AK_GOLD = '#D1A01F';

type EditState = Partial<FoodItemDTO> & { id?: string };

export default function FoodItemsAdminPage() {
  const [rows, setRows] = React.useState<FoodItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<EditState>({ name: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFoodItems();
      setRows(data);
    } catch (e:any) {
      notifyError(e?.response?.data?.message || 'Failed to load food items');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const onEdit = (it?: FoodItemDTO) => {
    setForm({
      id: it ? String(it.id) : undefined,
      name: it?.name || '',
      description: it?.description || '',
      // add more fields here if your DTO has them
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (form.id) {
        const { id, ...payload } = form;
        await updateFoodItem(id!, payload as any);
        notifySuccess('Updated');
      } else {
        const { id, ...payload } = form;
        await createFoodItem(payload as any);
        notifySuccess('Created');
      }
      setOpen(false);
      await load();
    } catch (e:any) {
      notifyError(e?.response?.data?.message || 'Save failed');
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteFoodItem(id);
      notifySuccess('Deleted');
      await load();
    } catch (e:any) {
      notifyError(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' }}>
        <Box sx={{ display:'flex', alignItems:'center', mb:2 }}>
          <Typography variant="h6" sx={{ color: AK_DARK, fontWeight: 800, flex:1 }}>Food Items</Typography>
          <Button onClick={() => onEdit()} variant="contained" sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover':{ bgcolor:'#E2B437' }}}>Add</Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={3}>No items</TableCell></TableRow>}
            {rows.map(it => (
              <TableRow key={String(it.id)}>
                <TableCell>{it.name}</TableCell>
                <TableCell>{it.description}</TableCell>
                <TableCell align="right">
                  <Button onClick={() => onEdit(it)} size="small" variant="outlined">Edit</Button>
                  <Button onClick={() => onDelete(String(it.id))} size="small" variant="text" color="error" sx={{ ml:1 }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? 'Edit Food Item' : 'Add Food Item'}</DialogTitle>
        <DialogContent sx={{ display:'grid', gap:2, pt:2 }}>
          <TextField label="Name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Description" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline minRows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} variant="contained" sx={{ bgcolor: AK_GOLD, color: AK_DARK, fontWeight: 800, '&:hover':{ bgcolor:'#E2B437' }}}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
