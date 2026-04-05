-- SkillHub POC Schema
-- Per PRD.md decisions: SHA-256 API keys, idempotency keys, model per skill

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Skill creators
CREATE TABLE creators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    stripe_account  TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Skills (metadata only — prompt stored on filesystem for POC)
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID REFERENCES creators(id),
    slug            TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT,
    input_schema    JSONB NOT NULL,
    model           TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    price_per_use   INTEGER NOT NULL DEFAULT 0,
    version         INTEGER DEFAULT 1,
    status          TEXT DEFAULT 'draft',
    s3_key          TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- End users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    api_key_hash    TEXT UNIQUE NOT NULL,
    balance_cents   INTEGER DEFAULT 0,
    stripe_customer TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Usage log (append-only)
CREATE TABLE usage_events (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    skill_id        UUID REFERENCES skills(id),
    idempotency_key TEXT UNIQUE,
    status          TEXT DEFAULT 'pending',
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    skill_cost      INTEGER,
    api_cost        INTEGER,
    request_input   JSONB,
    response_output TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Access control
CREATE TABLE user_skills (
    user_id         UUID REFERENCES users(id),
    skill_id        UUID REFERENCES skills(id),
    access_type     TEXT DEFAULT 'pay_per_use',
    granted_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

-- Seed a default creator and test user
INSERT INTO creators (id, email, display_name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'gstack@skillhub.dev', 'gstack');

-- Test user with API key "sk_test_skillhub_user_001"
-- SHA-256 hash of "sk_test_skillhub_user_001"
INSERT INTO users (id, email, api_key_hash, balance_cents) VALUES
    ('00000000-0000-0000-0000-000000000010', 'testuser@skillhub.dev',
     encode(sha256('sk_test_skillhub_user_001'::bytea), 'hex'),
     10000);
