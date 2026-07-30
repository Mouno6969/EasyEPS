from __future__ import annotations
import logging, tempfile, os
from dataclasses import dataclass
import numpy as np
import cv2

log = logging.getLogger(__name__)

MIN_FRAMES        = 10
MOTION_THRESHOLD  = 2.0
BLINK_FRAMES_REQ  = 2

@dataclass
class LivenessResult:
    passed: bool
    score: float
    frames_analyzed: int
    blinks: int
    motion: float
    error: str | None = None

def check_liveness(video_bytes: bytes, sample_every: int = 5) -> LivenessResult:
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(video_bytes)
            tmp_path = f.name
            
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            return LivenessResult(False, 0.0, 0, 0, 0.0, error="cannot_open_video")

        frames, motions, blinks, closed = [], [], 0, 0
        prev_gray = None
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok: break
            if idx % sample_every == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                if len(faces) == 0:
                    idx += 1
                    continue
                    
                x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
                face_gray = gray[y:y+h, x:x+w]

                if prev_gray is not None and prev_gray.shape == face_gray.shape:
                    diff = cv2.absdiff(prev_gray, face_gray)
                    motions.append(float(diff.mean()))

                eye_band = face_gray[int(h*0.3):int(h*0.55), int(w*0.2):int(w*0.8)]
                eye_var = float(eye_band.var())
                if eye_var < 50:
                    closed += 1
                    if closed >= BLINK_FRAMES_REQ:
                        blinks += 1
                        closed = 0
                else:
                    closed = 0

                frames.append(face_gray)
                prev_gray = face_gray
            idx += 1
            
        cap.release()

        if len(frames) < MIN_FRAMES:
            return LivenessResult(False, 0.0, len(frames), blinks, 0.0, error="too_few_frames")

        motion = float(np.mean(motions)) if motions else 0.0
        score  = min(1.0, (motion / MOTION_THRESHOLD) * 0.6 + min(blinks, 2) * 0.2)
        passed = motion >= MOTION_THRESHOLD and blinks >= 1
        return LivenessResult(passed, score, len(frames), blinks, motion)

    except Exception as e:
        log.exception("Liveness error")
        return LivenessResult(False, 0.0, 0, 0, 0.0, error=f"internal: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
