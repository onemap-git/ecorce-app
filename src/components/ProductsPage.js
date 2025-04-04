// src/components/ProductsPage.js
import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box
} from '@mui/material';
import Logo from '../logo.svg';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
// Import our FilterBar and ResponsiveProductsView:
import FilterBar from './FilterBar';
import ResponsiveProductsView from './ResponsiveProductsView';
import Basket from './Basket';
import { getWeekCode, getHumanReadableWeek } from '../utils/dateUtils';

function ProductsPage({ user, isDelivery }) {
  // --- State for products, basket, user address, etc.
  const [products, setProducts] = useState([]);
  const [basket, setBasket] = useState([]);
  const [userAddress, setUserAddress] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);

  // --- Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [bioOnly, setBioOnly] = useState(false);

  // For auto-saving
  const lastRemoteBasketRef = useRef([]);

  // For restricting orders to certain days
  const today = new Date();
  const allowedDays = [1, 2, 3]; // Monday=1, Tuesday=2, Wednesday=3
  // or set by environment
  const bypassOrderRestrictions = process.env.REACT_APP_BYPASS_ORDER_RESTRICTION === 'true';
  const isOrderAllowed = bypassOrderRestrictions || allowedDays.includes(today.getDay());

  // Current week code
  const currentWeek = getWeekCode(today);
  const humanReadableWeek = getHumanReadableWeek(today);

  // ------------------------------------------------------------------
  //  1) Retrieve user's address from "res_partner"
  // ------------------------------------------------------------------
  useEffect(() => {
    if (user && user.email) {
      const fetchAddress = async () => {
        try {
          const partnersRef = collection(firestore, 'res_partner');
          const qPartner = query(partnersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(qPartner);
          if (!querySnapshot.empty) {
            const partnerData = querySnapshot.docs[0].data();
            setUserAddress(partnerData.contact_address_complete || '');
          }
        } catch (error) {
          console.error("Error retrieving address from res_partner:", error);
        }
      };
      fetchAddress();
    }
  }, [user]);

  // ------------------------------------------------------------------
  //  2) Retrieve all products (available == true)
  // ------------------------------------------------------------------
  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('available', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  // ------------------------------------------------------------------
  //  3) Load an "open" order for the user (status == 'open')
  // ------------------------------------------------------------------
  useEffect(() => {
    const ordersRef = collection(firestore, 'orders');
    const qOrders = query(
      ordersRef,
      where('userId', '==', user.uid),
      where('status', '==', 'open')
    );
    const unsubscribe = onSnapshot(qOrders, (snapshot) => {
      if (!snapshot.empty) {
        // pick the most recently updated open order
        const openOrders = snapshot.docs.sort((a, b) => {
          const aTime = a.data().updatedAt ? a.data().updatedAt.seconds : 0;
          const bTime = b.data().updatedAt ? b.data().updatedAt.seconds : 0;
          return bTime - aTime;
        });
        const activeOrder = openOrders[0];
        const data = activeOrder.data();
        setActiveOrderId(activeOrder.id);
        const remoteItems = data.items || [];
        // If remote items differ from local basket, sync them
        if (JSON.stringify(remoteItems) !== JSON.stringify(basket)) {
          setBasket(remoteItems);
        }
        lastRemoteBasketRef.current = remoteItems;
      } else {
        // no open orders, so no basket
        setActiveOrderId(null);
        setBasket([]);
        lastRemoteBasketRef.current = [];
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  // ------------------------------------------------------------------
  //  Basket modifications
  // ------------------------------------------------------------------
  const addToBasket = (product, quantity) => {
    setBasket(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prev, { ...product, quantity }];
      }
    });
  };

  const updateBasketItem = (id, newQuantity) => {
    setBasket(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );
  };

  const updateBasketItemComment = (id, comment) => {
    setBasket(prev =>
      prev.map(item => (item.id === id ? { ...item, comment } : item))
    );
  };

  const removeBasketItem = (id) => {
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  // ------------------------------------------------------------------
  //  Manual order saving
  // ------------------------------------------------------------------
  const saveOrder = async () => {
    if (basket.length === 0) {
      alert("Le panier est vide !");
      return;
    }
    if (!isOrderAllowed) {
      alert("Les commandes ne peuvent être passées que du lundi au mercredi.");
      return;
    }
    const orderData = {
      userId: user.uid,
      email: user.email,
      items: basket,
      weekCode: getWeekCode(new Date()),
      status: "open",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    try {
      if (activeOrderId) {
        await updateDoc(doc(firestore, 'orders', activeOrderId), orderData);
        alert('Commande mise à jour !');
      } else {
        const docRef = await addDoc(collection(firestore, 'orders'), orderData);
        setActiveOrderId(docRef.id);
        alert('Commande créée et enregistrée !');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erreur lors de l\'enregistrement de la commande');
    }
  };

  // ------------------------------------------------------------------
  //  Auto-save effect
  // ------------------------------------------------------------------
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!activeOrderId && basket.length > 0) {
        // Create new order when there is no active order and basket is non-empty
        const orderData = {
          userId: user.uid,
          email: user.email,
          items: basket,
          weekCode: getWeekCode(new Date()),
          status: "open",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        addDoc(collection(firestore, 'orders'), orderData)
          .then(docRef => {
            setActiveOrderId(docRef.id);
            lastRemoteBasketRef.current = basket;
          })
          .catch(error => {
            console.error('Error auto-creating order', error);
          });
      } else if (activeOrderId) {
        // If we do have an active order, only update if basket changed
        if (JSON.stringify(basket) !== JSON.stringify(lastRemoteBasketRef.current)) {
          updateDoc(doc(firestore, 'orders', activeOrderId), {
            items: basket,
            updatedAt: serverTimestamp(),
          })
            .then(() => {
              lastRemoteBasketRef.current = basket;
            })
            .catch(error => {
              console.error(`Error updating order ${activeOrderId}`, error);
            });
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [basket, activeOrderId, user.uid]);

  // ------------------------------------------------------------------
  //  Filter logic
  // ------------------------------------------------------------------
  const distinctCategories = Array.from(new Set(products.map(p => p.category))).sort();
  const distinctSuppliers = Array.from(new Set(products.map(p => p.supplier))).sort();

  // Filter products based on the states
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    const matchesSupplier = selectedSupplier
      ? product.supplier === selectedSupplier
      : true;
    const matchesBio = bioOnly ? product.bio === true : true;
    return matchesSearch && matchesCategory && matchesSupplier && matchesBio;
  });

  // ------------------------------------------------------------------
  //  CUSTOM SORT: FRUITS -> LEGUMES -> everything else
  // ------------------------------------------------------------------
  const categoryPriority = {
    FRUITS: 1,
    LEGUMES: 2,
  };

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    const catA = (a.category || '').toUpperCase();
    const catB = (b.category || '').toUpperCase();

    const priorityA = categoryPriority[catA] || 999;  // 999 if not FRUITS or LEGUMES
    const priorityB = categoryPriority[catB] || 999;

    // First compare priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, compare category alphabetically
    const catComparison = catA.localeCompare(catB);
    if (catComparison !== 0) {
      return catComparison;
    }

    // If same category, compare name alphabetically
    return (a.name || '').localeCompare(b.name || '');
  });

  // ------------------------------------------------------------------
  //  Logout handler
  // ------------------------------------------------------------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------
  return (
    <Container sx={{ pt: 4, pb: { xs: 10, lg: 2 }, pr: { xs: 2, lg: '320px' } }}>
      {/* Header / Logo / Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <img src={Logo} alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
          <br />
          <Button variant="outlined" component={Link} to="/orders" sx={{ mt: 1 }}>
            Voir l'historique des commandes
          </Button>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          {user && (
            <>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {user.email}
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleLogout}
                sx={{ mt: 1 }}
              >
                Déconnexion
              </Button>
              {isDelivery && (
                <Button variant="outlined" component={Link} to="/delivery" sx={{ mt: 1, ml: 1 }}>
                  Tableau de bord des livraisons
                </Button>
              )}
              {userAddress && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {userAddress}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {humanReadableWeek}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Filter Bar (with mobile dialog) */}
      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        bioOnly={bioOnly}
        setBioOnly={setBioOnly}
        distinctCategories={distinctCategories}
        distinctSuppliers={distinctSuppliers}
      />

      {/* Product list/table (responsive) */}
      <Box className="table-container">
        <ResponsiveProductsView
          products={sortedFilteredProducts}
          addToBasket={addToBasket}
          basket={basket}
        />
      </Box>

      {/* Basket (at bottom) */}
      <Basket
        basket={basket}
        updateBasketItem={updateBasketItem}
        updateBasketItemComment={updateBasketItemComment}
        removeBasketItem={removeBasketItem}
        saveOrder={saveOrder}
        isOrderAllowed={isOrderAllowed}
      />
    </Container>
  );
}

export default ProductsPage;
