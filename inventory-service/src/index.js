const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/stock/:id', (req,res)=>res.json({productId: req.params.id, stock: Math.floor(Math.random()*50)}));

const PORT = 3007;
app.listen(PORT, '0.0.0.0', () => console.log(`inventory-service running on ${PORT}`));