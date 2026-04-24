const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
app.get('/', (req,res)=>res.json({message: 'Auth Service API. Available routes: POST /login'}));
app.post('/login', (req,res)=>res.json({token:'devx-jwt-123', user:{role:'admin'}}));
app.post('/register', (req,res)=>res.json({success: true, message: 'User registered'}));

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`auth-service running on ${PORT}`));