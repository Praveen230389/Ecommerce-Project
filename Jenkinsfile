pipeline {
    agent any
    
    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()
    }
    
    triggers {
        githubPush()
    }
    
    environment {
        AWS_DEFAULT_REGION = "ap-south-1"
        TARGET_SERVICE_1   = "cart-service"
        TARGET_SERVICE_2   = "api-gateway"
        
        // 🔐 ग्लोबल लेवल क्रेडेंशियल्स
        AWS_CREDENTIALS = credentials('aws-credentials-id')
        AWS_ACCESS_KEY_ID = "${env.AWS_CREDENTIALS_USR}"
        AWS_SECRET_ACCESS_KEY = "${env.AWS_CREDENTIALS_PSW}"
    }
    
    stages {
        stage('Workspace Clean') {
            steps {
                cleanWs()
            }
        }
        
        stage('Git Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Praveen230389/Ecommerce-Project.git'
                script {
                    env.ACTUAL_BRANCH = 'main'
                }
            }
        }
        
        stage("Docker Image Build (Cart Service)") {
            steps {
                script {
                    sh 'docker system prune -f'
                    sh 'docker container prune -f'
                    
                    sh '''
                        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
                        FULL_IMAGE_TAG="${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:${ACTUAL_BRANCH}-${BUILD_NUMBER}"
                        
                        echo "Building ${TARGET_SERVICE_1}..."
                        docker build -t Ecommerse/${TARGET_SERVICE_1} -t ${FULL_IMAGE_TAG} -f cart-service/Dockerfile cart-service/
                    '''
                }
            }
        }

        stage("Docker Image Build (API Gateway)") { // 🎯 NEW STAGE: एपीआई गेटवे का ऑटो-बिल्ड
            steps {
                script {
                    sh '''
                        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
                        FULL_IMAGE_TAG="${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:${ACTUAL_BRANCH}-${BUILD_NUMBER}"
                        
                        echo "Building ${TARGET_SERVICE_2}..."
                        docker build -t Ecommerse/${TARGET_SERVICE_2} -t ${FULL_IMAGE_TAG} -f api-gateway/Dockerfile api-gateway/
                    '''
                }
            }
        }

        stage('AWS ECR Login') {
            steps {
                echo "Logging into Amazon ECR Registry..."
                sh """
                    ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                    aws ecr get-login-password --region ${env.AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin \${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com
                """
            }
        }
        
        stage('Trivy Image Scan') {
            steps { 
                echo "Exporting images and scanning with Trivy..."
                script {
                    sh 'docker save Ecommerse/cart-service -o cart-service.tar'
                    sh 'trivy image --input cart-service.tar --scanners vuln --offline-scan > trivyresults-cart.txt || true'
                    
                    sh 'docker save Ecommerse/api-gateway -o api-gateway.tar'
                    sh 'trivy image --input api-gateway.tar --scanners vuln --offline-scan > trivyresults-gateway.txt || true'
                    
                    sh 'rm -f cart-service.tar api-gateway.tar'
                }
            }
        }

        stage('Docker Push Images') {
            steps {
                echo "Pushing verified images to Amazon ECR Repository..."
                sh '''
                    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                    LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"

                    echo "Pushing Cart Service..."
                    docker push ${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:${ACTUAL_BRANCH}-${BUILD_NUMBER}
                    
                    echo "Pushing API Gateway..."
                    docker push ${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:${ACTUAL_BRANCH}-${BUILD_NUMBER}
                '''
            }
        }

        stage('Kubernetes Deployment') {
            steps {
                echo "Deploying applications to Kubernetes Cluster..."
                sh '''
                    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                    LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
                    NAMESPACE="production"

                    # Snap सैंडबॉक्स के अंदर सुरक्षित Kubeconfig पाथ सेट करना
                    export KUBECONFIG="${WORKSPACE}/.kube-config"
                    aws eks update-kubeconfig --region ${AWS_DEFAULT_REGION} --name ecommerce-cluster --kubeconfig ${KUBECONFIG}

                    echo "🎯 Ensuring namespace ${NAMESPACE} exists..."
                    if [ -f "./k8s/namespaces.yaml" ]; then
                        kubectl apply -f ./k8s/namespaces.yaml --kubeconfig ${KUBECONFIG} || true
                    else
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - --kubeconfig ${KUBECONFIG} || true
                    fi

                    # रूट के मुख्य k8s फोल्डर के सभी YAMLs को डायनामिकली अपडेट करके अप्लाई करना
                    if [ -d "./k8s" ]; then
                        echo "🌐 Applying Global manifests from Root k8s folder..."
                        find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/cart-service:.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/api-gateway:.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        
                        kubectl apply -f ./k8s/ -n ${NAMESPACE} --kubeconfig ${KUBECONFIG}
                    fi

                    # सर्विस-स्पेसिफिक (cart-service) manifests को अप्लाई करना
                    if [ -d "./cart-service/k8s" ]; then
                        echo "📦 Applying Service-specific manifests for Cart Service..."
                        find ./cart-service/k8s/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        kubectl apply -f ./cart-service/k8s/ -n ${NAMESPACE} --kubeconfig ${KUBECONFIG}
                    fi

                    # सर्विस-स्पेसिफिक (api-gateway) manifests को अप्लाई करना
                    if [ -d "./api-gateway/k8s" ]; then
                        echo "📦 Applying Service-specific manifests for API Gateway..."
                        find ./api-gateway/k8s/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        kubectl apply -f ./api-gateway/k8s/ -n ${NAMESPACE} --kubeconfig ${KUBECONFIG}
                    fi
                '''
            }
        }

        stage('Cluster Inspection (Get Namespaces)') { // 🎯 NEW STAGE: नेमस्पेस वेरिफिकेशन स्टेज
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"
                    echo "📋 Current Active Namespaces in Cluster:"
                    kubectl get namespaces --kubeconfig ${KUBECONFIG}
                '''
            }
        }

        stage('Production Deployment Verification') { // 🎯 NEW STAGE: फाइनल लोड बैलेंसर लिंक हंटर स्टेज
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"
                    echo "🔍 Fetching deployed Pods and Services status..."
                    kubectl get pods,svc -n production --kubeconfig ${KUBECONFIG}
                    
                    echo "🌐 FETCHING AWS ALB INGRESS ADRESS (DNS LINK):"
                    kubectl get ingress -n production --kubeconfig ${KUBECONFIG}
                '''
            }
        }
    }
    
    post {
        always {
            script {
                echo "Cleaning up local workspace cache..."
                sh "docker image prune -f || true"
                cleanWs()
            }
        }
    }
}
