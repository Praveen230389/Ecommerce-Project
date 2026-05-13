pipeline {

    agent any

    environment {

        NAMESPACE = "prod"
    }

    stages {

        stage('Checkout Code') {

            steps {

                checkout scm
            }
        }

        stage('Deploy All Services') {

            steps {

                script {

                    def services = [
                        "analytics-service",
                        "api-gateway",
                        "auth-service",
                        "cart-service",                      
                    ]

                    for (service in services) {

                        dir(service) {

                            sh """
                                kubectl apply -f k8s/ -n ${NAMESPACE}
                            """
                        }
                    }
                }
            }
        }

        stage('Verify') {

            steps {

                sh "kubectl get pods -n ${NAMESPACE}"
            }
        }
    }
}
