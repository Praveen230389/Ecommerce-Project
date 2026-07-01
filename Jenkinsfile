pipeline {
    agent any

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()
    }

    triggers {
        // Triggers the pipeline automatically on repository webhook events
        githubPush()
    }

    environment {
        // ENTERPRISE REGISTRY CONFIGURATION
        JENKINS_JOB_BASE_PATH = "Microservices-Ecommerce"
    }

    stages {
        stage('Evaluate Changes & Trigger Downstream Pipelines') {
            steps {
                script {
                    // Define all 16 microservices here in this list. 
                    // Add the remaining services to this array exactly matching their folder names.
                    def microservices = [
                        'analytics-service',
                        'api-gateway',
                        'auth-service',
                        'cart-service',
                        'discount-service',
                        'inventory-service',
                        'notification-service',
                        'order-service',
                        'payment-service',
                        'product-service',
                        'review-service',
                        'recommendation-service',
                        'search-service',
                        'shipping-service',
                        'user-service',
                        'wishlist-service'
                    ]

                    // Loop through each microservice to check for source code changes
                    for (int i = 0; i < microservices.size(); i++) {
                        def serviceName = microservices[i]
                        
                        // Production Path Filtering Logic using Git Diff
                        // Checks if files inside the specific microservice folder changed in this commit
                        def hasChanges = sh(
                            script: "git diff --name-only HEAD~1 HEAD | grep -E '^${serviceName}/' || true",
                            returnStdout: true
                        ).trim()

                        if (hasChanges) {
                            echo "SUCCESS: Changes detected in directory: [${serviceName}]. Orchestrating microservice pipeline..."
                            
                            // Triggers the specific microservice pipeline asynchronously without blocking the root runner
                            build(
                                job: "${JENKINS_JOB_BASE_PATH}/${serviceName}/${env.BRANCH_NAME}",
                                wait: false,
                                propagate: false
                            )
                        } else {
                            echo "SKIP: No modifications found in directory: [${serviceName}]."
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
