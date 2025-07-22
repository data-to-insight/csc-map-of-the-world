import os
import sys

# scan folder (from arg or default)
BASE_DIR = sys.argv[1] if len(sys.argv) > 1 else "data_yml"

# exclude (e.g. .md, .yml)
EXCLUDE_EXTENSIONS = []

if not os.path.exists(BASE_DIR):
    print(f"Folder not found: {BASE_DIR}")
    sys.exit(1)

print(f"Scanning: {BASE_DIR}\n")

for root, dirs, files in os.walk(BASE_DIR):
    for dirname in dirs:
        print(f" {os.path.join(root, dirname)}")
    for filename in files:
        ext = os.path.splitext(filename)[1]
        if ext.lower() not in EXCLUDE_EXTENSIONS:
            print(f"📄 {os.path.join(root, filename)}")
