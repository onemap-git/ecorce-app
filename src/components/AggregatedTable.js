// src/components/AggregatedTable.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField
} from '@mui/material';
import { exportAggregatedPDF } from '../utils/pdfUtils';
import { firestore } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';
import DistributeQuantityDialog from './DistributeQuantityDialog'; // if implemented

// Custom hook: Batch-fetch original prices from products by IDs.
function useOriginalPrices(productIds) {
  const [pricesMap, setPricesMap] = useState({});
  useEffect(() => {
    async function fetchPrices() {
      const newMap = {};
      if (!productIds || productIds.length === 0) {
        setPricesMap(newMap);
        return;
      }
      // Firestore 'in' queries allow a maximum of 10 values.
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }
      for (const chunk of chunks) {
        const q = query(
          collection(firestore, 'products'),
          where('__name__', 'in', chunk)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data();
          newMap[doc.id] = data.price;
        });
      }
      setPricesMap(newMap);
    }
    fetchPrices();
  }, [productIds]);
  return pricesMap;
}

function AggregatedTable({
  aggregatedBySupplier,
  supplierInvoiceUrl,
  handleInvoiceFileChangeAndUpload,
  toggleCollected,
  updateChecklistField,
  checklist,
  handleOpenReplaceDialog,
  currentWeek,
  orders // orders for distribution
}) {
  const { getFinalPrice } = usePricing();

  // State for controlling the "Distribuer" dialog
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [currentDistributeProduct, setCurrentDistributeProduct] = useState(null);
  const [ordersForDistribution, setOrdersForDistribution] = useState([]);

  // Gather all unique product IDs
  const productIdsSet = new Set();
  Object.keys(aggregatedBySupplier).forEach(supplier => {
    const itemsObj = aggregatedBySupplier[supplier];
    Object.values(itemsObj).forEach(item => {
      productIdsSet.add(item.id);
    });
  });
  const productIds = Array.from(productIdsSet);
  const originalPrices = useOriginalPrices(productIds);

  if (Object.keys(aggregatedBySupplier).length === 0) {
    return <Typography>No aggregated products.</Typography>;
  }

  // Handler for opening the "Distribuer" dialog
  const handleOpenDistributeDialog = (item) => {
    // Find all orders that contain this product
    const relevantOrders = orders.filter((ord) =>
      ord.items?.some((it) => it.id === item.id)
    );
    setCurrentDistributeProduct(item);
    setOrdersForDistribution(relevantOrders);
    setDistributeDialogOpen(true);
  };

  return (
    <>
      {Object.keys(aggregatedBySupplier)
        .sort()
        .map((supplier) => {
          const itemsObj = aggregatedBySupplier[supplier];
          // Each aggregated item is assumed to have an optional "comments" array.
          const itemsArray = Object.values(itemsObj).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          // Compute total cost using margin-adjusted prices
          const totalCost = itemsArray.reduce((acc, item) => {
            const basePrice =
              originalPrices[item.id] !== undefined
                ? originalPrices[item.id]
                : item.price;
            const finalPrice = getFinalPrice(basePrice);
            return acc + finalPrice * item.quantity;
          }, 0);
          const handleExportPDF = () => {
            exportAggregatedPDF(itemsArray, currentWeek, supplier);
          };
          return (
            <Paper key={supplier} sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Fournisseur: {supplier}
              </Typography>
              <Button variant="contained" onClick={handleExportPDF} sx={{ mb: 2 }}>
                Exporter en PDF
              </Button>
              {/* Table Header Row with new "Collecté" column */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr'
                  },
                  gap: 1,
                  mb: 1,
                  fontWeight: 'bold',
                  borderBottom: '1px solid #ccc',
                  pb: 1,
                  width: '100%'
                }}
              >
                <Typography>ID</Typography>
                <Typography>Nom</Typography>
                <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  Qtée
                </Typography>
                <Typography sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                  Collecté
                </Typography>
                <Typography sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                  Nouv. Prix
                </Typography>
                <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  Orig
                </Typography>
                <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  Action
                </Typography>
              </Box>
              {itemsArray.map((item) => {
                const basePrice =
                  originalPrices[item.id] !== undefined
                    ? originalPrices[item.id]
                    : item.price;
                const finalPrice = getFinalPrice(basePrice);
                // We'll keep using checklist for newPrice
                const newPriceValue = checklist[item.id]?.newPrice ?? '';
                return (
                  <React.Fragment key={item.id}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr 1fr',
                          sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr'
                        },
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                        width: '100%',
                        p: 0.5
                      }}
                    >
                      <Typography>{item.id}</Typography>
                      <Typography>{item.name}</Typography>
                      {/* Quantity display */}
                      <Typography
                        sx={{
                          textAlign: 'right',
                          display: { xs: 'none', sm: 'block' }
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      {/* Collected checkbox */}
                      <Box sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                        {/* We use FormControlLabel with a Checkbox */}
                        <input
                          type="checkbox"
                          checked={checklist[item.id]?.collected || false}
                          onChange={() => toggleCollected(item.id)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                      </Box>
                      {/* New Price field */}
                      <TextField
                        label="New Price"
                        type="number"
                        size="small"
                        value={newPriceValue}
                        onChange={(e) => {
                          const newVal =
                            e.target.value === '' ? null : parseFloat(e.target.value);
                          updateChecklistField(item.id, 'newPrice', newVal);
                        }}
                        inputProps={{
                          min: 0,
                          style: { textAlign: 'right' },
                          inputMode: 'decimal',
                          pattern: '[0-9]*'
                        }}
                        sx={{
                          width: '100%',
                          maxWidth: { xs: '90px', sm: '100%' },
                          bgcolor:
                            newPriceValue &&
                            parseFloat(newPriceValue) !== parseFloat(item.price)
                              ? '#e0f2fe'
                              : 'transparent'
                        }}
                      />
                      {/* Display final price with margin */}
                      <Typography
                        sx={{
                          textAlign: 'right',
                          display: { xs: 'none', sm: 'block' }
                        }}
                      >
                        ${formatPrice(finalPrice)}
                      </Typography>
                      {/* Action buttons: Remplacer & Distribuer */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenReplaceDialog(item.id)}
                          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          Remplacer
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenDistributeDialog(item)}
                          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          Distribuer
                        </Button>
                      </Box>
                    </Box>
                    {/* Comments (if any) */}
                    {item.comments &&
                      item.comments.length > 0 &&
                      item.comments.map((entry, index) => (
                        <Typography
                          key={index}
                          variant="caption"
                          sx={{ pl: 2, color: 'grey.600', mb: 0.5 }}
                        >
                          Commentaire de {entry.company} : {entry.comment}
                        </Typography>
                      ))}
                  </React.Fragment>
                );
              })}
              {/* Total line */}
              <Box sx={{ mt: 2, textAlign: 'right', fontWeight: 'bold' }}>
                Total: ${totalCost.toFixed(2)}
              </Box>
            </Paper>
          );
        })}
      {/* The "Distribuer" dialog, if implemented */}
      {distributeDialogOpen && currentDistributeProduct && (
        <DistributeQuantityDialog
          open={distributeDialogOpen}
          product={currentDistributeProduct}
          orders={ordersForDistribution}
          onClose={() => setDistributeDialogOpen(false)}
        />
      )}
    </>
  );
}

export default AggregatedTable;
