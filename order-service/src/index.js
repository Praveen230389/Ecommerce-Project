const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
let orders = [];
app.post('/checkout', (req,res)=>{ 
  const newOrder = { orderId: 'ORD-'+Math.floor(Math.random()*10000), total: req.body.total, status: 'Processed...', items: req.body.items };
  orders.push(newOrder);
  res.json({success:true, order:newOrder});
});
app.get('/', (req,res)=>res.json(orders));

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => console.log(`order-service running on ${PORT}`));