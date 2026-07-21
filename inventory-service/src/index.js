const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/stock/:id', (req,res)=>res.json({productId: req.params.id, stock: Math.floor(Math.random()*50)}));

app.use('/', router);
app.use('/api/inventory', router);

const PORT = process.env.INVENTORY_SERVICE_PORT || 3007;
app.listen(PORT, '0.0.0.0', () => console.log(`inventory-service running on ${PORT}`));
