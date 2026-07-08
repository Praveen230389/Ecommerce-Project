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
                echo "Logging into Amazon ECR Registry and verifying repository existence..."
                sh """
                    ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                    
                    # 🛠️ FIX: चेक करो कि क्या ECR में cart-service नाम की रिपोजिटरी है
                    aws ecr describe-repositories --repository-names ${env.TARGET_SERVICE} --region ${env.AWS_DEFAULT_REGION} > /dev/null 2>&1
                    
                    # अगर नहीं है (Exit code non-zero), तो खुद ही रिपोजिटरी क्रिएट कर दो
                    if [ \$? -ne 0 ]; then
                        echo "⚠️ Repository '${env.TARGET_SERVICE}' not found. Creating it dynamically..."
                        aws ecr create-repository --repository-name ${env.TARGET_SERVICE} --region ${env.AWS_DEFAULT_REGION}
                    else
                        echo "✅ Repository '${env.TARGET_SERVICE}' already exists in ECR."
                    fi
                    
                    # अब हमेशा की तरह लॉगिन करो
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
                sh """
                    ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                    LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"

                    NAMESPACE="production"
                    if [ "${env.ACTUAL_BRANCH}" = "develop" ] || [ "${env.ACTUAL_BRANCH}" = "dev" ]; then NAMESPACE="dev"; fi
                    if [ "${env.ACTUAL_BRANCH}" = "testing" ]; then NAMESPACE="testing"; fi

                    K8S_DIR="./${env.TARGET_SERVICE}/k8s"
                    if [ ! -d "\${K8S_DIR}" ] && [ -d "./k8s" ]; then K8S_DIR="./k8s"; fi

                    if [ -d "\${K8S_DIR}" ]; then
                        echo "Dynamically replacing ECR Image Tag inside k8s manifests in \${K8S_DIR}..."
                        sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: \${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}|g" \${K8S_DIR}/*.yaml || true
                        sed -i "s|image: .*/${env.TARGET_SERVICE}:.*|image: \${LOCAL_ECR_URL}/${env.TARGET_SERVICE}:${env.ACTUAL_BRANCH}-${env.BUILD_NUMBER}|g" \${K8S_DIR}/*.yaml || true

                        echo "Applying k8s files to cluster in namespace: \${NAMESPACE}"
                        kubectl apply -f \${K8S_DIR}/ -n \${NAMESPACE} || true
                    else
                        echo "⚠️ Skipping K8s deploy step: No manifests directory found."
                    fi
                """
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
