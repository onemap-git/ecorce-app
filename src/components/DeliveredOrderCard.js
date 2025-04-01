// src/components/DeliveredOrderCard.js
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// <-- NEW: import your local logo
import logo from '../logo.png';

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
    const doc = new jsPDF();

    // 2) Insert the logo at top-left corner
    //    x=10, y=10, width=30, height auto (approx)
    doc.addImage(logo, 'PNG', 10, 10, 30, 0);

    // Optionally, add a horizontal line across the page, same as aggregator
    doc.setLineWidth(0.5);
    doc.line(10, 25, 200, 25);

    // 3) Add main title or text, after the line
    let startY = 35; // move content down
    doc.setFontSize(16);
    doc.text('Delivery Bill', 14, startY);
    startY += 10;

    // Additional info (order ID, date, etc.)
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 14, startY);
    startY += 8;

    const deliveredOn = order.deliveredAt
      ? order.deliveredAt.toDate().toLocaleString()
      : 'N/A';
    doc.text(`Delivered on: ${deliveredOn}`, 14, startY);
    startY += 10;

    if (companyName) {
      doc.text(`Company: ${companyName}`, 14, startY);
      startY += 8;
    }

    doc.text(`Email: ${order.email}`, 14, startY);
    startY += 8;

    if (address) {
      doc.text(`Address: ${address}`, 14, startY);
      startY += 10;
    }

    // PDF table with four columns: ID, Name, Quantity, and Price
    const tableColumns = ['ID', 'Name', 'Quantity', 'Price'];
    const tableRows = (order.items || []).map(item => [
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
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // If there's a signature, place it below the table
    let finalY = doc.lastAutoTable.finalY || startY;
    if (order.signature) {
      doc.text('Signature:', 14, finalY + 15);
      doc.addImage(order.signature, 'PNG', 14, finalY + 20, 60, 30);
      finalY += 45; // enough space for the signature
    } else {
      finalY = finalY + 10; // small gap
    }

    // Optionally, show total cost below the table
    doc.setFontSize(12);
    doc.setFont('', 'bold');
    doc.text(`Total: $${totalCost.toFixed(2)}`, 14, finalY + 10);

    // 4) Save the PDF
    doc.save(`delivery_bill_order_${order.id}.pdf`);
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
