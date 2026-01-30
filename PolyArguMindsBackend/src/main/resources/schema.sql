-- This schema represents the structure for Phase 1.
-- While JPA (ddl-auto=update) can generate this, having the raw SQL is crucial for understanding.

CREATE DATABASE IF NOT EXISTS ai_discussion_db;
USE ai_discussion_db;

-- 1. SESSIONS TABLE
-- Stores the core configuration and state of a discussion.
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    topic TEXT NOT NULL,
    mode VARCHAR(20) NOT NULL, -- 'DEBATE' or 'COLLABORATION'
    status VARCHAR(20) NOT NULL, -- 'CREATED', 'ACTIVE', 'COMPLETED', 'TERMINATED'
    start_time DATETIME,
    end_time DATETIME,
    max_duration_minutes INT DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. AGENTS TABLE
-- Stores the specific AI personas assigned to a session.
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    session_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL, -- e.g., 'Pro Agent', 'Analyst'
    role VARCHAR(20) NOT NULL, -- 'PRO', 'CON', 'JUDGE', 'ANALYST', 'CREATIVE'
    system_prompt TEXT, -- The specific instruction set for this agent instance
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 3. MESSAGES TABLE
-- Stores the actual conversation history.
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    session_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_ai BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_agents_session ON agents(session_id);