const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/login', (req,res)=>res.json({token:'devx-jwt-123', user:{role:'admin'}}));

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`auth-service running on ${PORT}`));