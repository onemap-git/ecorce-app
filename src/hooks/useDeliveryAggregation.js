// src/hooks/useDeliveryAggregation.js
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { getWeekCode } from '../utils/dateUtils';

export function useDeliveryAggregation() {
  const [orders, setOrders] = useState([]);
  const [aggregatedBySupplier, setAggregatedBySupplier] = useState({});
  const [supplierInvoiceUrl, setSupplierInvoiceUrl] = useState({});
  const currentWeek = getWeekCode(new Date());

  // 1) Fetch orders for current week
  useEffect(() => {
    const wc = getWeekCode(new Date());
    const ordersRef = collection(firestore, 'orders');
    const qOrders = query(ordersRef, where('weekCode', '==', wc));
    const unsub = onSnapshot(qOrders, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data);
    });
    return () => unsub();
  }, []);

  // 2) Recompute aggregatedBySupplier whenever orders changes
  useEffect(() => {
    const newAggregated = {};

    orders.forEach(order => {
      // Suppose we store a "companyName" in the order doc
      // or we fall back to the order's email:
      const company = order.companyName || order.email || "Unknown";

      if (order.items) {
        order.items.forEach(item => {
          const supplier = item.supplier || 'Unknown';

          // Initialize that supplier if missing
          if (!newAggregated[supplier]) {
            newAggregated[supplier] = {};
          }

          // If this product doesn't exist yet in the aggregator, create it
          if (!newAggregated[supplier][item.id]) {
            newAggregated[supplier][item.id] = {
              ...item,
              comments: []  // store array of {company, comment}
            };
          } else {
            // If it already exists, just increment quantity
            newAggregated[supplier][item.id].quantity += item.quantity;
          }

          // If there's a comment, push {company, comment} object
          if (item.comment && item.comment.trim() !== "") {
            newAggregated[supplier][item.id].comments.push({
              company,
              comment: item.comment
            });
          }
        });
      }
    });

    setAggregatedBySupplier(newAggregated);
  }, [orders]);

  // 3) (Optional) Check for uploaded invoices
  async function reloadInvoices(aggregatedObj) {
    for (const supplier of Object.keys(aggregatedObj)) {
      const docId = `${currentWeek}_${supplier}`;
      const invoiceDocRef = doc(firestore, 'delivery_invoices', docId);
      const snapshot = await getDoc(invoiceDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.invoiceUrl) {
          setSupplierInvoiceUrl((prev) => ({
            ...prev,
            [supplier]: data.invoiceUrl
          }));
        }
      }
    }
  }
  useEffect(() => {
    reloadInvoices(aggregatedBySupplier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregatedBySupplier]);

  return {
    orders,
    aggregatedBySupplier,
    supplierInvoiceUrl,
    reloadInvoices,
    currentWeek,
  };
}
