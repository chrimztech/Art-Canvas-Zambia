-- Payment gateway credentials entered by a super admin in the admin panel.
-- Values are AES-GCM encrypted by the application; server environment variables remain a fallback.
CREATE TABLE payment_credentials (
    name            TEXT PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
