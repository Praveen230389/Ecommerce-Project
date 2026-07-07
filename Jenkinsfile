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
        
        stage('Build & Deploy Engine (Single Service Mode)') {
            steps {
                script {
                    // 🎯 FIXED: लॉग्स को छोटा रखने के लिए बाकी 15 सर्विसेज हटा दी हैं, सिर्फ एक टेस्ट होगी!
                    def changedServices = ['api-gateway']
                    
                    echo "🔥 Single Service Mode Activated. Processing: ${changedServices}"
                    
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
                                            
                                            echo "Building Docker image for: ${service}"
                                            docker build -t \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER} ./${service}
                                            
                                            echo "Running Trivy Scan via Docker Host Mount..."
                                            # 🎯 FIXED TRIVY PATH: बाहर की ट्रिवी को कंटेनर के रास्ते से बुलाने का सही तरीका
                                            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}
                                            
                                            echo "Pushing Image to ECR for: ${service}"
                                            docker push \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}
                                            
                                            NAMESPACE="production"
                                            if [ "${env.BRANCH_NAME}" = "develop" ]; then NAMESPACE="dev"; fi
                                            if [ "${env.BRANCH_NAME}" = "testing" ]; then NAMESPACE="testing"; fi
                                            
                                            echo "Deploying ${service} to EKS Namespace [\${NAMESPACE}]..."
                                            
                                            sed -i "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g" ./${service}/k8s/*.yaml || true
                                            sed -i "s|image: .*/${service}:.*|image: \${LOCAL_ECR_URL}/${service}:${env.BRANCH_NAME}-${env.BUILD_NUMBER}|g" ./${service}/k8s/*.yaml || true
                                            
                                            kubectl apply -f ./${service}/k8s/ -n \this_namespace_is_fixed || kubectl apply -f ./${service}/k8s/ -n \${NAMESPACE}
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
                    echo "             FINAL BUILD REPORT (SINGLE MODE)             "
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
