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
 * Dialog pour sélectionner les commandes qui contiennent l’ancien produit.
 * L’utilisateur peut cocher celles à remplacer.
 */
function ReplaceOrdersSelectionDialog({
  open,
  ordersForReplacement,
  selectedOrders,
  setSelectedOrders,
  oldProductIdToReplace, // Pour afficher la quantité de l’ancien produit
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
      <DialogTitle>Sélectionner les commandes à remplacer</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Les commandes suivantes contiennent l'ancien produit. Sélectionnez celles où vous souhaitez le remplacer.
        </Typography>
        {ordersForReplacement.length === 0 ? (
          <Typography>Aucune commande ne contient l'ancien produit.</Typography>
        ) : (
          ordersForReplacement.map((order) => {
            // Trouver l’item qui correspond à l’ancien produit
            const matchingItem = order.items.find(
              (item) => item.id === oldProductIdToReplace
            );
            const quantity = matchingItem ? matchingItem.quantity : 0;

            return (
              <Box key={order.id} sx={{ mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleToggleOrder(order.id)}
                    />
                  }
                  label={`ID de commande : ${order.id} | ${order.email || ''} | Qté : ${quantity}`}
                />
              </Box>
            );
          })
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Annuler
        </Button>
        <Button
          onClick={onNext}
          variant="contained"
          color="primary"
          disabled={ordersForReplacement.length === 0}
        >
          Suivant
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DeliveryDashboard({ user }) {
  // Récupération via le hook d’agrégation
  const { orders, aggregatedBySupplier, supplierInvoiceUrl, currentWeek } = useDeliveryAggregation();

  // --------------------------------------------------
  //  Signature pad
  // --------------------------------------------------
  const [sigPadOpen, setSigPadOpen] = useState(null);
  const sigPadRef = useRef(null);

  // --------------------------------------------------
  //  Factures fournisseurs (invoices)
  // --------------------------------------------------
  const [supplierInvoiceUrlState, setSupplierInvoiceUrlState] = useState(supplierInvoiceUrl);

  // --------------------------------------------------
  //  Checklist pour “collected”, “collectedQuantity”, “newPrice”
  // --------------------------------------------------
  const [checklist, setChecklist] = useState({});

  // Charger le checklist depuis Firestore (comme dans l'ancienne version)
  useEffect(() => {
    const wc = getWeekCode(new Date());
    const checklistRef = collection(firestore, 'delivery_checklist');
    const qC = query(checklistRef, where('weekCode', '==', wc));
    const unsub = onSnapshot(qC, (snapshot) => {
      const data = {};
      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        data[d.productId] = { id: docSnap.id, ...d };
      });
      setChecklist(data);
    });
    return () => unsub();
  }, []);

  // Activer / désactiver “collected” pour un produit
  const toggleCollected = async (productId) => {
    const wc = getWeekCode(new Date());
    if (checklist[productId]) {
      // Inverse la valeur “collected”
      const newStatus = !checklist[productId].collected;
      try {
        await updateDoc(doc(firestore, 'delivery_checklist', checklist[productId].id), {
          collected: newStatus,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du checklist", error);
      }
    } else {
      // Crée un nouveau document checklist
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
        console.error("Erreur lors de la création du document checklist", error);
      }
    }
  };

  // Mettre à jour un champ du checklist (collectedQuantity ou newPrice)
  const updateChecklistField = async (productId, field, value) => {
    const wc = getWeekCode(new Date());
    const numericValue = parseFloat(value) || 0;
    if (checklist[productId]) {
      // Mettre à jour un doc existant
      try {
        await updateDoc(doc(firestore, 'delivery_checklist', checklist[productId].id), {
          [field]: numericValue,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour d'un champ du checklist", error);
      }
    } else {
      // Créer un nouveau doc si inexistant
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
        console.error("Erreur lors de la création du document checklist", error);
      }
    }
  };

  // --------------------------------------------------
  //  "Add Product" dialog
  // --------------------------------------------------
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [selectedOrderForProductAddition, setSelectedOrderForProductAddition] = useState(null);

  // --------------------------------------------------
  //  "Replace Product" feature
  // --------------------------------------------------
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [oldProductIdToReplace, setOldProductIdToReplace] = useState(null);

  // Step 2: user picks new product
  const [pendingNewProduct, setPendingNewProduct] = useState(null);

  // Orders selection dialog
  const [replaceOrdersSelectionOpen, setReplaceOrdersSelectionOpen] = useState(false);
  const [ordersForReplacement, setOrdersForReplacement] = useState([]);
  const [selectedOrdersForReplacement, setSelectedOrdersForReplacement] = useState([]);

  // Final confirm
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [ordersAffectedCount, setOrdersAffectedCount] = useState(0);

  // --------------------------------------------------
  //  Gestion des commandes actives / livrées
  // --------------------------------------------------
  const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'delivered');
  const sortedActiveOrders = [...activeOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  const sortedDeliveredOrders = [...deliveredOrders].sort((a, b) => (a.email || '').localeCompare(b.email || ''));

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
          console.error("Erreur lors du téléversement de la facture :", error);
          alert("Erreur lors du téléversement de la facture");
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
      console.error("Erreur lors du téléversement de la facture", err);
    }
  };

  // --------------------------------------------------
  //  Order item modifications
  // --------------------------------------------------
  // Mettre à jour la quantité d’un item dans une commande
  const handleQuantityChange = async (orderId, itemId, newQty) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = (order.items || []).map(item => {
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
      console.error("Erreur lors de la mise à jour de la quantité", err);
    }
  };

  // Marquer une commande comme livrée
  const markAsDelivered = async (orderId) => {
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        deliveryStatus: 'delivered',
        deliveredAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Erreur lors du marquage de la commande comme livrée", err);
    }
  };

  // --------------------------------------------------
  //  Signature
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
      console.error("Erreur lors de l'enregistrement de la signature", err);
    }
  };

  // --------------------------------------------------
  //  "Add Product" to Order
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
      console.log(`Produit « ${product.name} » ajouté à la commande ${orderId}`);
    } catch (error) {
      console.error("Erreur lors de l'ajout du produit à la commande", error);
    }
  };

  // --------------------------------------------------
  //  "Replace Product" Feature
  // --------------------------------------------------
  // Étape 1 : Choisir le produit à remplacer
  const handleOpenReplaceDialog = (oldProductId) => {
    setOldProductIdToReplace(oldProductId);
    setReplaceDialogOpen(true);
  };
  const handleCloseReplaceDialog = () => {
    setReplaceDialogOpen(false);
    setOldProductIdToReplace(null);
  };

  // Étape 2 : Choisir le nouveau produit dans AddProductDialog
  const handleStartReplaceConfirmation = (newProduct) => {
    if (!oldProductIdToReplace) return;

    // Trouver les commandes contenant l'ancien produit
    const relevantOrders = orders.filter(order =>
      (order.items || []).some(item => item.id === oldProductIdToReplace)
    );

    setOrdersForReplacement(relevantOrders);
    // Sélectionner toutes par défaut
    setSelectedOrdersForReplacement(relevantOrders.map(o => o.id));

    setPendingNewProduct(newProduct);

    // Fermer la boîte de dialogue de sélection
    setReplaceDialogOpen(false);

    // Ouvrir la boîte de dialogue “ReplaceOrdersSelection”
    setReplaceOrdersSelectionOpen(true);
  };

  // Étape 3 : l’utilisateur coche les commandes à remplacer
  const handleCloseReplaceOrdersSelection = () => {
    setReplaceOrdersSelectionOpen(false);
    setPendingNewProduct(null);
    setOldProductIdToReplace(null);
  };
  const handleNextFromReplaceOrdersSelection = () => {
    // Calculer combien de commandes seront affectées
    setOrdersAffectedCount(selectedOrdersForReplacement.length);
    setReplaceOrdersSelectionOpen(false);
    setReplaceConfirmOpen(true);
  };

  // Étape 4 : confirmation finale
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

  // Étape 5 : faire le remplacement dans toutes les commandes sélectionnées
  const handleReplaceProductInAllOrders = async (newProduct) => {
    let updatedCount = 0;

    // Ne remplacer que dans les commandes sélectionnées
    const newOrdersState = orders.map(order => {
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
        // Mettre à jour Firestore
        updateDoc(doc(firestore, 'orders', order.id), {
          items: updatedItems,
          updatedAt: serverTimestamp()
        }).catch(err => {
          console.error(`Erreur lors de la mise à jour de la commande ${order.id}`, err);
        });
        return { ...order, items: updatedItems };
      }
      return order;
    });

    console.log(
      `Produit ${oldProductIdToReplace} remplacé par ${newProduct.id} dans ${updatedCount} commande(s) sélectionnée(s).`
    );

    // Réinitialiser
    setOldProductIdToReplace(null);
    setOrdersForReplacement([]);
    setSelectedOrdersForReplacement([]);
  };

  // --------------------------------------------------
  //  Render
  // --------------------------------------------------
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Tableau de bord des livraisons
      </Typography>
      <Typography variant="body1" gutterBottom>
        Commandes pour la semaine : {currentWeek}
      </Typography>

      {/* Agrégation des articles */}
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
            Bons de commandes aux fournisseurs - Semaine {currentWeek}
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
        Livraisons
      </Typography>

      {/* Commandes actives */}
      {sortedActiveOrders.length === 0 ? (
        <Typography>Aucune commande active pour cette semaine.</Typography>
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

      {/* Commandes livrées */}
      {sortedDeliveredOrders.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Commandes livrées
          </Typography>
          {sortedDeliveredOrders.map(order => (
            <DeliveredOrderCard key={order.id} order={order} />
          ))}
        </>
      )}

      {/* Overlay de signature */}
      <SignatureOverlay
        open={!!sigPadOpen}
        sigPadRef={sigPadRef}
        onClear={clearSignature}
        onSave={saveSignature}
        onCancel={() => setSigPadOpen(null)}
      />

      {/* "Add Product" Dialog existant */}
      <AddProductDialog
        open={addProductDialogOpen}
        onClose={handleCloseAddProduct}
        onProductSelect={(product) => {
          handleAddProductToOrder(selectedOrderForProductAddition, product);
          handleCloseAddProduct();
        }}
      />

      {/* Étape 1 : choisir l’ancien produit à remplacer */}
      <AddProductDialog
        open={replaceDialogOpen}
        onClose={handleCloseReplaceDialog}
        onProductSelect={(product) => {
          handleStartReplaceConfirmation(product);
        }}
      />

      {/* Étape 2 : Sélection des commandes où remplacer */}
      <ReplaceOrdersSelectionDialog
        open={replaceOrdersSelectionOpen}
        ordersForReplacement={ordersForReplacement}
        selectedOrders={selectedOrdersForReplacement}
        setSelectedOrders={setSelectedOrdersForReplacement}
        oldProductIdToReplace={oldProductIdToReplace}
        onClose={handleCloseReplaceOrdersSelection}
        onNext={handleNextFromReplaceOrdersSelection}
      />

      {/* Étape 3 : confirmation finale */}
      <Dialog open={replaceConfirmOpen} onClose={handleCancelReplace}>
        <DialogTitle>Confirmer le remplacement du produit</DialogTitle>
        <DialogContent>
          <Typography>
            Vous êtes sur le point de remplacer le produit <strong>{oldProductIdToReplace}</strong> dans{' '}
            <strong>{ordersAffectedCount}</strong> commande(s) sélectionnée(s). Continuer ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelReplace} color="secondary">
            Annuler
          </Button>
          <Button onClick={handleConfirmReplace} variant="contained" color="primary">
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
