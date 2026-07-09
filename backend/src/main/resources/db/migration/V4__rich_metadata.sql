-- PROFILES (user metadata)
ALTER TABLE profiles
    ADD COLUMN cover_image_url TEXT,
    ADD COLUMN facebook_url TEXT,
    ADD COLUMN twitter_url TEXT,
    ADD COLUMN tiktok_url TEXT,
    ADD COLUMN specialties TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN years_experience INT,
    ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- ARTWORKS
ALTER TABLE artworks
    ADD COLUMN materials TEXT,
    ADD COLUMN style TEXT,
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN weight_kg NUMERIC(8,2),
    ADD COLUMN framed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN provenance TEXT;

-- EXHIBITIONS
ALTER TABLE exhibitions
    ADD COLUMN curator_name TEXT,
    ADD COLUMN theme TEXT,
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN contact_email TEXT,
    ADD COLUMN contact_phone TEXT,
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- CLASSES (courses)
ALTER TABLE classes
    ADD COLUMN skill_level TEXT CHECK (skill_level IN ('beginner','intermediate','advanced')),
    ADD COLUMN prerequisites TEXT,
    ADD COLUMN syllabus TEXT,
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN materials_included BOOLEAN NOT NULL DEFAULT false;

-- SUPPLIES (equipment)
ALTER TABLE supplies
    ADD COLUMN brand TEXT,
    ADD COLUMN sku TEXT,
    ADD COLUMN dimensions TEXT,
    ADD COLUMN weight_kg NUMERIC(8,2),
    ADD COLUMN warranty_months INT,
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}',
    DROP COLUMN image_urls;

CREATE TABLE supply_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_supply_images_supply ON supply_images(supply_id);
