// src/components/AddProductDialog.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

export default function AddProductDialog({ open, onClose, onProductSelect, defaultMode }) {
  // Use defaultMode prop (if provided) or default to "select"
  const [mode, setMode] = useState(defaultMode || 'select');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  // State for manual product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    price: '',
    supplier: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(defaultMode || 'select');
    setSearchTerm('');
    setNewProduct({ name: '', code: '', price: '', supplier: '' });
  }, [open, defaultMode]);

  // Fetch available products (for select mode)
  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('available', '==', true));
    const unsubscribe = onSnapshot(q, snapshot => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      prods.sort((a, b) => {
        if (a.manuallyAdded && !b.manuallyAdded) return -1;
        if (!a.manuallyAdded && b.manuallyAdded) return 1;
        return a.name.localeCompare(b.name);
      });
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  // Filter products based on search term (only in select mode)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler for manual product submission (creation)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newProdData = {
        ...newProduct,
        price: parseFloat(newProduct.price) || 0,
        available: true,
        manuallyAdded: true
      };
      const docRef = await addDoc(collection(firestore, 'products'), newProdData);
      const createdProduct = { id: docRef.id, ...newProdData };
      onProductSelect(createdProduct);
      setNewProduct({ name: '', code: '', price: '', supplier: '' });
      setMode('select');
    } catch (error) {
      console.error("Error adding new product", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'select' ? 'Ajouter un produit' : 'Ajouter un produit manuellement'}
      </DialogTitle>
      <DialogContent>
        {mode === 'select' ? (
          <>
            <TextField
              label="Rechercher"
              variant="outlined"
              fullWidth
              margin="normal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <List>
              {filteredProducts.map(product => (
                <ListItem
                  button
                  key={product.id}
                  onClick={() => onProductSelect(product)}
                >
                  <ListItemText
                    primary={product.name}
                    secondary={`Prix: $${parseFloat(product.price).toFixed(2)}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <form onSubmit={handleManualSubmit}>
            <TextField
              label="Nom du produit"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
            />
            <TextField
              label="Code du produit"
              variant="outlined"
              fullWidth
              margin="normal"
              value={newProduct.code}
              onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
            />
            <TextField
              label="Prix"
              variant="outlined"
              fullWidth
              margin="normal"
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Fournisseur</InputLabel>
              <Select
                label="Fournisseur"
                value={newProduct.supplier}
                onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                required
              >
                <MenuItem value="Big Block">Big Block</MenuItem>
                <MenuItem value="canadawide">canadawide</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button onClick={() => setMode('select')} color="primary">
                Retour
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? "En cours..." : "Ajouter"}
              </Button>
            </Box>
          </form>
        )}
      </DialogContent>
      {mode === 'select' && (
        <DialogActions>
          <Button onClick={() => setMode('manual')} variant="contained" color="primary">
            Ajouter un produit manuellement
          </Button>
          <Button onClick={onClose}>Annuler</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
