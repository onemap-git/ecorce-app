import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';
import OrderCard from './OrderCard';
import DeliveredOrderCard from './DeliveredOrderCard';
import { getWeekCode, getHumanReadableWeek, getDateFromWeekCode } from '../utils/dateUtils';

export default function OrderHistoryByWeek({ user, isAdmin }) {
  const [orders, setOrders] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekCode(new Date()));
  const [availableWeeks, setAvailableWeeks] = useState([]);

  useEffect(() => {
    const ordersRef = collection(firestore, 'orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const weeks = new Set();
      ordersData.forEach(order => {
        if (order.weekCode) {
          weeks.add(order.weekCode);
        }
      });
      setAvailableWeeks(Array.from(weeks).sort().reverse()); // Most recent first
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;

    const ordersRef = collection(firestore, 'orders');
    const q = query(ordersRef, where('weekCode', '==', selectedWeek));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });
    return () => unsubscribe();
  }, [selectedWeek]);

  const handleWeekChange = (event) => {
    setSelectedWeek(event.target.value);
  };

  const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'delivered');
  const sortedActiveOrders = [...activeOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  const sortedDeliveredOrders = [...deliveredOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Historique des commandes
      </Typography>
      <Link component={RouterLink} to="/delivery" sx={{ display: 'block', mb: 3 }}>
        Retour au tableau de bord des livraisons
      </Link>

      {/* Week selector dropdown */}
      <FormControl fullWidth sx={{ mb: 4 }}>
        <InputLabel id="week-select-label">Sélectionner une semaine</InputLabel>
        <Select
          labelId="week-select-label"
          id="week-select"
          value={selectedWeek}
          label="Sélectionner une semaine"
          onChange={handleWeekChange}
        >
          {availableWeeks.map((week) => (
            <MenuItem key={week} value={week}>
              {getHumanReadableWeek(getDateFromWeekCode(week))} (Code: {week})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Display orders for the selected week */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Commandes actives
      </Typography>

      {sortedActiveOrders.length === 0 ? (
        <Typography sx={{ mb: 4 }}>Aucune commande active pour cette semaine.</Typography>
      ) : (
        <Box sx={{ mb: 4 }}>
          {sortedActiveOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onMarkDelivered={() => {}} // Read-only view
              onOpenSignaturePad={() => {}} // Read-only view
              onQuantityChange={() => {}} // Read-only view
              onAddProduct={() => {}} // Read-only view
              onRefuseItem={() => {}} // Read-only view
            />
          ))}
        </Box>
      )}

      {/* Delivered orders */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Commandes livrées
      </Typography>

      {sortedDeliveredOrders.length === 0 ? (
        <Typography>Aucune commande livrée pour cette semaine.</Typography>
      ) : (
        sortedDeliveredOrders.map(order => (
          <DeliveredOrderCard key={order.id} order={order} />
        ))
      )}
    </Container>
  );
}
