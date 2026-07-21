const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/tracking/:id', (req,res)=>res.json({status:'Dispatched', location:'Facility A'}));

app.use('/', router);
app.use('/api/shipping', router);

const PORT = process.env.SHIPPING_SERVICE_PORT || 3012;
app.listen(PORT, '0.0.0.0', () => console.log(`shipping-service running on ${PORT}`));
