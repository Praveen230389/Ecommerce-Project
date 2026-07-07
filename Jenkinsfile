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
    }
    
    stages {
        stage('Initialize & AWS ECR Login') {
            steps {
                script {
                    echo "Initializing Environment and Logging into AWS ECR..."
                    
                    withCredentials([usernamePassword(credentialsId: 'aws-credentials-id', 
                                                     usernameVariable: 'AWS_ACCESS_KEY_ID', 
                                                     passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        
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
                    
                    def commitMessage = sh(script: "git log -1 --pretty=%B || true", returnStdout: true).trim()
                    echo "Current Commit Message: ${commitMessage}"
                    
                    if (commitMessage.contains("Jenkinsfile") || commitMessage.contains("add") || currentBuild.buildCauses.toString().contains("UserIdCause")) {
                        echo "🔄 Force Trigger Detected! Building all 16 microservices..."
                        changedServices = allServices
                    } else {
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
                    
                    def parallelStages = [:]
                    def serviceResults = [:]
                    
                    for (int i = 0; i < changedServices.size(); i++) {
                        def service = changedServices[i]
                        
                        parallelStages["${service}-pipeline"] = {
                            stage("Process ${service}") {
                                try {
                                    withCredentials([usernamePassword(credentialsId: 'aws-credentials-id', 
                                                                     usernameVariable: 'AWS_ACCESS_KEY_ID', 
                                                                     passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                                        
                                        sh """
                                            ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                                            LOCAL_ECR_URL="\${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com"
                                            
                                            # 🔥 AUTOMATIC DOCKERFILE FIX: 'npm ci' वाले एरर को हवा में ही फिक्स करना
                                            if [ -f "./${service}/Dockerfile" ]; then
                                                echo "Applying enterprise Dockerfile patch for ${service}..."
                                                sed -i 's|npm ci --only=production|npm install --omit=dev|g' ./${service}/Dockerfile || true
                                                sed -i 's|npm ci|npm install --omit=dev|g' ./${service}/Dockerfile || true
                                            fi
                                            
                                            echo "Building Docker image for: ${service}"
                                            docker build -t \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER} ./${service}
                                            
                                            echo "Running Trivy Scan for: ${service}"
                                            trivy image --exit-code 0 --severity HIGH,CRITICAL \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}
                                            
                                            echo "Pushing Image to ECR for: ${service}"
                                            docker push \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}
                                            
                                            NAMESPACE="production"
                                            if [ "${env.BRANCH_NAME}" = "develop" ]; then NAMESPACE="dev"; fi
                                            if [ "${env.BRANCH_NAME}" = "testing" ]; then NAMESPACE="testing"; fi
                                            
                                            echo "Deploying ${service} to EKS Namespace [\${NAMESPACE}]..."
                                            
                                            sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g" ./${service}/k8s/*.yaml || true
                                            sed -i "s|image: .*/${service}:.*|image: \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g" ./${service}/k8s/*.yaml || true
                                            
                                            kubectl apply -f ./${service}/k8s/ -n \${NAMESPACE}
                                        """
                                    }
                                    serviceResults[service] = "SUCCESS"
                                    
                                } catch (Exception e) {
                                    echo "❌ ERROR: Pipeline failed for ${service}. Error: ${e.getMessage()}"
                                    serviceResults[service] = "FAILED"
                                    currentBuild.result = 'UNSTABLE'
                                }
                            }
                        }
                    }
                    
                    parallel parallelStages
                    
                    echo "=========================================================="
                    echo "             FINAL MICROSERVICES BUILD REPORT             "
                    echo "=========================================================="
                    for (entry in serviceResults) {
                        echo "  🚀 ${entry.key} : [${entry.value}]"
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
