// src/utils/pricing.js
/**
 * Given a base price and a margin percentage, return the final price.
 * @param {number} basePrice - The original price.
 * @param {number} margin - The margin percentage (e.g., 10 for 10%).
 * @returns {number} The final price.
 */
export function applyMargin(basePrice, margin) {
    return basePrice * (1 + margin / 100);
  }
  