-- ORDER ITEMS: generalize beyond artworks
ALTER TABLE order_items
    ADD COLUMN item_type TEXT NOT NULL DEFAULT 'ARTWORK' CHECK (item_type IN ('ARTWORK','SUPPLY','CLASS','EXHIBITION')),
    ADD COLUMN seller_id UUID,
    ADD COLUMN reference_id UUID;

UPDATE order_items SET seller_id = artist_id, reference_id = artwork_id;

-- PAYOUT REQUESTS: allow platform-level (developer/owner) withdrawals alongside seller payouts
ALTER TABLE payout_requests
    ALTER COLUMN artist_id DROP NOT NULL,
    ADD COLUMN payee_type TEXT NOT NULL DEFAULT 'SELLER' CHECK (payee_type IN ('SELLER','DEVELOPER','OWNER'));

-- CART ITEMS: generalize beyond artworks (supplies join the cart too)
ALTER TABLE cart_items
    ALTER COLUMN artwork_id DROP NOT NULL,
    ADD COLUMN item_type TEXT NOT NULL DEFAULT 'ARTWORK' CHECK (item_type IN ('ARTWORK','SUPPLY')),
    ADD COLUMN item_id UUID;

UPDATE cart_items SET item_id = artwork_id;

-- CLASS ENROLLMENTS / EXHIBITION TICKETS: link back to the order item that paid for them
ALTER TABLE class_enrollments
    ADD COLUMN order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL;

ALTER TABLE exhibition_tickets
    ADD COLUMN order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    ADD COLUMN checked_in_at TIMESTAMPTZ;

-- PROFILES: a seller's stored default payout account
ALTER TABLE profiles
    ADD COLUMN payout_method TEXT,
    ADD COLUMN payout_phone TEXT,
    ADD COLUMN payout_bank_name TEXT,
    ADD COLUMN payout_receiver_id TEXT;

-- PLATFORM SETTINGS: developer + owner payout accounts
ALTER TABLE platform_settings
    ADD COLUMN developer_payout_method TEXT,
    ADD COLUMN developer_payout_phone TEXT,
    ADD COLUMN developer_payout_bank_name TEXT,
    ADD COLUMN developer_payout_receiver_id TEXT,
    ADD COLUMN owner_payout_method TEXT,
    ADD COLUMN owner_payout_phone TEXT,
    ADD COLUMN owner_payout_bank_name TEXT,
    ADD COLUMN owner_payout_receiver_id TEXT;
