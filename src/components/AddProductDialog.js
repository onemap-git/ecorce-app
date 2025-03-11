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

export default function AddProductDialog({ open, onClose, onProductSelect }) {
  // mode can be "select" (choose an existing product) or "manual" (add new)
  const [mode, setMode] = useState('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);

  // State for manual product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    price: '',
    supplier: '' // <--- New field for supplier
  });
  const [loading, setLoading] = useState(false);

  // Fetch available products
  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    // Assuming manually added products are also available
    const q = query(productsRef, where('available', '==', true));
    const unsubscribe = onSnapshot(q, snapshot => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort so that manually added ones appear first
      prods.sort((a, b) => {
        if (a.manuallyAdded && !b.manuallyAdded) return -1;
        if (!a.manuallyAdded && b.manuallyAdded) return 1;
        return a.name.localeCompare(b.name);
      });
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  // Filter products based on search term (only used in select mode)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler for manual product submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare new product data; tag it as manually added
      const newProdData = {
        ...newProduct,
        price: parseFloat(newProduct.price) || 0,  // fallback to 0 if empty
        available: true,
        manuallyAdded: true
      };

      // Add the product to Firestore
      const docRef = await addDoc(collection(firestore, 'products'), newProdData);
      const createdProduct = { id: docRef.id, ...newProdData };

      // Pass the new product to the parent so it can be added to the order
      onProductSelect(createdProduct);

      // Reset the manual form and mode
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
          // Manual entry form
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

            {/* Code is now NOT mandatory, so removed 'required' */}
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

            {/* New dropdown for selecting a supplier */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Fournisseur</InputLabel>
              <Select
                label="Fournisseur"
                value={newProduct.supplier}
                onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                required
              >
                {/* Example static items; replace with dynamic data if needed */}
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

      {/* Only show these DialogActions in 'select' mode */}
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
