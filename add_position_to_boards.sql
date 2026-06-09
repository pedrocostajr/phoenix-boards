-- 1. Add position column to boards table if it does not exist
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Backfill position column based on created_at for existing boards
WITH numbered_boards AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 as row_num
  FROM public.boards
)
UPDATE public.boards b
SET position = nb.row_num
FROM numbered_boards nb
WHERE b.id = nb.id;

-- 3. Verify changes
SELECT id, name, project_id, position, created_at FROM public.boards ORDER BY project_id, position;
