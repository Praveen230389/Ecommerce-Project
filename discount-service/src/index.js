const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.post('/apply', (req,res)=>res.json({valid:true, reduction:0.15}));

app.use('/', router);
app.use('/api/discount', router);

const PORT = process.env.PORT || 3014;
app.listen(PORT, '0.0.0.0', () => console.log(`discount-service running on ${PORT}`));
