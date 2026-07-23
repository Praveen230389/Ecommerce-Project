const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'}));
const items = [
  {id:1, name:'Enterprise K8s Server Blade', price: 4999.00, img:'https://placehold.co/400x300/111827/ffffff?text=Server+Blade'},
  {id:2, name:'Neural AI Processor', price: 2999.50, img:'https://placehold.co/400x300/111827/ffffff?text=AI+Processor'},
  {id:3, name:'Enterprise 100G Switch', price: 899.99, img:'https://placehold.co/400x300/111827/ffffff?text=Network+Switch'},
  {id:4, name:'Cluster Node Array X4', price: 15400.00, img:'https://placehold.co/400x300/111827/ffffff?text=K8s+Nodes'}
];
router.get('/', (req,res)=>res.json(items));
router.get('/:id', (req,res)=>res.json(items.find(i=>i.id == req.params.id)));

app.use('/', router);
app.use('/api/products', router);

const PORT = process.env.PORT || 3003;
app.listen(PORT, '0.0.0.0', () => console.log(`product-service running on ${PORT}`));
