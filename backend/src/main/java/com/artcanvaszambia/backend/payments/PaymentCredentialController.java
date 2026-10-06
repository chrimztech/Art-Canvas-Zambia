package com.artcanvaszambia.backend.payments;

import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import static com.artcanvaszambia.backend.payments.PaymentCredentialService.*;

/**
 * Super-admin management of payment gateway keys. Secret values are write-only: responses say
 * whether each key is set (and where from) with at most the last four characters.
 */
@RestController
@RequestMapping("/api/admin/payment-credentials")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class PaymentCredentialController {
    private final PaymentCredentialService credentials;
    private final LencoClient lencoClient;
    private final ZynlePayClient zynlePayClient;
    private final PaymentProviders paymentProviders;
    private final AuditService auditService;

    @Value("${app.lenco.api-token:}")
    private String envLencoToken;
    @Value("${app.lenco.public-key:}")
    private String envLencoPublicKey;
    @Value("${app.lenco.account-id:}")
    private String envLencoAccountId;
    @Value("${app.lenco.api-base-url}")
    private String envLencoBaseUrl;
    @Value("${app.zynlepay.merchant-id}")
    private String envZynleMerchantId;
    @Value("${app.zynlepay.api-id}")
    private String envZynleApiId;
    @Value("${app.zynlepay.api-key}")
    private String envZynleApiKey;

    /** source: "admin" (saved here), "server" (environment), "demo" (placeholder default) or "none". */
    public record Field(String name, boolean secret, String source, String preview) {
    }

    public record CredentialStatus(String activeProvider, String lencoEnvironment, boolean lencoReady,
                                   List<Field> lenco, List<Field> zynlepay) {
    }

    public record UpdateRequest(Map<String, String> values, List<String> clear) {
    }

    public record TestResult(boolean ok, String message) {
    }

    @GetMapping
    public CredentialStatus status() {
        String env = credentials.get(LENCO_ENVIRONMENT);
        String lencoEnv = env != null ? env : envLencoBaseUrl.contains("sandbox") ? "sandbox" : "live";
        return new CredentialStatus(paymentProviders.active(), lencoEnv, lencoClient.isConfigured(),
                List.of(field(LENCO_API_TOKEN, envLencoToken), field(LENCO_PUBLIC_KEY, envLencoPublicKey),
                        field(LENCO_ACCOUNT_ID, envLencoAccountId)),
                List.of(field(ZYNLEPAY_MERCHANT_ID, envZynleMerchantId), field(ZYNLEPAY_API_ID, envZynleApiId),
                        field(ZYNLEPAY_API_KEY, envZynleApiKey)));
    }

    @PutMapping
    public CredentialStatus update(@RequestBody UpdateRequest req) {
        Map<String, String> values = req.values() == null ? Map.of() : req.values();
        List<String> clear = req.clear() == null ? List.of() : req.clear();
        Map<String, String> toSave = new LinkedHashMap<>();
        values.forEach((name, value) -> {
            if (!NAMES.contains(name)) throw ApiException.badRequest("Unknown setting " + name);
            String v = value == null ? "" : value.trim();
            if (v.isEmpty()) return; // blank = keep the current value
            if (v.length() > 500) throw ApiException.badRequest(name + " is too long");
            if (LENCO_ENVIRONMENT.equals(name) && !v.equals("sandbox") && !v.equals("live")) {
                throw ApiException.badRequest("Lenco environment must be sandbox or live");
            }
            toSave.put(name, v);
        });
        for (String name : clear) {
            if (!NAMES.contains(name)) throw ApiException.badRequest("Unknown setting " + name);
        }

        boolean removesLencoToken = clear.contains(LENCO_API_TOKEN) && !toSave.containsKey(LENCO_API_TOKEN)
                && (envLencoToken == null || envLencoToken.isBlank());
        if (removesLencoToken && PaymentProviders.LENCO.equals(paymentProviders.active())) {
            // Don't leave live checkouts pointing at a gateway with no key.
            throw ApiException.badRequest("Lenco is the active gateway, so it needs an API token. "
                    + "Switch the payment provider to ZynlePay first, or enter a new token.");
        }

        var uid = SecurityUtils.currentUserId();
        toSave.forEach((name, v) -> credentials.save(name, v, uid));
        clear.stream().filter(n -> !toSave.containsKey(n)).forEach(credentials::clear);

        TreeSet<String> changed = new TreeSet<>(toSave.keySet());
        changed.addAll(clear);
        if (!changed.isEmpty()) {
            auditService.record("PAYMENT_CREDENTIALS_UPDATED", "SETTINGS", null, "Payment gateways",
                    String.join(", ", changed)); // names only, never values
        }
        return status();
    }

    /** Makes a harmless authenticated call (balance lookup) to check the keys work. */
    @PostMapping("/test")
    public TestResult test(@RequestParam String provider) {
        try {
            if (PaymentProviders.LENCO.equals(provider)) {
                if (!lencoClient.isConfigured()) return new TestResult(false, "No Lenco API token is set");
                LencoResult r = lencoClient.accountBalance();
                return r.accepted()
                        ? new TestResult(true, "Connected to Lenco — available balance K" + nz(r.dataField("availableBalance")))
                        : new TestResult(false, "Lenco rejected the request: " + r.message());
            }
            if (PaymentProviders.ZYNLEPAY.equals(provider)) {
                ZynlePayResult r = zynlePayClient.checkBalance();
                return r.isSuccess()
                        ? new TestResult(true, "Connected to ZynlePay")
                        : new TestResult(false, "ZynlePay responded: " + nz(r.description()));
            }
            throw ApiException.badRequest("Unknown provider");
        } catch (ApiException e) {
            return new TestResult(false, e.getMessage());
        } catch (Exception e) {
            return new TestResult(false, "Could not reach the gateway: " + e.getMessage());
        }
    }

    private Field field(String name, String envValue) {
        boolean secret = SECRETS.contains(name);
        String saved = credentials.get(name);
        String value;
        String source;
        if (saved != null) {
            value = saved;
            source = "admin";
        } else if (envValue != null && !envValue.isBlank()) {
            value = envValue;
            source = envValue.startsWith("DEMO_") ? "demo" : "server";
        } else {
            return new Field(name, secret, "none", null);
        }
        return new Field(name, secret, source, secret ? mask(value) : value);
    }

    private static String mask(String v) {
        return v.length() <= 4 ? "••••" : "••••" + v.substring(v.length() - 4);
    }

    private static String nz(String s) {
        return s == null ? "—" : s;
    }
}
