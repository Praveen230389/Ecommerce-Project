const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/', (req,res)=>res.json({results:[], note:'Elasticsearch stub'}));

app.use('/', router);
app.use('/api/search', router);

const PORT = process.env.PORT || 3011;
app.listen(PORT, '0.0.0.0', () => console.log(`search-service running on ${PORT}`));
