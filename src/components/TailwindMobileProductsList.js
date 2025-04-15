import React, { useState } from 'react';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';

function TailwindMobileProductsList({ products, addToBasket, basket }) {
  const { getFinalPrice } = usePricing();
  const [quantityMap, setQuantityMap] = useState({});

  const updateQuantity = (productId, value) => {
    setQuantityMap(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const getQuantity = (productId) => {
    return quantityMap[productId] || 1;
  };

  const handleAddToBasket = (product) => {
    const quantity = getQuantity(product.id);
    addToBasket(product, quantity);
    updateQuantity(product.id, 1);
  };

  return (
    <ul className="divide-y divide-gray-200">
      {products.map((product) => {
        const finalPrice = getFinalPrice(product.price);
        const displayPrice = formatPrice(finalPrice);
        const isInBasket = basket ? basket.some(item => item.id === product.id) : false;
        const quantity = getQuantity(product.id);

        return (
          <li
            key={product.id}
            className={`flex flex-col items-start p-4 ${isInBasket ? 'bg-blue-50' : ''}`}
          >
            <h3 className="font-bold text-lg">
              {product.name}
            </h3>
            <p className="mt-1 text-gray-700">
              Prix: ${displayPrice}
            </p>
            {product.category && (
              <p className="text-gray-600 text-sm">
                Catégorie: {product.category}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4">
              <input
                type="number"
                value={quantity}
                onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)}
                min="1"
                className="w-16 p-1 border border-gray-300 rounded"
              />
              <button 
                onClick={() => handleAddToBasket(product)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ajouter
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default TailwindMobileProductsList;
