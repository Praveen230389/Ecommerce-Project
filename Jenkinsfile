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
        // आपके जेनकिंस UI फोल्डर का सटीक नाम
        JENKINS_JOB_BASE_PATH = "Ecommerce-Project"
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
                    
                    // चेक करें कि क्या इंफ्रास्ट्रक्चर (k8s फोल्डर) या कॉन्फिग में बदलाव हुआ है
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
                            echo "SUCCESS: Modifications found. Preparing deploy for: [${serviceName}]"
                            
                            def targetJobPath = "${JENKINS_JOB_BASE_PATH}/${serviceName}/${env.BRANCH_NAME}"
                            
                            // कंपनी लेवल स्मार्ट सेफ-गार्ड: अगर ब्रांच नहीं मिली तो पाइपलाइन क्रैश नहीं होगी
                            try {
                                echo "Attempting to trigger child pipeline: [${targetJobPath}]"
                                build(
                                    job: targetJobPath,
                                    wait: false,
                                    propagate: true
                                )
                            } catch (Exception e) {
                                echo "WARNING: Branch [${env.BRANCH_NAME}] is not yet indexed inside Jenkins for [${serviceName}]."
                                echo "Triggering automatic Folder Scan/Indexing to discover the branches..."
                                
                                // सेफ फ़ॉलबैक: यह जेनकिंस की उस चाइल्ड जॉब को गिटहब स्कैन करने का आदेश देगा
                                build(
                                    job: "${JENKINS_JOB_BASE_PATH}/${serviceName}",
                                    wait: false,
                                    propagate: false
                                )
                            }
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
