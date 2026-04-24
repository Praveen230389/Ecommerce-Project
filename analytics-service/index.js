const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/metrics', (req,res)=>res.json({activeClusters: 120, eventsProcessed: 430291}));

const PORT = 3015;
app.listen(PORT, '0.0.0.0', () => console.log(`analytics-service running on ${PORT}`));