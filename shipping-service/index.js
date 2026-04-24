const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/tracking/:id', (req,res)=>res.json({status:'Dispatched', location:'Facility A'}));

const PORT = 3012;
app.listen(PORT, '0.0.0.0', () => console.log(`shipping-service running on ${PORT}`));