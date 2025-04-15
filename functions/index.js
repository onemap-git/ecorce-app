// functions/index.js
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const { processCanadawideExcel, checkProcessingStatus, processExcelBackground } = require('./src/processCanadawideExcel');

exports.processCanadawideExcel = processCanadawideExcel;
exports.checkProcessingStatus = checkProcessingStatus;
exports.processExcelBackground = processExcelBackground;

/**
 * Helper function to fetch the margin from Firestore.
 * Returns 0 if no margin is set.
 */
async function getMargin() {
  const marginSnap = await db.collection('settings').doc('sales').get();
  return marginSnap.exists ? marginSnap.data().margin || 0 : 0;
}

/**
 * Helper function to apply the margin to a given base price.
 * @param {number} basePrice - The original price.
 * @param {number} margin - The margin percentage.
 * @returns {number} The final price.
 */
function applyMargin(basePrice, margin) {
  return basePrice * (1 + margin / 100);
}

/**
 * Cloud Function to update all non-delivered orders with a new price (or revert to default).
 */
exports.applyPriceChangeToAllOrders = onDocumentWritten(
  { document: 'delivery_checklist/{docId}' },
  async (event) => {
    if (!event.data.after) {
      return null;
    }
    const oldData = event.data.before?.data() || {};
    const newData = event.data.after.data() || {};
    if (!newData.productId) {
      logger.info('No productId in new data, skipping...');
      return null;
    }
    const weekCode = newData.weekCode;
    if (!weekCode) {
      logger.info('No weekCode in new data, skipping...');
      return null;
    }
    const productId = newData.productId;
    const newPriceIsNumeric = typeof newData.newPrice === 'number';
    const oldPriceIsNumeric = typeof oldData.newPrice === 'number';

    if (newData.newPrice === oldData.newPrice) {
      logger.info('newPrice did not change, skipping...');
      return null;
    }

    let priceToApply;
    if (newPriceIsNumeric) {
      priceToApply = newData.newPrice;
      logger.info(`Applying new base price ${priceToApply} for product ${productId}`);
    } else {
      if (!oldPriceIsNumeric) {
        logger.info('newPrice is not numeric and no prior override, skipping revert.');
        return null;
      }
      const productSnap = await db.collection('products').doc(productId).get();
      if (!productSnap.exists) {
        logger.info(`Product ${productId} not found; cannot revert price.`);
        return null;
      }
      priceToApply = productSnap.data().price;
      logger.info(`Reverting price for product ${productId} to base price ${priceToApply}`);
    }

    // Fetch the margin and apply it
    const margin = await getMargin();
    priceToApply = applyMargin(priceToApply, margin);

    const ordersSnap = await db.collection('orders').where('weekCode', '==', weekCode).get();
    if (ordersSnap.empty) {
      logger.info(`No orders found for weekCode=${weekCode} to update.`);
      return null;
    }
    const relevantDocs = ordersSnap.docs.filter((docSnap) => {
      const data = docSnap.data();
      return data.deliveryStatus !== 'delivered';
    });
    if (relevantDocs.length === 0) {
      logger.info('All orders are delivered or none matching. Nothing to update.');
      return null;
    }
    const batch = db.batch();
    relevantDocs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) return;
      let changed = false;
      const updatedItems = orderData.items.map((item) => {
        if (item.id === productId) {
          changed = true;
          return { ...item, price: priceToApply };
        }
        return item;
      });
      if (changed) {
        batch.update(orderDoc.ref, {
          items: updatedItems,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
    if (batch._ops.length === 0) {
      logger.info('No items needed updating in non-delivered orders.');
      return null;
    }
    await batch.commit();
    logger.info(`Successfully updated non-delivered orders for product ${productId} with final price ${priceToApply}.`);
    return null;
  }
);
