package com.artcanvaszambia.backend.payments;

import com.artcanvaszambia.backend.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Client for Lenco's v2 API (Zambia): mobile-money collections, collection status (also used to
 * verify card payments made through the LencoPay widget), transfers to mobile money / bank, balances.
 * All responses share the envelope {status, message, data}.
 */
@Service
public class LencoClient {
    static final String SANDBOX_API = "https://sandbox.lenco.co/access/v2";
    static final String SANDBOX_WIDGET = "https://pay.sandbox.lenco.co/js/v1/inline.js";
    static final String LIVE_API = "https://api.lenco.co/access/v2";
    static final String LIVE_WIDGET = "https://pay.lenco.co/js/v1/inline.js";

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PaymentCredentialService credentials;

    // Server configuration (environment variables); keys saved in the admin panel take precedence.
    @Value("${app.lenco.api-base-url}")
    private String envApiBaseUrl;

    @Value("${app.lenco.api-token:}")
    private String envApiToken;

    @Value("${app.lenco.public-key:}")
    private String envPublicKey;

    @Value("${app.lenco.account-id:}")
    private String envAccountId;

    @Value("${app.lenco.widget-url}")
    private String envWidgetUrl;

    private String apiToken() {
        return credentials.resolve(PaymentCredentialService.LENCO_API_TOKEN, envApiToken).trim();
    }

    private String accountId() {
        return credentials.resolve(PaymentCredentialService.LENCO_ACCOUNT_ID, envAccountId).trim();
    }

    /** "live" or "sandbox" when chosen in the admin panel, otherwise null (use the server URLs). */
    private String environment() {
        return credentials.get(PaymentCredentialService.LENCO_ENVIRONMENT);
    }

    private String apiBaseUrl() {
        String env = environment();
        return "live".equals(env) ? LIVE_API : "sandbox".equals(env) ? SANDBOX_API : envApiBaseUrl;
    }

    public LencoClient(PaymentCredentialService credentials) {
        this.credentials = credentials;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return !apiToken().isBlank();
    }

    public String publicKey() {
        return credentials.resolve(PaymentCredentialService.LENCO_PUBLIC_KEY, envPublicKey).trim();
    }

    public String widgetUrl() {
        String env = environment();
        return "live".equals(env) ? LIVE_WIDGET : "sandbox".equals(env) ? SANDBOX_WIDGET : envWidgetUrl;
    }

    /** Pushes a payment prompt to the customer's phone. Status is usually "pay-offline" until they approve. */
    public LencoResult collectMobileMoney(String reference, BigDecimal amount, String phone, String operator) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amount);
        body.put("reference", reference);
        body.put("phone", phone);
        body.put("operator", operator);
        body.put("country", "zm");
        body.put("bearer", "merchant");
        return call("POST", "/collections/mobile-money", body);
    }

    /** Status of a collection by our reference; this is also how widget (card) payments are verified. */
    public LencoResult collectionStatus(String reference) {
        return call("GET", "/collections/status/" + reference, null);
    }

    public LencoResult transferToMobileMoney(String reference, BigDecimal amount, String phone, String operator, String narration) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accountId", requireAccountId());
        body.put("amount", amount);
        body.put("reference", reference);
        body.put("narration", narration);
        body.put("phone", phone);
        body.put("operator", operator);
        body.put("country", "zm");
        return call("POST", "/transfers/mobile-money", body);
    }

    public LencoResult transferToBankAccount(String reference, BigDecimal amount, String accountNumber, String bankId, String narration) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accountId", requireAccountId());
        body.put("amount", amount);
        body.put("reference", reference);
        body.put("narration", narration);
        body.put("accountNumber", accountNumber);
        body.put("bankId", bankId);
        body.put("country", "zm");
        return call("POST", "/transfers/bank-account", body);
    }

    public LencoResult accountBalance() {
        return call("GET", "/accounts/" + requireAccountId() + "/balance", null);
    }

    /** Zambian banks as {id, name}; bank payouts need Lenco's bank id. */
    public List<Map<String, String>> banks() {
        LencoResult result = call("GET", "/banks?country=zm", null);
        List<Map<String, String>> banks = new ArrayList<>();
        JsonNode data = result.data();
        if (data != null && data.isArray()) {
            for (JsonNode b : data) {
                banks.add(Map.of("id", b.path("id").asText(), "name", b.path("name").asText()));
            }
        }
        return banks;
    }

    /**
     * Webhooks carry X-Lenco-Signature = hex(HMAC-SHA512(body, key)), where key is the hex
     * SHA-256 digest of the API token.
     */
    public boolean isValidWebhookSignature(String rawBody, String signature) {
        if (!isConfigured() || signature == null || rawBody == null) return false;
        try {
            String hashKey = HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(apiToken().getBytes(StandardCharsets.UTF_8)));
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(hashKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            String expected = HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    private String requireAccountId() {
        String accountId = accountId();
        if (accountId.isBlank()) {
            throw ApiException.badRequest("Lenco account id is not configured (LENCO_ACCOUNT_ID)");
        }
        return accountId;
    }

    private LencoResult call(String method, String path, Map<String, Object> body) {
        if (!isConfigured()) {
            throw ApiException.badRequest("Lenco payments are not configured — add the API token under Admin → Settings → Payment gateways");
        }
        String raw;
        try {
            var spec = "GET".equals(method)
                    ? restClient.get().uri(apiBaseUrl() + path)
                    : restClient.post().uri(apiBaseUrl() + path).contentType(MediaType.APPLICATION_JSON).body(body);
            // Lenco returns 400 with a JSON envelope for business errors (e.g. duplicate reference); read it rather than throw.
            raw = spec.header("Authorization", "Bearer " + apiToken())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> { })
                    .body(String.class);
        } catch (Exception e) {
            throw ApiException.badRequest("Could not reach the payment provider: " + e.getMessage());
        }
        try {
            return new LencoResult(objectMapper.readTree(raw == null ? "{}" : raw));
        } catch (Exception e) {
            throw ApiException.badRequest("Unexpected response from payment provider");
        }
    }
}
