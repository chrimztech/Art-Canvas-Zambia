ALTER TABLE platform_settings ALTER COLUMN developer_royalty_percent SET DEFAULT 10.00;

UPDATE platform_settings
SET developer_royalty_percent = 10.00
WHERE id = 1 AND developer_royalty_percent = 7.00;
