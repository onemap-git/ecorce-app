// src/components/DeliveryDashboard.js
import React, { useState, useRef } from 'react';
import {
  updateDoc,
  setDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { firestore, storage } from '../firebase';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useDeliveryAggregation } from '../hooks/useDeliveryAggregation';
import AggregatedTable from './AggregatedTable';
import SignatureOverlay from './SignatureOverlay';
import DeliveredOrderCard from './DeliveredOrderCard';
import AddProductDialog from './AddProductDialog';
import OrderCard from './OrderCard';
import { getWeekCode } from '../utils/dateUtils';

/**
 * A new dialog that shows which orders contain the old product,
 * allowing the user to select which orders get replaced.
 */
function ReplaceOrdersSelectionDialog({
  open,
  ordersForReplacement,
  selectedOrders,
  setSelectedOrders,
  onClose,
  onNext
}) {
  if (!open) return null;

  const handleToggleOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Select Orders to Replace</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The following orders contain the old product. Check which orders should have it replaced.
        </Typography>

        {ordersForReplacement.length === 0 ? (
          <Typography>No orders found that contain the old product.</Typography>
        ) : (
          ordersForReplacement.map(order => (
            <Box key={order.id} sx={{ mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => handleToggleOrder(order.id)}
                  />
                }
                label={`Order ID: ${order.id} | ${order.email || ''}`}
              />
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button
          onClick={onNext}
          variant="contained"
          color="primary"
          disabled={ordersForReplacement.length === 0}
        >
          Next
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DeliveryDashboard({ user }) {
  const { orders, aggregatedBySupplier, supplierInvoiceUrl, currentWeek } = useDeliveryAggregation();

  // Signature pad
  const [sigPadOpen, setSigPadOpen] = useState(null);
  const sigPadRef = useRef(null);

  // Invoices
  const [supplierInvoiceUrlState, setSupplierInvoiceUrlState] = useState(supplierInvoiceUrl);

  // Checklist
  const [checklist, setChecklist] = useState({});

  // "Add Product" dialog
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [selectedOrderForProductAddition, setSelectedOrderForProductAddition] = useState(null);

  // Replace Feature
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [oldProductIdToReplace, setOldProductIdToReplace] = useState(null);

  // Step 2: user picks new product -> we open a selection dialog
  const [pendingNewProduct, setPendingNewProduct] = useState(null);

  // The new "Replace Orders Selection" dialog
  const [replaceOrdersSelectionOpen, setReplaceOrdersSelectionOpen] = useState(false);
  const [ordersForReplacement, setOrdersForReplacement] = useState([]);
  const [selectedOrdersForReplacement, setSelectedOrdersForReplacement] = useState([]);

  // The final confirmation
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [ordersAffectedCount, setOrdersAffectedCount] = useState(0);

  // Derived orders
  const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'delivered');
  const sortedActiveOrders = [...activeOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  const sortedDeliveredOrders = [...deliveredOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));

  // --------------------------------------------------
  //  Checklist methods (example placeholders)
  // --------------------------------------------------
  const toggleCollected = async (productId) => {
    // your existing logic...
  };
  const updateChecklistField = async (productId, field, value) => {
    // your existing logic...
  };

  // --------------------------------------------------
  //  Invoices
  // --------------------------------------------------
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
          setSupplierInvoiceUrlState((prev) => ({
            ...prev,
            [supplier]: downloadURL
          }));
        }
      );
    } catch (err) {
      console.error('Error uploading invoice', err);
    }
  };

  // --------------------------------------------------
  //  Order item modifications
  // --------------------------------------------------
  const handleQuantityChange = async (orderId, itemId, newQty) => {
    // your existing logic
  };
  const markAsDelivered = async (orderId) => {
    // your existing logic
  };

  // --------------------------------------------------
  //  Signature pad
  // --------------------------------------------------
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

  // --------------------------------------------------
  //  "Add Product to Order"
  // --------------------------------------------------
  const handleOpenAddProduct = (orderId) => {
    setSelectedOrderForProductAddition(orderId);
    setAddProductDialogOpen(true);
  };
  const handleCloseAddProduct = () => {
    setAddProductDialogOpen(false);
    setSelectedOrderForProductAddition(null);
  };
  const handleAddProductToOrder = async (orderId, product) => {
    // your existing logic
  };

  // --------------------------------------------------
  //  "Replace Product" Feature
  // --------------------------------------------------
  // Step 1: user picks old product
  const handleOpenReplaceDialog = (oldProductId) => {
    setOldProductIdToReplace(oldProductId);
    setReplaceDialogOpen(true);
  };
  const handleCloseReplaceDialog = () => {
    setReplaceDialogOpen(false);
    setOldProductIdToReplace(null);
  };

  // Step 2: user picks new product in AddProductDialog
  const handleStartReplaceConfirmation = (newProduct) => {
    if (!oldProductIdToReplace) return;

    // Identify which orders contain the old product
    const relevantOrders = orders.filter(order =>
      (order.items || []).some(item => item.id === oldProductIdToReplace)
    );

    setOrdersForReplacement(relevantOrders);
    // By default, select them all
    setSelectedOrdersForReplacement(relevantOrders.map(o => o.id));

    setPendingNewProduct(newProduct);

    // close "replace product selection" dialog
    setReplaceDialogOpen(false);

    // open the new selection dialog
    setReplaceOrdersSelectionOpen(true);
  };

  // Step 3: user picks which orders get replaced
  const handleCloseReplaceOrdersSelection = () => {
    setReplaceOrdersSelectionOpen(false);
    setPendingNewProduct(null);
    setOldProductIdToReplace(null);
  };
  const handleNextFromReplaceOrdersSelection = () => {
    // We'll show the final confirm
    setOrdersAffectedCount(selectedOrdersForReplacement.length);
    setReplaceOrdersSelectionOpen(false);
    setReplaceConfirmOpen(true);
  };

  // Step 4: final confirm
  const handleConfirmReplace = () => {
    if (!pendingNewProduct || !oldProductIdToReplace) return;
    handleReplaceProductInAllOrders(pendingNewProduct);
    setReplaceConfirmOpen(false);
    setPendingNewProduct(null);
  };
  const handleCancelReplace = () => {
    setReplaceConfirmOpen(false);
    setPendingNewProduct(null);
    setOldProductIdToReplace(null);
  };

  // Step 5: actual replacement in the selected orders
  const handleReplaceProductInAllOrders = async (newProduct) => {
    let updatedCount = 0;

    // Only replace in the selected orders
    const newOrdersState = orders.map(order => {
      // If user did not select this order, skip
      if (!selectedOrdersForReplacement.includes(order.id)) {
        return order;
      }

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

    console.log(
      `Replaced product ${oldProductIdToReplace} with ${newProduct.id} in ${updatedCount} selected orders.`
    );

    // Clear old product ID
    setOldProductIdToReplace(null);

    // Reset selection
    setOrdersForReplacement([]);
    setSelectedOrdersForReplacement([]);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Delivery Dashboard
      </Typography>
      <Typography variant="body1" gutterBottom>
        Orders for week: {currentWeek}
      </Typography>

      {/* Aggregated Items */}
      <Box
        sx={{
          mt: 4,
          border: '1px solid #ccc',
          p: 2,
          borderRadius: 1,
          width: '100%'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ ml: 2 }}>
            Bons de commandes aux fournisseurs - Week {currentWeek}
          </Typography>
        </Box>
        <AggregatedTable
          aggregatedBySupplier={aggregatedBySupplier}
          supplierInvoiceUrl={supplierInvoiceUrlState}
          currentWeek={currentWeek}
          checklist={checklist}
          toggleCollected={toggleCollected}
          updateChecklistField={updateChecklistField}
          handleInvoiceFileChangeAndUpload={handleInvoiceFileChangeAndUpload}
          handleOpenReplaceDialog={handleOpenReplaceDialog}
        />
      </Box>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Deliveries
      </Typography>

      {/* ACTIVE ORDERS */}
      {sortedActiveOrders.length === 0 ? (
        <Typography>No active orders for this week.</Typography>
      ) : (
        sortedActiveOrders.map(order => (
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
      {sortedDeliveredOrders.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Delivered Orders
          </Typography>
          {sortedDeliveredOrders.map(order => (
            <DeliveredOrderCard key={order.id} order={order} />
          ))}
        </>
      )}

      {/* Signature Overlay */}
      <SignatureOverlay
        open={!!sigPadOpen}
        sigPadRef={sigPadRef}
        onClear={clearSignature}
        onSave={saveSignature}
        onCancel={() => setSigPadOpen(null)}
      />

      {/* Existing "Add Product" Dialog */}
      <AddProductDialog
        open={addProductDialogOpen}
        onClose={handleCloseAddProduct}
        onProductSelect={(product) => {
          handleAddProductToOrder(selectedOrderForProductAddition, product);
          handleCloseAddProduct();
        }}
      />

      {/* Step 1: Replace Product -> pick new product */}
      <AddProductDialog
        open={replaceDialogOpen}
        onClose={handleCloseReplaceDialog}
        onProductSelect={(product) => {
          handleStartReplaceConfirmation(product);
        }}
      />

      {/* Step 2: Show orders that have oldProductId, user picks which ones to replace */}
      <ReplaceOrdersSelectionDialog
        open={replaceOrdersSelectionOpen}
        ordersForReplacement={ordersForReplacement}
        selectedOrders={selectedOrdersForReplacement}
        setSelectedOrders={setSelectedOrdersForReplacement}
        onClose={handleCloseReplaceOrdersSelection}
        onNext={handleNextFromReplaceOrdersSelection}
      />

      {/* Step 3: final confirm */}
      <Dialog open={replaceConfirmOpen} onClose={handleCancelReplace}>
        <DialogTitle>Confirm Product Replacement</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to replace product <strong>{oldProductIdToReplace}</strong> in{' '}
            <strong>{ordersAffectedCount}</strong> selected order(s). Continue?
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
