# admin_scripts/get_r2_cloudflare_files.py

# this set up to pull pdf files from R2 bucket. R2 is currently set up under RH personal 
# address as ESCC was needing approval. 

# script authenticates via API,needs either .env file with secrets or multiple 'export .... 
# running before the script. 
# Will then pull from r2 root, any files matching below defined file types and bring down
# into existing/new created "data_r2files2" folder in repo. 
 

import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

def need(name: str) -> str:
    v = os.getenv(name)
    if not v:
        print(f"Missing env var: {name}\n"
              f"Set it in shell, e.g.:\n"
              f"  export {name}=<value>", file=sys.stderr)
        sys.exit(1)
    return v

def parse_exts(csv: str) -> set[str]:
    # ".pdf,.txt,doc" -> {".pdf", ".txt", ".doc"} (case-insensitive)
    out = set()
    for raw in csv.split(","):
        t = raw.strip().lower()
        if not t:
            continue
        out.add(t if t.startswith(".") else f".{t}")
    return out

# --- Required env vars (use names, not literal IDs) ---
ACCOUNT_ID = need("R2_ACCOUNT_ID")
ACCESS_KEY = need("R2_ACCESS_KEY_ID")
SECRET_KEY = need("R2_SECRET_ACCESS_KEY")
BUCKET     = need("R2_BUCKET")

# --- Optional config ---
REGION       = os.getenv("R2_REGION", "auto")  # Cloudflare prefers "auto"
ENDPOINT     = os.getenv("R2_ENDPOINT", f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com")
PREFIX       = os.getenv("R2_PREFIX", "")      # e.g. "pdf/csc/"
TARGET_DIR   = Path(os.getenv("R2_TARGET_DIR", "data_r2files"))
EXTS         = parse_exts(os.getenv("R2_EXTS", ".pdf,.txt,.doc"))
OVERWRITE    = os.getenv("R2_OVERWRITE", "false").lower() in {"1", "true", "yes", "y"}

# --- S3-compatible client for Cloudflare R2 ---
s3 = boto3.client(
    "s3",
    endpoint_url=ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION,
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)

def iter_matching_objects(bucket: str, prefix: str, wanted_exts: set[str]):
    """Yield (key, size) for objects whose extension is in wanted_exts."""
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # Skip 'folders' (S3 prefixes might show as zero-byte keys ending with '/')
            if key.endswith("/"):
                continue
            ext = Path(key).suffix.lower()
            if ext in wanted_exts:
                yield key, obj.get("Size", 0)

def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    skipped = 0
    bytes_dl = 0
    bytes_skipped = 0

    found_any = False
    for key, size in iter_matching_objects(BUCKET, PREFIX, EXTS):
        found_any = True
        local_path = TARGET_DIR / key  # preserve prefix structure
        local_path.parent.mkdir(parents=True, exist_ok=True)

        if local_path.exists() and not OVERWRITE:
            # Fast skip if sizes match
            try:
                if local_path.stat().st_size == size:
                    print(f"SKIP (exists, same size): {key}")
                    skipped += 1
                    bytes_skipped += size
                    continue
            except OSError:
                pass  # fall through to re-download

        try:
            s3.download_file(BUCKET, key, str(local_path))
            print(f"OK: {key} -> {local_path} ({size} bytes)")
            downloaded += 1
            bytes_dl += size
        except ClientError as e:
            print(f"FAIL: {key} ({e})")

    if not found_any:
        print(f"No matching objects found in s3://{BUCKET}/{PREFIX} for extensions: {', '.join(sorted(EXTS))}")
        return

    print(
        f"\nDone. Downloaded {downloaded}, skipped {skipped}. "
        f"Bytes downloaded: {bytes_dl:,}. Skipped bytes: {bytes_skipped:,}.\n"
        f"Bucket: s3://{BUCKET}/{PREFIX or ''}  Types: {', '.join(sorted(EXTS))}  "
        f"Target: {TARGET_DIR}/"
    )

if __name__ == "__main__":
    main()
