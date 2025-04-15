const functions = require('firebase-functions');
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

/**
 * Cloud Function to process Canadawide Excel file
 * Triggered by a file upload to the temp/canadawide/ directory in Firebase Storage
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
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a fileUrl.'
    );
  }
  
  const urlParts = fileUrl.split('/');
  const fileName = urlParts[urlParts.length - 1].split('?')[0];
  const filePath = `temp/canadawide/${fileName}`;
  const fileBucket = process.env.GCLOUD_PROJECT + '.appspot.com';
  
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The file must be an Excel file (.xlsx or .xls).'
    );
  }
  const tempFilePath = path.join(os.tmpdir(), fileName);
  
  try {
    await storage.bucket(fileBucket).file(filePath).download({ destination: tempFilePath });
    console.log('Excel file downloaded to:', tempFilePath);
    
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
    
    fs.unlinkSync(tempFilePath);
    
    await storage.bucket(fileBucket).file(filePath).delete();
    
    return { success: true, productsProcessed: products.length };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    res.status(500).json({ error: error.message });
    return;
  }
  
  res.status(200).json({ success: true, productsProcessed: products.length });
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
    res.status(200).json({ status: 'completed', success: true });
  } catch (error) {
    console.error('Error checking processing status:', error);
    res.status(500).json({ error: error.message });
  }
});
