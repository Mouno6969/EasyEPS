from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Literal, Optional

class UploadUrlsReq(BaseModel):
    nid_ext: Literal["jpg","jpeg","png","webp"] = "jpg"
    face_ext: Literal["jpg","jpeg","png","webp"] = "jpg"
    video_ext: Literal["webm","mp4"] = "webm"

class UploadUrlsResp(BaseModel):
    nid: dict; face: dict; video: dict

class SubmitKycReq(BaseModel):
    nid_key: str
    face_key: str
    video_key: str
    full_name: str = Field(min_length=2, max_length=120)
    nid_number: str = Field(min_length=6, max_length=40)
    dob: str  # ISO yyyy-mm-dd

class SubmitKycResp(BaseModel):
    id: UUID; status: str

class AdminDecision(BaseModel):
    decision: Literal["approved","rejected"]
    note: Optional[str] = None

class KycRecordOut(BaseModel):
    id: UUID
    user_email: str
    full_name: str
    nid_number: str
    status: str
    face_match_score: Optional[float]
    face_match_passed: Optional[bool]
    liveness_score: Optional[float]
    liveness_passed: Optional[bool]
    admin_note: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    nid_url: str
    face_url: str
    video_url: str
