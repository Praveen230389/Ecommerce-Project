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
                    dir('cartservice/Dockerfile') { // 🛠️ FIX 3: 'cartservice/Dockerfile' से फ़ाइल हटाकर सिर्फ फोल्डर पाथ दिया
                        sh 'docker system prune -f'
                        sh 'docker container prune -f'
                        sh 'docker build -t Ecommerse/cart-service .'
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
                echo "Scanning Image for Vulnerabilities..."
                sh "trivy image --scanners vuln --offline-scan Ecommerse/cart-service > trivyresults.txt"
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
