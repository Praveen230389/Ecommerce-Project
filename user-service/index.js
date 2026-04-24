const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/profile', (req,res)=>res.json({id:1, name:'DevSecOps Admin', email:'admin@cluster.local'}));

const PORT = 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`user-service running on ${PORT}`));