const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/', (req,res)=>res.json({results:[], note:'Elasticsearch stub'}));

const PORT = 3011;
app.listen(PORT, '0.0.0.0', () => console.log(`search-service running on ${PORT}`));