CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (name, description, permissions, is_system, is_super_admin) VALUES
    ('Super Administrator', 'Has all permissions and cannot be modified', ARRAY['*'], TRUE, TRUE),
    ('Administrator', 'Has all administrative permissions', 
        ARRAY['users:list', 'users:create', 'users:update', 'users:delete', 'users:toggle_active', 'users:reset_password', 
              'roles:list', 'roles:create', 'roles:update', 'roles:delete', 
              'system:settings', 'system:logs',
              'kb:list', 'kb:create', 'kb:update', 'kb:delete',
              'docs:list', 'docs:create', 'docs:update', 'docs:delete'], 
        TRUE, FALSE),
    ('User Manager', 'Can manage users', 
        ARRAY['users:list', 'users:create', 'users:update', 'users:toggle_active', 'users:reset_password'], 
        TRUE, FALSE),
    ('Viewer', 'Read-only access', 
        ARRAY['users:list', 'roles:list', 'kb:list', 'docs:list'], 
        TRUE, FALSE)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    super_admin_role_id UUID;
    existing_user_count INTEGER;
BEGIN
    SELECT id INTO super_admin_role_id 
    FROM roles 
    WHERE name = 'Super Administrator' AND is_super_admin = TRUE;

    SELECT COUNT(*) INTO existing_user_count 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.is_super_admin = TRUE;

    IF existing_user_count = 0 AND super_admin_role_id IS NOT NULL THEN
        INSERT INTO users (username, password_hash, role_id, display_name, is_active)
        VALUES (
            'clown',
            crypt('012359clown', gen_salt('bf', 12)),
            super_admin_role_id,
            'Super Administrator',
            TRUE
        );
        RAISE NOTICE 'Super admin user created successfully';
    ELSE
        RAISE NOTICE 'Super admin user already exists or role not found';
    END IF;
END $$;
