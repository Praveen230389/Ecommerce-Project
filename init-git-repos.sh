#!/bin/sh
for dir in *-service api-gateway; do
  if [ -d "$dir" ]; then
    echo "Initializing git repository in $dir..."
    cd $dir
    git init
    git add .
    git commit -m "Initial microservice commit for Jenkins multibranch pipeline config"
    cd ..
  fi
done
