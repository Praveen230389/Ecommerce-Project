const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/metrics', (req,res)=>res.json({activeClusters: 120, eventsProcessed: 430291}));

app.use('/', router);
app.use('/api/analytics', router);

const PORT = process.env.ANALYTICS_SERVICE_PORT || 3015;
app.listen(PORT, '0.0.0.0', () => console.log(`analytics-service running on ${PORT}`));
