CREATE TABLE telegram_users (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  role TEXT NOT NULL,
  first_name TEXT,
  username TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(chat_id, role)
);

-- Enable RLS (no policies for anon — frontend has no direct access)
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
