
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve the frontend SPA
app.use(express.static(path.join(__dirname, 'public')));

// Proxies
const services = {
    'auth': 'http://localhost:3001',
    'users': 'http://localhost:3002',
    'products': 'http://localhost:3003',
    'cart': 'http://localhost:3004',
    'orders': 'http://localhost:3005',
    'payment': 'http://localhost:3006',
    'inventory': 'http://localhost:3007',
    'notify': 'http://localhost:3008',
    'reviews': 'http://localhost:3009',
    'wishlist': 'http://localhost:3010',
    'search': 'http://localhost:3011',
    'shipping': 'http://localhost:3012',
    'recommendation': 'http://localhost:3013',
    'discount': 'http://localhost:3014',
    'analytics': 'http://localhost:3015',
};

Object.entries(services).forEach(([name, target]) => {
    app.use('/api/' + name, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { ['^/api/' + name]: '' }
    }));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('API Gateway running on port ' + PORT);
});
