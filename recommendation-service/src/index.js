const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/', (req,res)=>res.json([{id:3, remark:'Frequently bought together'}]));

app.use('/', router);
app.use('/api/recommendation', router);

const PORT = process.env.RECOMMENDATION_SERVICE_PORT || 3013;
app.listen(PORT, '0.0.0.0', () => console.log(`recommendation-service running on ${PORT}`));
