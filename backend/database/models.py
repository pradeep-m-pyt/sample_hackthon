from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("LandProject", back_populates="owner")

class LandProject(Base):
    __tablename__ = "land_projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    polygon_geojson = Column(JSON)
    area_m2 = Column(Float)
    lat = Column(Float)
    lng = Column(Float)
    land_distribution_json = Column(JSON)
    elevation_m = Column(Float)
    slope_pct = Column(Float)
    dominant_type = Column(String)
    user_intent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="projects")
    analysis = relationship("AnalysisResult", back_populates="project", uselist=False)
    scenarios = relationship("Scenario", back_populates="project")
    recommendation = relationship("AIRecommendation", back_populates="project", uselist=False)

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("land_projects.id"))
    flood_json = Column(JSON)
    solar_json = Column(JSON)
    carbon_json = Column(JSON)
    environmental_npv = Column(Float)
    financial_npv = Column(Float)
    composite_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("LandProject", back_populates="analysis")

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("land_projects.id"))
    scenario_type = Column(String) # preserve, develop, hybrid
    allocation_json = Column(JSON)
    npv_30yr = Column(Float)
    roi_pct = Column(Float)
    risk_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("LandProject", back_populates="scenarios")

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("land_projects.id"))
    recommendation_text = Column(Text)
    model_used = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("LandProject", back_populates="recommendation")
