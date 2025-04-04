// src/components/ResponsiveProductsView.js
import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { List, ListItem, Typography, Box, Button, TextField } from '@mui/material';
import VirtualizedProductsTable from './VirtualizedProductsTable';
import { usePricing } from '../contexts/PricingContext';    // <-- NEW
import { formatPrice } from '../utils/formatPrice';          // <-- NEW

function MobileProductsList({ products, addToBasket, basket }) {
  const { getFinalPrice } = usePricing();
  const [quantityMap, setQuantityMap] = useState({});

  const updateQuantity = (productId, value) => {
    setQuantityMap(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const getQuantity = (productId) => {
    return quantityMap[productId] || 1;
  };

  const handleAddToBasket = (product) => {
    const quantity = getQuantity(product.id);
    addToBasket(product, quantity);
    updateQuantity(product.id, 1);
  };

  return (
    <List>
      {products.map((product) => {
        const finalPrice = getFinalPrice(product.price);
        const displayPrice = formatPrice(finalPrice);
        const isInBasket = basket ? basket.some(item => item.id === product.id) : false;
        const quantity = getQuantity(product.id);

        return (
          <ListItem
            key={product.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              borderBottom: '1px solid #eee',
              backgroundColor: isInBasket ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {product.name}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Prix: ${displayPrice}
            </Typography>
            {product.category && (
              <Typography variant="body2" sx={{ color: 'grey.600' }}>
                Catégorie: {product.category}
              </Typography>
            )}
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                type="number"
                value={quantity}
                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1 }}
                size="small"
                sx={{ width: '60px' }}
              />
              <Button variant="contained" onClick={() => handleAddToBasket(product)}>
                Ajouter
              </Button>
            </Box>
          </ListItem>
        );
      })}
    </List>
  );
}

export default function ResponsiveProductsView({ products, addToBasket, basket }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileProductsList products={products} addToBasket={addToBasket} basket={basket} />;
  } else {
    return <VirtualizedProductsTable products={products} addToBasket={addToBasket} basket={basket} />;
  }
}
