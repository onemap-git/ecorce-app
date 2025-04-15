// src/components/DeliveredOrderCard.js
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { exportDeliveryBillPDF } from '../utils/pdfUtils';

export default function DeliveredOrderCard({ order }) {
  // Only fetching company info and address now; email comes from order.email
  const [address, setAddress] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const fetchPartnerInfo = async () => {
      try {
        const partnersRef = collection(firestore, 'res_partner');
        const qPartners = query(partnersRef, where('email', '==', order.email));
        const querySnapshot = await getDocs(qPartners);

        if (!querySnapshot.empty) {
          const partnerData = querySnapshot.docs[0].data();
          setAddress(partnerData.contact_address_complete || '');
          setCompanyName(partnerData.company_name || '');
        }
      } catch (error) {
        console.error('Error fetching address/company info', error);
      }
    };
    fetchPartnerInfo();
  }, [order.email]);

  // 1) Compute total cost
  const totalCost = (order.items || []).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const printBill = () => {
    exportDeliveryBillPDF(order, companyName, address);
  };

  return (
    <Paper sx={{ mb: 2, p: 2, backgroundColor: '#f7f7f7' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        ID de commande: {order.id}
      </Typography>
      {/* Display company info */}
      {companyName && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Compagnie: {companyName}
        </Typography>
      )}
      <Typography variant="body2" sx={{ mb: 1 }}>
        Courriel: {order.email}
      </Typography>
      {address && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Adresse: {address}
        </Typography>
      )}
      <Typography variant="body2">
        Livré le:{' '}
        {order.deliveredAt ? order.deliveredAt.toDate().toLocaleString() : 'N/A'}
      </Typography>

      {/* Web Interface: Items in columns */}
      {(order.items && order.items.length > 0) && (
        <Box sx={{ mt: 2 }}>
          {/* Header Row */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid #ccc', pb: 1, mb: 1 }}>
            <Box sx={{ flex: 1, fontWeight: 'bold' }}>ID</Box>
            <Box sx={{ flex: 3, fontWeight: 'bold' }}>Nom</Box>
            <Box sx={{ flex: 1, fontWeight: 'bold', textAlign: 'right' }}>Quantitée</Box>
            <Box sx={{ flex: 1, fontWeight: 'bold', textAlign: 'right' }}>Prix</Box>
          </Box>
          {/* Data Rows */}
          {order.items.map(item => (
            <Box key={item.id} sx={{ display: 'flex', borderBottom: '1px dashed #ccc', pb: 1, mb: 1 }}>
              <Box sx={{ flex: 1 }}>{item.id}</Box>
              <Box sx={{ flex: 3 }}>{item.name}</Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>{item.quantity}</Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                ${parseFloat(item.price).toFixed(2)}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Show total cost in the UI as well */}
      <Typography
        variant="body2"
        sx={{ textAlign: 'right', mt: 2, fontWeight: 'bold' }}
      >
        Total: ${totalCost.toFixed(2)}
      </Typography>

      {/* If signature, show it in the UI */}
      {order.signature && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2"><strong>Signature:</strong></Typography>
          <Box
            component="img"
            src={order.signature}
            alt="Signature"
            sx={{ maxWidth: 200, border: '1px solid #ccc', p: 0.5, borderRadius: 1 }}
          />
        </Box>
      )}

      <Button variant="contained" onClick={printBill} sx={{ mt: 2 }}>
        Imprimer le bon de livraison
      </Button>
    </Paper>
  );
}
