// 1) Import Functions + Admin SDK
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions'); // optional for logs
const admin = require('firebase-admin');

// 2) Initialize Admin if not already
admin.initializeApp();

// 3) Access Firestore via admin
const db = admin.firestore();

/**
 * Triggers whenever a `delivery_checklist/{docId}` doc is created/updated/deleted.
 * We specifically look for changes in the `newPrice` field, and apply them
 * to non-delivered orders containing that product (same weekCode).
 */
exports.applyPriceChangeToAllOrders = onDocumentWritten(
  {
    document: 'delivery_checklist/{docId}',
    // optionally you can set `region` / `timeoutSeconds` / `memory`
  },
  async (event) => {
    // If the document was deleted, exit
    if (!event.data.after) {
      return null;
    }

    // old data vs. new data
    const oldData = event.data.before?.data() || {};
    const newData = event.data.after.data() || {};

    // Make sure `productId` and `newPrice` exist
    if (!newData.productId) {
      logger.info('No productId in new data, skipping...');
      return null;
    }
    if (typeof newData.newPrice !== 'number') {
      logger.info('No numeric newPrice in new data, skipping...');
      return null;
    }

    // If `newPrice` hasn't changed, do nothing
    if (newData.newPrice === oldData.newPrice) {
      logger.info('newPrice did not change, skipping...');
      return null;
    }

    // Require a weekCode (so we only update the current week's orders).
    const weekCode = newData.weekCode;
    if (!weekCode) {
      logger.info('No weekCode in new data, skipping...');
      return null;
    }

    const productId = newData.productId;
    const newPrice = newData.newPrice;

    // 4) Query the "orders" collection for the matching weekCode.
    // We'll filter out delivered status in code below.
    const ordersSnap = await db
      .collection('orders')
      .where('weekCode', '==', weekCode)
      .get();

    if (ordersSnap.empty) {
      logger.info(`No orders found for weekCode=${weekCode} to update.`);
      return null;
    }

    // 5) Filter out orders that are explicitly "delivered".
    //    If deliveryStatus is missing or anything else, we apply the new price.
    const relevantDocs = ordersSnap.docs.filter((docSnap) => {
      const data = docSnap.data();
      return data.deliveryStatus !== 'delivered'; // keep only non-delivered
    });

    if (relevantDocs.length === 0) {
      logger.info('All orders are delivered or none matching. Nothing to update.');
      return null;
    }

    // 6) Batch-update all relevant (non-delivered) orders
    const batch = db.batch();

    relevantDocs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return; // no items to update
      }

      let changed = false;
      const updatedItems = orderData.items.map((item) => {
        if (item.id === productId) {
          changed = true;
          return { ...item, price: newPrice };
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

    // If no docs got changed at all, skip
    if (batch._ops.length === 0) {
      logger.info('No items needed updating in non-delivered orders.');
      return null;
    }

    // 7) Commit the batch
    await batch.commit();
    logger.info(
      `Successfully updated non-delivered orders with new price ${newPrice} for productId ${productId}.`
    );
    return null;
  }
);
