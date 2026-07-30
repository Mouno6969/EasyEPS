from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.auth import require_admin, get_db
from app.models import User, KycSubmission
from app.schemas import AdminDecision, KycRecordOut
from app.routers.kyc import _to_out

router = APIRouter(prefix="/admin/kyc", tags=["admin"])

@router.get("", response_model=list[KycRecordOut])
def list_kyc_submissions(status: str = "pending_admin",
                         admin: User = Depends(require_admin),
                         db: Session = Depends(get_db)):
    rows = db.execute(
        select(KycSubmission, User.email)
        .join(User, User.id == KycSubmission.user_id)
        .where(KycSubmission.status == status)
    ).all()
    return [_to_out(s, e) for s, e in rows]

@router.get("/{sub_id}", response_model=KycRecordOut)
def get_one(sub_id: str,
            admin: User = Depends(require_admin),
            db: Session = Depends(get_db)):
    row = db.execute(
        select(KycSubmission, User.email)
        .join(User, User.id == KycSubmission.user_id)
        .where(KycSubmission.id == sub_id)
    ).first()
    if not row: raise HTTPException(404, "Not found")
    return _to_out(*row)

@router.post("/{sub_id}/decision", response_model=KycRecordOut)
def decide(sub_id: str, body: AdminDecision,
           admin: User = Depends(require_admin),
           db: Session = Depends(get_db)):
    sub = db.get(KycSubmission, sub_id)
    if not sub: raise HTTPException(404, "Not found")
    if sub.status not in ("pending_admin", "pending_review"):
        raise HTTPException(409, f"Already {sub.status}")
    if body.decision == "rejected" and not body.note:
        raise HTTPException(422, "Rejection requires a note")
    sub.status = body.decision
    sub.admin_note = body.note
    sub.admin_id = admin.id
    sub.reviewed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(sub)
    row = db.execute(select(User.email).where(User.id == sub.user_id)).one()
    return _to_out(sub, row[0])
