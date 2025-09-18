-- Initialize database schema for fintech AI services

-- Create predictions table for storing Prophet forecast results
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_amount DECIMAL(15, 2) NOT NULL,
    lower_bound DECIMAL(15, 2),
    upper_bound DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, prediction_date)
);

-- Create analysis_jobs table for tracking async jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    file_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    job_metadata JSONB
);

-- Create leak_analysis table for storing leak calculation results
CREATE TABLE IF NOT EXISTS leak_analysis (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    actual_amount DECIMAL(15, 2),
    predicted_amount DECIMAL(15, 2),
    leak_amount DECIMAL(15, 2),
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, year, month)
);

-- Create indexes for better query performance
CREATE INDEX idx_predictions_file_id ON predictions(file_id);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);
CREATE INDEX idx_analysis_jobs_file_id ON analysis_jobs(file_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_leak_analysis_file_id ON leak_analysis(file_id);
CREATE INDEX idx_leak_analysis_year_month ON leak_analysis(year, month);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE
    ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();