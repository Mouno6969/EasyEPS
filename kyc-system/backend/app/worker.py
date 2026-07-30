import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import KycSubmission
from app.storage import get_bytes, save_bytes
from app.ml.face_match import verify_faces
from app.ml.liveness import check_liveness

log = logging.getLogger(__name__)

def run_verification(submission_id: str):
    db: Session = SessionLocal()
    try:
        sub = db.get(KycSubmission, submission_id)
        if not sub: return
        
        nid_bytes    = get_bytes(sub.nid_s3_key)
        face_bytes   = get_bytes(sub.face_s3_key)
        video_bytes  = get_bytes(sub.video_s3_key)

        fm = verify_faces(nid_bytes, face_bytes)
        lv = check_liveness(video_bytes)

        sub.face_match_score  = fm.distance
        sub.face_match_passed = fm.passed
        sub.liveness_score    = lv.score
        sub.liveness_passed   = lv.passed

        if fm.error or lv.error:
            sub.status = "auto_rejected"
        elif fm.passed and lv.passed:
            sub.status = "pending_admin"
        else:
            sub.status = "pending_admin"
            
        db.commit()
        log.info("KYC %s processed -> %s", submission_id, sub.status)
    finally:
        db.close()
