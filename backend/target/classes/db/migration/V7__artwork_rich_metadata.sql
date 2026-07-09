ALTER TABLE artworks
    ADD COLUMN signed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN signature_location TEXT,
    ADD COLUMN certificate_of_authenticity BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN surface TEXT,
    ADD COLUMN orientation TEXT CHECK (orientation IN ('portrait','landscape','square')),
    ADD COLUMN shipping_notes TEXT,
    ADD COLUMN ready_to_hang BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN origin_city TEXT,
    ADD COLUMN origin_country TEXT;
