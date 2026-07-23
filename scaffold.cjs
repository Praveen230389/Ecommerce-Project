const fs = require('fs');

let scaffold = fs.readFileSync('scaffold.cjs', 'utf-8');

// Update health checks to include status 200
scaffold = scaffold.replace(/res\.json\(\{status:'UP'\}\)/g, 'res.status(200).json({status:"UP"})');

const newGateway = `
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Expose Environment Variables to Frontend
app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(\`window.ENV = { API_BASE_URL: "\${process.env.API_BASE_URL || ''}" };\`);
});

// Serve the frontend SPA
app.use(express.static(path.join(__dirname, '../public')));

// Detect if running inside Kubernetes to use internal DNS by default, otherwise fallback to localhost for AI Studio
const isK8s = process.env.KUBERNETES_SERVICE_HOST !== undefined;
const getHost = (svc, port) => isK8s ? \`http://\${svc}:\${port}\` : \`http://localhost:\${port}\`;

// Proxies
const services = {
    'auth': process.env.AUTH_SERVICE_URL || getHost('auth-service', 3001),
    'users': process.env.USER_SERVICE_URL || getHost('user-service', 3002),
    'products': process.env.PRODUCT_SERVICE_URL || getHost('product-service', 3003),
    'cart': process.env.CART_SERVICE_URL || getHost('cart-service', 3004),
    'orders': process.env.ORDER_SERVICE_URL || getHost('order-service', 3005),
    'payment': process.env.PAYMENT_SERVICE_URL || getHost('payment-service', 3006),
    'inventory': process.env.INVENTORY_SERVICE_URL || getHost('inventory-service', 3007),
    'notify': process.env.NOTIFICATION_SERVICE_URL || getHost('notification-service', 3008),
    'reviews': process.env.REVIEW_SERVICE_URL || getHost('review-service', 3009),
    'wishlist': process.env.WISHLIST_SERVICE_URL || getHost('wishlist-service', 3010),
    'search': process.env.SEARCH_SERVICE_URL || getHost('search-service', 3011),
    'shipping': process.env.SHIPPING_SERVICE_URL || getHost('shipping-service', 3012),
    'recommendation': process.env.RECOMMENDATION_SERVICE_URL || getHost('recommendation-service', 3013),
    'discount': process.env.DISCOUNT_SERVICE_URL || getHost('discount-service', 3014),
    'analytics': process.env.ANALYTICS_SERVICE_URL || getHost('analytics-service', 3015),
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
`;

scaffold = scaffold.replace(/const gatewayContent = `[\s\S]*?`;/, 'const gatewayContent = `' + newGateway.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`;');

let frontendHtmlStr = fs.readFileSync('api-gateway/public/index.html', 'utf-8');
scaffold = scaffold.replace(/const frontendHTML = `[\s\S]*?`;/, 'const frontendHTML = `' + frontendHtmlStr.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`;');

scaffold = scaffold.replace(/const indexContent = `[\s\S]*?`;/, `
    let modifiedEndpoints = svc.endpoints.replace(/app\\.(get|post)\\(/g, 'router.$1(');
    
    // Map service name to api path
    const apiMap = {
        'auth-service': 'auth', 'user-service': 'users', 'product-service': 'products',
        'cart-service': 'cart', 'order-service': 'orders', 'payment-service': 'payment',
        'inventory-service': 'inventory', 'notification-service': 'notify',
        'review-service': 'reviews', 'wishlist-service': 'wishlist',
        'search-service': 'search', 'shipping-service': 'shipping',
        'recommendation-service': 'recommendation', 'discount-service': 'discount',
        'analytics-service': 'analytics'
    };
    const apiName = apiMap[svc.name];

    const indexContent = \\\`const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const router = express.Router();
\${modifiedEndpoints}

app.use('/', router);
app.use('/api/\${apiName}', router);

const PORT = process.env.PORT || ${svc.port};
app.listen(PORT, '0.0.0.0', () => console.log(\\\\\`\${svc.name} running on \\\\\${PORT}\\\\\`));\\\`;
`);

fs.writeFileSync('scaffold.cjs', scaffold);
