// src/components/AggregatedTable.js
import React from 'react';
import { Box, Paper, Typography, Button, FormControlLabel, Checkbox, TextField } from '@mui/material';
import { exportAggregatedPDF } from '../utils/pdfUtils';

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
  if (Object.keys(aggregatedBySupplier).length === 0) {
    return <Typography>No aggregated products.</Typography>;
  }

  return (
    <>
      {Object.keys(aggregatedBySupplier)
        .sort()
        .map((supplier) => {
          const itemsObj = aggregatedBySupplier[supplier];
          const itemsArray = Object.values(itemsObj).sort((a, b) => a.name.localeCompare(b.name));

          const totalCost = itemsArray.reduce((acc, item) => acc + item.quantity * item.price, 0);
          const handleExportPDF = () => {
            exportAggregatedPDF(itemsArray, currentWeek, supplier);
          };

          return (
            <Paper key={supplier} sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Supplier: {supplier}
              </Typography>
              <Button variant="contained" onClick={handleExportPDF} sx={{ mb: 2 }}>
                Export PDF
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
                <Typography>Name</Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Qty</Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Coll.</Typography>
                <Typography sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                  Collected
                </Typography>
                <Typography sx={{ textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
                  New Price
                </Typography>
                <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  Orig
                </Typography>
                <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  Action
                </Typography>
              </Box>

              {itemsArray.map((item) => {
                const quantityChanged =
                  checklist[item.id]?.collectedQuantity &&
                  checklist[item.id].collectedQuantity !== item.quantity;

                const priceChanged =
                  checklist[item.id]?.newPrice &&
                  parseFloat(checklist[item.id].newPrice) !== parseFloat(item.price);

                return (
                  <Box
                    key={item.id}
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
                            checklist[item.id]?.collectedQuantity !== undefined && checklist[item.id].collectedQuantity !== null
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
                            bgcolor: quantityChanged ? '#e0f2fe' : 'transparent',
                        }}
                    />

                    <TextField
                        label="New Price"
                        type="number"
                        size="small"
                        value={
                            checklist[item.id]?.newPrice !== undefined && checklist[item.id].newPrice !== null
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
                            bgcolor: priceChanged ? '#e0f2fe' : 'transparent',
                        }}
                    />

                    <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      ${parseFloat(item.price).toFixed(2)}
                    </Typography>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenReplaceDialog(item.id)}
                      sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                      Replace
                    </Button>
                  </Box>
                );
              })}

              <Box sx={{ mt: 2, textAlign: 'right', fontWeight: 'bold' }}>
                Total: ${totalCost.toFixed(2)}
              </Box>
            </Paper>
          );
        })}
    </>
  );
}
