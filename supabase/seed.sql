-- Seed Super Admin User
-- Default credentials: username: "clown", password: "012359clown"

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
