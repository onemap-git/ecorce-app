// src/components/VirtualizedProductsTable.js
import React, { useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { usePricing } from '../contexts/PricingContext';    // <-- NEW
import { formatPrice } from '../utils/formatPrice';          // <-- NEW

// Define your columns
const columns = [
  { label: 'Bio', baseWidth: 40 },
  { label: 'Produit', baseWidth: 300 },
  { label: 'Catégorie', baseWidth: 150 },
  { label: 'Fournisseur', baseWidth: 120 },
  { label: 'Prix', baseWidth: 80 },
  { label: 'Quantité', baseWidth: 60 },
  { label: 'Ajouter', baseWidth: 60 },
];

const ROW_HEIGHT = 50;

/**
 * RowRenderer: We pass getFinalPrice via itemData, so we can apply margin.
 */
function RowRendererWithoutHeader({ index, style, data }) {
  const { 
    products, 
    addToBasket, 
    scaledColumns, 
    getFinalPrice, 
    basket, 
    getQuantity, 
    updateQuantity 
  } = data;
  
  const product = products[index];
  if (!product) return null;

  // 1) Apply margin
  const finalPrice = getFinalPrice(product.price);
  // 2) Format it
  const displayPrice = formatPrice(finalPrice);
  
  const isInBasket = basket ? basket.some(item => item.id === product.id) : false;
  const quantity = getQuantity(product.id);

  const handleAddToBasket = () => {
    addToBasket(product, quantity);
    updateQuantity(product.id, 1);
  };

  return (
    <div style={{ 
      ...style, 
      display: 'flex', 
      borderBottom: '1px solid #eee',
      backgroundColor: isInBasket ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
    }}>
      {/* Column 1: Bio */}
      <div
        style={{
          width: scaledColumns[0].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.bio ? '🌿' : ''}
      </div>

      {/* Column 2: Product Name */}
      <div
        style={{
          width: scaledColumns[1].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.name}
      </div>

      {/* Column 3: Category */}
      <div
        style={{
          width: scaledColumns[2].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.category}
      </div>

      {/* Column 4: Supplier */}
      <div
        style={{
          width: scaledColumns[3].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.supplier || ''}
      </div>

      {/* Column 5: Price (with margin) */}
      <div
        style={{
          width: scaledColumns[4].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
          textAlign: 'right',
        }}
      >
        ${displayPrice}
      </div>

      {/* Column 6: Quantity input */}
      <div
        style={{
          width: scaledColumns[5].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        <input 
          type="number" 
          min="1" 
          value={quantity} 
          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value, 10) || 1)} 
          style={{ width: '40px' }}
        />
      </div>

      {/* Column 7: Add button */}
      <div
        style={{
          width: scaledColumns[6].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        <button onClick={handleAddToBasket}>Ajouter</button>
      </div>
    </div>
  );
}

export default function VirtualizedProductsTable({ products, addToBasket, basket }) {
  // Pull getFinalPrice from context
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

  // The rest is your existing code for layout
  const totalBaseWidth = columns.reduce((sum, col) => sum + col.baseWidth, 0);

  return (
    <div style={{ height: '80vh', width: '100%' }}>
      <AutoSizer>
        {({ width, height }) => {
          const ratio = totalBaseWidth > 0 ? width / totalBaseWidth : 1;
          const scaledColumns = columns.map((col) => ({
            label: col.label,
            scaledWidth: col.baseWidth * ratio,
          }));
          const headerHeight = ROW_HEIGHT;
          const listHeight = height - headerHeight;

          return (
            <>
              {/* Header row */}
              <div
                style={{
                  width: `${width}px`,
                  display: 'flex',
                  backgroundColor: '#F5F3EB',
                  fontWeight: 'bold',
                  height: headerHeight,
                }}
              >
                {scaledColumns.map((col) => (
                  <div
                    key={col.label}
                    style={{
                      width: col.scaledWidth,
                      padding: '8px',
                      boxSizing: 'border-box',
                      borderRight: '1px solid #ddd',
                    }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Scrolling list */}
              <List
                height={listHeight}
                width={width}
                itemCount={products.length}
                itemSize={ROW_HEIGHT}
                itemData={{ products, addToBasket, scaledColumns, getFinalPrice, basket, getQuantity, updateQuantity }}
              >
                {RowRendererWithoutHeader}
              </List>
            </>
          );
        }}
      </AutoSizer>
    </div>
  );
}
