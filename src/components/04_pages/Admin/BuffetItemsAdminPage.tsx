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
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  Box,
} from "@mui/material";
import {
  listAllBuffetItems,
  createBuffetItem,
  updateBuffetItem,
  deleteBuffetItem,
} from "../../../services/buffetItems";
import { listFoodItems } from "../../../services/foodItems";
import {
  BuffetItemReadDTO,
  BuffetItemWriteDTO,
  FoodItemDTO,
} from "../../../types/api-types";
import { notifyError, notifySuccess } from "../../../services/toast";

const AK_DARK = "#0B2D24";
const AK_GOLD = "#D1A01F";

type EditState = {
  id?: string;
  foodItemId: string;
  price: string;
  available: boolean;
};

export default function BuffetItemsAdminPage() {
  const [rows, setRows] = React.useState<BuffetItemReadDTO[]>([]);
  const [foods, setFoods] = React.useState<FoodItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<EditState>({
    foodItemId: "",
    price: "",
    available: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [mi, fi] = await Promise.all([
        listAllBuffetItems(),
        listFoodItems(),
      ]);
      setRows(mi);
      setFoods(fi);
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Failed to load buffet items");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const onEdit = (it?: BuffetItemReadDTO) => {
    setForm(
      it
        ? {
            id: String(it.id),
            foodItemId: String(it.foodItemId ?? ""),
            price: String(it.price ?? ""),
            available: Boolean(it.available ?? true),
          }
        : { foodItemId: "", price: "", available: true }
    );
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload: BuffetItemWriteDTO = {
        foodItemId: form.foodItemId,
        price: String(form.price || "0"),
        available: form.available,
      };
      if (form.id) {
        await updateBuffetItem(form.id, payload);
        notifySuccess("Updated");
      } else {
        await createBuffetItem(payload);
        notifySuccess("Created");
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Save failed");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteBuffetItem(id);
      notifySuccess("Deleted");
      await load();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || "Delete failed");
    }
  };

  const foodName = (id?: string) =>
    foods.find((f) => String(f.id) === String(id))?.name || id;

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
            Buffet Items
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
              <TableCell>Dish</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Available</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No items</TableCell>
              </TableRow>
            )}
            {rows.map((it) => (
              <TableRow key={String(it.id)}>
                <TableCell>{foodName(it.foodItemId)}</TableCell>
                <TableCell>CHF {Number(it.price || "0").toFixed(2)}</TableCell>
                <TableCell>{it.available ? "Yes" : "No"}</TableCell>
                <TableCell align="right">
                  <Button
                    onClick={() => onEdit(it)}
                    size="small"
                    variant="outlined"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => onDelete(String(it.id))}
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
        <DialogTitle>
          {form.id ? "Edit Buffet Item" : "Add Buffet Item"}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          <Box>
            <InputLabel id="food-label">Food Item</InputLabel>
            <Select
              labelId="food-label"
              value={form.foodItemId}
              onChange={(e) =>
                setForm((f) => ({ ...f, foodItemId: String(e.target.value) }))
              }
              fullWidth
            >
              {foods.map((f) => (
                <MenuItem key={String(f.id)} value={String(f.id)}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <TextField
            label="Price (CHF)"
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!form.available}
                onChange={(e) =>
                  setForm((f) => ({ ...f, available: e.target.checked }))
                }
              />
            }
            label="Available"
          />
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
