package com.artcanvaszambia.backend.payments;

import com.fasterxml.jackson.databind.JsonNode;

public class ZynlePayResult {
    private final JsonNode node;

    public ZynlePayResult(JsonNode node) {
        this.node = node;
    }

    public String get(String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    public String responseCode() {
        return get("response_code");
    }

    public String description() {
        String d = get("response_description");
        return d != null ? d : get("message");
    }

    public String referenceNo() {
        return get("reference_no");
    }

    public String transactionId() {
        return get("transaction_id");
    }

    public String operatorReference() {
        return get("operator_reference");
    }

    public String redirectUrl() {
        return get("redirect_url");
    }

    public boolean isSuccess() {
        return "100".equals(responseCode());
    }

    public boolean isPending() {
        return "120".equals(responseCode()) || "990".equals(responseCode());
    }
}
