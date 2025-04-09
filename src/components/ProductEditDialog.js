// src/components/ProductEditDialog.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Box
} from '@mui/material';

export default function ProductEditDialog({ open, product, onClose, onSave }) {
  const [editedProduct, setEditedProduct] = useState({
    origin:''
  });

  useEffect(() => {
    if (product) {
      setEditedProduct(product);
    }
  }, [product]);

  const handleChange = (field, value) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (field, event) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleSave = () => {
    onSave(editedProduct);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Modifier le produit</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nom"
            variant="outlined"
            fullWidth
            value={editedProduct.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
          <TextField
            label="Code"
            variant="outlined"
            fullWidth
            value={editedProduct.code || ''}
            onChange={(e) => handleChange('code', e.target.value)}
          />
          <TextField
            label="Prix"
            variant="outlined"
            fullWidth
            type="number"
            value={editedProduct.price || ''}
            onChange={(e) => handleChange('price', parseFloat(e.target.value))}
          />
          <TextField
            label="Catégorie"
            variant="outlined"
            fullWidth
            value={editedProduct.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
          />
          <TextField
            label="Fournisseur"
            variant="outlined"
            fullWidth
            value={editedProduct.supplier || ''}
            onChange={(e) => handleChange('supplier', e.target.value)}
          />
            <TextField
            label="Origine"
            variant="outlined"
            fullWidth
            value={editedProduct.origin || ''}
            onChange={(e) => handleChange('origin', e.target.value)}/>
          <FormControlLabel
            control={
              <Checkbox
                checked={editedProduct.available || false}
                onChange={(e) => handleCheckboxChange('available', e)}
              />
            }
            label="Disponible"
          />
          {/* Add any additional product fields as needed */}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Sauver
        </Button>
      </DialogActions>
    </Dialog>
  );
}
