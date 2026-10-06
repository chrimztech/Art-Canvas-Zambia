package com.artcanvaszambia.backend.payments;

import com.fasterxml.jackson.databind.JsonNode;

/** Lenco response envelope: {status, message, data}. */
public class LencoResult {
    private final JsonNode root;

    public LencoResult(JsonNode root) {
        this.root = root;
    }

    /** True when Lenco accepted the request (not the same as the payment having succeeded). */
    public boolean accepted() {
        return root.path("status").asBoolean(false);
    }

    public String message() {
        JsonNode m = root.get("message");
        return m == null || m.isNull() ? null : m.asText();
    }

    public JsonNode data() {
        JsonNode d = root.get("data");
        return d == null || d.isNull() ? null : d;
    }

    public String dataField(String field) {
        JsonNode d = data();
        JsonNode v = d != null ? d.get(field) : null;
        return v == null || v.isNull() ? null : v.asText();
    }

    /** pending | successful | failed | pay-offline | 3ds-auth-required (collections); pending | successful | failed (transfers). */
    public String transactionStatus() {
        return dataField("status");
    }

    public boolean isSuccessful() {
        return accepted() && "successful".equals(transactionStatus());
    }

    public boolean isFailed() {
        return !accepted() || "failed".equals(transactionStatus());
    }

    public String lencoReference() {
        return dataField("lencoReference");
    }

    /** Most useful human-readable explanation of a failure. */
    public String failureReason() {
        String reason = dataField("reasonForFailure");
        if (reason != null && !reason.isBlank()) return reason;
        String m = message();
        return m != null ? m : "Payment could not be processed";
    }
}
