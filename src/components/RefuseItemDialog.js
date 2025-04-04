import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from '@mui/material';

export default function RefuseItemDialog({
  open,
  item,
  onClose,
  onRefuse
}) {
  const [reason, setReason] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = () => {
    onRefuse({
      itemId: item.id,
      reason,
      photoUrl
    });
    setReason('');
    setPhotoUrl('');
    onClose();
  };

  if (!open || !item) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Refuser l'article</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {item.name} - ${parseFloat(item.price).toFixed(2)}
        </Typography>
        
        <TextField
          label="Raison du refus"
          fullWidth
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 3 }}
        />
        
        <Box sx={{ mb: 2 }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <Button 
            variant="outlined" 
            onClick={handleTakePhoto}
            sx={{ mb: 2 }}
          >
            Prendre une photo
          </Button>
          
          {photoUrl && (
            <Box 
              sx={{ 
                mt: 2, 
                border: '1px solid #ccc', 
                p: 1, 
                borderRadius: 1 
              }}
            >
              <img 
                src={photoUrl} 
                alt="Refusal evidence" 
                style={{ width: '100%', height: 'auto' }} 
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!reason.trim()}
        >
          Confirmer le refus
        </Button>
      </DialogActions>
    </Dialog>
  );
}
