package com.artcanvaszambia.backend.payments;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Payment gateway credentials saved from the admin panel, encrypted at rest (AES-256-GCM).
 * Reads are cached; a saved value overrides the corresponding server environment variable.
 * The encryption key is CREDENTIALS_ENCRYPTION_KEY, or the JWT secret when that isn't set —
 * changing it makes stored credentials unreadable (they then fall back to the environment).
 */
@Slf4j
@Service
public class PaymentCredentialService {
    public static final String LENCO_API_TOKEN = "LENCO_API_TOKEN";
    public static final String LENCO_PUBLIC_KEY = "LENCO_PUBLIC_KEY";
    public static final String LENCO_ACCOUNT_ID = "LENCO_ACCOUNT_ID";
    /** "sandbox" or "live". */
    public static final String LENCO_ENVIRONMENT = "LENCO_ENVIRONMENT";
    public static final String ZYNLEPAY_MERCHANT_ID = "ZYNLEPAY_MERCHANT_ID";
    public static final String ZYNLEPAY_API_ID = "ZYNLEPAY_API_ID";
    public static final String ZYNLEPAY_API_KEY = "ZYNLEPAY_API_KEY";

    public static final Set<String> NAMES = Set.of(LENCO_API_TOKEN, LENCO_PUBLIC_KEY, LENCO_ACCOUNT_ID, LENCO_ENVIRONMENT,
            ZYNLEPAY_MERCHANT_ID, ZYNLEPAY_API_ID, ZYNLEPAY_API_KEY);
    /** Shown only as "ends in …" in the admin panel. */
    public static final Set<String> SECRETS = Set.of(LENCO_API_TOKEN, ZYNLEPAY_API_KEY);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String MISSING = "\u0000";

    private final JdbcTemplate jdbc;
    private final SecretKeySpec key;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public PaymentCredentialService(JdbcTemplate jdbc,
                                    @Value("${app.credentials-encryption-key:}") String configuredKey,
                                    @Value("${app.jwt.secret}") String jwtSecret) {
        this.jdbc = jdbc;
        String material = configuredKey == null || configuredKey.isBlank() ? jwtSecret : configuredKey;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    ("payment-credentials:" + material).getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialise credential encryption", e);
        }
    }

    /** The saved value, or null when none is saved (callers then use the environment). */
    public String get(String name) {
        String v = cache.computeIfAbsent(name, n -> {
            try {
                var rows = jdbc.queryForList("select encrypted_value from payment_credentials where name = ?", String.class, n);
                return rows.isEmpty() ? MISSING : decrypt(rows.get(0));
            } catch (Exception e) {
                log.warn("Stored payment credential {} could not be read ({}); using the server environment instead", n, e.getMessage());
                return MISSING;
            }
        });
        return MISSING.equals(v) ? null : v;
    }

    /** Saved value if present, otherwise the environment/config value. */
    public String resolve(String name, String fallback) {
        String saved = get(name);
        return saved != null ? saved : (fallback == null ? "" : fallback);
    }

    public boolean isSaved(String name) {
        return get(name) != null;
    }

    @Transactional
    public void save(String name, String value, UUID updatedBy) {
        jdbc.update("""
                insert into payment_credentials (name, encrypted_value, updated_by, updated_at) values (?, ?, ?, now())
                on conflict (name) do update set encrypted_value = excluded.encrypted_value,
                    updated_by = excluded.updated_by, updated_at = now()""", name, encrypt(value), updatedBy);
        cache.remove(name);
    }

    @Transactional
    public void clear(String name) {
        jdbc.update("delete from payment_credentials where name = ?", name);
        cache.remove(name);
    }

    private String encrypt(String plain) {
        try {
            byte[] iv = new byte[12];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + sealed.length).put(iv).put(sealed).array());
        } catch (Exception e) {
            throw new IllegalStateException("Could not encrypt credential", e);
        }
    }

    private String decrypt(String stored) throws Exception {
        byte[] all = Base64.getDecoder().decode(stored);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, all, 0, 12));
        return new String(cipher.doFinal(all, 12, all.length - 12), StandardCharsets.UTF_8);
    }
}
