import uuid, datetime as dt
from sqlalchemy import (Column, String, Float, Boolean, ForeignKey,
                        DateTime, Text)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email    = Column(String, unique=True, nullable=False)
    pwd_hash = Column(String, nullable=False)
    role     = Column(String, default="user")   # 'user' | 'admin'
    kyc_subs = relationship("KycSubmission", backref="user",
                            foreign_keys="KycSubmission.user_id")

class KycSubmission(Base):
    __tablename__ = "kyc_submissions"
    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id             = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    nid_s3_key          = Column(Text, nullable=False)
    face_s3_key         = Column(Text, nullable=False)
    video_s3_key        = Column(Text, nullable=False)
    full_name           = Column(Text, nullable=False)
    nid_number          = Column(Text, nullable=False)
    dob                 = Column(String)  
    status              = Column(String, default="pending_review", nullable=False)
    face_match_score    = Column(Float)
    face_match_passed   = Column(Boolean)
    liveness_score      = Column(Float)
    liveness_passed     = Column(Boolean)
    admin_id            = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    admin_note          = Column(Text)
    reviewed_at         = Column(DateTime(timezone=True))
    created_at          = Column(DateTime(timezone=True), server_default=dt.datetime.utcnow)
    updated_at          = Column(DateTime(timezone=True), server_default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)
