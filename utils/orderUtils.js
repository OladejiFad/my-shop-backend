// utils/orderUtils.js

// Generates a random uppercase alphanumeric string of given length
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generates an order ID prefixed with "TRADY-" and current date (YYYYMMDD)
// Example output: TRADY-20250615-X7F9
function generateOrderId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TRADY-${datePart}-${generateRandomString(4)}`;
}

module.exports = { generateOrderId };
