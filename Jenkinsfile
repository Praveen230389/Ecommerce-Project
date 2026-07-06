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
        AWS_CREDS          = credentials('aws-credentials-id')
        ECR_URL            = "" // यह स्टेज 2 में डायनामिकली भरा जाएगा
    }
    
    stages {
        stage('Initialize & AWS ECR Login') {
            steps {
                script {
                    echo "Initializing Environment and Logging into AWS ECR..."
                    
                    // FIXED: प्लगइन एरर को बाईपास करने के लिए स्टैंडर्ड usernamePassword बाइंडिंग का उपयोग
                    withCredentials([usernamePassword(credentialsId: 'aws-credentials-id', 
                                                     usernameVariable: 'AWS_ACCESS_KEY_ID', 
                                                     passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        
                        def accountId = sh(script: "aws sts get-caller-identity --query Account --output text", returnStdout: true).trim()
                        env.ECR_URL = "${accountId}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                        sh "aws ecr get-login-password --region ${env.AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${env.ECR_URL}"
                    }
                }
            }
        }
        
        stage('Detect Changed Microservices & Build Engine') {
            steps {
                script {
                    // सभी 16 माइक्रोसर्विसेज की लिस्ट
                    def allServices = [
                        'analytics-service', 'api-gateway', 'auth-service', 'cart-service',
                        'discount-service', 'inventory-service', 'notification-service', 'order-service',
                        'payment-service', 'product-service', 'review-service', 'recommendation-service',
                        'search-service', 'shipping-service', 'user-service', 'wishlist-service'
                    ]
                    
                    def changedServices = []
                    
                    // गिटहब कमिट से बदलावों को ट्रैक करना
                    def changedFiles = sh(script: "git diff --name-only HEAD~1 HEAD || true", returnStdout: true).trim().split('\n')
                    
                    for (file in changedFiles) {
                        if (file.contains('/')) {
                            def folder = file.tokenize('/')[0]
                            if (allServices.contains(folder) && !changedServices.contains(folder)) {
                                changedServices.add(folder)
                            }
                        }
                    }
                    
                    if (changedServices.isEmpty()) {
                        echo "=========================================================="
                        echo "   ⚠️ NO MICROSERVICES CHANGED. SKIPPING AUTOMATION.   "
                        echo "=========================================================="
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                    
                    echo "🔥 Changed Services Detected: ${changedServices}"
                    
                    // 🌟 पैरेलल एग्जीक्यूशन इंजन (Parallel Execution Engine)
                    def parallelStages = [:]
                    def serviceResults = [:]
                    
                    // हर बदली हुई सर्विस के लिए डायनामिक ब्लॉक बनाना
                    for (int i = 0; i < changedServices.size(); i++) {
                        def service = changedServices[i]
                        
                        parallelStages["${service}-pipeline"] = {
                            stage("Process ${service}") {
                                try {
                                    // 1. Docker Build
                                    echo "Building Docker image for: ${service}"
                                    sh "docker build -t ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER} ./${service}"
                                    
                                    // 2. Trivy Scan (HIGH & CRITICAL होने पर फेल होगा)
                                    echo "Running Trivy Scan for: ${service}"
                                    sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                                    
                                    // 3. Push to AWS ECR
                                    echo "Pushing Image to ECR for: ${service}"
                                    withEnv(["AWS_ACCESS_KEY_ID=${env.AWS_CREDS_USR}", "AWS_SECRET_ACCESS_KEY=${env.AWS_CREDS_PSW}"]) {
                                        sh "docker push ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                                    }
                                    
                                    // 4. Deploy to Kubernetes EKS (Branch के हिसाब से नेमस्पेस तय करना)
                                    def namespace = "production"
                                    if (env.BRANCH_NAME == 'develop') namespace = "dev"
                                    if (env.BRANCH_NAME == 'testing')  namespace = "testing"
                                    
                                    echo "Deploying ${service} to EKS Namespace [${namespace}]..."
                                    
                                    // कूबरनेटीस मैनिफेस्ट के अंदर इमेज टैग को बिना फाइल एडिट किए बदलना (Sed Magic)
                                    sh """
                                        sed -i 's|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g' ./${service}/k8s/*.yaml || true
                                        sed -i 's|image: .*/${service}:.*|image: ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g' ./${service}/k8s/*.yaml || true
                                    """
                                    
                                    // कूबरनेटीस अप्लाई और रोलआउट चेक
                                    sh "kubectl apply -f ./${service}/k8s/ -n ${namespace}"
                                    sh "kubectl rollout status deployment/${service} -n ${namespace} --timeout=90s"
                                    
                                    serviceResults[service] = "SUCCESS"
                                    
                                } catch (Exception e) {
                                    // अगर एक सर्विस फेल होगी, तो बाकी चलती रहेंगी!
                                    echo "❌ ERROR: Pipeline failed for ${service}. Error: ${e.getMessage()}"
                                    serviceResults[service] = "FAILED"
                                    currentBuild.result = 'UNSTABLE' 
                                }
                            }
                        }
                    }
                    
                    // सभी पैरेलल टास्क को एक साथ ट्रिगर करना
                    parallel parallelStages
                    
                    // अंतिम रिजल्ट्स को डैशबोर्ड पर प्रिंट करना
                    echo "=========================================================="
                    echo "             FINAL MICROSERVICES BUILD REPORT             "
                    echo "=========================================================="
                    serviceResults.each { s, res ->
                        echo "  🚀 ${s} : [${res}]"
                    }
                    echo "=========================================================="
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "Cleaning up local workspace cache and unused docker layers..."
                sh "docker image prune -f || true"
                cleanWs()
            }
        }
    }
}
