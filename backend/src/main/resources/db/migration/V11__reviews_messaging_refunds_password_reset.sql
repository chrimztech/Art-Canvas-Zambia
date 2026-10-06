-- PASSWORD RESET: single-use, short-lived tokens; only a SHA-256 hash is stored
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- REVIEWS: one verified-purchase review per order item
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    reference_id UUID,
    item_title TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT CHECK (length(comment) <= 2000),
    seller_reply TEXT CHECK (length(seller_reply) <= 2000),
    seller_replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_seller ON reviews(seller_id, created_at DESC);
CREATE INDEX idx_reviews_reference ON reviews(reference_id);

-- MESSAGING: one conversation per pair of users per context (listing/order/commission or general).
-- participant_a is always the smaller uuid so the pair is found regardless of who writes first.
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT,
    context_type TEXT NOT NULL DEFAULT 'GENERAL'
        CHECK (context_type IN ('GENERAL','ARTWORK','SUPPLY','CLASS','EXHIBITION','ORDER','COMMISSION')),
    context_id UUID,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (participant_a < participant_b)
);
CREATE UNIQUE INDEX uq_conversations_pair_context ON conversations
    (participant_a, participant_b, context_type, COALESCE(context_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_conversations_a ON conversations(participant_a, last_message_at DESC);
CREATE INDEX idx_conversations_b ON conversations(participant_b, last_message_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- REFUNDS: buyer requests per order item, resolved by an admin
CREATE TABLE refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID,
    amount_zmw NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 2000),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','refunded','rejected')),
    seller_response TEXT CHECK (length(seller_response) <= 2000),
    admin_note TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_refund_requests_open ON refund_requests(order_item_id) WHERE status = 'requested';
CREATE INDEX idx_refund_requests_status ON refund_requests(status, created_at DESC);

-- Refunded items no longer count towards seller earnings or platform fees
ALTER TABLE order_items ADD COLUMN refunded_at TIMESTAMPTZ;
