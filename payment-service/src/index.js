const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
app.get('/', (req,res)=>res.json({message: 'Payment Service'}));
app.post('/process', (req,res)=>setTimeout(()=>res.json({success:true, txId:'TXN-'+Date.now()}), 800));

const PORT = 3006;
app.listen(PORT, '0.0.0.0', () => console.log(`payment-service running on ${PORT}`));