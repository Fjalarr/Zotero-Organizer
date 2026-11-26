import json
import os
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT, "dist")

with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
    MANIFEST = json.load(f)

VERSION = MANIFEST["version"]
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

print(f"Built {XPI_PATH} ({os.path.getsize(XPI_PATH)} bytes)")
with zipfile.ZipFile(XPI_PATH, "r") as zf:
    for info in zf.infolist():
        print(f"  {info.filename:45s} {info.file_size:6d} B")
