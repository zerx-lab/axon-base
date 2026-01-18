UPDATE roles 
SET permissions = array_cat(permissions, ARRAY['kb:list', 'kb:create', 'kb:update', 'kb:delete', 'docs:list', 'docs:create', 'docs:update', 'docs:delete']) 
WHERE name = 'Administrator' 
  AND NOT ('kb:list' = ANY(permissions));

UPDATE roles 
SET permissions = array_cat(permissions, ARRAY['kb:list', 'docs:list']) 
WHERE name = 'Viewer'
  AND NOT ('kb:list' = ANY(permissions));

SELECT name, permissions FROM roles WHERE name IN ('Super Administrator', 'Administrator', 'Viewer');
