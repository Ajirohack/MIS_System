-- Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  invited_name TEXT,
  status TEXT DEFAULT 'pending'
);

-- Onboarding Table
CREATE TABLE IF NOT EXISTS onboarding (
  id SERIAL PRIMARY KEY,
  invitation_code TEXT REFERENCES invitations(code),
  voice_consent BOOLEAN,
  responses TEXT[]
);

-- Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
  id SERIAL PRIMARY KEY,
  invitation_code TEXT REFERENCES invitations(code),
  membership_code TEXT UNIQUE,
  membership_key TEXT UNIQUE,
  issued_to TEXT,
  active BOOLEAN DEFAULT TRUE,
  issued_at TIMESTAMPTZ DEFAULT now()
);

-- Adding audio_introduction column to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS audio_introduction TEXT;

-- Create user_preferences table for tool toggles
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    educator_enabled BOOLEAN DEFAULT FALSE,
    planner_enabled BOOLEAN DEFAULT FALSE,
    rag_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create telegram_connections table
CREATE TABLE IF NOT EXISTS telegram_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_token TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    bot_username TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create storage bucket for audio files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'audio_introductions', 'audio_introductions', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'audio_introductions'
);

-- Storage bucket policies for audio files
-- Allow authenticated users to upload
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Authenticated users can upload audio files',
    '(role() = ''authenticated'')',
    'audio_introductions'::text
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'audio_introductions' AND name = 'Authenticated users can upload audio files'
);

-- Allow everyone to read audio files
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Audio files are publicly accessible',
    '(role() = ''authenticated'' OR role() = ''anon'')',
    'audio_introductions'::text
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'audio_introductions' AND name = 'Audio files are publicly accessible'
);