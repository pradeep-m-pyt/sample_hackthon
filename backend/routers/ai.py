from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import LandProject, AnalysisResult, AIRecommendation
from routers.auth import get_me, UserOut
from engines.ai_engine import get_ai_recommendation

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/recommend/{project_id}")
async def recommend(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me)
):
    project = db.query(LandProject).filter(LandProject.id == project_id, LandProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    analysis = db.query(AnalysisResult).filter(AnalysisResult.project_id == project_id).first()
    if not analysis:
        raise HTTPException(status_code=400, detail="Analysis results not yet available for this project")
        
    # Run Groq Engine
    recommendation_text = await get_ai_recommendation(
        {
            "name": project.name,
            "area_m2": project.area_m2,
            "dominant_type": project.dominant_type,
            "user_intent": project.user_intent,
            "elevation_m": project.elevation_m,
            "slope_pct": project.slope_pct
        },
        {
            "flood_json": analysis.flood_json,
            "solar_json": analysis.solar_json,
            "carbon_json": analysis.carbon_json,
            "environmental_npv": analysis.environmental_npv,
            "financial_npv": analysis.financial_npv,
            "composite_score": analysis.composite_score
        }
    )
    
    # Save to DB
    ai_rec = db.query(AIRecommendation).filter(AIRecommendation.project_id == project_id).first()
    if not ai_rec:
        ai_rec = AIRecommendation(project_id=project_id)
        db.add(ai_rec)
        
    ai_rec.recommendation_text = recommendation_text
    ai_rec.model_used = "llama-3.3-70b-versatile"
    db.commit()
    
    return {"recommendation": recommendation_text}
