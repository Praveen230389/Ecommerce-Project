const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.get('/profile', (req,res)=>res.json({id:1, name:'DevSecOps Admin', email:'admin@cluster.local'}));

app.use('/', router);
app.use('/api/users', router);

const PORT = process.env.USER_SERVICE_PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`user-service running on ${PORT}`));
