import os
import datetime as dt
import uuid

STORAGE_DIR = "./kyc_storage"

os.makedirs(STORAGE_DIR, exist_ok=True)

def _get_file_path(key: str) -> str:
    return os.path.join(STORAGE_DIR, key)

def issue_upload_urls(user_id: str, exts: dict) -> dict:
    out = {}
    ts = dt.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    for kind, ext in exts.items():
        # Generate a unique key for local storage
        key = f"kyc/{user_id}/{ts}_{kind}_{uuid.uuid4().hex}.{ext}"
        file_path = _get_file_path(key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        out[kind] = {"key": key, "upload_url": f"file://{file_path}"}
    return out

def issue_download_url(key: str) -> str:
    file_path = _get_file_path(key)
    return f"file://{file_path}"

def get_bytes(key: str) -> bytes:
    file_path = _get_file_path(key)
    with open(file_path, "rb") as f:
        return f.read()

def save_bytes(key: str, content: bytes):
    file_path = _get_file_path(key)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)
