const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
router.get('/health', (req,res)=>res.status(200).json({status:'UP'})); router.post('/email', (req,res)=>res.json({success:true, message:'Email queued for delivery'}));

app.use('/', router);
app.use('/api/notify', router);

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3008;
app.listen(PORT, '0.0.0.0', () => console.log(`notification-service running on ${PORT}`));
