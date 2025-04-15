import React, { useState, useEffect } from 'react';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';

function TailwindBasket({ basket, updateBasketItem, updateBasketItemComment, removeBasketItem, saveOrder, isOrderAllowed }) {
  const [expanded, setExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState({});
  const { getFinalPrice } = usePricing();
  
  const isDesktop = window.innerWidth >= 1024;

  useEffect(() => {
    setCommentOpen(prev => {
      const newState = { ...prev };
      basket.forEach(item => {
        if (item.comment && item.comment.trim() !== '' && !newState[item.id]) {
          newState[item.id] = true;
        }
      });
      return newState;
    });
  }, [basket]);

  const toggleExpand = () => setExpanded(!expanded);
  const toggleComment = (id) => {
    setCommentOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCostValue = basket.reduce((acc, item) => {
    const finalPrice = getFinalPrice(item.price);
    return acc + finalPrice * item.quantity;
  }, 0);
  const totalCost = totalCostValue.toFixed(2);

  return (
    <div className={`
      fixed 
      ${isDesktop ? 'top-0 right-0 h-screen w-[450px]' : 'bottom-0 left-0 right-0 h-auto w-full'} 
      flex flex-col 
      bg-white 
      ${isDesktop ? 'border-l' : 'border-t'} 
      border-gray-300 
      p-4 
      shadow-lg 
      z-50 
      ${isDesktop ? 'overflow-y-auto' : ''}
    `}>
      <div className="flex justify-between items-center">
        <div className={isDesktop ? 'hidden' : 'block'}>
          <button 
            onClick={toggleExpand}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            {expanded ? (
              <>
                Masquer le panier
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </>
            ) : (
              <>
                Afficher le panier
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </div>
        <p className={`${isDesktop ? 'ml-auto' : ''} pr-5`}>
          {basket.length} articles | Total : ${totalCost}
        </p>
      </div>
      
      <div className={`${expanded || isDesktop ? 'block' : 'hidden'} mt-4`}>
        <div className={`${isDesktop ? 'max-h-[calc(100vh-120px)]' : 'max-h-[50vh]'} overflow-y-auto`}>
          {basket.length === 0 ? (
            <p>Aucun article dans le panier</p>
          ) : (
            <div className="space-y-4">
              {[...basket]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => {
                  const finalPrice = getFinalPrice(item.price);
                  const formattedPrice = formatPrice(finalPrice);
                  const lineTotal = (finalPrice * item.quantity).toFixed(2);
                  return (
                    <div key={item.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap relative pr-10">
                        <p className="flex-grow-1 flex-shrink-0 basis-1/2">
                          {item.name} - ${formattedPrice}
                        </p>
                        <p className="w-24 text-right">
                          ${lineTotal}
                        </p>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateBasketItem(item.id, parseInt(e.target.value, 10))}
                          min="1"
                          className="w-16 p-1 border border-gray-300 rounded"
                        />
                        <button 
                          onClick={() => toggleComment(item.id)}
                          className={`text-blue-600 hover:text-blue-800 ${isDesktop ? 'mr-10' : ''}`}
                        >
                          {commentOpen[item.id] ? 'Masquer le commentaire' : 'Ajouter un commentaire'}
                        </button>
                        <button 
                          onClick={() => removeBasketItem(item.id)}
                          className={`text-red-500 hover:text-red-700 ${isDesktop ? 'absolute right-0 top-1/2 transform -translate-y-1/2' : ''}`}
                          aria-label="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                      {commentOpen[item.id] && (
                        <div>
                          <label htmlFor={`comment-${item.id}`} className="sr-only">Commentaire</label>
                          <textarea
                            id={`comment-${item.id}`}
                            className="w-full p-2 border border-gray-300 rounded"
                            placeholder="Commentaire"
                            value={item.comment || ''}
                            onChange={(e) => updateBasketItemComment(item.id, e.target.value)}
                            rows="2"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        
        {basket.length > 0 && (
          <div className="mt-4">
            <button
              onClick={saveOrder}
              disabled={!isOrderAllowed || basket.length === 0}
              className={`w-full py-2 px-4 rounded ${
                isOrderAllowed && basket.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Enregistrer la commande
            </button>
            
            {totalCostValue < 400 && (
              <p className="mt-2 text-red-600 text-base">
                On n'est pas encore à 400$, c'est le minimum pour la livraison.
              </p>
            )}
            
            {!isOrderAllowed && (
              <p className="mt-2 text-red-600 text-sm">
                Les commandes ne peuvent être passées que du lundi au mercredi.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TailwindBasket;
