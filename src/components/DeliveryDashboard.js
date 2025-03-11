// src/components/DeliveryDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  setDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { firestore, storage } from '../firebase';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Logo from '../logo.png';
import DeliveredOrderCard from './DeliveryOrderCard';

// Helper to compute week code (e.g., "07-2025")
function getWeekCode(date) {
  const target = new Date(date);
  const dayNr = (target.getDay() + 6) % 7; // Monday=0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const weekNumber = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  return `${weekNumber < 10 ? '0' + weekNumber : weekNumber}-${target.getFullYear()}`;
}

// Generate multi-page PDF of aggregated items
function exportAggregatedPDF(aggregatedItemsArray, currentWeek, supplierLabel) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Aggregated Products - Week ${currentWeek}`, 14, 20);
  doc.setFontSize(12);
  if (supplierLabel) {
    doc.text(`Supplier: ${supplierLabel}`, 14, 30);
  }

  const columns = [
    { header: 'ID - Name', dataKey: 'name' },
    { header: 'Qty', dataKey: 'quantity' },
    { header: 'Price', dataKey: 'price' },
    { header: 'Line Total', dataKey: 'total' }
  ];

  const rows = aggregatedItemsArray.map(item => ({
    name: `ID: ${item.id} - ${item.name}`,
    quantity: item.quantity,
    price: `$${parseFloat(item.price).toFixed(2)}`,
    total: `$${(item.price * item.quantity).toFixed(2)}`
  }));

  autoTable(doc, {
    startY: 40,
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => row[col.dataKey])),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    margin: { horizontal: 14 }
  });

  doc.save(`aggregated_products_week_${currentWeek}${supplierLabel ? `_${supplierLabel}` : ''}.pdf`);
}

/**
 * Component for an active order (not delivered yet).
 * Displays items, plus company info from `res_partner`.
 */
const OrderCard = ({ order, onMarkDelivered, onOpenSignaturePad, onQuantityChange }) => {
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

  return (
    <Paper sx={{ mb: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        Order ID: {order.id}
      </Typography>
      {/* Display partner info (company, email, address) */}
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
        {order.items?.map((item) => (
          <Box key={item.id} sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Item name */}
              <Typography sx={{ flex: 1 }}>{item.name}</Typography>
              {/* New supplier column */}
              <Typography sx={{ flex: 1 }}>
                {item.supplier || 'N/A'}
              </Typography>
              {/* Price */}
              <Typography sx={{ width: '80px', textAlign: 'right' }}>
                ${parseFloat(item.price).toFixed(2)}
              </Typography>
              {/* Quantity */}
              <TextField
                type="number"
                size="small"
                value={item.quantity}
                onChange={(e) => onQuantityChange(order.id, item.id, e.target.value)}
                sx={{ width: '60px', textAlign: 'right' }}
                inputProps={{
                  style: { textAlign: 'right' },
                  min: 0,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
              />
            </Box>
            {item.comment && (
              <Typography variant="body2" sx={{ ml: 2, color: 'grey.600' }}>
                Comment: {item.comment}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={() => onMarkDelivered(order.id)}
          disabled={!order.signature}
        >
          Mark Delivered
        </Button>
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
};

function DeliveryDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [sigPadOpen, setSigPadOpen] = useState(null); // ID of order being signed
  const sigPadRef = useRef(null);
  const printRef = useRef(null);
  const currentWeek = getWeekCode(new Date());

  // For supplier invoices
  const [supplierInvoiceUrl, setSupplierInvoiceUrl] = useState({});

  // 1) Fetch orders for current week
  useEffect(() => {
    const wc = getWeekCode(new Date());
    const ordersRef = collection(firestore, 'orders');
    const qOrders = query(ordersRef, where('weekCode', '==', wc));
    const unsub = onSnapshot(qOrders, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data);
    });
    return () => unsub();
  }, []);

  // 2) Aggregate items by supplier
  const aggregatedBySupplier = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const supplier = item.supplier || 'Unknown';
        if (!aggregatedBySupplier[supplier]) {
          aggregatedBySupplier[supplier] = {};
        }
        if (!aggregatedBySupplier[supplier][item.id]) {
          aggregatedBySupplier[supplier][item.id] = { ...item };
        } else {
          aggregatedBySupplier[supplier][item.id].quantity += item.quantity;
        }
      });
    }
  });

  // 3) Check if there's an uploaded invoice in Firestore for each supplier
  useEffect(() => {
    const loadAllSupplierInvoices = async () => {
      for (const supplier of Object.keys(aggregatedBySupplier)) {
        const docId = `${currentWeek}_${supplier}`;
        const invoiceDocRef = doc(firestore, 'delivery_invoices', docId);
        const snapshot = await getDoc(invoiceDocRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.invoiceUrl) {
            setSupplierInvoiceUrl((prev) => ({
              ...prev,
              [supplier]: data.invoiceUrl
            }));
          }
        }
      }
    };
    loadAllSupplierInvoices();
  }, [currentWeek, aggregatedBySupplier]);

  // 4) Checklist logic
  const [checklist, setChecklist] = useState({});
  useEffect(() => {
    const wc = getWeekCode(new Date());
    const checklistRef = collection(firestore, 'delivery_checklist');
    const qC = query(checklistRef, where('weekCode', '==', wc));
    const unsub = onSnapshot(qC, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        data[d.productId] = { id: docSnap.id, ...d };
      });
      setChecklist(data);
    });
    return () => unsub();
  }, []);

  const toggleCollected = async (productId) => {
    const wc = getWeekCode(new Date());
    if (checklist[productId]) {
      const newStatus = !checklist[productId].collected;
      try {
        await updateDoc(doc(firestore, 'delivery_checklist', checklist[productId].id), {
          collected: newStatus,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating checklist', error);
      }
    } else {
      try {
        const newDocRef = doc(collection(firestore, 'delivery_checklist'));
        await setDoc(newDocRef, {
          weekCode: wc,
          productId,
          collected: true,
          collectedQuantity: 0,
          newPrice: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error creating checklist document', error);
      }
    }
  };

  const updateChecklistField = async (productId, field, value) => {
    const wc = getWeekCode(new Date());
    const numericValue = parseFloat(value) || 0;
    if (checklist[productId]) {
      try {
        await updateDoc(doc(firestore, 'delivery_checklist', checklist[productId].id), {
          [field]: numericValue,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating checklist field', error);
      }
    } else {
      try {
        const newDocRef = doc(collection(firestore, 'delivery_checklist'));
        await setDoc(newDocRef, {
          weekCode: wc,
          productId,
          collected: false,
          collectedQuantity: field === 'collectedQuantity' ? numericValue : 0,
          newPrice: field === 'newPrice' ? numericValue : 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error creating checklist document', error);
      }
    }
  };

  // 5) Active vs. delivered orders
  const handleQuantityChange = async (orderId, itemId, newQty) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: parseInt(newQty, 10) || 0 };
      }
      return item;
    });
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        items: updatedItems,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating quantity', err);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        deliveryStatus: 'delivered',
        deliveredAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error marking as delivered', err);
    }
  };

  // 6) Signature pad
  const openSignaturePad = (orderId) => {
    setSigPadOpen(orderId);
  };
  const clearSignature = () => {
    sigPadRef.current?.clear();
  };
  const saveSignature = async () => {
    if (!sigPadRef.current) return;
    const orderId = sigPadOpen;
    const signatureDataUrl = sigPadRef.current.toDataURL('image/png');
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        signature: signatureDataUrl,
        updatedAt: serverTimestamp()
      });
      setSigPadOpen(null);
    } catch (err) {
      console.error('Error saving signature', err);
    }
  };

  // 7) Separate orders
  const activeOrders = orders.filter(order => order.deliveryStatus !== 'delivered');
  const deliveredOrders = orders.filter(order => order.deliveryStatus === 'delivered');

  // 8) PDF Export per supplier
  const handleExportPDF = (supplier) => {
    const itemsObj = aggregatedBySupplier[supplier] || {};
    const itemsArray = Object.values(itemsObj);
    exportAggregatedPDF(itemsArray, currentWeek, supplier);
  };

  // 9) Auto-upload invoices
  const handleInvoiceFileChangeAndUpload = async (supplier, file) => {
    try {
      const invoiceRef = ref(storage, `invoices/${currentWeek}/${supplier}/${file.name}`);
      const uploadTask = uploadBytesResumable(invoiceRef, file);
      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          console.error('Upload error:', error);
          alert('Error uploading invoice');
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const docId = `${currentWeek}_${supplier}`;
          await setDoc(
            doc(firestore, 'delivery_invoices', docId),
            {
              weekCode: currentWeek,
              invoiceUrl: downloadURL,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
          setSupplierInvoiceUrl((prev) => ({
            ...prev,
            [supplier]: downloadURL
          }));
        }
      );
    } catch (err) {
      console.error('Error uploading invoice', err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Delivery Dashboard
      </Typography>
      <Typography variant="body1" gutterBottom>
        Orders for week: {currentWeek}
      </Typography>

      {/* Aggregated Items, grouped by supplier */}
      <Box ref={printRef} sx={{ mt: 4, border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ ml: 2 }}>
            Aggregated Lists - Week {currentWeek}
          </Typography>
        </Box>
        {Object.keys(aggregatedBySupplier).length === 0 ? (
          <Typography>No aggregated products.</Typography>
        ) : (
          Object.keys(aggregatedBySupplier).map((supplier) => {
            const itemsObj = aggregatedBySupplier[supplier];
            const itemsArray = Object.values(itemsObj);
            return (
              <Paper key={supplier} sx={{ mb: 2, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Supplier: {supplier}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => handleExportPDF(supplier)}
                  sx={{ mb: 2 }}
                >
                  Export PDF
                </Button>
                {/* Image upload area - auto-upload, small preview */}
                <Box sx={{ mb: 2 }}>
                  {supplierInvoiceUrl[supplier] ? (
                    // If there's already an uploaded invoice, show a small preview
                    <Box
                      onClick={() => {
                        document.getElementById(`invoice-input-${supplier}`).click();
                      }}
                      sx={{ cursor: 'pointer', display: 'inline-block' }}
                    >
                      <img
                        src={supplierInvoiceUrl[supplier]}
                        alt={`Invoice for ${supplier}`}
                        style={{ maxHeight: 80, width: 'auto' }}
                      />
                      <Typography variant="body2" color="primary">
                        Click to replace invoice
                      </Typography>
                    </Box>
                  ) : (
                    // Otherwise, prompt to upload
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={() => {
                        document.getElementById(`invoice-input-${supplier}`).click();
                      }}
                    >
                      Click to upload invoice
                    </Typography>
                  )}
                  {/* Hidden file input triggers immediate upload */}
                  <input
                    id={`invoice-input-${supplier}`}
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleInvoiceFileChangeAndUpload(supplier, e.target.files[0]);
                        // Reset file input so user can re-select the same file if needed
                        e.target.value = null;
                      }
                    }}
                  />
                </Box>
                {/* Aggregated table for items */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 1,
                    fontWeight: 'bold',
                    borderBottom: '1px solid #ccc',
                    pb: 1
                  }}
                >
                  <Typography sx={{ flex: 1 }}>ID - Name</Typography>
                  <Typography sx={{ flex: 1 }}>Qty</Typography>
                  <Typography>Coll.</Typography>
                  <Typography sx={{ width: '80px', textAlign: 'center' }}>
                    Collected
                  </Typography>
                  <Typography sx={{ width: '80px', textAlign: 'center' }}>
                    New Price
                  </Typography>
                  <Typography sx={{ width: '80px', textAlign: 'right' }}>
                    Orig
                  </Typography>
                </Box>
                {itemsArray.map(item => (
                  <Box
                    key={item.id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}
                  >
                    <Typography sx={{ flex: 1 }}>
                      {`ID: ${item.id} - ${item.name}`}
                    </Typography>
                    <Typography sx={{ width: '60px', textAlign: 'right' }}>
                      {item.quantity}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist[item.id]?.collected || false}
                          onChange={() => toggleCollected(item.id)}
                        />
                      }
                      label=""
                      sx={{ mr: 0 }}
                    />
                    <TextField
                      label="Collected"
                      type="number"
                      size="small"
                      value={
                        checklist[item.id]?.collectedQuantity !== undefined
                          ? checklist[item.id].collectedQuantity
                          : ''
                      }
                      onChange={(e) =>
                        updateChecklistField(item.id, 'collectedQuantity', e.target.value)
                      }
                      sx={{ width: '80px', textAlign: 'right' }}
                      inputProps={{
                        min: 0,
                        style: { textAlign: 'right' },
                        inputMode: 'numeric',
                        pattern: '[0-9]*'
                      }}
                    />
                    <TextField
                      label="New Price"
                      type="number"
                      size="small"
                      value={
                        checklist[item.id]?.newPrice !== undefined
                          ? checklist[item.id].newPrice
                          : ''
                      }
                      onChange={(e) =>
                        updateChecklistField(item.id, 'newPrice', e.target.value)
                      }
                      sx={{ width: '100px', textAlign: 'right' }}
                      inputProps={{
                        min: 0,
                        style: { textAlign: 'right' },
                        inputMode: 'numeric',
                        pattern: '[0-9]*'
                      }}
                    />
                    <Typography sx={{ width: '80px', textAlign: 'right' }}>
                      ${parseFloat(item.price).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            );
          })
        )}
      </Box>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Deliveries
      </Typography>

      {/* ACTIVE ORDERS */}
      {activeOrders.length === 0 ? (
        <Typography>No active orders for this week.</Typography>
      ) : (
        activeOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onMarkDelivered={markAsDelivered}
            onOpenSignaturePad={openSignaturePad}
            onQuantityChange={handleQuantityChange}
          />
        ))
      )}

      {/* DELIVERED ORDERS */}
      {deliveredOrders.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Delivered Orders
          </Typography>
          {deliveredOrders.map(order => (
            <DeliveredOrderCard key={order.id} order={order} />
          ))}
        </>
      )}

      {/* Signature Pad Overlay */}
      {sigPadOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Signature
            </Typography>
            <SignatureCanvas
              ref={sigPadRef}
              penColor="black"
              canvasProps={{ width: 400, height: 200, className: 'sigCanvas' }}
              backgroundColor="#eee"
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={clearSignature}>
                Clear
              </Button>
              <Button variant="contained" onClick={saveSignature}>
                Save Signature
              </Button>
              <Button variant="text" onClick={() => setSigPadOpen(null)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default DeliveryDashboard;
