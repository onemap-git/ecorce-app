// src/components/DeliveredOrderCard.js
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DeliveredOrderCard = ({ order }) => {
  // Additional state for company info:
  const [address, setAddress] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

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
          setPartnerEmail(partnerData.email || '');
        }
      } catch (error) {
        console.error('Error fetching address/company info', error);
      }
    };
    fetchPartnerInfo();
  }, [order.email]);

  const printBill = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Delivery Bill', 14, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 14, 30);

    const deliveredOn = order.deliveredAt
      ? order.deliveredAt.toDate().toLocaleString()
      : 'N/A';
    doc.text(`Delivered on: ${deliveredOn}`, 14, 40);

    let startY = 50;

    // Company info
    if (companyName) {
      doc.text(`Company: ${companyName}`, 14, startY);
      startY += 8;
    }
    if (partnerEmail) {
      doc.text(`Email: ${partnerEmail}`, 14, startY);
      startY += 8;
    }
    if (address) {
      doc.text(`Address: ${address}`, 14, startY);
      startY += 10;
    }

    // PDF table with four columns: ID, Name, Quantity, and Price.
    const tableColumns = ['ID', 'Name', 'Quantity', 'Price'];
    const tableRows = order.items.map(item => [
      item.id,
      item.name,
      item.quantity.toString(),
      `$${parseFloat(item.price).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY,
      head: [tableColumns],
      body: tableRows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        2: { halign: 'right' }, // Right-align Quantity
        3: { halign: 'right' }  // Right-align Price
      }
    });

    // Add signature if available.
    if (order.signature) {
      const finalY = doc.lastAutoTable.finalY || startY;
      doc.text('Signature:', 14, finalY + 15);
      doc.addImage(order.signature, 'PNG', 14, finalY + 20, 60, 30);
    }

    doc.save(`delivery_bill_order_${order.id}.pdf`);
  };

  return (
    <Paper sx={{ mb: 2, p: 2, backgroundColor: '#f7f7f7' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        Order ID: {order.id}
      </Typography>

      {/* Display company info */}
      {companyName && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Company: {companyName}
        </Typography>
      )}
      {partnerEmail && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Email: {partnerEmail}
        </Typography>
      )}
      {address && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Address: {address}
        </Typography>
      )}

      <Typography variant="body2">
        Delivered on:{' '}
        {order.deliveredAt
          ? order.deliveredAt.toDate().toLocaleString()
          : 'N/A'}
      </Typography>

      {/* Web Interface: Items in columns */}
      {order.items && order.items.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {/* Header Row */}
          <Box
            sx={{
              display: 'flex',
              borderBottom: '1px solid #ccc',
              pb: 1,
              mb: 1
            }}
          >
            <Box sx={{ flex: 1, fontWeight: 'bold' }}>ID</Box>
            <Box sx={{ flex: 3, fontWeight: 'bold' }}>Name</Box>
            <Box sx={{ flex: 1, fontWeight: 'bold', textAlign: 'right' }}>
              Quantity
            </Box>
            <Box sx={{ flex: 1, fontWeight: 'bold', textAlign: 'right' }}>
              Price
            </Box>
          </Box>
          {/* Data Rows */}
          {order.items.map(item => (
            <Box
              key={item.id}
              sx={{ display: 'flex', borderBottom: '1px dashed #ccc', pb: 1, mb: 1 }}
            >
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

      {order.signature && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Signature:</strong>
          </Typography>
          <Box
            component="img"
            src={order.signature}
            alt="Signature"
            sx={{ maxWidth: 200, border: '1px solid #ccc', p: 0.5, borderRadius: 1 }}
          />
        </Box>
      )}

      <Button variant="contained" onClick={printBill} sx={{ mt: 2 }}>
        Print Delivery Bill
      </Button>
    </Paper>
  );
};

export default DeliveredOrderCard;
