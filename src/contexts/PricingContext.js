// src/contexts/PricingContext.js
import React, { createContext, useContext } from 'react';
import { useMargin } from '../hooks/useMargin';
import { applyMargin } from '../utils/pricing';

const PricingContext = createContext({
  margin: 0,
  getFinalPrice: (price) => price,
});

export const PricingProvider = ({ children }) => {
  const margin = useMargin();
  const getFinalPrice = (basePrice) => applyMargin(basePrice, margin);

  return (
    <PricingContext.Provider value={{ margin, getFinalPrice }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => useContext(PricingContext);
