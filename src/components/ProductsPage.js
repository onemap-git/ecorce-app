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
import Basket from './Basket';
import VirtualizedProductsTable from './VirtualizedProductsTable';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import Logo from '../logo.svg';

function ProductsPage({ user }) {
  const [products, setProducts] = useState([]);
  const [basket, setBasket] = useState([]);
  const [userAddress, setUserAddress] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [bioOnly, setBioOnly] = useState(false);
  const lastRemoteBasketRef = useRef([]);
  const today = new Date();
  const allowedDays = [1, 2, 3];
  const bypassOrderRestrictions = process.env.REACT_APP_BYPASS_ORDER_RESTRICTION === 'true';
  const isOrderAllowed = bypassOrderRestrictions || allowedDays.includes(today.getDay());

  function getWeekCode(date) {
    const target = new Date(date.valueOf());
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = target - firstThursday;
    const weekNumber = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
    return `${weekNumber < 10 ? '0' + weekNumber : weekNumber}-${target.getFullYear()}`;
  }
  const currentWeek = getWeekCode(today);

  // Retrieve user's address from res_partner
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
          console.error("Erreur lors de la récupération de l'adresse depuis res_partner", error);
        }
      };
      fetchAddress();
    }
  }, [user]);

  // Retrieve all products
  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    const unsubscribe = onSnapshot(productsRef, snapshot => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  // Load an open order
  useEffect(() => {
    const ordersRef = collection(firestore, 'orders');
    const qOrders = query(
      ordersRef,
      where('userId', '==', user.uid),
      where('status', '==', 'open')
    );
    const unsubscribe = onSnapshot(qOrders, snapshot => {
      if (!snapshot.empty) {
        const openOrders = snapshot.docs.sort((a, b) => {
          const aTime = a.data().updatedAt ? a.data().updatedAt.seconds : 0;
          const bTime = b.data().updatedAt ? b.data().updatedAt.seconds : 0;
          return bTime - aTime;
        });
        const activeOrder = openOrders[0];
        const data = activeOrder.data();
        setActiveOrderId(activeOrder.id);
        const remoteItems = data.items || [];
        if (JSON.stringify(remoteItems) !== JSON.stringify(basket)) {
          setBasket(remoteItems);
        }
        lastRemoteBasketRef.current = remoteItems;
        console.log(`[ProductsPage] Chargement de la commande active ${activeOrder.id} avec le panier :`, remoteItems);
      } else {
        setActiveOrderId(null);
        setBasket([]);
        lastRemoteBasketRef.current = [];
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Basket modifications
  const addToBasket = (product, quantity) => {
    console.log(`[ProductsPage] addToBasket: productId=${product.id}, quantity=${quantity}`);
    setBasket(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        return [...prev, { ...product, quantity }];
      }
    });
  };

  const updateBasketItem = (id, newQuantity) => {
    console.log(`[ProductsPage] updateBasketItem: id=${id}, newQuantity=${newQuantity}`);
    setBasket(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );
  };

  const updateBasketItemComment = (id, comment) => {
    setBasket(prev =>
      prev.map(item => (item.id === id ? { ...item, comment } : item))
    );
  };

  const removeBasketItem = id => {
    console.log(`[ProductsPage] removeBasketItem: id=${id}`);
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  // Manual order saving
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
        console.log(`[ProductsPage] saveOrder: Commande ${activeOrderId} mise à jour avec succès`);
        alert('Commande mise à jour !');
      } else {
        const docRef = await addDoc(collection(firestore, 'orders'), orderData);
        setActiveOrderId(docRef.id);
        console.log(`[ProductsPage] saveOrder: Commande ${docRef.id} créée avec succès`);
        alert('Commande créée et enregistrée !');
      }
    } catch (error) {
      console.error('[ProductsPage] saveOrder: Erreur lors de l\'enregistrement de la commande', error);
      alert('Erreur lors de l\'enregistrement de la commande');
    }
  };

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!activeOrderId && basket.length > 0) {
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
            console.log(`[ProductsPage] Auto-création de la commande ${docRef.id}`);
          })
          .catch(error => {
            console.error(`[ProductsPage] Erreur lors de la création automatique de la commande`, error);
          });
      } else if (activeOrderId && basket.length > 0) {
        if (JSON.stringify(basket) !== JSON.stringify(lastRemoteBasketRef.current)) {
          updateDoc(doc(firestore, 'orders', activeOrderId), {
            items: basket,
            updatedAt: serverTimestamp(),
          })
            .then(() => {
              console.log(`[ProductsPage] Panier mis à jour pour la commande ${activeOrderId}`);
              lastRemoteBasketRef.current = basket;
            })
            .catch((error) => {
              console.error(`[ProductsPage] Erreur lors de la mise à jour de la commande ${activeOrderId}`, error);
            });
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [basket, activeOrderId, user.uid]);

  // Extract distinct categories and suppliers from products
  const distinctCategories = Array.from(new Set(products.map(p => p.category))).sort();
  const distinctSuppliers = Array.from(new Set(products.map(p => p.supplier))).sort();

  // Filter products based on search, category, supplier, and bio-only filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSupplier = selectedSupplier ? product.supplier === selectedSupplier : true;
    const matchesBio = bioOnly ? product.bio === true : true;
    return matchesSearch && matchesCategory && matchesSupplier && matchesBio;
  });

  console.log(
    `[ProductsPage] render: searchTerm="${searchTerm}", selectedCategory="${selectedCategory}", selectedSupplier="${selectedSupplier}", bioOnly=${bioOnly}, totalProducts=${products.length}, filteredProducts=${filteredProducts.length}`
  );

  return (
    <Container sx={{ pt: 4, pb: 10 }}>
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
              {userAddress && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {userAddress}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Semaine: {currentWeek}
              </Typography>
            </>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', px: 0 }}>
        <Box sx={{ py: 3, borderBottom: '1px solid #DDD' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            Produits
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Rechercher"
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Catégorie"
              >
                <MenuItem value="">Toutes</MenuItem>
                {distinctCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Fournisseur</InputLabel>
              <Select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                label="Fournisseur"
              >
                <MenuItem value="">Tous</MenuItem>
                {distinctSuppliers.map((sup) => (
                  <MenuItem key={sup} value={sup}>
                    {sup}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={bioOnly}
                  onChange={(e) => setBioOnly(e.target.checked)}
                />
              }
              label="Bio seulement"
            />
          </Box>
        </Box>
        <Box className="table-container">
          <VirtualizedProductsTable
            products={filteredProducts}
            addToBasket={addToBasket}
          />
        </Box>
        <Basket
          basket={basket}
          updateBasketItem={updateBasketItem}
          updateBasketItemComment={updateBasketItemComment}
          removeBasketItem={removeBasketItem}
          saveOrder={saveOrder}
          isOrderAllowed={isOrderAllowed}
        />
      </Box>
      {/* Panier dupliqué si nécessaire en bas */}
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
