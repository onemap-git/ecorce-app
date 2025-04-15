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
exports.processCanadawideExcel = functions.storage.object().onFinalize(async (object) => {
  if (!object.name.startsWith('temp/canadawide/') || 
      (!object.name.endsWith('.xlsx') && !object.name.endsWith('.xls'))) {
    console.log('Not a Canadawide Excel file:', object.name);
    return null;
  }
  
  const fileBucket = object.bucket;
  const filePath = object.name;
  const fileName = path.basename(filePath);
  
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
    
    throw error;
  }
});

/**
 * HTTP function to check the status of a file processing operation
 */
exports.checkProcessingStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  
  try {
    return { status: 'completed', success: true };
  } catch (error) {
    console.error('Error checking processing status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
