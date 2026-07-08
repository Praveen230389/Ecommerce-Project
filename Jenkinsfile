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

        stage('Kubernetes Deployment & Verification') {
            steps {
                echo "Deploying and verifying applications on Kubernetes..."
                // 🛠️ ग्रूवी से क्रेडेंशियल्स उठाकर सीधे इन्जेक्ट कर रहे हैं ताकि कटी-फटी URL का खतरा ही न रहे
                withCredentials([usernamePassword(credentialsId: 'aws-credentials-id', 
                                                 usernameVariable: 'AWS_ACCESS_KEY_ID', 
                                                 passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                        # 1. सीधे होस्ट यूजर के होम डायरेक्टरी का सुरक्षित पाथ इस्तेमाल करना
                        export KUBECONFIG="${HOME}/.kube/config"
                        
                        # 2. AWS क्रेडेंशियल्स को शेल में एक्टिवेट करना
                        export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                        export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                        export AWS_DEFAULT_REGION="ap-south-1"
                        
                        # 3. क्लस्टर कॉन्फिगरेशन को फोर्स अपडेट करना
                        aws eks update-kubeconfig --region ap-south-1 --name ecommerce-cluster
                        
                        NAMESPACE="production"
                        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                        LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"
                        
                        echo "🎯 Target Namespace: ${NAMESPACE}"
                        echo "🎯 Target ECR Registry: ${LOCAL_ECR_URL}"
                        
                        # 4. नेमस्पेस क्रिएट करना
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        
                        # 5. रूट k8s मैनिफेस्ट्स को अपडेट और अप्लाई करना
                        if [ -d "./k8s" ]; then
                            echo "🌐 Processing Global manifests..."
                            find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/cart-service:.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:main-${BUILD_NUMBER}|g" {} + || true
                            find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/api-gateway:.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:main-${BUILD_NUMBER}|g" {} + || true
                            kubectl apply -f ./k8s/ -n ${NAMESPACE}
                        fi
                        
                        # 6. कार्ट सर्विस मैनिफेस्ट्स को अप्लाई करना
                        if [ -d "./cart-service/k8s" ]; then
                            echo "📦 Processing Cart Service manifests..."
                            find ./cart-service/k8s/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_1}:main-${BUILD_NUMBER}|g" {} + || true
                            kubectl apply -f ./cart-service/k8s/ -n ${NAMESPACE}
                        fi
                        
                        # 7. एपीआई गेटवे मैनिफेस्ट्स को अप्लाई करना
                        if [ -d "./api-gateway/k8s" ]; then
                            echo "📦 Processing API Gateway manifests..."
                            find ./api-gateway/k8s/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE_2}:main-${BUILD_NUMBER}|g" {} + || true
                            kubectl apply -f ./api-gateway/k8s/ -n ${NAMESPACE}
                        fi
                        
                        # 8. 🔍 LIVE VERIFICATION (यह सीधे लॉग्स में आउटपुट दिखाएगा)
                        echo "📋 VERIFYING ACTIVE NAMESPACES:"
                        kubectl get namespaces
                        
                        echo "🔍 VERIFYING PODS & SERVICES STATUS IN PRODUCTION:"
                        kubectl get pods,svc -n ${NAMESPACE}
                        
                        echo "🌐 FETCHING AWS ALB INGRESS ADRESS (THE DNS LINK):"
                        kubectl get ingress -n ${NAMESPACE}
                    '''
                }
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
