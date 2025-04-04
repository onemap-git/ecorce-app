// src/utils/formatPrice.js
import { applyMargin } from './pricing';

/**
 * Formats a given price by applying the margin percentage.
 * @param {number} value - The base price.
 * @param {number} [margin=0] - The margin percentage to apply.
 * @returns {string} The final price formatted to two decimal places.
 */
export function formatPrice(value, margin = 0) {
  const padded = applyMargin(value, margin);
  return padded.toFixed(2);
}
