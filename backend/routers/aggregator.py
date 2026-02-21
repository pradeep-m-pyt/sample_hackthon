from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import LandProject, AnalysisResult, Scenario
from routers.auth import get_me, UserOut
from engines.flood_engine import run_flood_analysis
from engines.solar_engine import run_solar_analysis
from engines.carbon_engine import run_carbon_analysis
from engines.aggregator import aggregate_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/run/{project_id}")
async def run_full_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me)
):
    # 1. Fetch Project
    project = db.query(LandProject).filter(LandProject.id == project_id, LandProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 2. Run Parallel Analysis Engines
    flood_res = await run_flood_analysis(
        project.lat, project.lng, project.land_distribution_json, project.elevation_m, project.slope_pct
    )
    solar_res = await run_solar_analysis(
        project.lat, project.lng, project.area_m2, project.land_distribution_json
    )
    carbon_res = await run_carbon_analysis(
        project.area_m2, project.land_distribution_json
    )
    
    # 3. Aggregate
    full_agg = await aggregate_analysis(
        project.area_m2, flood_res, solar_res, carbon_res, project.user_intent
    )
    
    # 4. Save Results
    analysis_record = db.query(AnalysisResult).filter(AnalysisResult.project_id == project.id).first()
    if not analysis_record:
        analysis_record = AnalysisResult(project_id=project.id)
        db.add(analysis_record)
        
    analysis_record.flood_json = flood_res
    analysis_record.solar_json = solar_res
    analysis_record.carbon_json = carbon_res
    analysis_record.environmental_npv = full_agg["environmental_npv"]
    analysis_record.financial_npv = full_agg["financial_npv"]
    analysis_record.composite_score = full_agg["composite_score"]
    
    # 5. Create Scenarios (Preserve, Develop, Hybrid)
    # Clear old
    db.query(Scenario).filter(Scenario.project_id == project.id).delete()
    
    scenarios = [
        Scenario(
            project_id=project.id,
            scenario_type="preserve",
            allocation_json={"nature": 1.0, "construction": 0.0, "solar": 0.0},
            npv_30yr = full_agg["environmental_npv"],
            roi_pct = 0,
            risk_score = flood_res["flood_risk_score"]
        ),
        Scenario(
            project_id=project.id,
            scenario_type="develop",
            allocation_json={"nature": 0.1, "construction": 0.9, "solar": 0.0},
            npv_30yr = full_agg["financial_npv"],
            roi_pct = 15.0,
            risk_score = 0.9 # High risk of env loss
        ),
        Scenario(
            project_id=project.id,
            scenario_type="hybrid",
            allocation_json={"nature": 0.4, "construction": 0.4, "solar": 0.2},
            npv_30yr = (full_agg["environmental_npv"] * 0.6) + (full_agg["financial_npv"] * 0.4),
            roi_pct = 8.0,
            risk_score = 0.3
        )
    ]
    db.add_all(scenarios)
    
    db.commit()
    
    return {
        "project_id": project.id,
        "flood": flood_res,
        "solar": solar_res,
        "carbon": carbon_res,
        "aggregation": full_agg
    }

@router.get("/results/{project_id}")
def get_analysis_results(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me)
):
    project = db.query(LandProject).filter(LandProject.id == project_id, LandProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    analysis = db.query(AnalysisResult).filter(AnalysisResult.project_id == project_id).first()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    
    return {
        "project": project,
        "analysis": analysis,
        "scenarios": scenarios
    }
