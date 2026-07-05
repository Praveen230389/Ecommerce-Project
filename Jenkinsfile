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
        JENKINS_JOB_BASE_PATH = "Microservices-Ecommerce"
    }
    stages {
        stage('Evaluate Changes & Trigger Downstream Pipelines') {
            steps {
                script {
                    def microservices = [
                        'analytics-service', 'api-gateway', 'auth-service', 'cart-service',
                        'discount-service', 'inventory-service', 'notification-service', 'order-service',
                        'payment-service', 'product-service', 'review-service', 'recommendation-service',
                        'search-service', 'shipping-service', 'user-service', 'wishlist-service'
                    ]
                    
                    // FIXED: अगर k8s फोल्डर या रूट की फाइल्स में बदलाव हुआ, तो सब डिप्लॉय होगा
                    def infraChanges = sh(
                        script: "git diff --name-only HEAD~1 HEAD | grep -E '^(k8s/|user.yaml)' || true",
                        returnStdout: true
                    ).trim()

                    for (int i = 0; i < microservices.size(); i++) {
                        def serviceName = microservices[i]
                        
                        def hasChanges = sh(
                            script: "git diff --name-only HEAD~1 HEAD | grep -E '^${serviceName}/' || true",
                            returnStdout: true
                        ).trim()
                        
                        if (hasChanges || infraChanges) {
                            echo "SUCCESS: Triggering deployment for: [${serviceName}]"
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
