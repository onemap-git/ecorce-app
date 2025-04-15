import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

export default function CanadawideUploadDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const region = 'us-central1';
  const functions = getFunctions(undefined, region);
  
  const checkProcessingStatus = httpsCallable(functions, 'checkProcessingStatus');
  
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setStatus({ 
          type: 'error', 
          message: 'Format de fichier invalide. Veuillez sélectionner un fichier Excel (.xlsx ou .xls).' 
        });
        return;
      }
      
      setFile(selectedFile);
      setStatus({ type: '', message: '' });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Veuillez sélectionner un fichier' });
      return;
    }
    
    if (!auth.currentUser) {
      setStatus({ 
        type: 'error', 
        message: 'Vous devez être connecté pour téléverser des fichiers.' 
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatus({ type: '', message: '' });

    try {
      const storageRef = ref(storage, `temp/canadawide/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error uploading file:', error);
          setStatus({ 
            type: 'error', 
            message: 'Erreur lors du téléversement du fichier. Veuillez réessayer.' 
          });
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          try {
            const processCanadawide = httpsCallable(functions, 'processCanadawideExcel');
            await processCanadawide({ fileUrl: downloadURL });
            
            setStatus({ 
              type: 'success', 
              message: 'Fichier téléversé avec succès! Traitement en cours...' 
            });
            
            statusCheckIntervalRef.current = setInterval(async () => {
              try {
                const result = await checkProcessingStatus();
                if (result.data.status === 'completed') {
                  clearInterval(statusCheckIntervalRef.current);
                  statusCheckIntervalRef.current = null;
                  
                  if (result.data.success) {
                    setStatus({ 
                      type: 'success', 
                      message: 'Produits mis à jour avec succès!' 
                    });
                  } else {
                    setStatus({ 
                      type: 'error', 
                      message: 'Erreur lors du traitement du fichier. Veuillez réessayer.' 
                    });
                  }
                  setUploading(false);
                }
              } catch (error) {
                console.error('Error checking processing status:', error);
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
                setStatus({ 
                  type: 'error', 
                  message: 'Erreur lors de la vérification du statut. Veuillez réessayer.' 
                });
                setUploading(false);
              }
            }, 2000);
          } catch (error) {
            console.error('Error processing file:', error);
            setStatus({ 
              type: 'error', 
              message: 'Erreur lors du traitement du fichier. Veuillez réessayer.' 
            });
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error starting upload:', error);
      setStatus({ 
        type: 'error', 
        message: 'Erreur lors du téléversement du fichier. Veuillez réessayer.' 
      });
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setStatus({ type: '', message: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!uploading ? onClose : undefined}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Téléverser les produits Canadawide</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Sélectionnez un fichier Excel contenant la liste des produits Canadawide.
            Le fichier doit contenir les catégories dans la colonne A et les produits 
            (code/nom/prix) dans les colonnes A/B/C.
          </Typography>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
            id="canadawide-file-input"
            ref={fileInputRef}
          />
          <label htmlFor="canadawide-file-input">
            <Button
              variant="outlined"
              component="span"
              disabled={uploading}
            >
              Sélectionner un fichier
            </Button>
          </label>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Fichier sélectionné: {file.name}
            </Typography>
          )}
        </Box>
        
        {uploading && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Téléversement en cours...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        )}
        
        {status.type && (
          <Alert severity={status.type} sx={{ mt: 2 }}>
            {status.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {!uploading ? (
          <>
            <Button onClick={handleReset} color="secondary" disabled={!file}>
              Réinitialiser
            </Button>
            <Button onClick={onClose} color="secondary">
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              color="primary"
              disabled={!file}
            >
              Téléverser
            </Button>
          </>
        ) : (
          <Button disabled>
            Traitement en cours...
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
