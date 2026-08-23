import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
paths = [ROOT / "content/lessons/lesson-01.json", ROOT / "content/audio/manifest.json"]
changed = 0
for path in paths:
    data = json.loads(path.read_text(encoding="utf-8"))
    def migrate(value):
        global changed
        if isinstance(value, dict):
            if value.get("license") == "generated" and value.get("reviewStatus") == "approved":
                value["reviewStatus"] = "generated"
                changed += 1
            for child in value.values():
                migrate(child)
        elif isinstance(value, list):
            for child in value:
                migrate(child)
    migrate(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"migrated_generated_clips={changed}")
