const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
app.get('/', (req,res)=>res.json({message: 'Review Service'}));
app.get('/product/:id', (req,res)=>res.json([{rating:5, text:'Exceptional hardware!'}, {rating:4, text:'Good performance'} ]));

const PORT = 3009;
app.listen(PORT, '0.0.0.0', () => console.log(`review-service running on ${PORT}`));