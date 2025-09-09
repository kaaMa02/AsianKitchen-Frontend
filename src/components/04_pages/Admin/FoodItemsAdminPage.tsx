import * as React from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { FoodItemDTO } from '../../../types/api-types';
import { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem } from '../../../services/foodItems';

const card = { p: 3, borderRadius: 2, border: '1px solid #E2D9C2', bgcolor: '#f5efdf' } as const;

export default function FoodItemsAdminPage() {
  const [rows, setRows] = React.useState<FoodItemDTO[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FoodItemDTO | null>(null);
  const [form, setForm] = React.useState<FoodItemDTO>({ name: '' });

  const load = React.useCallback(async () => {
    const data = await listFoodItems();
    setRows(data);
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const onEdit = (r: FoodItemDTO) => { setEditing(r); setForm(r); setOpen(true); };
  const onCreate = () => { setEditing(null); setForm({ name: '' }); setOpen(true); };

  const onSave = async () => {
    if (editing?.id) await updateFoodItem(String(editing.id), form);
    else await createFoodItem(form);
    setOpen(false); await load();
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Delete this item?')) return;
    await deleteFoodItem(id); await load();
  };

  const bind = (k: keyof FoodItemDTO) => ({
    value: (form as any)[k] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  });

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: '#0B2D24' }}>Food Items</Typography>

      <Paper elevation={0} sx={card}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={onCreate} variant="contained" sx={{ bgcolor: '#D1A01F', color: '#0B2D24', fontWeight: 800, '&:hover': { bgcolor: '#E2B437' } }}>
            New Food Item
          </Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Ingredients</TableCell>
              <TableCell>Allergies</TableCell>
              <TableCell>Image</TableCell>
              <TableCell width={120} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={String(r.id)}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell>{r.ingredients}</TableCell>
                <TableCell>{r.allergies}</TableCell>
                <TableCell>{r.imageUrl}</TableCell>
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
        <DialogTitle>{editing ? 'Edit Food Item' : 'New Food Item'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Name" {...bind('name')} required />
          <TextField label="Description" {...bind('description')} multiline />
          <TextField label="Ingredients" {...bind('ingredients')} multiline />
          <TextField label="Allergies" {...bind('allergies')} multiline />
          <TextField label="Image URL" {...bind('imageUrl')} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
