-- FAVORITES: collectors save artworks to a wishlist
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, artwork_id)
);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ORDER ITEMS: commissions are paid through checkout too
ALTER TABLE order_items DROP CONSTRAINT order_items_item_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_item_type_check
    CHECK (item_type IN ('ARTWORK','SUPPLY','CLASS','EXHIBITION','COMMISSION'));

-- ORDER ITEMS: per-item shipping/fulfilment tracking for physical goods
ALTER TABLE order_items
    ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (fulfillment_status IN ('pending','shipped','delivered')),
    ADD COLUMN carrier TEXT,
    ADD COLUMN tracking_number TEXT,
    ADD COLUMN shipped_at TIMESTAMPTZ,
    ADD COLUMN delivered_at TIMESTAMPTZ;

-- COMMISSIONS: the artist's message accompanying a quote
ALTER TABLE commissions ADD COLUMN artist_note TEXT;
