// src/components/ResponsiveProductsView.js
import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { List, ListItem, ListItemText, Box, Typography, Button } from '@mui/material';
// Import your existing VirtualizedProductsTable:
import VirtualizedProductsTable from './VirtualizedProductsTable';

/**
 * A simple card-like list for mobile screens.
 * You can customize how many fields to display, 
 * e.g., category, supplier, etc.
 */
function MobileProductsList({ products, addToBasket }) {
  return (
    <List>
      {products.map((product) => (
        <ListItem 
          key={product.id} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            borderBottom: '1px solid #eee'
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {product.name}
          </Typography>
          
          {/* Example: Show Price and maybe Category */}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Price: ${product.price?.toFixed(2)}
          </Typography>
          {product.category && (
            <Typography variant="body2" sx={{ color: 'grey.600' }}>
              Category: {product.category}
            </Typography>
          )}
          
          {/* "Add to Basket" button */}
          <Box sx={{ mt: 1 }}>
            <Button 
              variant="contained" 
              onClick={() => addToBasket(product, 1)}
            >
              Ajouter
            </Button>
          </Box>
        </ListItem>
      ))}
    </List>
  );
}

/**
 * A wrapper that detects if we're on a small screen:
 * - If yes, render the mobile list
 * - If no, render the VirtualizedProductsTable
 */
export default function ResponsiveProductsView({ products, addToBasket }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    // Card/list layout for mobile
    return <MobileProductsList products={products} addToBasket={addToBasket} />;
  } else {
    // Original table for larger screens
    return <VirtualizedProductsTable products={products} addToBasket={addToBasket} />;
  }
}
