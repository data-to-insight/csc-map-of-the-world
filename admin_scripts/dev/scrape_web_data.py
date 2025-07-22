# Re-run with fallback in case slugify is unavailable
import os
import yaml
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlparse
import re

# Fallback slugify
def simple_slugify(value):
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value)

# Define output directory
output_dir = Path("data_web")
output_dir.mkdir(parents=True, exist_ok=True)

# Load site config
config_path = Path("data_web/sites_to_scrape.yaml")
if not config_path.exists():
    raise FileNotFoundError("Missing 'data_web/sites_to_scrape.yaml'")

with open(config_path, "r", encoding="utf-8") as f:
    sites = yaml.safe_load(f)

scraped = []

for site in sites:
    name = site.get("name", "unnamed")
    url = site.get("url")
    tags = site.get("tags", [])

    if not url:
        continue

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract visible text
        for script_or_style in soup(["script", "style"]):
            script_or_style.decompose()
        text = soup.get_text(separator=" ", strip=True)

        # Prepare file
        domain = urlparse(url).netloc.replace("www.", "")
        filename = f"{simple_slugify(domain + '-' + name)}.txt"
        output_path = output_dir / filename

        # Add header with metadata
        metadata = f"""# {name}
Source: {url}
Tags: {", ".join(tags)}
---
"""
        with open(output_path, "w", encoding="utf-8") as f_out:
            f_out.write(metadata + "\n" + text)

        scraped.append((name, filename, len(text.split())))

    except requests.RequestException as e:
        scraped.append((name, "FAILED", str(e)))
