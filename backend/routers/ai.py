from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import LandProject, AnalysisResult, Scenario, AIRecommendation
from routers.auth import get_me, UserOut
from engines.ai_engine import get_ai_recommendation
from engines.aggregator import aggregate_analysis

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/recommend/{project_id}")
async def recommend(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me),
):
    # 1. Fetch project
    project = (
        db.query(LandProject)
        .filter(LandProject.id == project_id, LandProject.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Fetch persisted analysis
    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.project_id == project_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=400,
            detail="Analysis not yet available. Please run /analysis/run first.",
        )

    # 3. Re-derive cost_breakdown + scenario NPVs from the aggregator
    #    (we don't persist cost_breakdown in the DB, so we recalculate)
    flood_json  = analysis.flood_json  or {}
    solar_json  = analysis.solar_json  or {}
    carbon_json = analysis.carbon_json or {}

    full_agg = await aggregate_analysis(
        area_m2      = project.area_m2,
        flood_data   = flood_json,
        solar_data   = solar_json,
        carbon_data  = carbon_json,
        user_intent  = project.user_intent or "mixed",
    )

    # 4. Build structured data for AI engine
    project_data = {
        "name":          project.name,
        "area_m2":       project.area_m2,
        "dominant_type": project.dominant_type,
        "user_intent":   project.user_intent,
        "elevation_m":   project.elevation_m,
        "slope_pct":     project.slope_pct,
    }

    analysis_data = {
        "flood_json":        flood_json,
        "solar_json":        solar_json,
        "carbon_json":       carbon_json,
        "environmental_npv": full_agg["environmental_npv"],
        "financial_npv":     full_agg["financial_npv"],
        "composite_score":   full_agg["composite_score"],
        "cost_breakdown":    full_agg["cost_breakdown"],     # ← production cost model
        "scenarios":         full_agg["scenarios"],
        "metrics":           full_agg["metrics"],
        "indicators":        full_agg["indicators"],
    }

    # 5. Generate AI recommendation
    recommendation_text = await get_ai_recommendation(project_data, analysis_data)

    # 6. Persist to DB
    ai_rec = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.project_id == project_id)
        .first()
    )
    if not ai_rec:
        ai_rec = AIRecommendation(project_id=project_id)
        db.add(ai_rec)

    ai_rec.recommendation_text = recommendation_text
    ai_rec.model_used           = "llama-3.3-70b-versatile"
    db.commit()

    return {"recommendation": recommendation_text}
