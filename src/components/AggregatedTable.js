// src/components/AggregatedTable.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControlLabel,
  Checkbox,
  TextField
} from '@mui/material';
import { exportAggregatedPDF } from '../utils/pdfUtils';
import { firestore } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

export default function AggregatedTable({
  aggregatedBySupplier,
  supplierInvoiceUrl,
  handleInvoiceFileChangeAndUpload,
  toggleCollected,
  updateChecklistField,
  checklist,
  handleOpenReplaceDialog,
  currentWeek,
}) {
  // Extract unique product IDs from the aggregated orders.
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
          const totalCost = itemsArray.reduce(
            (acc, item) => acc + item.quantity * item.price,
            0
          );
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
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr',
                  },
                  gap: 1,
                  mb: 1,
                  fontWeight: 'bold',
                  borderBottom: '1px solid #ccc',
                  pb: 1,
                  width: '100%',
                }}
              >
                <Typography>ID</Typography>
                <Typography>Nom</Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Qtée
                </Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Coll.
                </Typography>
                <Typography
                  sx={{
                    textAlign: 'center',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Collecté
                </Typography>
                <Typography
                  sx={{
                    textAlign: 'center',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Nouv. Prix
                </Typography>
                <Typography
                  sx={{
                    textAlign: 'right',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Orig
                </Typography>
                <Typography
                  sx={{
                    textAlign: 'right',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Action
                </Typography>
              </Box>
              {itemsArray.map((item) => (
                <React.Fragment key={item.id}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr 1fr',
                        sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr',
                      },
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      width: '100%',
                      p: 0.5,
                    }}
                  >
                    <Typography>{item.id}</Typography>
                    <Typography>{item.name}</Typography>
                    <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
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
                      sx={{ mr: 0, display: { xs: 'none', sm: 'inline-flex' } }}
                    />
                    <TextField
                      label="Collected"
                      type="number"
                      size="small"
                      value={
                        checklist[item.id]?.collectedQuantity !== undefined &&
                        checklist[item.id].collectedQuantity !== null
                          ? checklist[item.id].collectedQuantity
                          : ''
                      }
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        updateChecklistField(item.id, 'collectedQuantity', newValue);
                      }}
                      inputProps={{
                        min: 0,
                        style: { textAlign: 'right' },
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      }}
                      sx={{
                        width: '100%',
                        maxWidth: { xs: '90px', sm: '100%' },
                        bgcolor:
                          checklist[item.id]?.collectedQuantity !== item.quantity ? '#e0f2fe' : 'transparent',
                      }}
                    />
                    <TextField
                      label="New Price"
                      type="number"
                      size="small"
                      value={
                        checklist[item.id]?.newPrice !== undefined &&
                        checklist[item.id].newPrice !== null
                          ? checklist[item.id].newPrice
                          : ''
                      }
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateChecklistField(item.id, 'newPrice', newValue);
                      }}
                      inputProps={{
                        min: 0,
                        style: { textAlign: 'right' },
                        inputMode: 'decimal',
                        pattern: '[0-9]*',
                      }}
                      sx={{
                        width: '100%',
                        maxWidth: { xs: '90px', sm: '100%' },
                        bgcolor:
                          checklist[item.id]?.newPrice &&
                          parseFloat(checklist[item.id].newPrice) !== parseFloat(item.price)
                            ? '#e0f2fe'
                            : 'transparent',
                      }}
                    />
                    <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      ${parseFloat(originalPrices[item.id] !== undefined ? originalPrices[item.id] : item.price).toFixed(2)}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenReplaceDialog(item.id)}
                      sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                      Remplacer
                    </Button>
                  </Box>
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
              ))}
              <Box sx={{ mt: 2, textAlign: 'right', fontWeight: 'bold' }}>
                Total: ${totalCost.toFixed(2)}
              </Box>
            </Paper>
          );
        })}
    </>
  );
}
