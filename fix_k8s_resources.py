#!/usr/bin/env python3

from pathlib import Path
import re

ROOT = Path(__file__).parent

files = list(ROOT.glob("*/k8s/deployment.yaml"))

if not files:
    print("No deployment.yaml files found.")
    exit()

for f in files:
    text = f.read_text(encoding="utf-8")

    # replicas
    text = re.sub(
        r"replicas:\s*\d+",
        "replicas: 1",
        text
    )

    # CPU Request
    text = re.sub(
        r'cpu:\s*"250m"',
        'cpu: "50m"',
        text
    )

    # Memory Request
    text = re.sub(
        r'memory:\s*"256Mi"',
        'memory: "128Mi"',
        text,
        count=1
    )

    # CPU Limit
    text = re.sub(
        r'cpu:\s*"500m"',
        'cpu: "200m"',
        text
    )

    # Memory Limit
    text = re.sub(
        r'memory:\s*"512Mi"',
        'memory: "256Mi"',
        text
    )

    f.write_text(text, encoding="utf-8")
    print(f"Updated: {f.relative_to(ROOT)}")

print("\nDone.")
