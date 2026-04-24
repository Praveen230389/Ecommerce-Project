const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/apply', (req,res)=>res.json({valid:true, reduction:0.15}));

const PORT = 3014;
app.listen(PORT, '0.0.0.0', () => console.log(`discount-service running on ${PORT}`));