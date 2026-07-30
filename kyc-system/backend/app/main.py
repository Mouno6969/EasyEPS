from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import kyc, admin
from app.auth import auth_router
from app.database import engine, Base

app = FastAPI(title="KYC Service", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"] , 
                   allow_methods=["*"] , allow_headers=["*"])

app.include_router(auth_router)
app.include_router(kyc.router)
app.include_router(admin.router)

from app.storage import save_bytes
from fastapi import Request, HTTPException

@app.post("/upload-file")
async def upload_file(request: Request):
    file_key = request.headers.get("X-File-Key")
    if not file_key:
        raise HTTPException(status_code=400, detail="X-File-Key header missing")
    content = await request.body()
    save_bytes(file_key, content)
    return {"message": "File uploaded successfully"}

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
