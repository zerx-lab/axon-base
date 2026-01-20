-- Add reranker quality control configuration to system settings
-- This migration adds a new system setting for configuring dynamic result quality control
-- based on reranking model scores

INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES (
  'reranker_quality_config',
  jsonb_build_object(
    'enabled', true,
    'minResults', 1,
    'maxResults', 10,
    'scoreThreshold', 0.6,
    'dropoffThreshold', 0.15
  ),
  'Quality control configuration for reranked search results. Dynamically determines the number of results to return based on reranking model scores.',
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
