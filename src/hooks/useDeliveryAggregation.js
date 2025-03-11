// src/hooks/useDeliveryAggregation.js
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { getWeekCode } from '../utils/dateUtils';

/**
 * A custom hook that fetches and aggregates orders, plus checks for supplier invoices.
 * Returns { orders, aggregatedBySupplier, supplierInvoiceUrl, reloadInvoices }
 */
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
      if (order.items) {
        order.items.forEach(item => {
          const supplier = item.supplier || 'Unknown';
          if (!newAggregated[supplier]) {
            newAggregated[supplier] = {};
          }
          if (!newAggregated[supplier][item.id]) {
            newAggregated[supplier][item.id] = { ...item };
          } else {
            newAggregated[supplier][item.id].quantity += item.quantity;
          }
        });
      }
    });
    setAggregatedBySupplier(newAggregated);
  }, [orders]);

  // 3) Check if there's an uploaded invoice in Firestore for each supplier
  //    Provide a function so we can reload if needed
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
