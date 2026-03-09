-- Zone ordering and table scale for map layout
ALTER TABLE zones ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS scale real DEFAULT 1;
