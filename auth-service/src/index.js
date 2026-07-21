const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.post('/login', (req,res)=>res.json({token:'devx-jwt-123', user:{role:'admin'}}));

app.use('/', router);
app.use('/api/auth', router);

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`auth-service running on ${PORT}`));
