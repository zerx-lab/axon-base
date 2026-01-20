-- Migration: Add Chat permissions to existing system roles
-- This migration updates the permissions array for Administrator, User Manager, and Viewer roles

-- Update Administrator role: Add full chat permissions
UPDATE roles 
SET permissions = ARRAY[
    'users:list', 'users:create', 'users:update', 'users:delete', 'users:toggle_active', 'users:reset_password', 
    'roles:list', 'roles:create', 'roles:update', 'roles:delete', 
    'system:settings', 'system:logs',
    'kb:list', 'kb:create', 'kb:update', 'kb:delete',
    'docs:list', 'docs:create', 'docs:update', 'docs:delete',
    'embedding:view', 'embedding:manage', 'embedding:search',
    'chat:access', 'chat:create', 'chat:delete', 'chat:kb_permissions:view', 'chat:kb_permissions:manage'
]
WHERE name = 'Administrator' AND is_system = TRUE;

-- Update User Manager role: Add basic chat permissions
UPDATE roles 
SET permissions = ARRAY[
    'users:list', 'users:create', 'users:update', 'users:toggle_active', 'users:reset_password',
    'chat:access', 'chat:create'
]
WHERE name = 'User Manager' AND is_system = TRUE;

-- Update Viewer role: Add basic chat permissions
UPDATE roles 
SET permissions = ARRAY[
    'users:list', 'roles:list', 'kb:list', 'docs:list', 'embedding:view', 'embedding:search',
    'chat:access', 'chat:create'
]
WHERE name = 'Viewer' AND is_system = TRUE;
