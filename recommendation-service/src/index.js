const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/', (req,res)=>res.json([{id:3, remark:'Frequently bought together'}]));

const PORT = 3013;
app.listen(PORT, '0.0.0.0', () => console.log(`recommendation-service running on ${PORT}`));