// src/components/SignatureOverlay.js
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';

export default function SignatureOverlay({
  open,
  sigPadRef,
  onClear,
  onSave,
  onCancel
}) {
  if (!open) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
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
          <Button variant="outlined" onClick={onClear}>
            Clear
          </Button>
          <Button variant="contained" onClick={onSave}>
            Save Signature
          </Button>
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
