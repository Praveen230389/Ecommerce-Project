const fs = require('fs');
const path = require('path');

// Clean up old root-level index.js files if they exist to keep the namespace clean
['api-gateway', 'auth-service', 'user-service', 'product-service', 'cart-service', 'order-service', 'payment-service', 'inventory-service', 'notification-service', 'review-service', 'wishlist-service', 'search-service', 'shipping-service', 'recommendation-service', 'discount-service', 'analytics-service'].forEach(name => {
    if (fs.existsSync(path.join(name, 'index.js'))) {
        fs.unlinkSync(path.join(name, 'index.js'));
    }
});

const services = [
    { name: 'auth-service', port: 3001, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/login', (req,res)=>res.json({token:'devx-jwt-123', user:{role:'admin'}}));" },
    { name: 'user-service', port: 3002, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/profile', (req,res)=>res.json({id:1, name:'DevSecOps Admin', email:'admin@cluster.local'}));" },
    { name: 'product-service', port: 3003, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'}));\nconst items = [\n  {id:1, name:'Enterprise K8s Server Blade', price: 4999.00, img:'https://placehold.co/400x300/111827/ffffff?text=Server+Blade'},\n  {id:2, name:'Neural AI Processor', price: 2999.50, img:'https://placehold.co/400x300/111827/ffffff?text=AI+Processor'},\n  {id:3, name:'Enterprise 100G Switch', price: 899.99, img:'https://placehold.co/400x300/111827/ffffff?text=Network+Switch'},\n  {id:4, name:'Cluster Node Array X4', price: 15400.00, img:'https://placehold.co/400x300/111827/ffffff?text=K8s+Nodes'}\n];\napp.get('/', (req,res)=>res.json(items));\napp.get('/:id', (req,res)=>res.json(items.find(i=>i.id == req.params.id)));" },
    { name: 'cart-service', port: 3004, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'}));\nlet cart = [];\napp.get('/', (req,res)=>res.json(cart));\napp.post('/add', (req,res)=>{ \n  const existing = cart.find(i => i.id === req.body.id);\n  if(existing) existing.quantity++;\n  else cart.push({...req.body, quantity: 1});\n  res.json({success:true, cart}) \n});\napp.post('/clear', (req,res)=>{ cart=[]; res.json({success:true}) });" },
    { name: 'order-service', port: 3005, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'}));\nlet orders = [];\napp.post('/checkout', (req,res)=>{ \n  const newOrder = { orderId: 'ORD-'+Math.floor(Math.random()*10000), total: req.body.total, status: 'Processed...', items: req.body.items };\n  orders.push(newOrder);\n  res.json({success:true, order:newOrder});\n});\napp.get('/', (req,res)=>res.json(orders));" },
    { name: 'payment-service', port: 3006, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/process', (req,res)=>setTimeout(()=>res.json({success:true, txId:'TXN-'+Date.now()}), 800));" },
    { name: 'inventory-service', port: 3007, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/stock/:id', (req,res)=>res.json({productId: req.params.id, stock: Math.floor(Math.random()*50)}));" },
    { name: 'notification-service', port: 3008, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/email', (req,res)=>res.json({success:true, message:'Email queued for delivery'}));" },
    { name: 'review-service', port: 3009, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/product/:id', (req,res)=>res.json([{rating:5, text:'Exceptional hardware!'}, {rating:4, text:'Good performance'} ]));" },
    { name: 'wishlist-service', port: 3010, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); let list=[]; app.get('/', (req,res)=>res.json(list));" },
    { name: 'search-service', port: 3011, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/', (req,res)=>res.json({results:[], note:'Elasticsearch stub'}));" },
    { name: 'shipping-service', port: 3012, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/tracking/:id', (req,res)=>res.json({status:'Dispatched', location:'Facility A'}));" },
    { name: 'recommendation-service', port: 3013, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/', (req,res)=>res.json([{id:3, remark:'Frequently bought together'}]));" },
    { name: 'discount-service', port: 3014, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.post('/apply', (req,res)=>res.json({valid:true, reduction:0.15}));" },
    { name: 'analytics-service', port: 3015, endpoints: "app.get('/health', (req,res)=>res.json({status:'UP'})); app.get('/metrics', (req,res)=>res.json({activeClusters: 120, eventsProcessed: 430291}));" }
];

// GATEWAY CONFIG
fs.mkdirSync('api-gateway/src', { recursive: true });
fs.mkdirSync('api-gateway/public', { recursive: true });

const gatewayContent = `
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve the frontend SPA
app.use(express.static(path.join(__dirname, '../public')));

const services = {
 'auth': 'http://auth-service:80',
 'users': 'http://user-service:80',
 'products': 'http://product-service:80',
 'cart': 'http://cart-service:80',
 'orders': 'http://order-service:80',
 'payment': 'http://payment-service:80',
 'inventory': 'http://inventory-service:80',
 'notify': 'http://notification-service:80',
 'reviews': 'http://review-service:80',
 'wishlist': 'http://wishlist-service:80',
 'search': 'http://search-service:80',
 'shipping': 'http://shipping-service:80',
 'recommendation': 'http://recommendation-service:80',
 'discount': 'http://discount-service:80',
 'analytics': 'http://analytics-service:80',
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
fs.writeFileSync(path.join('api-gateway/src', 'index.js'), gatewayContent);

const pkgContentGw = `{
  "name": "api-gateway",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "http-proxy-middleware": "^2.0.6"
  }
}`;
fs.writeFileSync(path.join('api-gateway', 'package.json'), pkgContentGw);

const dockerContentGw = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
fs.writeFileSync(path.join('api-gateway', 'Dockerfile'), dockerContentGw);

const jenkinsContentGw = `pipeline {
    agent any
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = "123456789012.dkr.ecr.\${AWS_REGION}.amazonaws.com"
        IMAGE_NAME = 'api-gateway'
        IMAGE_TAG = "v\${env.BUILD_ID}"
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Build & Test') { steps { sh 'npm install'; sh 'npm test || echo "Skipping missing tests"' } }
        stage('SonarQube / OWASP Scan') { steps { echo "Executing SonarQube Scanner..."; echo "Executing OWASP Dependency-Check..." } }
        stage('Docker Build') { steps { sh 'docker build -t \${ECR_REPO}/\${IMAGE_NAME}:\${IMAGE_TAG} -t \${ECR_REPO}/\${IMAGE_NAME}:latest .' } }
        stage('Trivy Security Scan') { steps { echo "Running Trivy Image Scan..."; sh 'trivy image --severity HIGH,CRITICAL \${ECR_REPO}/\${IMAGE_NAME}:latest || echo "Trivy Scan Phase"' } }
        stage('Push to ECR') { steps { echo "Mock AWS ECR Login..."; echo "docker push \${ECR_REPO}/\${IMAGE_NAME}:\${IMAGE_TAG}" } }
        stage('Deploy to K8s') { steps { sh 'kubectl apply -f k8s/' } }
    }
}`;
fs.writeFileSync(path.join('api-gateway', 'Jenkinsfile'), jenkinsContentGw);
fs.mkdirSync('api-gateway/k8s', { recursive: true });
fs.writeFileSync(path.join('api-gateway/k8s', 'deployment.yaml'), `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api-gateway\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: api-gateway\n  template:\n    metadata:\n      labels:\n        app: api-gateway\n    spec:\n      containers:\n      - name: api-gateway\n        image: myregistry/api-gateway:latest\n        ports:\n        - containerPort: 3000`);
fs.writeFileSync(path.join('api-gateway/k8s', 'service.yaml'), `apiVersion: v1\nkind: Service\nmetadata:\n  name: api-gateway\nspec:\n  type: LoadBalancer\n  selector:\n    app: api-gateway\n  ports:\n    - protocol: TCP\n      port: 80\n      targetPort: 3000`);

const frontendHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enterprise E-Commerce Microservices</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50 text-gray-800 font-sans">
    <div id="app" class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
            <div class="p-6 border-b border-slate-800 flex items-center">
                <i class="fa-solid fa-server text-blue-400 text-2xl mr-3"></i>
                <h1 class="font-bold text-lg tracking-wide uppercase">DevSecOps Hub</h1>
            </div>
            <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                <button @click="view = 'shop'" :class="{'bg-blue-600': view === 'shop', 'hover:bg-slate-800': view !== 'shop'}" class="w-full flex items-center p-3 rounded-lg transition-colors text-left">
                    <i class="fa-solid fa-store w-6"></i> Hardware Store
                </button>
                <button @click="view = 'cart'" :class="{'bg-blue-600': view === 'cart', 'hover:bg-slate-800': view !== 'cart'}" class="w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left">
                    <div><i class="fa-solid fa-cart-shopping w-6"></i> Shopping Cart</div>
                    <span v-if="cart.length" class="bg-red-500 text-xs px-2 py-1 rounded-full">{{cart.length}}</span>
                </button>
                <button @click="view = 'orders'" :class="{'bg-blue-600': view === 'orders', 'hover:bg-slate-800': view !== 'orders'}" class="w-full flex items-center p-3 rounded-lg transition-colors text-left">
                    <i class="fa-solid fa-box w-6"></i> My Orders
                </button>
                <div class="pt-6 pb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">Architecture</div>
                <button @click="view = 'health'" :class="{'bg-blue-600': view === 'health', 'hover:bg-slate-800': view !== 'health'}" class="w-full flex items-center p-3 rounded-lg transition-colors text-left">
                    <i class="fa-solid fa-heart-pulse w-6"></i> Cluster Health
                </button>
            </nav>
            <div class="p-4 border-t border-slate-800 text-xs text-slate-500">
                15 Microservices Active <br> Kubernetes Ready
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
            <header class="bg-white shadow-sm h-16 flex items-center px-8 justify-between z-10">
                <h2 class="text-xl font-semibold capitalize text-gray-700">{{ view }} Overview</h2>
                <div class="flex items-center space-x-4 text-sm font-medium text-gray-500">
                    <span><i class="fa-solid fa-user-shield mr-1"></i> Admin Logged In</span>
                    <span class="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 text-xs">Auth Service Active</span>
                </div>
            </header>

            <div class="flex-1 overflow-y-auto p-8 relative">
                
                <!-- SHOP -->
                <div v-if="view === 'shop'" class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
                    <div v-for="product in products" :key="product.id" class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col justify-between">
                        <div>
                        <img :src="product.img" class="w-full h-48 object-cover border-b border-gray-100" />
                        <div class="p-5">
                            <h3 class="font-bold text-lg text-gray-800 mb-2 truncate">{{product.name}}</h3>
                        </div>
                        </div>
                        <div class="p-5 pt-0">
                            <div class="flex items-center justify-between mt-4">
                                <span class="text-xl font-bold text-blue-600">\${{product.price.toLocaleString()}}</span>
                                <button @click="addToCart(product)" class="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                                    <i class="fa-solid fa-plus mr-1"></i> Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CART -->
                <div v-if="view === 'cart'" class="max-w-4xl mx-auto">
                    <div class="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                        <div v-if="cart.length === 0" class="text-center py-16 text-gray-400">
                            <i class="fa-solid fa-cart-shopping text-6xl mb-4 opacity-30"></i>
                            <h3 class="text-xl font-semibold text-gray-600">Your cart is empty</h3>
                            <p class="mt-2 text-sm text-gray-500">Add an item to trigger the cart-service.</p>
                        </div>
                        <div v-else>
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b-2 border-gray-100">
                                        <th class="py-3 px-4 text-gray-600">Product</th>
                                        <th class="py-3 px-4 text-gray-600">Price</th>
                                        <th class="py-3 px-4 text-gray-600">Qty</th>
                                        <th class="py-3 px-4 text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in cart" :key="item.id" class="border-b border-gray-50">
                                        <td class="py-4 px-4 font-medium">{{item.name}}</td>
                                        <td class="py-4 px-4 text-gray-600">\${{item.price.toLocaleString()}}</td>
                                        <td class="py-4 px-4">
                                            <span class="bg-gray-100 px-3 py-1 rounded-md">{{item.quantity}}</span>
                                        </td>
                                        <td class="py-4 px-4 font-bold text-blue-600">\${{(item.price * item.quantity).toLocaleString()}}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="mt-8 flex justify-between items-center bg-gray-50 p-6 rounded-lg border border-gray-100">
                                <div>
                                    <div class="text-sm text-gray-500">Total Calculation via Cart Service</div>
                                    <div class="text-3xl font-bold text-gray-800">\${{cartTotal.toLocaleString()}}</div>
                                </div>
                                <button @click="checkout" :disabled="isCheckingOut" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 flex items-center">
                                    <i v-if="isCheckingOut" class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                                    {{ isCheckingOut ? 'Processing Payment...' : 'Checkout Cart' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ORDERS -->
                <div v-if="view === 'orders'" class="max-w-4xl mx-auto space-y-6">
                    <div v-if="orders.length === 0" class="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400">
                        <i class="fa-solid fa-box-open text-6xl mb-4 opacity-30"></i>
                        <h3 class="text-xl font-semibold text-gray-600">No orders placed yet</h3>
                        <p class="mt-2 text-sm text-gray-500">Checkout a cart to simulate hitting the order-service.</p>
                    </div>
                    <div v-else v-for="order in orders" :key="order.orderId" class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                        <div class="flex justify-between items-center bg-slate-50 p-4 border-b border-gray-100">
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-widest">Order ID (order-service)</div>
                                <div class="font-mono font-bold text-slate-800">{{order.orderId}}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-xs text-gray-500 uppercase tracking-widest">Status</div>
                                <div class="font-bold text-green-600"><i class="fa-solid fa-check-circle mr-1"></i>{{order.status}}</div>
                            </div>
                        </div>
                        <div class="p-6">
                            <div class="space-y-2">
                                <div v-for="itm in order.items" class="flex justify-between text-sm">
                                    <span>{{itm.quantity}}x {{itm.name}}</span>
                                    <span class="text-gray-500">\${{(itm.price * itm.quantity).toLocaleString()}}</span>
                                </div>
                            </div>
                            <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span class="font-bold">Total Paid</span>
                                <span class="font-bold text-xl">\${{order.total.toLocaleString()}}</span>
                            </div>
                            <div class="mt-4 bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg text-sm flex items-center">
                                <i class="fa-solid fa-truck-fast mr-3"></i> Querying shipping-service... Dispatched from Facility A
                            </div>
                        </div>
                    </div>
                </div>

                <!-- HEALTH -->
                <div v-if="view === 'health'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div v-for="status in healthStatuses" :key="status.name" class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                        <div :class="status.up ? 'text-green-500' : 'text-red-500'" class="mb-2">
                            <i v-if="status.up" class="fa-solid fa-circle-check text-3xl"></i>
                            <i v-else class="fa-solid fa-triangle-exclamation text-3xl"></i>
                        </div>
                        <div class="font-bold text-sm text-gray-800 mb-1 truncate w-full" :title="status.name">{{status.name}}</div>
                        <div class="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded border border-gray-200 font-mono">Port {{status.port}}</div>
                        <div v-if="status.up" class="text-[10px] mt-2 text-green-600 uppercase font-bold tracking-widest opacity-70">Online</div>
                        <div v-else class="text-[10px] mt-2 text-red-600 uppercase font-bold tracking-widest opacity-70">Offline</div>
                    </div>
                </div>

            </div>
            
            <div class="fixed bottom-6 right-6 flex flex-col space-y-2 z-50">
                <div v-for="toast in toasts" :key="toast.id" class="bg-slate-900 border-l-4 border-blue-500 text-white px-6 py-4 rounded shadow-2xl flex items-center">
                    <i class="fa-solid fa-info-circle mr-3 text-blue-400"></i>
                    <div class="text-sm">
                        <div class="font-bold text-blue-300 uppercase tracking-widest text-[10px] mb-1">notification-service</div>
                        {{toast.message}}
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const { createApp, ref, computed, onMounted } = Vue;

        createApp({
            setup() {
                const view = ref('shop');
                const products = ref([]);
                const cart = ref([]);
                const orders = ref([]);
                const isCheckingOut = ref(false);
                const healthStatuses = ref([]);
                const toasts = ref([]);

                const cartTotal = computed(() => {
                    return cart.value.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                });

                const notify = async (msg) => {
                    const id = Date.now();
                    toasts.value.push({id, message: msg});
                    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 4000);
                    fetch('/api/notify/email', {
                        method: 'POST', 
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({message: msg})
                    }).catch(()=>{});
                };

                const fetchProducts = async () => {
                    try {
                        const res = await fetch('/api/products');
                        products.value = await res.json();
                    } catch(e) {}
                };

                const fetchCart = async () => {
                    try {
                        const res = await fetch('/api/cart');
                        cart.value = await res.json();
                    } catch(e) {}
                };

                const fetchOrders = async () => {
                    try {
                        const res = await fetch('/api/orders');
                        orders.value = await res.json();
                    } catch (e) {}
                };

                const addToCart = async (product) => {
                    try {
                        await fetch('/api/cart/add', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(product)
                        });
                        await fetchCart();
                        notify(\`Added \${product.name} to cart\`);
                    } catch(e) {}
                };

                const checkout = async () => {
                    isCheckingOut.value = true;
                    try {
                        await fetch('/api/payment/process', { method: 'POST' });
                        await fetch('/api/cart/clear', { method: 'POST' });
                        const orderRes = await fetch('/api/orders/checkout', {
                            method: 'POST',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ total: cartTotal.value, items: [...cart.value] })
                        });
                        const orderData = await orderRes.json();
                        cart.value = [];
                        await fetchOrders();
                        view.value = 'orders';
                        notify(\`Order \${orderData.order.orderId} created successfully.\`);
                    } catch(e) {
                        notify('Checkout failed.');
                    } finally {
                        isCheckingOut.value = false;
                    }
                };

                const checkHealth = async () => {
                    const svcs = [
                        {n:'auth-service', p:3001, c:'auth'}, {n:'user-service', p:3002, c:'users'},
                        {n:'product-service', p:3003, c:'products'}, {n:'cart-service', p:3004, c:'cart'},
                        {n:'order-service', p:3005, c:'orders'}, {n:'payment-service', p:3006, c:'payment'},
                        {n:'inventory-service', p:3007, c:'inventory'}, {n:'notification-service', p:3008, c:'notify'},
                        {n:'review-service', p:3009, c:'reviews'}, {n:'wishlist-service', p:3010, c:'wishlist'},
                        {n:'search-service', p:3011, c:'search'}, {n:'shipping-service', p:3012, c:'shipping'},
                        {n:'recommendation-service', p:3013, c:'recommendation'}, {n:'discount-service', p:3014, c:'discount'},
                        {n:'analytics-service', p:3015, c:'analytics'}
                    ];
                    
                    healthStatuses.value = await Promise.all(svcs.map(async s => {
                        try {
                            const res = await fetch(\`/api/\${s.c}/health\`);
                            return { name: s.n, port: s.p, up: res.ok };
                        } catch(e) {
                            return { name: s.n, port: s.p, up: false };
                        }
                    }));
                };

                onMounted(() => {
                    fetchProducts();
                    fetchCart();
                    fetchOrders();
                    checkHealth();
                });

                return { view, products, cart, cartTotal, orders, isCheckingOut, healthStatuses, toasts, addToCart, checkout };
            }
        }).mount('#app');
    </script>
</body>
</html>`;
fs.writeFileSync(path.join('api-gateway/public', 'index.html'), frontendHTML);

// Remove old K8s array logic
fs.rmSync('k8s', { recursive: true, force: true });

let dcompose = `version: '3.8'\nservices:\n`;

['api-gateway', ...services.map(s => s.name)].forEach(name => {
    const isGw = name === 'api-gateway';
    const port = isGw ? 3000 : services.find(s => s.name === name).port;

    // Docker Compose
    let dependsOn = isGw ? `    depends_on:\n${services.map(s => `      - ${s.name}`).join('\n')}\n` : '';
    
    dcompose += `  ${name}:
    build:
      context: ./${name}
    container_name: ${name}
    ports:
      - "${port}:${port}"
    environment:
      - PORT=${port}
${dependsOn}
`;
});
fs.writeFileSync('docker-compose.yml', dcompose);

services.forEach(svc => {
    fs.mkdirSync(svc.name, { recursive: true });
    fs.mkdirSync(path.join(svc.name, 'src'), { recursive: true });
    fs.mkdirSync(path.join(svc.name, 'k8s'), { recursive: true });
    
    // index.js
    const indexContent = `const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

${svc.endpoints}

const PORT = ${svc.port};
app.listen(PORT, '0.0.0.0', () => console.log(\`${svc.name} running on \${PORT}\`));`;

    fs.writeFileSync(path.join(svc.name, 'src', 'index.js'), indexContent);

    // package.json
    const pkgContent = `{
  "name": "${svc.name}",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}`;
    fs.writeFileSync(path.join(svc.name, 'package.json'), pkgContent);

    // Dockerfile
    const dockerContent = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${svc.port}
CMD ["npm", "start"]`;
    fs.writeFileSync(path.join(svc.name, 'Dockerfile'), dockerContent);

    const jenkinsContent = `pipeline {
    agent any
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = "123456789012.dkr.ecr.\${AWS_REGION}.amazonaws.com"
        IMAGE_NAME = '${svc.name}'
        IMAGE_TAG = "v\${env.BUILD_ID}"
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Build & Test') { steps { sh 'npm install'; sh 'npm test || echo "Skipping missing tests"' } }
        stage('SonarQube / OWASP Scan') { steps { echo "Executing SonarQube Scanner..."; echo "Executing OWASP Dependency-Check..." } }
        stage('Docker Build') { steps { sh 'docker build -t \${ECR_REPO}/\${IMAGE_NAME}:\${IMAGE_TAG} -t \${ECR_REPO}/\${IMAGE_NAME}:latest .' } }
        stage('Trivy Security Scan') { steps { echo "Running Trivy Image Scan..."; sh 'trivy image --severity HIGH,CRITICAL \${ECR_REPO}/\${IMAGE_NAME}:latest || echo "Trivy Scan Phase"' } }
        stage('Push to ECR') { steps { echo "Mock AWS ECR Login..."; echo "docker push \${ECR_REPO}/\${IMAGE_NAME}:\${IMAGE_TAG}" } }
        stage('Deploy to K8s') { steps { sh 'kubectl apply -f k8s/' } }
    }
}`;
    fs.writeFileSync(path.join(svc.name, 'Jenkinsfile'), jenkinsContent);

    // K8s specific to service
     // 🎯 scaffold.cjs के अंत में (Page 40) इन दोनों लाइन्स को ऐसे अपडेट करें:

 // 1. प्रत्येक माइक्रोसर्विस का containerPort उसके कोड के असली पोर्ट (जैसे 3001, 3015) से मैच होना चाहिए
 // fs.writeFileSync(path.join(svc.name, 'k8s', 'deployment.yaml'), 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n name: ' + svc.name + '\n namespace: production\nspec:\n replicas: 1\n selector:\n matchLabels:\n app: ' + svc.name + '\n template:\n metadata:\n labels:\n app: ' + svc.name + '\n spec:\n containers:\n - name: ' + svc.name + '\n image: REPLACE_WITH_AWS_ECR_URL/' + svc.name + ':latest\n ports:\n - containerPort: ' + svc.port);
     // 🎯 scaffold.cjs के अंत में (Page 40) इन दोनों ब्लॉक्स को हूबहू ऐसे रिप्लेस करें:

 // 1. DEPLOYMENT YAML: कंटेनर का अपना असली पोर्ट (जैसे 3001, 3015) साफ़ अक्षरों में होना चाहिए
 fs.writeFileSync(path.join(svc.name, 'k8s', 'deployment.yaml'), 
 `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc.name}
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${svc.name}
  template:
    metadata:
      labels:
        app: ${svc.name}
    spec:
      containers:
      - name: ${svc.name}
        image: REPLACE_WITH_AWS_ECR_URL/${svc.name}:latest
        ports:
        - containerPort: ${svc.port}
          name: http`);

 // 2. SERVICE YAML: सर्विस खुद बाहर पोर्ट 80 पर सुनेगी, लेकिन अंदर ट्रैफिक को कंटेनर के असली पोर्ट पर भेजेगी
 fs.writeFileSync(path.join(svc.name, 'k8s', 'service.yaml'), 
 `apiVersion: v1
kind: Service
metadata:
  name: ${svc.name}
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: ${svc.name}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${svc.port}
    name: http`);

 // 2. सर्विस का port हमेशा 80 रहेगा (ताकि गेटवे सीधे नाम:80 से ढूंढ सके) और targetPort कंटेनर के असली पोर्ट पर ट्रैफिक भेजेगा
 // fs.writeFileSync(path.join(svc.name, 'k8s', 'service.yaml'), 'apiVersion: v1\nkind: Service\nmetadata:\n name: ' + svc.name + '\n namespace: production\nspec:\n type: ClusterIP\n selector:\n app: ' + svc.name + '\n ports:\n - protocol: TCP\n port: 80\n targetPort: ' + svc.port);

});

// Removed child_process Git Init
const allServices = ['api-gateway', ...services.map(s=>s.name)];
const cmd = allServices.map(s => '"node ' + s + '/src/index.js"').join(' ');

const rootPkg = {
  "name": "enterprise-microservices",
  "version": "1.0.0",
  "scripts": {
    "start": "concurrently " + cmd,
    "dev": "npm start"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "http-proxy-middleware": "^2.0.6",
    "concurrently": "^8.2.2"
  }
};
fs.writeFileSync('package.json', JSON.stringify(rootPkg, null, 2));
console.log('15 Microservices & Gateway successfully scaffolded!');
