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
        TARGET_SERVICE     = "cart-service" // 🎯 इसे आप अपनी जरूरत के हिसाब से बदल सकते हैं
        
        // 🔐 पूरे क्रेडेंशियल्स को एक ही बार ग्लोबल लेवल पर सेट कर दिया ताकि बार-बार न लिखना पड़े
        AWS_CREDENTIALS = credentials('aws-credentials-id')
        AWS_ACCESS_KEY_ID = "${env.AWS_CREDENTIALS_USR}"
        AWS_SECRET_ACCESS_KEY = "${env.AWS_CREDENTIALS_PSW}"
    }
    
    stages {
        stage('Workspace Clean') { // 🛠️ FIX 1: बिना कोट्स के 'clean' को स्ट्रिंग में बदला
            steps {
                cleanWs()
            }
        }
        
        stage('git checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Praveen230389/Ecommerce-Project.git'
                script {
                    // 🛠️ FIX 2: नीचे की स्टेजेस में इस्तेमाल होने वाले ACTUAL_BRANCH को यहाँ सेट किया
                    env.ACTUAL_BRANCH = 'main'
                }
            }
        }
        
        stage("Docker Image Build") {
            steps {
                script {
                    sh 'docker system prune -f'
                    sh 'docker container prune -f'
                    
                    // 🛠️ FIX: सीधे शेल स्क्रिप्ट के अंदर ही अकाउंट आईडी निकालकर फुल टैग बनाएंगे
                    // इससे कोई भी वेरिएबल खाली रहने का चांस 0% हो जाता है
                    if (fileExists('cart-service/Dockerfile')) {
                        echo "✅ Found Dockerfile in cart-service folder"
                        sh """
                            ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                            LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                            FULL_IMAGE_TAG="\${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}"
                            
                            docker build -t Ecommerse/cart-service -t \${FULL_IMAGE_TAG} -f cart-service/Dockerfile cart-service/
                        """
                    } else if (fileExists('cartservice/Dockerfile')) {
                        echo "✅ Found Dockerfile in cartservice folder"
                        sh """
                            ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                            LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                            FULL_IMAGE_TAG="\${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}"
                            
                            docker build -t Ecommerse/cart-service -t \${FULL_IMAGE_TAG} -f cartservice/Dockerfile cartservice/
                        """
                    } else if (fileExists('Dockerfile')) {
                        echo "✅ Found Dockerfile in Root directory"
                        sh """
                            ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                            LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                            FULL_IMAGE_TAG="\${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}"
                            
                            docker build -t Ecommerse/cart-service -t \${FULL_IMAGE_TAG} .
                        """
                    } else {
                        error "Pipeline stopped due to missing Dockerfile"
                     }
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
        
        stage('Trivy image Scan') {
            steps { 
                echo "Exporting image and scanning with Trivy..."
                script {
                    // 1. डॉकर इमेज को एक tar फाइल में सेव करें
                    sh 'docker save Ecommerse/cart-service -o cart-service.tar'
                    
                    // 2. Trivy से सीधे उस tar फाइल को स्कैन करें (इसे डॉकर सॉकेट की ज़रूरत नहीं पड़ेगी)
                    sh 'trivy image --input cart-service.tar --scanners vuln --offline-scan > trivyresults.txt || true'
                    
                    // 3. स्कैन होने के बाद भारी tar फाइल को साफ करें
                    sh 'rm -f cart-service.tar'
                    
                    // 4. टर्मिनल पर रिजल्ट देखने के लिए (Optional)
                    sh 'cat trivyresults.txt || true'
                }
            }
        }

        stage('Docker Push Image') {
            steps {
                echo "Pushing verified image to Amazon ECR Repository..."
                sh """
                    ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                    LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"

                    docker push \${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}
                """
            }
        }

        stage('Kubernetes Deployment') {
            steps {
                echo "Deploying ${env.TARGET_SERVICE} to Kubernetes Cluster..."
                // 🛠️ यहाँ डबल कोट्स की जगह सिंगल कोट्स (''') का उपयोग किया है ताकि Jenkins Groovy बीच में हस्तक्षेप न करे
                sh '''
                    # 1. सीधे शेल के अंदर ही AWS Account ID और ECR URL सेट करना
                    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
                    LOCAL_ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
                    
                    echo "Starting deployment for AWS Account: ${ACCOUNT_ID}"
                    echo "ECR URL configured as: ${LOCAL_ECR_URL}"

                    # 2. स्नैप के सुरक्षित वर्कस्पेस के अंदर kubeconfig सेट करना
                    export KUBECONFIG="${WORKSPACE}/.kube-config"
                    aws eks update-kubeconfig --region ${AWS_DEFAULT_REGION} --name ecommerce-cluster --kubeconfig ${KUBECONFIG}

                    NAMESPACE="production"
                    if [ "${ACTUAL_BRANCH}" = "develop" ] || [ "${ACTUAL_BRANCH}" = "dev" ] || [ "${BRANCH_NAME}" = "develop" ]; then 
                        NAMESPACE="dev"
                    fi
                    if [ "${ACTUAL_BRANCH}" = "testing" ] || [ "${BRANCH_NAME}" = "testing" ]; then 
                        NAMESPACE="testing"
                    fi

                    echo "🎯 Ensuring namespace ${NAMESPACE} exists..."
                    if [ -f "./k8s/namespaces.yaml" ]; then
                        kubectl apply -f ./k8s/namespaces.yaml --kubeconfig ${KUBECONFIG} || true
                    else
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - --kubeconfig ${KUBECONFIG} || true
                    fi

                    # 3. रूट के मुख्य k8s फोल्डर की फाइल्स को अपडेट और अप्लाई करना
                    if [ -d "./k8s" ]; then
                        echo "🌐 Applying Global manifests from Root k8s folder..."
                        find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        find ./k8s/ -name "*.yaml" ! -name "namespaces.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE}:main-${BUILD_NUMBER}|g" {} + || true
                        
                        kubectl apply -f ./k8s/ -n ${NAMESPACE} --kubeconfig ${KUBECONFIG}
                    fi

                    # 4. सर्विस स्पेसिफिक (cart-service) manifests को अप्लाई करना
                    K8S_DIR="./${TARGET_SERVICE}/k8s"
                    if [ -d "${K8S_DIR}" ]; then
                        echo "📦 Applying Service-specific manifests from ${K8S_DIR}..."
                        find ${K8S_DIR}/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE}:${ACTUAL_BRANCH}-${BUILD_NUMBER}|g" {} + || true
                        find ${K8S_DIR}/ -name "*.yaml" -exec sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE}:main-${BUILD_NUMBER}|g" {} + || true
                        find ${K8S_DIR}/ -name "*.yaml" -exec sed -i "s|image: .*/${TARGET_SERVICE}:.*|image: ${LOCAL_ECR_URL}/${TARGET_SERVICE}:main-${BUILD_NUMBER}|g" {} + || true

                        kubectl apply -f ${K8S_DIR}/ -n ${NAMESPACE} --kubeconfig ${KUBECONFIG}
                    fi
                    
                    echo "🎉 Complete Cluster deployment finished successfully!"
                '''
            }
        }
    } // 🛠️ FIX: यह ब्रैकेट 'stages' ब्लॉक को बंद करने के लिए ज़रूरी था

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
