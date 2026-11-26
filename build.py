import hashlib
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT, "dist")
MANIFEST_PATH = os.path.join(ROOT, "manifest.json")
UPDATES_PATH = os.path.join(ROOT, "updates.json")

with open(MANIFEST_PATH, encoding="utf-8") as f:
    MANIFEST = json.load(f)

VERSION = MANIFEST["version"]
ADDON_ID = MANIFEST["applications"]["zotero"]["id"]
MIN_VER = MANIFEST["applications"]["zotero"].get("strict_min_version", "7.0")
MAX_VER = MANIFEST["applications"]["zotero"].get("strict_max_version", "10.*")
REPO_URL = MANIFEST.get("homepage_url", "https://github.com/Fjalarr/Zotero-Organizer").rstrip("/")

XPI_NAME = f"organizer-v{VERSION}.xpi"
XPI_PATH = os.path.join(DIST_DIR, XPI_NAME)

INCLUDE_FILES = [
    "manifest.json",
    "chrome.manifest",
    "bootstrap.js",
]

INCLUDE_DIRS = [
    "src",
    "locale",
    "chrome",
]

os.makedirs(DIST_DIR, exist_ok=True)

# Keep only the latest build in dist/ — older versions are tracked in GitHub Releases
for fname in os.listdir(DIST_DIR):
    if fname.endswith(".xpi") and fname != XPI_NAME:
        os.remove(os.path.join(DIST_DIR, fname))

with zipfile.ZipFile(XPI_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    for rel in INCLUDE_FILES:
        full = os.path.join(ROOT, rel)
        zf.write(full, rel)
    for d in INCLUDE_DIRS:
        base = os.path.join(ROOT, d)
        for dirpath, _, filenames in os.walk(base):
            for fname in sorted(filenames):
                full = os.path.join(dirpath, fname)
                arc = os.path.relpath(full, ROOT).replace("\\", "/")
                zf.write(full, arc)

# Compute SHA-256 hash and keep updates.json synchronized for Zotero automatic updates
with open(XPI_PATH, "rb") as f:
    sha256_hex = hashlib.sha256(f.read()).hexdigest()

updates_payload = {
    "addons": {
        ADDON_ID: {
            "updates": [
                {
                    "version": VERSION,
                    "update_link": f"{REPO_URL}/releases/download/v{VERSION}/{XPI_NAME}",
                    "update_hash": f"sha256:{sha256_hex}",
                    "applications": {
                        "zotero": {
                            "strict_min_version": MIN_VER,
                            "strict_max_version": MAX_VER,
                        }
                    },
                }
            ]
        }
    }
}

with open(UPDATES_PATH, "w", encoding="utf-8", newline="\n") as f:
    json.dump(updates_payload, f, indent=2)
    f.write("\n")

print(f"Built {XPI_PATH} ({os.path.getsize(XPI_PATH)} bytes)")
print(f"SHA-256: sha256:{sha256_hex}")
print(f"Updated {UPDATES_PATH} for Zotero auto-update -> v{VERSION}")
with zipfile.ZipFile(XPI_PATH, "r") as zf:
    for info in zf.infolist():
        print(f"  {info.filename:45s} {info.file_size:6d} B")
