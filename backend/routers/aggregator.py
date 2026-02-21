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
    current_user: UserOut = Depends(get_me),
):
    project = (
        db.query(LandProject)
        .filter(LandProject.id == project_id, LandProject.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run all three analysis engines
    flood_res  = await run_flood_analysis(
        project.lat, project.lng,
        project.land_distribution_json,
        project.elevation_m, project.slope_pct,
    )
    solar_res  = await run_solar_analysis(
        project.lat, project.lng,
        project.area_m2,
        project.land_distribution_json,
    )
    carbon_res = await run_carbon_analysis(
        project.area_m2,
        project.land_distribution_json,
    )

    # Aggregate → includes cost_breakdown, scenarios, indicators
    full_agg = await aggregate_analysis(
        project.area_m2, flood_res, solar_res, carbon_res, project.user_intent
    )

    # Persist AnalysisResult
    analysis_record = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.project_id == project.id)
        .first()
    )
    if not analysis_record:
        analysis_record = AnalysisResult(project_id=project.id)
        db.add(analysis_record)

    analysis_record.flood_json        = flood_res
    analysis_record.solar_json        = solar_res
    analysis_record.carbon_json       = carbon_res
    analysis_record.environmental_npv = full_agg["environmental_npv"]
    analysis_record.financial_npv     = full_agg["financial_npv"]
    analysis_record.composite_score   = full_agg["composite_score"]

    # Rebuild Scenarios
    db.query(Scenario).filter(Scenario.project_id == project.id).delete()

    scen        = full_agg["scenarios"]
    cb          = full_agg["cost_breakdown"]
    flood_risk  = flood_res["flood_risk_score"]

    scenarios = [
        Scenario(
            project_id      = project.id,
            scenario_type   = "preserve",
            allocation_json = {"nature": 1.0, "construction": 0.0, "solar": 0.0},
            npv_30yr        = scen["preserve_npv30_inr"],
            roi_pct         = 5.0,
            risk_score      = max(0.0, flood_risk - 0.1),
        ),
        Scenario(
            project_id      = project.id,
            scenario_type   = "develop",
            allocation_json = {
                "nature": 0.05, "construction": 0.95, "solar": 0.0,
                "land_cost_inr":    cb["land_acquisition_cost_inr"],
                "build_cost_inr":   cb["construction_cost_inr"],
                "infra_cost_inr":   cb["infrastructure_cost_inr"],
                "flood_mit_inr":    cb["flood_mitigation_cost_inr"],
                "gross_rev_inr":    cb["gross_revenue_inr"],
                "net_profit_inr":   cb["net_profit_inr"],
            },
            npv_30yr        = scen["develop_npv_inr"],
            roi_pct         = cb["roi_pct"],
            risk_score      = min(1.0, flood_risk + 0.2),
        ),
        Scenario(
            project_id      = project.id,
            scenario_type   = "hybrid",
            allocation_json = {"nature": 0.35, "construction": 0.40, "solar": 0.25},
            npv_30yr        = scen["hybrid_npv_inr"],
            roi_pct         = 10.0,
            risk_score      = flood_risk,
        ),
    ]
    db.add_all(scenarios)
    db.commit()

    return {
        "project_id":  project.id,
        "flood":       flood_res,
        "solar":       solar_res,
        "carbon":      carbon_res,
        "aggregation": full_agg,
    }


@router.get("/results/{project_id}")
def get_analysis_results(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_me),
):
    project = (
        db.query(LandProject)
        .filter(LandProject.id == project_id, LandProject.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis  = db.query(AnalysisResult).filter(AnalysisResult.project_id == project_id).first()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

    return {"project": project, "analysis": analysis, "scenarios": scenarios}
