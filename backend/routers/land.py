from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import LandProject, User
from routers.auth import get_me, UserOut
from engines.land_classifier import classify_land
from engines.elevation_engine import get_elevation_data
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter(prefix="/land", tags=["land"])

class LandAnalysisRequest(BaseModel):
    name: str
    polygon: List[Dict[str, float]]
    area_m2: float
    user_intent: str # housing, solar, agriculture, etc.

@router.post("/analyze")
async def analyze_land(
    request: LandAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me)
):
    # 1. Run Engines
    classification = await classify_land(request.polygon)
    terrain = await get_elevation_data(request.polygon)
    
    # 2. Extract center point for project record
    lats = [p['lat'] for p in request.polygon]
    lngs = [p['lng'] for p in request.polygon]
    center_lat = sum(lats) / len(lats)
    center_lng = sum(lngs) / len(lngs)
    
    # 3. Save to DB
    new_project = LandProject(
        user_id=current_user.id,
        name=request.name,
        polygon_geojson=request.polygon,
        area_m2=request.area_m2,
        lat=center_lat,
        lng=center_lng,
        land_distribution_json=classification["distribution"],
        elevation_m=terrain["mean_elevation"],
        slope_pct=terrain["slope_pct"],
        dominant_type=classification["dominant_type"],
        user_intent=request.user_intent
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return {
        "project_id": new_project.id,
        "classification": classification,
        "terrain": terrain,
        "area_ha": request.area_m2 / 10000
    }

@router.get("/projects")
def get_user_projects(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me)
):
    return db.query(LandProject).filter(LandProject.user_id == current_user.id).all()
