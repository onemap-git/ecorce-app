// src/components/OrderCard.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { exportDeliveryBillPDF } from '../utils/pdfUtils';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button
} from '@mui/material';

export default function OrderCard({
  order,
  onMarkDelivered,
  onOpenSignaturePad,
  onQuantityChange,
  onAddProduct,
  onRefuseItem
}) {
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
        console.error('Error fetching partner info', error);
      }
    };
    fetchPartnerInfo();
  }, [order.email]);

  const totalCost = (order.items || []).reduce(
    (acc, item) => acc + (item.refused ? 0 : item.price * item.quantity),
    0
  );

  const printBill = () => {
    exportDeliveryBillPDF(order, companyName, address);
  };

  return (
    <Paper sx={{ mb: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        Order ID: {order.id}
      </Typography>

      {companyName && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Company: {companyName}
        </Typography>
      )}

      <Typography variant="body2" sx={{ mb: 1 }}>
        Email: {order.email}
      </Typography>

      {address && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Address: {address}
        </Typography>
      )}

      <Typography variant="body2">
        Delivery Status: {order.deliveryStatus || 'N/A'}
      </Typography>

      <Box sx={{ mt: 2 }}>
        {[...(order.items || [])]
          // Sort alphabetically by item name
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <Box key={item.id} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {/* Item name */}
                <Typography sx={{ flex: 1 }}>{item.name}</Typography>

                {/* Supplier */}
                <Typography sx={{ flex: 1 }}>
                  {item.supplier || 'N/A'}
                </Typography>

                {/* Price (not editable, just displayed) */}
                <Typography sx={{ width: '80px', textAlign: 'right' }}>
                  ${parseFloat(item.price).toFixed(2)}
                </Typography>

                {/* Quantity field: numeric-friendly for mobile */}
                <TextField
                  type="number"
                  size="small"
                  value={item.quantity}
                  onChange={(e) => onQuantityChange(order.id, item.id, e.target.value)}
                  sx={{
                    width: { xs: '50px', sm: '60px' },
                    textAlign: 'right',
                  }}
                  inputProps={{
                    style: { textAlign: 'right' },
                    min: 0,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
                
                {/* Refuse button */}
                <Button 
                  variant="outlined" 
                  color="error"
                  size="small"
                  onClick={() => onRefuseItem(order.id, item)}
                  disabled={item.refused}
                  sx={{ ml: 1 }}
                >
                  {item.refused ? 'Refusé' : 'Refuser'}
                </Button>
              </Box>

              {/* Optional comment */}
              {item.comment && (
                <Typography variant="body2" sx={{ ml: 2, color: 'grey.600' }}>
                  Comment: {item.comment}
                </Typography>
              )}
            </Box>
          ))}
      </Box>

      {/* 2) Show total cost at bottom */}
      <Typography
        variant="body2"
        sx={{ textAlign: 'right', mt: 2, fontWeight: 'bold' }}
      >
        Total: ${totalCost.toFixed(2)}
      </Typography>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => onMarkDelivered(order.id)}
          disabled={!order.signature}
        >
          Mark Delivered
        </Button>

        <Button variant="contained" onClick={printBill}>
          Imprimer le bon de livraison
        </Button>

        <Button variant="contained" onClick={() => onAddProduct(order.id)}>
          Ajouter un produit
        </Button>

        {/* If there's a signature, show it; otherwise show the capture button */}
        {order.signature ? (
          <Box
            sx={{
              border: '1px solid #ccc',
              p: 1,
              maxWidth: 200,
              maxHeight: 100,
              overflow: 'hidden'
            }}
          >
            <img
              src={order.signature}
              alt="Signature"
              style={{ width: '100%', height: 'auto' }}
            />
          </Box>
        ) : (
          <Button variant="outlined" onClick={() => onOpenSignaturePad(order.id)}>
            Capture Signature
          </Button>
        )}
      </Box>
    </Paper>
  );
}
