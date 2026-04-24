
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve frontend
app.use(express.static(path.join(__dirname, '../public')));

// ✅ FIXED: use Docker service names (NOT localhost)
const services = {
    'auth': 'http://auth-service:3001',
    'users': 'http://user-service:3002',
    'products': 'http://product-service:3003',
    'cart': 'http://cart-service:3004',
    'orders': 'http://order-service:3005',
    'payment': 'http://payment-service:3006',
    'inventory': 'http://inventory-service:3007',
    'notify': 'http://notification-service:3008',
    'reviews': 'http://review-service:3009',
    'wishlist': 'http://wishlist-service:3010',
    'search': 'http://search-service:3011',
    'shipping': 'http://shipping-service:3012',
    'recommendation': 'http://recommendation-service:3013',
    'discount': 'http://discount-service:3014',
    'analytics': 'http://analytics-service:3015',
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
