// src/components/OrderHistory.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Link as RouterLink } from 'react-router-dom';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';
import { Container, Typography, Link, Paper, Box, Chip } from '@mui/material';

function OrderHistory({ user }) {
  const [orders, setOrders] = useState([]);
  const { getFinalPrice } = usePricing();

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

  const getStatusColor = (status) => {
    if (status === 'delivered') return 'success';
    if (status === 'being delivered') return 'warning';
    return 'default';
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Historique des commandes
      </Typography>
      <Link component={RouterLink} to="/">
        Retour aux produits
      </Link>
      {orders.length === 0 ? (
        <Typography sx={{ mt: 2 }}>Aucune commande trouvée.</Typography>
      ) : (
        orders.map(order => {
          // Compute total cost using margin-adjusted prices for each item
          const totalCost = (order.items || []).reduce((acc, item) => {
            const finalPrice = getFinalPrice(item.price);
            return acc + finalPrice * item.quantity;
          }, 0);

          return (
            <Paper key={order.id} sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                ID de commande: {order.id}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong>{' '}
                {order.createdAt ? order.createdAt.toDate().toLocaleString() : 'N/A'}
              </Typography>
              {order.deliveryStatus && (
                <Box sx={{ my: 1 }}>
                  <Chip label={order.deliveryStatus} color={getStatusColor(order.deliveryStatus)} />
                </Box>
              )}
              {order.deliveryStatus === 'delivered' && (
                <Typography variant="body2">
                  <strong>Date de livraison:</strong>{' '}
                  {order.deliveredAt ? order.deliveredAt.toDate().toLocaleString() : 'N/A'}
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Articles:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    borderBottom: '1px solid #ccc',
                    fontWeight: 'bold',
                    pb: 1,
                    mb: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>ID</Box>
                  <Box sx={{ flex: 2 }}>Name</Box>
                  <Box sx={{ width: 80, textAlign: 'right' }}>Quantity</Box>
                  <Box sx={{ width: 80, textAlign: 'right' }}>Price</Box>
                </Box>
                {[...(order.items || [])]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(item => {
                    const finalPrice = getFinalPrice(item.price);
                    return (
                      <Box key={item.id} sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 0.5,
                            borderBottom: '1px dashed #eee',
                          }}
                        >
                          <Box sx={{ flex: 1 }}>{item.id}</Box>
                          <Box sx={{ flex: 2 }}>{item.name}</Box>
                          <Box sx={{ width: 80, textAlign: 'right' }}>{item.quantity}</Box>
                          <Box sx={{ width: 80, textAlign: 'right' }}>
                            ${formatPrice(finalPrice)}
                          </Box>
                        </Box>
                        {item.comment && (
                          <Typography variant="body2" sx={{ ml: 2, color: 'grey.600', pt: 0.5 }}>
                            Commentaire: {item.comment}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'right', mt: 2, fontWeight: 'bold' }}>
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
