const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); let list=[]; app.get('/', (req,res)=>res.json(list));

const PORT = 3010;
app.listen(PORT, '0.0.0.0', () => console.log(`wishlist-service running on ${PORT}`));