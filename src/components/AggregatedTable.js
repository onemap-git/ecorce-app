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

              {/* Example of invoice image upload area */}
              <Box sx={{ mb: 2 }}>
                {/* ...unchanged invoice logic... */}
              </Box>

              {/* Responsive grid header */}
              <Box
                sx={{
                  display: 'grid',
                  // Use breakpoints to switch columns for small screens
                  gridTemplateColumns: {
                    xs: '1fr 1fr', // Only 2 columns on extra-small screens
                    sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr', // Original columns on small+
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
                <Typography>Name</Typography>
                {/* The next columns will be hidden on xs because we only have 2 columns on xs */}
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

              {/* Items rows */}
              {itemsArray.map(item => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr 1fr',
                      sm: '1fr 2fr 0.7fr 0.7fr 1fr 1fr 1fr 1fr'
                    },
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                    width: '100%'
                  }}
                >
                  <Typography>{item.id}</Typography>
                  <Typography>{item.name}</Typography>

                  {/* Quantity (hidden on xs) */}
                  <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                    {item.quantity}
                  </Typography>

                  {/* "Coll." checkbox (hidden on xs) */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checklist[item.id]?.collected || false}
                        onChange={() => toggleCollected(item.id)}
                      />
                    }
                    label=""
                    sx={{
                      mr: 0,
                      display: { xs: 'none', sm: 'inline-flex' }
                    }}
                  />

                  {/* Collected input (hidden on xs) */}
                  <TextField
                    label="Collected"
                    type="number"
                    size="small"
                    value={
                      checklist[item.id]?.collectedQuantity !== undefined
                        ? checklist[item.id].collectedQuantity
                        : ''
                    }
                    onChange={(e) => updateChecklistField(item.id, 'collectedQuantity', e.target.value)}
                    // For mobile numeric keyboard
                    inputProps={{
                      min: 0,
                      style: { textAlign: 'right' },
                      inputMode: 'numeric',
                      pattern: '[0-9]*'
                    }}
                    sx={{
                      width: '100%',
                      maxWidth: { xs: '90px', sm: '100%' },
                      textAlign: 'right',
                      display: { xs: 'none', sm: 'inline-flex' }
                    }}
                  />

                  {/* New Price input (hidden on xs) */}
                  <TextField
                    label="New Price"
                    type="number"
                    size="small"
                    value={
                      checklist[item.id]?.newPrice !== undefined
                        ? checklist[item.id].newPrice
                        : ''
                    }
                    onChange={(e) => updateChecklistField(item.id, 'newPrice', e.target.value)}
                    inputProps={{
                      min: 0,
                      style: { textAlign: 'right' },
                      inputMode: 'decimal',
                      pattern: '[0-9]*'
                    }}
                    sx={{
                      width: '100%',
                      maxWidth: { xs: '90px', sm: '100%' },
                      textAlign: 'right',
                      display: { xs: 'none', sm: 'inline-flex' }
                    }}
                  />

                  {/* Original Price */}
                  <Typography sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                    ${parseFloat(item.price).toFixed(2)}
                  </Typography>

                  {/* Replace button */}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleOpenReplaceDialog(item.id)}
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Replace
                  </Button>
                </Box>
              ))}
            </Paper>
          );
        })}
    </>
  );
}
