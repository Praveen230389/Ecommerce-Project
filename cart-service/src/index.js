const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'}));
let cart = [];
router.get('/', (req,res)=>res.json(cart));
router.post('/add', (req,res)=>{ 
  const existing = cart.find(i => i.id === req.body.id);
  if(existing) existing.quantity++;
  else cart.push({...req.body, quantity: 1});
  res.json({success:true, cart}) 
});
router.post('/clear', (req,res)=>{ cart=[]; res.json({success:true}) });

app.use('/', router);
app.use('/api/cart', router);

const PORT = process.env.CART_SERVICE_PORT || 3004;
app.listen(PORT, '0.0.0.0', () => console.log(`cart-service running on ${PORT}`));
