// 1) Import Functions + Admin SDK
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

// 2) Initialize Admin if not already
admin.initializeApp();

// 3) Access Firestore via admin
const db = admin.firestore();

/**
 * Triggers whenever a `delivery_checklist/{docId}` doc is created/updated/deleted.
 * If a new numeric value is set in the `newPrice` field, it updates all non-delivered orders.
 * If `newPrice` is cleared (non-numeric) after having been set, it reverts to the product's default price.
 */
exports.applyPriceChangeToAllOrders = onDocumentWritten(
  {
    document: 'delivery_checklist/{docId}',
  },
  async (event) => {
    // If the document was deleted, exit.
    if (!event.data.after) {
      return null;
    }

    // Get old and new data.
    const oldData = event.data.before?.data() || {};
    const newData = event.data.after.data() || {};

    // Must have a productId.
    if (!newData.productId) {
      logger.info('No productId in new data, skipping...');
      return null;
    }

    // Must have a weekCode.
    const weekCode = newData.weekCode;
    if (!weekCode) {
      logger.info('No weekCode in new data, skipping...');
      return null;
    }

    const productId = newData.productId;

    // Determine whether newPrice is numeric.
    const newPriceIsNumeric = typeof newData.newPrice === 'number';
    const oldPriceIsNumeric = typeof oldData.newPrice === 'number';

    // If newPrice hasn't changed, do nothing.
    if (newData.newPrice === oldData.newPrice) {
      logger.info('newPrice did not change, skipping...');
      return null;
    }

    // Decide which price to apply.
    let priceToApply;
    if (newPriceIsNumeric) {
      // When a new numeric price is provided, use it.
      priceToApply = newData.newPrice;
      logger.info(`Applying new price ${priceToApply} for product ${productId}`);
    } else {
      // When newPrice is cleared, revert only if there was a prior override.
      if (!oldPriceIsNumeric) {
        logger.info('newPrice is not numeric and no prior override, skipping revert.');
        return null;
      }
      // Fetch the product's default price from Firestore.
      const productSnap = await db.collection('products').doc(productId).get();
      if (!productSnap.exists) {
        logger.info(`Product ${productId} not found; cannot revert price.`);
        return null;
      }
      priceToApply = productSnap.data().price;
      logger.info(`Reverting price for product ${productId} to default ${priceToApply}`);
    }

    // 4) Query the "orders" collection for orders matching the weekCode.
    const ordersSnap = await db
      .collection('orders')
      .where('weekCode', '==', weekCode)
      .get();

    if (ordersSnap.empty) {
      logger.info(`No orders found for weekCode=${weekCode} to update.`);
      return null;
    }

    // 5) Filter out orders that are already delivered.
    const relevantDocs = ordersSnap.docs.filter((docSnap) => {
      const data = docSnap.data();
      return data.deliveryStatus !== 'delivered';
    });

    if (relevantDocs.length === 0) {
      logger.info('All orders are delivered or none matching. Nothing to update.');
      return null;
    }

    // 6) Batch-update all relevant (non-delivered) orders.
    const batch = db.batch();

    relevantDocs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return; // No items to update.
      }

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

    // If no documents were updated, exit.
    if (batch._ops.length === 0) {
      logger.info('No items needed updating in non-delivered orders.');
      return null;
    }

    // 7) Commit the batch update.
    await batch.commit();
    logger.info(
      `Successfully updated non-delivered orders for product ${productId} with price ${priceToApply}.`
    );
    return null;
  }
);
