#!/usr/bin/env python3

from pathlib import Path
import re

ROOT = Path(__file__).parent
K8S_DIR = ROOT / "k8s"

SKIP_FILES = {
    "ingress.yaml",
    "namespaces.yaml"
}

files = [
    f for f in K8S_DIR.glob("*.yaml")
    if f.name not in SKIP_FILES
]

if not files:
    print("No YAML files found.")
    exit()

for f in files:
    text = f.read_text(encoding="utf-8")

    # Limits
    text = re.sub(
        r'cpu:\s*"500m"',
        'cpu: "200m"',
        text
    )

    text = re.sub(
        r'memory:\s*"512Mi"',
        'memory: "256Mi"',
        text
    )

    # Requests
    text = re.sub(
        r'cpu:\s*"250m"',
        'cpu: "50m"',
        text
    )

    text = re.sub(
        r'memory:\s*"256Mi"',
        'memory: "128Mi"',
        text,
        count=1
    )

    f.write_text(text, encoding="utf-8")
    print(f"Updated: {f.relative_to(ROOT)}")

print("\nDone.")
