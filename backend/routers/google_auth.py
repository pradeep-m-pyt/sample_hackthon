from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from utils.security import create_access_token
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth/google", tags=["google_auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class GoogleToken(BaseModel):
    token: str

@router.post("/login")
async def google_login(data: GoogleToken, db: Session = Depends(get_db)):
    # 1. Verify token with Google
    # We use httpx to call Google's tokeninfo endpoint for simplicity
    # In a more robust implementation, we would use google-auth libraries to verify locally
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={data.token}"
        )
        
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Google token")
        
    user_info = response.json()
    
    # 2. Check if audience matches CLIENT_ID
    if user_info["aud"] != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Invalid Client ID")
        
    email = user_info.get("email")
    full_name = user_info.get("name")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
        
    # 3. Check if user exists, if not create
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=None # Google users don't have a local password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # 4. Generate JWT
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "full_name": user.full_name}}
