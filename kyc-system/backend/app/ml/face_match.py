from __future__ import annotations
import io, logging
from dataclasses import dataclass
import numpy as np
from PIL import Image
from deepface import DeepFace

log = logging.getLogger(__name__)

FACE_MATCH_THRESHOLD = 0.40
DETECTOR_BACKEND    = "opencv"

@dataclass
class MatchResult:
    passed: bool
    distance: float
    threshold: float
    error: str | None = None

def _to_numpy(img_bytes: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(img_bytes)) as im:
        return np.array(im.convert("RGB"))

def verify_faces(nid_image_bytes: bytes,
                 selfie_image_bytes: bytes,
                 threshold: float = FACE_MATCH_THRESHOLD) -> MatchResult:
    try:
        nid_arr    = _to_numpy(nid_image_bytes)
        selfie_arr = _to_numpy(selfie_image_bytes)

        result = DeepFace.verify(
            img1_path=nid_arr,
            img2_path=selfie_arr,
            model_name="Facenet512",
            detector_backend=DETECTOR_BACKEND,
            distance_metric="cosine",
            enforce_detection=True,
            align=True,
        )

        distance = float(result["distance"])
        passed   = distance <= threshold
        return MatchResult(passed=passed, distance=distance, threshold=threshold)

    except ValueError as e:
        log.warning("Face detection failed: %s", e)
        return MatchResult(False, float("inf"), threshold, error=f"face_not_detected: {e}")
    except Exception as e:
        log.exception("Face match error")
        return MatchResult(False, float("inf"), threshold, error=f"internal: {e}")
