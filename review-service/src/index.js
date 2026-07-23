const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/product/:id', (req,res)=>res.json([{rating:5, text:'Exceptional hardware!'}, {rating:4, text:'Good performance'} ]));

app.use('/', router);
app.use('/api/reviews', router);

const PORT = process.env.PORT || 3009;
app.listen(PORT, '0.0.0.0', () => console.log(`review-service running on ${PORT}`));
