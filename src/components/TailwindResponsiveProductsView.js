import React from 'react';
import TailwindMobileProductsList from './TailwindMobileProductsList';
import { usePricing } from '../contexts/PricingContext';
import { formatPrice } from '../utils/formatPrice';

const columns = [
  { label: 'Bio', baseWidth: 40 },
  { label: 'Produit', baseWidth: 300 },
  { label: 'Catégorie', baseWidth: 150 },
  { label: 'Fournisseur', baseWidth: 120 },
  { label: 'Prix', baseWidth: 80 },
  { label: 'Quantité', baseWidth: 60 },
  { label: 'Ajouter', baseWidth: 60 },
];

function TailwindProductsTable({ products, addToBasket, basket }) {
  const { getFinalPrice } = usePricing();
  const [quantityMap, setQuantityMap] = React.useState({});

  const updateQuantity = (productId, value) => {
    setQuantityMap(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const getQuantity = (productId) => {
    return quantityMap[productId] || 1;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.baseWidth }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => {
            const finalPrice = getFinalPrice(product.price);
            const displayPrice = formatPrice(finalPrice);
            const isInBasket = basket ? basket.some(item => item.id === product.id) : false;
            const quantity = getQuantity(product.id);

            return (
              <tr 
                key={product.id}
                className={isInBasket ? 'bg-blue-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.bio ? '🌿' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.supplier || ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  ${displayPrice}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)}
                    className="w-16 p-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => {
                      addToBasket(product, quantity);
                      updateQuantity(product.id, 1);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Ajouter
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TailwindResponsiveProductsView({ products, addToBasket, basket }) {
  const isMobile = window.innerWidth < 640;

  if (isMobile) {
    return <TailwindMobileProductsList products={products} addToBasket={addToBasket} basket={basket} />;
  } else {
    return <TailwindProductsTable products={products} addToBasket={addToBasket} basket={basket} />;
  }
}
