from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.auth import current_user, get_db
from app.models import User, KycSubmission
from app.schemas import (UploadUrlsReq, UploadUrlsResp,
                         SubmitKycReq, SubmitKycResp, KycRecordOut)
from app.storage import issue_upload_urls, issue_download_url
from app.worker import run_verification

router = APIRouter(prefix="/kyc", tags=["kyc"])

def _to_out(sub: KycSubmission, user_email: str) -> KycRecordOut:
    return KycRecordOut(
        id=sub.id,
        user_email=user_email,
        full_name=sub.full_name,
        nid_number=sub.nid_number,
        status=sub.status,
        face_match_score=sub.face_match_score,
        face_match_passed=sub.face_match_passed,
        liveness_score=sub.liveness_score,
        liveness_passed=sub.liveness_passed,
        admin_note=sub.admin_note,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        nid_url=issue_download_url(sub.nid_s3_key),
        face_url=issue_download_url(sub.face_s3_key),
        video_url=issue_download_url(sub.video_s3_key),
    )

@router.post("/upload-urls", response_model=UploadUrlsResp)
def get_upload_urls(req: UploadUrlsReq, user: User = Depends(current_user)):
    return issue_upload_urls(str(user.id), {
        "nid": req.nid_ext,
        "face": req.face_ext,
        "video": req.video_ext,
    })

@router.post("/submit", response_model=SubmitKycResp)
def submit_kyc(req: SubmitKycReq, background_tasks: BackgroundTasks,
               user: User = Depends(current_user),
               db: Session = Depends(get_db)):
    sub = KycSubmission(
        user_id=user.id,
        nid_s3_key=req.nid_key,
        face_s3_key=req.face_key,
        video_s3_key=req.video_key,
        full_name=req.full_name,
        nid_number=req.nid_number,
        dob=req.dob,
    )
    db.add(sub); db.commit(); db.refresh(sub)
    background_tasks.add_task(run_verification, str(sub.id))
    return sub

@router.get("/my-submissions", response_model=list[KycRecordOut])
def get_my_submissions(user: User = Depends(current_user),
                       db: Session = Depends(get_db)):
    rows = db.execute(
        select(KycSubmission, User.email)
        .join(User, User.id == KycSubmission.user_id)
        .where(KycSubmission.user_id == user.id)
    ).all()
    return [_to_out(s, e) for s, e in rows]
