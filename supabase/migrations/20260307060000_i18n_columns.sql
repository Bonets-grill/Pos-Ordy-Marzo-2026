-- Add missing i18n columns for full 5-language support

-- menu_items: add description columns for fr, de, it
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_fr text DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_de text DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_it text DEFAULT '';

-- modifier_groups: add name columns for fr, de, it
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS name_fr text DEFAULT '';
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS name_de text DEFAULT '';
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS name_it text DEFAULT '';

-- modifiers: add name columns for fr, de, it
ALTER TABLE modifiers ADD COLUMN IF NOT EXISTS name_fr text DEFAULT '';
ALTER TABLE modifiers ADD COLUMN IF NOT EXISTS name_de text DEFAULT '';
ALTER TABLE modifiers ADD COLUMN IF NOT EXISTS name_it text DEFAULT '';
