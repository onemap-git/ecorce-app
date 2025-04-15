const functions = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const os = require('os');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { Storage } = require('@google-cloud/storage');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = new Storage();

const PROCESSING_COLLECTION = 'canadawide_processing';

/**
 * HTTP function to initiate the Excel file processing
 * This function quickly returns and starts a background process
 */
exports.processCanadawideExcel = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  const data = req.body || {};
  
  const fileUrl = data.fileUrl;
  if (!fileUrl) {
    res.status(400).json({ error: 'The function must be called with a fileUrl.' });
    return;
  }
  
  try {
    const processingId = Date.now().toString();
    const statusRef = db.collection(PROCESSING_COLLECTION).doc(processingId);
    
    await statusRef.set({
      fileUrl: fileUrl,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: null
    });
    
    res.status(200).json({ 
      processingId: processingId,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Error initiating processing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Background function triggered when a new processing document is created
 * This function can run for up to 9 minutes (540 seconds)
 */
exports.processExcelBackground = onDocumentCreated(
  `${PROCESSING_COLLECTION}/{processingId}`,
  async (event) => {
    const snapshot = event.data;
    const context = event.params;
    const processingData = snapshot.data();
    const processingId = context.processingId;
    const statusRef = snapshot.ref;
    
    let tempFilePath = null;
    
    try {
      await statusRef.update({
        status: 'downloading',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const fileUrl = processingData.fileUrl;
      
      const fileUrlObj = new URL(fileUrl);
      const pathMatch = fileUrlObj.pathname.match(/\/o\/(.+)$/);
      
      if (!pathMatch) {
        throw new Error('Invalid file URL format');
      }
      
      const encodedFilePath = pathMatch[1];
      const filePath = decodeURIComponent(encodedFilePath);
      const fileName = filePath.split('/').pop();
      
      const bucketMatch = fileUrlObj.pathname.match(/\/b\/([^\/]+)/);
      if (!bucketMatch) {
        throw new Error('Could not extract bucket name from URL');
      }
      const fileBucket = bucketMatch[1];
      
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        throw new Error('The file must be an Excel file (.xlsx or .xls).');
      }
      
      tempFilePath = path.join(os.tmpdir(), fileName);
      
      await storage.bucket(fileBucket).file(filePath).download({ destination: tempFilePath });
      console.log('Excel file downloaded to:', tempFilePath);
      
      await statusRef.update({
        status: 'processing',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Process the Excel file
      const workbook = xlsx.readFile(tempFilePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }
      
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 'A', defval: '' });
      
      const products = [];
      let currentCategory = null;
      
      for (const row of jsonData) {
        const A = row.A || '';
        const B = row.B || '';
        const C = row.C || '';
        
        if (!B && !C && A) {
          currentCategory = A;
        } else if (A && B && C !== '') {
          const price = parseFloat(C);
          if (isNaN(price)) {
            console.warn(`Skipping product ${A} due to invalid price: ${C}`);
            continue;
          }
          
          products.push({
            code: A,
            category: currentCategory,
            name: B,
            price: price,
            bio: B.toLowerCase().includes('(bio)'),
            supplier: 'canadawide',
            available: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      if (products.length === 0) {
        throw new Error('No valid products found in the Excel file');
      }
      
      console.log(`Found ${products.length} valid products`);
      
      await statusRef.update({
        status: 'updating_database',
        productsFound: products.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const existingProducts = await db.collection('products')
                                      .where('supplier', '==', 'canadawide')
                                      .get();
      
      console.log(`Found ${existingProducts.size} existing canadawide products`);
      
      const validCodes = new Set(products.map(p => p.code));
      
      const MAX_BATCH_SIZE = 500;
      let batchCount = 0;
      let batch = db.batch();
      
      for (const product of products) {
        const docRef = db.collection('products').doc(product.code);
        batch.set(docRef, product, { merge: true });
        
        batchCount++;
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
      
      existingProducts.forEach(doc => {
        const productData = doc.data();
        if (!validCodes.has(productData.code)) {
          batch.update(doc.ref, { 
            available: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          batchCount++;
          if (batchCount >= MAX_BATCH_SIZE) {
            batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      });
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log('Successfully updated products');
      
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      await storage.bucket(fileBucket).file(filePath).delete();
      
      await statusRef.update({
        status: 'completed',
        success: true,
        productsProcessed: products.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      await statusRef.update({
        status: 'error',
        error: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * HTTP function to check the status of a file processing operation
 */
exports.checkProcessingStatus = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const processingId = req.query.processingId;
    
    if (!processingId) {
      res.status(400).json({ error: 'Processing ID is required' });
      return;
    }
    
    const statusDoc = await db.collection(PROCESSING_COLLECTION).doc(processingId).get();
    
    if (!statusDoc.exists) {
      res.status(404).json({ error: 'Processing job not found' });
      return;
    }
    
    const statusData = statusDoc.data();
    
    res.status(200).json({
      processingId: processingId,
      status: statusData.status,
      success: statusData.status === 'completed' ? statusData.success : undefined,
      error: statusData.error,
      productsProcessed: statusData.productsProcessed,
      updatedAt: statusData.updatedAt
    });
  } catch (error) {
    console.error('Error checking processing status:', error);
    res.status(500).json({ error: error.message });
  }
});
