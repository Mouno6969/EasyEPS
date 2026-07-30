from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
from app.models import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")
auth_router = APIRouter(prefix="/auth", tags=["auth"])

def hash_pw(p): return pwd.hash(p)
def verify_pw(p, h): return pwd.verify(p, h)

def make_token(u: User) -> str:
    payload = {
        "sub": str(u.id),
        "role": u.role,
        "email": u.email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_TTL_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def current_user(token: str = Depends(oauth2),
                 db: Session = Depends(get_db)) -> User:
    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, "Invalid token")
    u = db.get(User, data["sub"])
    if not u: raise HTTPException(401, "User not found")
    return u

def require_admin(u: User = Depends(current_user)) -> User:
    if u.role != "admin":
        raise HTTPException(403, "Admins only")
    return u

@auth_router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not verify_pw(form.password, u.pwd_hash):
        raise HTTPException(400, "Incorrect email or password")
    return {"access_token": make_token(u), "token_type": "bearer"}

@auth_router.post("/register")
def register(email: str, password: str, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already registered")
    u = User(email=email, pwd_hash=hash_pw(password), role="user")
    db.add(u); db.commit(); db.refresh(u)
    return {"id": str(u.id), "email": u.email}
