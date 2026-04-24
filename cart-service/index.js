const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
let cart = [];
app.get('/', (req,res)=>res.json(cart));
app.post('/add', (req,res)=>{ 
  const existing = cart.find(i => i.id === req.body.id);
  if(existing) existing.quantity++;
  else cart.push({...req.body, quantity: 1});
  res.json({success:true, cart}) 
});
app.post('/clear', (req,res)=>{ cart=[]; res.json({success:true}) });

const PORT = 3004;
app.listen(PORT, '0.0.0.0', () => console.log(`cart-service running on ${PORT}`));