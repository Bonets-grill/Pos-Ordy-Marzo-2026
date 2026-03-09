-- Add position and rotation columns for table map layout
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS pos_x real DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS pos_y real DEFAULT 0;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS rotation integer DEFAULT 0;
