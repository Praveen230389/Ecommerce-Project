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
                        
                        // FIXED: कोई ग्रूवी वेरिएबल नहीं, पूरा काम प्योर लिनक्स शेल के अंदर
                        sh """
                            ACCOUNT_ID=\$(aws sts get-caller-identity --query Account --output text)
                            echo "Detected AWS Account ID: \${ACCOUNT_ID}"
                            aws ecr get-login-password --region ${env.AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin \${ACCOUNT_ID}.dkr.ecr.${env.AWS_DEFAULT_REGION}.amazonaws.com
                        """
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
                    
                    for (int i = 0; i  echo "  🚀 ${s} : [${res}]" }
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
