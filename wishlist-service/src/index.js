const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); let list=[]; router.get('/', (req,res)=>res.json(list));

app.use('/', router);
app.use('/api/wishlist', router);

const PORT = process.env.WISHLIST_SERVICE_PORT || 3010;
app.listen(PORT, '0.0.0.0', () => console.log(`wishlist-service running on ${PORT}`));
