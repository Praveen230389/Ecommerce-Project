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
        // ग्लोबल एनवायरनमेंट वेरिएबल ताकि पैरेलल स्टेज इसे आसानी से पढ़ सके
        ECR_URL            = "" 
    }
    
    stages {
        stage('Initialize & AWS ECR Login') {
            steps {
                script {
                    echo "Initializing Environment and Logging into AWS ECR..."
                    
                    withCredentials([usernamePassword(credentialsId: 'aws-credentials-id', 
                                                     usernameVariable: 'AWS_ACCESS_KEY_ID', 
                                                     passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        
                        // अकाउंट आईडी निकालकर उसे ग्लोबल क्रेडेंशियल में सेट करना
                        def accountId = sh(script: "aws sts get-caller-identity --query Account --output text", returnStdout: true).trim()
                        echo "Detected AWS Account ID: ${accountId}"
                        
                        env.ECR_URL = "${accountId}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                        
                        sh "aws ecr get-login-password --region ${env.AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${env.ECR_URL}"
                    }
                }
            }
        }
        
        stage('Detect Changed Microservices & Build Engine') {
            steps {
                script {
                    def allServices = [
                        'analytics-service', 'api-gateway', 'auth-service', 'cart-service',
                        'discount-service', 'inventory-service', 'notification-service', 'order-service',
                        'payment-service', 'product-service', 'review-service', 'recommendation-service',
                        'search-service', 'shipping-service', 'user-service', 'wishlist-service'
                    ]
                    
                    def changedServices = []
                    
                    // गिट कमिट का मैसेज निकालना
                    def commitMessage = sh(script: "git log -1 --pretty=%B || true", returnStdout: true).trim()
                    echo "Current Commit Message: ${commitMessage}"
                    
                    // FORCE TRIGGER LOGIC: अगर Jenkinsfile अपडेट हुई या मैन्युअल रन है, तो सब बिल्ड होगा
                    if (commitMessage.contains("Jenkinsfile") || commitMessage.contains("add") || currentBuild.buildCauses.toString().contains("UserIdCause")) {
                        echo "🔄 Force Trigger Detected! Building all 16 microservices..."
                        changedServices = allServices
                    } else {
                        // सामान्य दिनों में सिर्फ बदलाव वाले फोल्डर्स को ट्रैक करना
                        def changedFiles = sh(script: "git diff --name-only HEAD~1 HEAD || true", returnStdout: true).trim().split('\n')
                        for (file in changedFiles) {
                            if (file.contains('/')) {
                                def folder = file.tokenize('/').first()
                                if (allServices.contains(folder) && !changedServices.contains(folder)) {
                                    changedServices.add(folder)
                                }
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
                    
                    echo "🔥 Services to Process: ${changedServices}"
                    
                    // पैरेलल एग्जीक्यूशन इंजन
                    def parallelStages = [:]
                    def serviceResults = [:]
                    
                    for (int i = 0; i < changedServices.size(); i++) {
                        def service = changedServices[i]
                        
                        parallelStages["${service}-pipeline"] = {
                            stage("Process ${service}") {
                                try {
                                    echo "Building Docker image for: ${service}"
                                    sh "docker build -t ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER} ./${service}"
                                    
                                    echo "Running Trivy Scan for: ${service}"
                                    sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                                    
                                    echo "Pushing Image to ECR for: ${service}"
                                    sh "docker push ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                                    
                                    def namespace = "production"
                                    if (env.BRANCH_NAME == 'develop') namespace = "dev"
                                    if (env.BRANCH_NAME == 'testing')  namespace = "testing"
                                    
                                    echo "Deploying ${service} to EKS Namespace [${namespace}]..."
                                    
                                    // SED MAGIC: कूबरनेटीस मैनिफेस्ट के अंदर इमेज टैग को लाइव बदलना
                                    sh """
                                        sed -i 's|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g' ./${service}/k8s/*.yaml || true
                                        sed -i 's|image: .*/${service}:.*|image: ${env.ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g' ./${service}/k8s/*.yaml || true
                                    """
                                    
                                    sh "kubectl apply -f ./${service}/k8s/ -n ${namespace}"
                                    serviceResults[service] = "SUCCESS"
                                    
                                } catch (Exception e) {
                                    echo "❌ ERROR: Pipeline failed for ${service}. Error: ${e.getMessage()}"
                                    serviceResults[service] = "FAILED"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                        }
                    }
                    
                    // सभी पैरेलल टास्क को एक साथ ट्रिगर करना
                    parallel parallelStages
                    
                    echo "=========================================================="
                    echo "             FINAL MICROSERVICES BUILD REPORT             "
                    echo "=========================================================="
                    serviceResults.each { s, res -> echo "  🚀 ${s} : [${res}]" }
                    echo "=========================================================="
                }
            }
        }
    } // FIXED: यहाँ पर stages ब्लॉक का क्लोजिंग ब्रैकेट गायब था, जिसे फिक्स कर दिया है
    
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
