// src/components/VirtualizedProductsTable.js
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Définitions de colonnes de base
// Ajout d'une nouvelle colonne pour "Fournisseur" avec une largeur de base de 120
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
 * Rendu d'une ligne de données (sans en-tête).
 */
const RowRendererWithoutHeader = ({ index, style, data }) => {
  const { products, addToBasket, scaledColumns } = data;
  const product = products[index];
  if (!product) return null;
  const formattedPrice = parseFloat(product.price).toFixed(2);
  return (
    <div style={{ ...style, display: 'flex', borderBottom: '1px solid #eee' }}>
      {/* Colonne 1 : Bio */}
      <div
        style={{
          width: scaledColumns[0].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.bio ? '🌿' : ''}
      </div>
      {/* Colonne 2 : Nom du produit */}
      <div
        style={{
          width: scaledColumns[1].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.name}
      </div>
      {/* Colonne 3 : Catégorie */}
      <div
        style={{
          width: scaledColumns[2].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.category}
      </div>
      {/* Colonne 4 : Fournisseur */}
      <div
        style={{
          width: scaledColumns[3].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        {product.supplier || ''}
      </div>
      {/* Colonne 5 : Prix (aligné à droite) */}
      <div
        style={{
          width: scaledColumns[4].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
          textAlign: 'right',
        }}
      >
        ${formattedPrice}
      </div>
      {/* Colonne 6 : Quantité (fixée à "1" dans cet exemple minimal) */}
      <div
        style={{
          width: scaledColumns[5].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        1
      </div>
      {/* Colonne 7 : Bouton Ajouter */}
      <div
        style={{
          width: scaledColumns[6].scaledWidth,
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        <button onClick={() => addToBasket(product, 1)}>Ajouter</button>
      </div>
    </div>
  );
};

function VirtualizedProductsTable({ products, addToBasket }) {
  // Largeur totale de toutes les colonnes combinées, avant le redimensionnement
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
          // Réserver de l'espace pour la ligne d'en-tête
          const headerHeight = ROW_HEIGHT;
          const listHeight = height - headerHeight;
          return (
            <>
              {/* En-tête fixe */}
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
              {/* Liste déroulante des lignes */}
              <List
                height={listHeight}
                width={width}
                itemCount={products.length}
                itemSize={ROW_HEIGHT}
                itemData={{ products, addToBasket, scaledColumns }}
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

export default VirtualizedProductsTable;
