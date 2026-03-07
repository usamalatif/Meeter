-- Users
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id           VARCHAR(255) UNIQUE NOT NULL,
  email              VARCHAR(255) UNIQUE NOT NULL,
  plan               VARCHAR(50) DEFAULT 'trial',
  minutes_used       INTEGER DEFAULT 0,
  minutes_quota      INTEGER DEFAULT 60,
  stripe_customer_id VARCHAR(255),
  created_at         TIMESTAMP DEFAULT NOW()
);

-- Meetings
CREATE TABLE meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  platform     VARCHAR(20) NOT NULL,     -- 'zoom' or 'meet'
  meeting_url  VARCHAR(500) NOT NULL,
  title        VARCHAR(255),
  status       VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, active, completed, failed
  started_at   TIMESTAMP,
  ended_at     TIMESTAMP,
  duration_mins INTEGER,
  attendees    TEXT[],
  config       JSONB DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Meeting AI outputs
CREATE TABLE meeting_outputs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID REFERENCES meetings(id) ON DELETE CASCADE,
  transcript        TEXT,
  summary           TEXT,
  key_decisions     TEXT[],
  action_items      JSONB,
  unresolved_items  TEXT[],
  follow_up_email   JSONB,
  jira_tickets      JSONB,
  next_agenda       TEXT[],
  slack_summary     TEXT,
  actions_taken     JSONB DEFAULT '{}',
  created_at        TIMESTAMP DEFAULT NOW()
);

-- User integrations (OAuth tokens per user, encrypted)
CREATE TABLE user_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  service     VARCHAR(50) NOT NULL,   -- 'jira', 'slack', 'gmail'
  credentials JSONB NOT NULL,         -- encrypted OAuth tokens
  config      JSONB DEFAULT '{}',     -- jira project key, slack channel etc.
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- Usage tracking for billing
CREATE TABLE usage_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  meeting_id  UUID REFERENCES meetings(id),
  minutes     INTEGER NOT NULL,
  cost_usd    DECIMAL(10, 4),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_outputs_meeting_id ON meeting_outputs(meeting_id);
CREATE INDEX idx_usage_user_id ON usage_events(user_id);
CREATE INDEX idx_integrations_user_id ON user_integrations(user_id);
