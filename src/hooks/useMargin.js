import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';

/**
 * Custom hook to fetch the margin percentage from Firestore.
 * It listens to the document at settings/sales and returns the margin,
 * defaulting to 0 if not set.
 */
export function useMargin() {
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    const marginDocRef = doc(firestore, 'settings', 'sales');
    const unsubscribe = onSnapshot(marginDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMargin(data.margin ?? 0);
      } else {
        setMargin(0);
      }
    });
    return () => unsubscribe();
  }, []);

  return margin;
}
