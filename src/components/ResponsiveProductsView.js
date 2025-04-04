// src/components/ResponsiveProductsView.js
import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { List, ListItem, Typography, Box, Button } from '@mui/material';
import VirtualizedProductsTable from './VirtualizedProductsTable';
import { usePricing } from '../contexts/PricingContext';    // <-- NEW
import { formatPrice } from '../utils/formatPrice';          // <-- NEW

function MobileProductsList({ products, addToBasket }) {
  const { getFinalPrice } = usePricing();

  return (
    <List>
      {products.map((product) => {
        const finalPrice = getFinalPrice(product.price);
        const displayPrice = formatPrice(finalPrice);

        return (
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
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Prix: ${displayPrice}
            </Typography>
            {product.category && (
              <Typography variant="body2" sx={{ color: 'grey.600' }}>
                Catégorie: {product.category}
              </Typography>
            )}
            <Box sx={{ mt: 1 }}>
              <Button variant="contained" onClick={() => addToBasket(product, 1)}>
                Ajouter
              </Button>
            </Box>
          </ListItem>
        );
      })}
    </List>
  );
}

export default function ResponsiveProductsView({ products, addToBasket }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return <MobileProductsList products={products} addToBasket={addToBasket} />;
  } else {
    return <VirtualizedProductsTable products={products} addToBasket={addToBasket} />;
  }
}
