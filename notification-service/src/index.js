const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'}));
app.get('/', (req,res)=>res.json({message: 'Notification Service'}));
app.post('/email', (req,res)=>res.json({success:true, message:'Email queued for delivery'}));

const PORT = 3008;
app.listen(PORT, '0.0.0.0', () => console.log(`notification-service running on ${PORT}`));