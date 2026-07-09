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

        stage('Load AWS Credentials') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-credentials-id',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        echo "=============================================="
                        echo "Loading AWS Credentials"
                        echo "=============================================="

                        export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                        export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                        export AWS_DEFAULT_REGION="ap-south-1"

                        aws sts get-caller-identity
                    '''
                }
            }
        }

        stage('Generate Kubeconfig') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-credentials-id',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                        export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                        export AWS_DEFAULT_REGION="ap-south-1"

                        export KUBECONFIG="${WORKSPACE}/.kube-config"

                        aws eks update-kubeconfig \
                            --region ap-south-1 \
                            --name ecommerce-cluster \
                            --kubeconfig "${KUBECONFIG}"
                    '''
                }
            }
        }

        stage('Verify Cluster Connectivity') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    echo "=============================================="
                    echo "Cluster Information"
                    echo "=============================================="

                    kubectl cluster-info
                    kubectl version --short || true
                '''
            }
        }

        stage('Verify Worker Nodes') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    echo "=============================================="
                    echo "Worker Nodes"
                    echo "=============================================="

                    kubectl get nodes -o wide
                '''
            }
        }

        stage('Verify Namespaces') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    echo "=============================================="
                    echo "Namespaces"
                    echo "=============================================="

                    kubectl get ns
                '''
            }
        }

        stage('Create Production Namespace') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl create namespace production \
                    --dry-run=client -o yaml | kubectl apply -f -
                '''
            }
        }

        stage('Prepare Environment Variables') {
            steps {
                sh '''
                    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

                    echo "ACCOUNT_ID=${ACCOUNT_ID}" > deploy.env
                    echo "ECR=${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com" >> deploy.env
                    echo "NAMESPACE=production" >> deploy.env

                    cat deploy.env
                '''
            }
        }

        stage('Update Global Kubernetes Manifests') {
            steps {
                sh '''
                    source deploy.env

                    if [ -d "./k8s" ]; then

                        find ./k8s \
                        -name "*.yaml" \
                        ! -name "namespaces.yaml" \
                        -exec sed -i \
                        "s|image: REPLACE_WITH_AWS_ECR_URL/cart-service:.*|image: ${ECR}/${TARGET_SERVICE_1}:main-${BUILD_NUMBER}|g" {} +

                        find ./k8s \
                        -name "*.yaml" \
                        ! -name "namespaces.yaml" \
                        -exec sed -i \
                        "s|image: REPLACE_WITH_AWS_ECR_URL/api-gateway:.*|image: ${ECR}/${TARGET_SERVICE_2}:main-${BUILD_NUMBER}|g" {} +
                    fi
                '''
            }
        }

        stage('Apply Global Kubernetes Manifests') {
            steps {
                sh '''
                    source deploy.env

                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    if [ -d "./k8s" ]; then
                        kubectl apply -f ./k8s -n ${NAMESPACE} || true
                    fi
                '''
            }
        }

        stage('Update Cart Service Manifest') {
            steps {
                sh '''
                    source deploy.env

                    if [ -d "./cart-service/k8s" ]; then

                        find ./cart-service/k8s \
                        -name "*.yaml" \
                        -exec sed -i \
                        "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${ECR}/${TARGET_SERVICE_1}:main-${BUILD_NUMBER}|g" {} +
                    fi
                '''
            }
        }

        stage('Deploy Cart Service') {
            steps {
                sh '''
                    source deploy.env

                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    if [ -d "./cart-service/k8s" ]; then
                        kubectl apply -f ./cart-service/k8s -n ${NAMESPACE} || true
                    fi
                '''
            }
        }

        stage('Update API Gateway Manifest') {
            steps {
                sh '''
                    source deploy.env

                    if [ -d "./api-gateway/k8s" ]; then

                        find ./api-gateway/k8s \
                        -name "*.yaml" \
                        -exec sed -i \
                        "s|image: REPLACE_WITH_AWS_ECR_URL/.*|image: ${ECR}/${TARGET_SERVICE_2}:main-${BUILD_NUMBER}|g" {} +
                    fi
                '''
            }
        }

        stage('Deploy API Gateway') {
            steps {
                sh '''
                    source deploy.env

                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    if [ -d "./api-gateway/k8s" ]; then
                        kubectl apply -f ./api-gateway/k8s -n ${NAMESPACE} || true
                    fi
                '''
            }
        }

        stage('Verify Deployments') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get deployment -n production
                '''
            }
        }

        stage('Verify ReplicaSets') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get rs -n production
                '''
            }
        }

        stage('Verify Pods') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get pods -n production -o wide
                '''
            }
        }

        stage('Describe Pending Pods') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get pods -n production \
                    --field-selector=status.phase=Pending \
                    -o name | while read pod
                    do
                        echo "====================================="
                        echo "$pod"
                        echo "====================================="
                        kubectl describe $pod -n production || true
                    done
                '''
            }
        }

        stage('Verify Services') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get svc -n production
                '''
            }
        }

        stage('Verify Endpoints') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get endpoints -n production
                '''
            }
        }

        stage('Verify Ingress') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get ingress -n production
                    kubectl describe ingress -n production || true
                '''
            }
        }

        stage('Verify Events') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl get events \
                    -n production \
                    --sort-by=.metadata.creationTimestamp | tail -100 || true
                '''
            }
        }

        stage('Rollout Status - Cart Service') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl rollout status deployment/cart-service \
                    -n production \
                    --timeout=60s || true
                '''
            }
        }

        stage('Rollout Status - API Gateway') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    kubectl rollout status deployment/api-gateway \
                    -n production \
                    --timeout=60s || true
                '''
            }
        }

        stage('Final Cluster Summary') {
            steps {
                sh '''
                    export KUBECONFIG="${WORKSPACE}/.kube-config"

                    echo "==========================================="
                    echo "FINAL DEPLOYMENT STATUS"
                    echo "==========================================="

                    kubectl get nodes

                    echo ""

                    kubectl get deployment -n production

                    echo ""

                    kubectl get pods -n production -o wide

                    echo ""

                    kubectl get svc -n production

                    echo ""

                    kubectl get ingress -n production
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
