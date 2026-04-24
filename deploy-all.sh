#!/bin/bash

echo "🚀 Starting Kubernetes Deployment..."

# Step 1: Go to k8s folder
cd k8s || { echo "❌ k8s folder not found"; exit 1; }

echo "📦 Applying all Kubernetes YAMLs..."
kubectl apply -f .

echo ""
echo "⏳ Waiting for pods to initialize..."
sleep 10

echo ""
echo "📊 Checking Pod Status..."
kubectl get pods

echo ""
echo "🔍 Detailed Status Check..."

FAILED=0

for pod in $(kubectl get pods --no-headers -o custom-columns=":metadata.name"); do
    STATUS=$(kubectl get pod $pod -o jsonpath='{.status.phase}')

    if [ "$STATUS" != "Running" ]; then
        echo "❌ $pod is NOT Running (Status: $STATUS)"
        FAILED=1
    else
        echo "✅ $pod is Running"
    fi
done

echo ""
if [ $FAILED -eq 1 ]; then
    echo "⚠️ Some services FAILED. Check logs using:"
    echo "kubectl logs <pod-name>"
else
    echo "🎉 All services are running successfully!"
fi

echo ""
echo "🌐 Services:"
kubectl get svc

echo ""
echo "👉 To access API Gateway:"
echo "minikube service api-gateway"
