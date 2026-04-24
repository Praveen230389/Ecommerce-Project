const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'UP' }));

// In-memory cart
let cart = [];

// GET CART (FIXED - removes bad data)
app.get('/', (req, res) => {
  const validCart = cart.filter(item => item.id && item.name && item.price);
  res.json(validCart);
});

// ADD TO CART (FIXED - prevents bad entries)
app.post('/add', (req, res) => {
  const { id, name, price, img } = req.body;

  // Validate input
  if (!id || !name || !price) {
    return res.status(400).json({ error: 'Invalid product data' });
  }

  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id,
      name,
      price,
      img,
      quantity: 1
    });
  }

  res.json({ success: true, cart });
});

// CLEAR CART
app.post('/clear', (req, res) => {
  cart = [];
  res.json({ success: true });
});

// Start server
const PORT = 3004;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`cart-service running on ${PORT}`);
});
