const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'}));
let orders = [];
router.post('/checkout', (req,res)=>{ 
  const newOrder = { orderId: 'ORD-'+Math.floor(Math.random()*10000), total: req.body.total, status: 'Processed...', items: req.body.items };
  orders.push(newOrder);
  res.json({success:true, order:newOrder});
});
router.get('/', (req,res)=>res.json(orders));

app.use('/', router);
app.use('/api/orders', router);

const PORT = process.env.ORDER_SERVICE_PORT || 3005;
app.listen(PORT, '0.0.0.0', () => console.log(`order-service running on ${PORT}`));
