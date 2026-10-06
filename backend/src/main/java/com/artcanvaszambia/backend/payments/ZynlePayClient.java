package com.artcanvaszambia.backend.payments;

import com.artcanvaszambia.backend.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin client for ZynlePay's JSON API. All of Card Deposit, Momo Deposit, Momo
 * Withdraw and Wallet-to-Bank share one endpoint distinguished by "channel" and
 * "method"; their responses come wrapped in a top-level "response" object, while
 * checkBalance and paymentStatus responses are flat — verified against the live
 * sandbox, since the published docs don't show the wrapping.
 */
@Service
public class ZynlePayClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.zynlepay.api-base-url}")
    private String apiBaseUrl;

    @Value("${app.zynlepay.payment-status-url}")
    private String paymentStatusUrl;

    // Server configuration; credentials saved in the admin panel take precedence.
    @Value("${app.zynlepay.merchant-id}")
    private String envMerchantId;

    @Value("${app.zynlepay.api-id}")
    private String envApiId;

    @Value("${app.zynlepay.api-key}")
    private String envApiKey;

    private final PaymentCredentialService credentials;

    private String merchantId() {
        return credentials.resolve(PaymentCredentialService.ZYNLEPAY_MERCHANT_ID, envMerchantId).trim();
    }

    private String apiId() {
        return credentials.resolve(PaymentCredentialService.ZYNLEPAY_API_ID, envApiId).trim();
    }

    private String apiKey() {
        return credentials.resolve(PaymentCredentialService.ZYNLEPAY_API_KEY, envApiKey).trim();
    }

    public ZynlePayClient(PaymentCredentialService credentials) {
        this.credentials = credentials;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(20).toMillis());
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public ZynlePayResult cardDeposit(String referenceNo, BigDecimal amount, String description,
                                       String firstName, String lastName, String address, String email,
                                       String phone, String city, String state, String zipCode, String country) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("method", "runTranAuthCapture");
        data.put("reference_no", referenceNo);
        data.put("amount", amount.toPlainString());
        data.put("description", description);
        data.put("first_name", firstName);
        data.put("last_name", lastName);
        data.put("address", address);
        data.put("email", email);
        data.put("phone", phone);
        data.put("city", city);
        data.put("state", state);
        data.put("currency", "ZMW");
        data.put("zip_code", zipCode);
        data.put("country", country);
        return callJsonApi("card", data);
    }

    public ZynlePayResult momoDeposit(String senderId, String referenceNo, BigDecimal amount) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("method", "runBillPayment");
        data.put("sender_id", senderId);
        data.put("reference_no", referenceNo);
        data.put("amount", amount.toPlainString());
        return callJsonApi("momo", data);
    }

    public ZynlePayResult momoWithdraw(String receiverId, String referenceNo, BigDecimal amount) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("method", "runPayToEwallet");
        data.put("receiver_id", receiverId);
        data.put("reference_no", referenceNo);
        data.put("amount", amount.toPlainString());
        return callJsonApi("momo", data);
    }

    public ZynlePayResult walletToBank(String receiverId, String bankName, String referenceNo,
                                       BigDecimal amount, String description) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("method", "runPayToBank");
        data.put("reference_no", referenceNo);
        data.put("amount", amount.toPlainString());
        data.put("description", description);
        data.put("bank_name", bankName);
        data.put("receiver_id", receiverId);
        return callJsonApi("bank", data);
    }

    public ZynlePayResult checkBalance() {
        Map<String, Object> auth = new LinkedHashMap<>();
        auth.put("merchant_id", merchantId());
        auth.put("api_id", apiId());
        auth.put("api_key", apiKey());
        Map<String, Object> body = Map.of("auth", auth, "data", Map.of("method", "checkBalance"));
        return parse(post(apiBaseUrl, body));
    }

    public ZynlePayResult paymentStatus(String referenceNo) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("api_id", apiId());
        body.put("api_key", apiKey());
        body.put("reference_no", referenceNo);
        return parse(post(paymentStatusUrl, body));
    }

    private ZynlePayResult callJsonApi(String channel, Map<String, Object> data) {
        Map<String, Object> auth = new LinkedHashMap<>();
        auth.put("merchant_id", merchantId());
        auth.put("api_id", apiId());
        auth.put("api_key", apiKey());
        auth.put("channel", channel);
        Map<String, Object> body = Map.of("auth", auth, "data", data);
        return parse(post(apiBaseUrl, body));
    }

    private String post(String url, Map<String, Object> body) {
        try {
            return restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            throw ApiException.badRequest("Could not reach the payment provider: " + e.getMessage());
        }
    }

    private ZynlePayResult parse(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode unwrapped = root.has("response") ? root.get("response") : root;
            return new ZynlePayResult(unwrapped);
        } catch (Exception e) {
            throw ApiException.badRequest("Unexpected response from payment provider");
        }
    }
}
