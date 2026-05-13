pipeline {

    agent any

    environment {

        NAMESPACE = "prod"

        IMAGE_NAME = "praveen230389/auth-service"

        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        // =========================================
        // STAGE 1 - CHECKOUT CODE
        // =========================================
        stage('Checkout Code') {
            steps {

                echo "Downloading Production Code..."

                checkout scm
            }
        }


        // =========================================
        // STAGE 2 - VERIFY TOOLS
        // =========================================
        stage('Verify Tools') {
            steps {

                echo "Checking Required Tools..."

                sh '''
                docker --version
                kubectl version --client
                '''

            }
        }


        // =========================================
        // STAGE 3 - SONARQUBE SCAN
        // =========================================
        stage('SonarQube Scan') {
            steps {

                echo "Running SonarQube Scan..."

                sh '''
                if command -v sonar-scanner >/dev/null 2>&1
                then
                    sonar-scanner
                else
                    echo "Sonar Scanner Missing"
                    exit 1
                fi
                '''

            }
        }


        // =========================================
        // STAGE 4 - BUILD DOCKER IMAGE
        // =========================================
        stage('Build Docker Image') {
            steps {

                echo "Building Docker Image..."

                dir('auth-service') {

                    sh '''
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                    '''

                }

            }
        }


        // =========================================
        // STAGE 5 - TRIVY SECURITY SCAN
        // =========================================
        stage('Trivy Security Scan') {
            steps {

                echo "Running Security Scan..."

                sh '''
                if command -v trivy >/dev/null 2>&1
                then
                    trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}:${IMAGE_TAG}
                else
                    echo "Trivy Missing"
                    exit 1
                fi
                '''

            }
        }


        // =========================================
        // STAGE 6 - PUSH IMAGE
        // =========================================
        stage('Push Docker Image') {
            steps {

                echo "Pushing Docker Image..."

                sh '''
                docker push ${IMAGE_NAME}:${IMAGE_TAG}
                '''

            }
        }


        // =========================================
        // STAGE 7 - MANUAL APPROVAL
        // =========================================
        stage('Production Approval') {
            steps {

                input message: 'Deploy To Production?', ok: 'Deploy'

            }
        }


        // =========================================
        // STAGE 8 - DEPLOY TO PRODUCTION
        // =========================================
        stage('Deploy To Production') {
            steps {

                echo "Deploying To Production Namespace..."

                dir('auth-service') {

                    sh '''
                    kubectl apply --validate=false -f k8s/ -n prod
                    '''

                }

            }
        }


        // =========================================
        // STAGE 9 - VERIFY PRODUCTION
        // =========================================
        stage('Verify Production Deployment') {
            steps {

                echo "Checking Production Pods..."

                sh '''
                kubectl get pods -n prod
                '''

            }
        }

    }


    // =========================================
    // POST ACTIONS
    // =========================================
    post {

        success {

            echo "Production Deployment Successful"

        }

        failure {

            echo "Production Deployment Failed"

        }

        always {

            echo "Production Pipeline Finished"

        }

    }

}
