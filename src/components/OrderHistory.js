// src/components/OrderHistory.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Link,
  Paper,
  Box,
  Chip
} from '@mui/material';

function OrderHistory({ user }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const ordersRef = collection(firestore, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, snapshot => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Helper: Choose chip color based on order status
  const getStatusColor = (status) => {
    if (status === 'delivered') return 'success';
    if (status === 'being delivered') return 'warning';
    return 'default';
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Order History
      </Typography>
      <Link component={RouterLink} to="/">
        Back to Products
      </Link>

      {orders.length === 0 ? (
        <Typography sx={{ mt: 2 }}>No orders found.</Typography>
      ) : (
        orders.map(order => {
          // 1) Calculate total cost for each order
          const totalCost = (order.items || []).reduce(
            (acc, item) => acc + (item.price * item.quantity),
            0
          );

          return (
            <Paper key={order.id} sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Order ID: {order.id}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong>{' '}
                {order.createdAt ? order.createdAt.toDate().toLocaleString() : 'N/A'}
              </Typography>

              {/* Status Chip */}
              {order.deliveryStatus && (
                <Box sx={{ my: 1 }}>
                  <Chip
                    label={order.deliveryStatus}
                    color={getStatusColor(order.deliveryStatus)}
                  />
                </Box>
              )}

              {/* If delivered, show delivery date */}
              {order.deliveryStatus === 'delivered' && (
                <Typography variant="body2">
                  <strong>Delivery Date:</strong>{' '}
                  {order.deliveredAt ? order.deliveredAt.toDate().toLocaleString() : 'N/A'}
                </Typography>
              )}

              {/* Items table */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Items:
                </Typography>

                {/* Table header */}
                <Box
                  sx={{
                    display: 'flex',
                    borderBottom: '1px solid #ccc',
                    fontWeight: 'bold',
                    pb: 1,
                    mb: 1
                  }}
                >
                  <Box sx={{ flex: 1 }}>ID</Box>
                  <Box sx={{ flex: 2 }}>Name</Box>
                  <Box sx={{ width: 80, textAlign: 'right' }}>Quantity</Box>
                  <Box sx={{ width: 80, textAlign: 'right' }}>Price</Box>
                </Box>

                {/* Render each item (sorted alphabetically by name) */}
                {[...(order.items || [])]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(item => (
                    <Box key={item.id} sx={{ mb: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 0.5,
                          borderBottom: '1px dashed #eee'
                        }}
                      >
                        <Box sx={{ flex: 1 }}>{item.id}</Box>
                        <Box sx={{ flex: 2 }}>{item.name}</Box>
                        <Box sx={{ width: 80, textAlign: 'right' }}>{item.quantity}</Box>
                        <Box sx={{ width: 80, textAlign: 'right' }}>
                          ${parseFloat(item.price).toFixed(2)}
                        </Box>
                      </Box>

                      {item.comment && (
                        <Typography
                          variant="body2"
                          sx={{ ml: 2, color: 'grey.600', pt: 0.5 }}
                        >
                          Comment: {item.comment}
                        </Typography>
                      )}
                    </Box>
                  ))}
              </Box>

              {/* Optionally, show signature if available */}
              {order.signature && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2"><strong>Signature:</strong></Typography>
                  <Box
                    component="img"
                    src={order.signature}
                    alt="Signature"
                    sx={{ maxWidth: 200, border: '1px solid #ccc', p: 0.5, borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* 2) Show total cost for this order at the bottom */}
              <Typography
                variant="body2"
                sx={{ textAlign: 'right', mt: 2, fontWeight: 'bold' }}
              >
                Total: ${totalCost.toFixed(2)}
              </Typography>
            </Paper>
          );
        })
      )}
    </Container>
  );
}

export default OrderHistory;
