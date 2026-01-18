-- AxonBase Database Schema Migration
-- Migrated from Convex to Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role name lookup
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    display_name VARCHAR(255),
    avatar TEXT,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to roles"
    ON roles FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to users"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to sessions"
    ON sessions FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS TO SUPABASE ROLES
-- ============================================
-- Grant table permissions to Supabase roles
GRANT ALL PRIVILEGES ON TABLE roles TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE users TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE sessions TO anon, authenticated, service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- SEED SYSTEM ROLES
-- ============================================
INSERT INTO roles (name, description, permissions, is_system, is_super_admin) VALUES
    ('Super Administrator', 'Has all permissions and cannot be modified', ARRAY['*'], TRUE, TRUE),
    ('Administrator', 'Has all administrative permissions', 
        ARRAY['users:list', 'users:create', 'users:update', 'users:delete', 'users:toggle_active', 'users:reset_password', 
              'roles:list', 'roles:create', 'roles:update', 'roles:delete', 'system:settings', 'system:logs'], 
        TRUE, FALSE),
    ('User Manager', 'Can manage users', 
        ARRAY['users:list', 'users:create', 'users:update', 'users:toggle_active', 'users:reset_password'], 
        TRUE, FALSE),
    ('Viewer', 'Read-only access', 
        ARRAY['users:list', 'roles:list'], 
        TRUE, FALSE)
ON CONFLICT (name) DO NOTHING;
