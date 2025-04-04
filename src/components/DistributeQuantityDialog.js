// src/components/DistributeQuantityDialog.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
} from '@mui/material';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';

const DistributeQuantityDialog = ({ open, product, orders, onClose }) => {
  // Create a state to hold updated quantities for each order (keyed by order id)
  const [quantities, setQuantities] = useState({});

  // When the dialog opens, initialize the quantities from the orders' items.
  useEffect(() => {
    if (open && product && orders) {
      const initial = {};
      orders.forEach((order) => {
        const item = order.items.find((it) => it.id === product.id);
        if (item) {
          initial[order.id] = item.quantity;
        }
      });
      setQuantities(initial);
    }
  }, [open, product, orders]);

  // Handle quantity change for an order
  const handleQuantityChange = (orderId, newQty) => {
    setQuantities((prev) => ({
      ...prev,
      [orderId]: newQty,
    }));
  };

  // On confirm, update all orders with the new quantity for the product
  const handleConfirm = async () => {
    const batchUpdates = [];
    for (const order of orders) {
      const itemIndex = order.items.findIndex((it) => it.id === product.id);
      if (itemIndex >= 0) {
        const currentQty = order.items[itemIndex].quantity;
        const newQty = parseInt(quantities[order.id], 10);
        if (newQty !== currentQty) {
          const updatedItems = [...order.items];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: newQty };
          batchUpdates.push(
            updateDoc(doc(firestore, 'orders', order.id), {
              items: updatedItems,
              updatedAt: serverTimestamp(),
            })
          );
        }
      }
    }
    try {
      await Promise.all(batchUpdates);
      onClose();
    } catch (error) {
      console.error('Error updating distributed quantities:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Distribuer pour {product?.name}</DialogTitle>
      <DialogContent dividers>
        {orders && orders.length > 0 ? (
          orders.map((order) => {
            const item = order.items.find((it) => it.id === product.id);
            if (!item) return null;
            return (
              <Box
                key={order.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px', // left = auto, right = fixed
                  alignItems: 'center',
                  gap: 2,
                  mb: 2,
                }}
              >
                {/* Left side: 2 lines for order ID and email */}
                <Box>
                  <Typography variant="body1">
                    Order {order.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.email || 'N/A'}
                  </Typography>
                </Box>

                {/* Right side: the quantity field */}
                <TextField
                  type="number"
                  size="small"
                  value={quantities[order.id] ?? item.quantity}
                  onChange={(e) => handleQuantityChange(order.id, e.target.value)}
                  inputProps={{ min: 0 }}
                />
              </Box>
            );
          })
        ) : (
          <Typography>Aucune commande trouvée pour ce produit.</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Annuler
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DistributeQuantityDialog;
