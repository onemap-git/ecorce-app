// src/components/ProductsManager.js
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Container, Typography, Box, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import FilterBar from './FilterBar';
import ProductEditDialog from './ProductEditDialog';
import AddProductDialog from './AddProductDialog';
import CanadawideUploadDialog from './CanadawideUploadDialog';

export default function ProductsManager({ user }) {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [bioOnly, setBioOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [canadawideUploadOpen, setCanadawideUploadOpen] = useState(false);

  // Fetch all products (admins see everything)
  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, [refreshToggle]);

  // Prepare filter options
  const distinctCategories = Array.from(new Set(products.map(p => p.category))).sort();
  const distinctSuppliers = Array.from(new Set(products.map(p => p.supplier))).sort();
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSupplier = selectedSupplier ? product.supplier === selectedSupplier : true;
    const matchesBio = bioOnly ? product.bio === true : true;
    return matchesSearch && matchesCategory && matchesSupplier && matchesBio;
  });

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleDialogClose = () => {
    setSelectedProduct(null);
  };

  const handleProductSave = async (updatedProduct) => {
    try {
      await updateDoc(doc(firestore, 'products', updatedProduct.id), updatedProduct);
      setRefreshToggle(!refreshToggle);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleAddProduct = (product) => {
    // When a new product is added, refresh list and close the dialog
    setRefreshToggle(!refreshToggle);
    setAddDialogOpen(false);
  };

  return (
    <Container sx={{ pt: 4, pb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gestionnaire de produits
      </Typography>
      {/* Add New Product and Upload Canadawide buttons */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={() => setAddDialogOpen(true)}>
            Ajouter un nouveau produit
        </Button>
        <Button variant="contained" color="secondary" onClick={() => setCanadawideUploadOpen(true)}>
            Upload canadawide
        </Button>
      </Box>
      <FilterBar
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
      />
      <Box sx={{ mt: 2 }}>
        {filteredProducts.length === 0 ? (
          <Typography>Aucun produit trouvé.</Typography>
        ) : (
          <List>
            {filteredProducts.map(product => (
              <React.Fragment key={product.id}>
                <ListItem button onClick={() => handleProductClick(product)}>
                  <ListItemText
                    primary={product.name}
                    secondary={`Code: ${product.code || '-'} | Prix: $${parseFloat(product.price).toFixed(2)} | Disponible: ${product.available ? 'Oui' : 'Non'}`}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
      {selectedProduct && (
        <ProductEditDialog
          open={Boolean(selectedProduct)}
          product={selectedProduct}
          onClose={handleDialogClose}
          onSave={handleProductSave}
        />
      )}
      {/* Dialog for adding a new product */}
      {addDialogOpen && (
        <AddProductDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onProductSelect={handleAddProduct}
          defaultMode="manual"
        />
      )}
      <CanadawideUploadDialog
        open={canadawideUploadOpen}
        onClose={() => setCanadawideUploadOpen(false)}
      />
    </Container>
  );
}
