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
import Logo from '../logo.svg';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import TailwindFilterBar from './TailwindFilterBar';
import TailwindResponsiveProductsView from './TailwindResponsiveProductsView';
import TailwindBasket from './TailwindBasket';
import { getWeekCode, getHumanReadableWeek } from '../utils/dateUtils';

function TailwindProductsPage({ user, isDelivery }) {
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
  const allowedDays = [1, 2, 3]; // Monday=1, Tuesday=2, Wednesday=3
  const bypassOrderRestrictions = process.env.REACT_APP_BYPASS_ORDER_RESTRICTION === 'true';
  const isOrderAllowed = bypassOrderRestrictions || allowedDays.includes(today.getDay());

  const currentWeek = getWeekCode(today);
  const humanReadableWeek = getHumanReadableWeek(today);

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

  useEffect(() => {
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('available', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ordersRef = collection(firestore, 'orders');
    const qOrders = query(
      ordersRef,
      where('userId', '==', user.uid),
      where('status', '==', 'open')
    );
    const unsubscribe = onSnapshot(qOrders, (snapshot) => {
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
      } else {
        setActiveOrderId(null);
        setBasket([]);
        lastRemoteBasketRef.current = [];
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

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
          })
          .catch(error => {
            console.error('Error auto-creating order', error);
          });
      } else if (activeOrderId) {
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

  const distinctCategories = Array.from(new Set(products.map(p => p.category))).sort();
  const distinctSuppliers = Array.from(new Set(products.map(p => p.supplier))).sort();

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

  const categoryPriority = {
    FRUITS: 1,
    LEGUMES: 2,
  };

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    const catA = (a.category || '').toUpperCase();
    const catB = (b.category || '').toUpperCase();

    const priorityA = categoryPriority[catA] || 999;  // 999 if not FRUITS or LEGUMES
    const priorityB = categoryPriority[catB] || 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const catComparison = catA.localeCompare(catB);
    if (catComparison !== 0) {
      return catComparison;
    }

    return (a.name || '').localeCompare(b.name || '');
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="container mx-auto pt-4 pb-10 lg:pb-2 lg:pr-[470px] pl-0 ml-0 w-full">
      {/* Header / Logo / Buttons */}
      <div className="flex justify-between items-start mb-2 w-full ml-0 pl-0">
        <div>
          <img src={Logo} alt="Logo" className="h-10 mb-2.5" />
          <br />
          <Link to="/orders" className="inline-block mt-1 px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
            Voir l'historique des commandes
          </Link>
        </div>
        <div className="text-right pr-2 lg:pr-3">
          {user && (
            <>
              <p className="font-bold">
                {user.email}
              </p>
              <button
                onClick={handleLogout}
                className="mt-1 px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Déconnexion
              </button>
              {isDelivery && (
                <Link to="/delivery" className="inline-block mt-1 ml-1 px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Tableau de bord des livraisons
                </Link>
              )}
              {userAddress && (
                <p className="text-sm text-gray-500">
                  {userAddress}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {humanReadableWeek}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar (with mobile dialog) - using Tailwind component */}
      <TailwindFilterBar
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

      {/* Product list/table (responsive) - using Tailwind component */}
      <div className="table-container ml-0 pl-0 w-full">
        <TailwindResponsiveProductsView
          products={sortedFilteredProducts}
          addToBasket={addToBasket}
          basket={basket}
        />
      </div>

      {/* Basket (at bottom) - using Tailwind component */}
      <TailwindBasket
        basket={basket}
        updateBasketItem={updateBasketItem}
        updateBasketItemComment={updateBasketItemComment}
        removeBasketItem={removeBasketItem}
        saveOrder={saveOrder}
        isOrderAllowed={isOrderAllowed}
      />
    </div>
  );
}

export default TailwindProductsPage;
