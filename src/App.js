// src/App.js
import React, { useEffect, useState } from 'react';
import { auth, firestore } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProductsPage from './components/ProductsPage';
import OrderHistory from './components/OrderHistory';
import DeliveryDashboard from './components/DeliveryDashboard';
import ProductsManager from './components/ProductsManager'; // NEW: Products Manager for admins
import OrderHistoryByWeek from './components/OrderHistoryByWeek'; // NEW: Order History by Week

function App() {
  const [user, setUser] = useState(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // admin flag
  const [loading, setLoading] = useState(true); // loading state

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Fetch the user document from Firestore
        const userDocRef = doc(firestore, 'users', u.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          setIsDelivery(data.delivery === true);
          setIsAdmin(data.admin === true); // set admin flag based on user doc
        } else {
          setIsDelivery(false);
          setIsAdmin(false);
        }
      } else {
        setIsDelivery(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    // Render a loading indicator until auth and user data are loaded
    return <div>Loading application...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public route for login */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        {/* Normal user route */}
        <Route
          path="/"
          element={user ? <ProductsPage user={user} isDelivery={isDelivery} /> : <Navigate to="/login" />}
        />
        <Route path="/orders" element={user ? <OrderHistory user={user} /> : <Navigate to="/login" />} />
        {/* Delivery route */}
        <Route
          path="/delivery"
          element={user && isDelivery ? <DeliveryDashboard user={user} isAdmin={isAdmin} /> : <Navigate to="/" />}
        />
        {/* Admin Products Manager route */}
        <Route
          path="/admin/products"
          element={user && isAdmin ? <ProductsManager user={user} /> : <Navigate to="/" />}
        />
        {/* Order History by Week route - accessible to delivery and admin users */}
        <Route
          path="/delivery/history"
          element={user && (isDelivery || isAdmin) ? <OrderHistoryByWeek user={user} isAdmin={isAdmin} /> : <Navigate to="/" />}
        />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
