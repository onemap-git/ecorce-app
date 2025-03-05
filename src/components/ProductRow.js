// ProductRow.js
import React, { useState } from 'react';
import { TableRow, TableCell, TextField, Button } from '@mui/material';
import { formatPrice } from '../utils/formatPrice';


function ProductRow({ product, addToBasket, style, columnWidths }) {
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    console.log('[ProductRow] No product found for this row. Possibly out of range?');
    return null;
  }

  const handleAdd = () => {
    console.log(`[ProductRow] handleAdd: productId=${product.id}, quantity=${quantity}`);
    addToBasket(product, parseInt(quantity, 10));
    setQuantity(1);
  };

  return (
    <TableRow style={style}>
      <TableCell sx={{ width: columnWidths.name }}>{product.name}</TableCell>
      <TableCell sx={{ width: columnWidths.category }}>{product.category}</TableCell>
      <TableCell sx={{ width: columnWidths.bio }}>{product.bio ? "Yes" : "No"}</TableCell>
      <TableCell sx={{ width: columnWidths.price }}>${formatPrice(product.price)}</TableCell>
      <TableCell sx={{ width: columnWidths.quantity }}>
        <TextField
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          inputProps={{ min: 1 }}
          size="small"
          sx={{ width: '60px' }}
        />
      </TableCell>
      <TableCell sx={{ width: columnWidths.add }}>
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default ProductRow;
