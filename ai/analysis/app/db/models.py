"""
Database models for analysis service
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base


class Prediction(Base):
    """Model for storing Prophet predictions by category"""
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # Category name
    prediction_date = Column(Date, nullable=False, index=True)
    predicted_amount = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('file_id', 'category', 'prediction_date', name='uq_file_cat_date'),
    )


class AnalysisJob(Base):
    """Model for tracking async analysis jobs"""
    __tablename__ = "analysis_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(255), unique=True, nullable=False, index=True)
    file_id = Column(String(255), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending", index=True)
    error_message = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    job_metadata = Column(JSON)


class BaselinePrediction(Base):
    """Model for storing monthly baseline predictions (소비 기준 금액)"""
    __tablename__ = "baseline_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    predicted_amount = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    training_cutoff_date = Column(Date)  # Data used until this date
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('file_id', 'category', 'year', 'month', name='uq_baseline_file_cat_year_month'),
    )


class LeakAnalysis(Base):
    """Model for storing leak analysis results"""
    __tablename__ = "leak_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    actual_amount = Column(Float)
    predicted_amount = Column(Float)
    leak_amount = Column(Float)
    analysis_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('file_id', 'year', 'month', name='uq_file_year_month'),
    )