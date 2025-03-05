// src/App.js
import React, { useEffect, useState } from 'react';
import { auth, firestore } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProductsPage from './components/ProductsPage';
import OrderHistory from './components/OrderHistory';
import DeliveryDashboard from './components/DeliveryDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [loading, setLoading] = useState(true); // New loading state

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Check if user is a delivery person
        const userDocRef = doc(firestore, 'users', u.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.delivery === true) {
            console.log('Is delivery');
            setIsDelivery(true);
          } else {
            setIsDelivery(false);
          }
        } else {
          setIsDelivery(false);
        }
      } else {
        setIsDelivery(false);
      }
      setLoading(false); // Loading complete after auth & fetch check
    });
    return () => unsub();
  }, []);

  if (loading) {
    // Render a loading indicator or nothing until the state is determined
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public or login */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />

        {/* Normal user path */}
        <Route
          path="/"
          element={user ? <ProductsPage user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/orders"
          element={user ? <OrderHistory user={user} /> : <Navigate to="/login" />}
        />

        {/* Delivery path (only accessible if user isDelivery) */}
        <Route
          path="/delivery"
          element={
            user && isDelivery
              ? <DeliveryDashboard user={user} />
              : <Navigate to="/" />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}


export default App;
