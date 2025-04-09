// src/components/FilterBar.js
import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@mui/material';

/**
 * A small dialog for mobile screens: user can pick filters.
 */
function MobileFiltersDialog({
  open,
  onClose,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedSupplier,
  setSelectedSupplier,
  bioOnly,
  setBioOnly,
  distinctCategories,
  distinctSuppliers,
  distinctOrigins,
  selectedOrigin,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Filtrer</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Rechercher"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mt: 2 }}
        />

        <FormControl sx={{ width: '100%', mt: 2 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="Catégorie"
          >
            <MenuItem value="">Toutes</MenuItem>
            {distinctCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ width: '100%', mt: 2 }}>
          <InputLabel>Fournisseur</InputLabel>
          <Select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            label="Fournisseur"
          >
            <MenuItem value="">Tous</MenuItem>
            {distinctSuppliers.map((sup) => (
              <MenuItem key={sup} value={sup}>
                {sup}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: '100%', mt: 2 }}>
          <InputLabel>Origin</InputLabel>
          <Select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            label="Origin"
          >
            <MenuItem value="">Tous</MenuItem>
            {distinctOrigins.map((origin) => (
              <MenuItem key={origin} value={origin}>
                {origin}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={bioOnly}
              onChange={(e) => setBioOnly(e.target.checked)}
            />
          }
          label="Bio seulement"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * FilterBar decides:
 * - On mobile: show a single "Filtrer" button -> opens MobileFiltersDialog
 * - On larger screens: show the filters inline
 */
export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedSupplier,
  setSelectedSupplier,
  bioOnly,
  setBioOnly,
  distinctCategories,
  distinctSuppliers,
  distinctOrigins,
  setSelectedOrigin,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for opening the mobile dialog
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isMobile) {
    // --- Desktop / Tablet Layout (filters inline) ---
    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap', ml: 0, pl: 0, width: '100%' }}>
        <TextField
          label="Rechercher"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="Catégorie"
          >
            <MenuItem value="">Toutes</MenuItem>
            {distinctCategories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Fournisseur</InputLabel>
          <Select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            label="Fournisseur"
          >
            <MenuItem value="">Tous</MenuItem>
            {distinctSuppliers.map((sup) => (
              <MenuItem key={sup} value={sup}>
                {sup}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Origine</InputLabel>
          <Select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            label="Origine"
          >
            <MenuItem value="">Toutes</MenuItem>
            {distinctOrigins.map((origin) => (
              <MenuItem key={origin} value={origin}>
                {origin}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={bioOnly}
              onChange={(e) => setBioOnly(e.target.checked)}
            />
          }
          label="Bio seulement"
        />
      </Box>
    );
  }

  // --- Mobile Layout (dialog) ---
  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 2 }}
      >
        Filtrer
      </Button>

      <MobileFiltersDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        bioOnly={bioOnly}
        setBioOnly={setBioOnly}
        distinctCategories={distinctCategories}
        distinctSuppliers={distinctSuppliers}
        distinctOrigins={distinctOrigins}
        selectedOrigin={setSelectedOrigin}
      />
    </>
  );
}
