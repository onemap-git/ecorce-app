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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import Logo from '../logo.png';
import DeliveredOrderCard from './DeliveredOrderCard';
import AddProductDialog from './AddProductDialog';
import OrderCard from './OrderCard';
import { getWeekCode } from '../utils/dateUtils';
import { exportAggregatedPDF } from '../utils/pdfUtils';

function DeliveryDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [sigPadOpen, setSigPadOpen] = useState(null); // ID of order being signed
  const sigPadRef = useRef(null);
  const printRef = useRef(null);
  const currentWeek = getWeekCode(new Date());

  // For supplier invoices
  const [supplierInvoiceUrl, setSupplierInvoiceUrl] = useState({});

  // -----------------------------
  // Existing "Add Product" feature
  // -----------------------------
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [selectedOrderForProductAddition, setSelectedOrderForProductAddition] = useState(null);

  // -----------------------------
  // New "Replace Product" feature
  // -----------------------------
  // We'll reuse AddProductDialog in "replace" mode, then show a confirm dialog.
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [oldProductIdToReplace, setOldProductIdToReplace] = useState(null);

  // A second dialog to confirm the replacement
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingNewProduct, setPendingNewProduct] = useState(null);
  const [ordersAffectedCount, setOrdersAffectedCount] = useState(0);

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
  const activeOrders = orders.filter(order => order.deliveryStatus !== 'delivered');
  const deliveredOrders = orders.filter(order => order.deliveryStatus === 'delivered');

  // 7) Quantity update for order items
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

  // 8) Mark order as delivered
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

  // -----------------------------
  // Existing "Add Product to Order" Feature
  // -----------------------------
  const handleOpenAddProduct = (orderId) => {
    setSelectedOrderForProductAddition(orderId);
    setAddProductDialogOpen(true);
  };
  const handleCloseAddProduct = () => {
    setAddProductDialogOpen(false);
    setSelectedOrderForProductAddition(null);
  };
  const handleAddProductToOrder = async (orderId, product) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    let newItems = [];
    let found = false;
    if (order.items) {
      newItems = order.items.map(item => {
        if (item.id === product.id) {
          found = true;
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    } else {
      newItems = [];
    }
    if (!found) {
      newItems.push({ ...product, quantity: 1 });
    }
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        items: newItems,
        updatedAt: serverTimestamp()
      });
      console.log(`Product ${product.name} added to order ${orderId}`);
    } catch (error) {
      console.error('Error adding product to order', error);
    }
  };

  // -----------------------------
  // New "Replace Product" Feature
  // -----------------------------
  const handleOpenReplaceDialog = (oldProductId) => {
    setOldProductIdToReplace(oldProductId);
    setReplaceDialogOpen(true);
  };
  const handleCloseReplaceDialog = () => {
    setReplaceDialogOpen(false);
    setOldProductIdToReplace(null);
  };

  // Step 1: user picks new product in AddProductDialog -> confirm replacement
  const handleStartReplaceConfirmation = (newProduct) => {
    if (!oldProductIdToReplace) return;

    // Count how many orders would be changed
    let count = 0;
    orders.forEach(order => {
      const items = order.items || [];
      if (items.some(item => item.id === oldProductIdToReplace)) {
        count++;
      }
    });
    setOrdersAffectedCount(count);

    // We'll store newProduct in state, then show the confirmation dialog
    setPendingNewProduct(newProduct);

    // Close the replace product selection dialog
    setReplaceDialogOpen(false);

    // Open the final confirm dialog
    setReplaceConfirmOpen(true);
  };

  // Step 2: If user confirms, do the actual replacement
  const handleConfirmReplace = () => {
    if (!pendingNewProduct || !oldProductIdToReplace) return;
    handleReplaceProductInAllOrders(pendingNewProduct);
    setReplaceConfirmOpen(false);
    setPendingNewProduct(null);
  };

  // Step 2b: user cancels
  const handleCancelReplace = () => {
    setReplaceConfirmOpen(false);
    setPendingNewProduct(null);
    setOldProductIdToReplace(null);
  };

  /**
   * Actually replaces oldProductIdToReplace with newProduct across all relevant orders,
   * then re-aggregates local data so UI updates.
   */
  const handleReplaceProductInAllOrders = async (newProduct) => {
    let updatedCount = 0;
    const newOrdersState = orders.map(order => {
      const items = order.items || [];
      let changed = false;

      const updatedItems = items.map(item => {
        if (item.id === oldProductIdToReplace) {
          changed = true;
          return {
            ...item,
            id: newProduct.id,
            name: newProduct.name,
            price: newProduct.price,
            supplier: newProduct.supplier || 'Unknown'
          };
        }
        return item;
      });

      if (changed) {
        updatedCount++;
        // Update doc in Firestore
        updateDoc(doc(firestore, 'orders', order.id), {
          items: updatedItems,
          updatedAt: serverTimestamp()
        }).catch(err => {
          console.error(`Error updating order ${order.id}`, err);
        });
        return { ...order, items: updatedItems };
      }
      return order;
    });

    console.log(`Replaced product ${oldProductIdToReplace} with ${newProduct.id} in ${updatedCount} orders.`);

    // Update local orders state
    setOrders(newOrdersState);

    // Re-aggregate
    const reAggregated = {};
    newOrdersState.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const supplier = item.supplier || 'Unknown';
          if (!reAggregated[supplier]) {
            reAggregated[supplier] = {};
          }
          if (!reAggregated[supplier][item.id]) {
            reAggregated[supplier][item.id] = { ...item };
          } else {
            reAggregated[supplier][item.id].quantity += item.quantity;
          }
        });
      }
    });

    // Overwrite aggregatedBySupplier
    Object.keys(aggregatedBySupplier).forEach(k => delete aggregatedBySupplier[k]);
    Object.keys(reAggregated).forEach(sup => {
      aggregatedBySupplier[sup] = reAggregated[sup];
    });

    // Clear old product ID
    setOldProductIdToReplace(null);
  };

  // 9) PDF Export per supplier
  const handleExportPDF = (supplier) => {
    const itemsObj = aggregatedBySupplier[supplier] || {};
    const itemsArray = Object.values(itemsObj);
    exportAggregatedPDF(itemsArray, currentWeek, supplier);
  };

  // 10) Auto-upload invoices
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
                {/* Image upload area */}
                <Box sx={{ mb: 2 }}>
                  {supplierInvoiceUrl[supplier] ? (
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
                  <input
                    id={`invoice-input-${supplier}`}
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleInvoiceFileChangeAndUpload(supplier, e.target.files[0]);
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

                    {/* NEW: Replace button */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenReplaceDialog(item.id)}
                    >
                      Replace
                    </Button>
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
            onAddProduct={handleOpenAddProduct}
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

      {/* Existing "Add Product" Dialog */}
      <AddProductDialog
        open={addProductDialogOpen}
        onClose={handleCloseAddProduct}
        onProductSelect={(product) => {
          handleAddProductToOrder(selectedOrderForProductAddition, product);
          handleCloseAddProduct();
        }}
      />

      {/* NEW "Replace Product" Dialog (step 1: pick product) */}
      <AddProductDialog
        open={replaceDialogOpen}
        onClose={handleCloseReplaceDialog}
        onProductSelect={(product) => {
          handleStartReplaceConfirmation(product);
        }}
      />

      {/* Confirmation Dialog (step 2: confirm) */}
      <Dialog open={replaceConfirmOpen} onClose={handleCancelReplace}>
        <DialogTitle>Confirm Product Replacement</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to replace product <strong>{oldProductIdToReplace}</strong> in{' '}
            <strong>{ordersAffectedCount}</strong> order(s). Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelReplace} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirmReplace} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DeliveryDashboard;
