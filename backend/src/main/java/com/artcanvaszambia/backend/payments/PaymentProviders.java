package com.artcanvaszambia.backend.payments;

import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.orders.PlatformSettings;
import com.artcanvaszambia.backend.orders.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

/** Which payment gateway handles new payments, plus Zambian mobile-number helpers. */
@Service
@RequiredArgsConstructor
public class PaymentProviders {
    public static final String ZYNLEPAY = "zynlepay";
    public static final String LENCO = "lenco";
    public static final Set<String> ALL = Set.of(ZYNLEPAY, LENCO);

    private final PlatformSettingsRepository platformSettingsRepository;

    /** The gateway selected in platform settings; ZynlePay when unset. */
    public String active() {
        String configured = platformSettingsRepository.findById(1).map(PlatformSettings::getPaymentProvider).orElse(null);
        return configured != null && LENCO.equalsIgnoreCase(configured.trim()) ? LENCO : ZYNLEPAY;
    }

    /** Normalises +260 / 260 prefixes to the local 10-digit form (e.g. 0971234567). */
    public static String localPhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.startsWith("260") && digits.length() == 12) digits = "0" + digits.substring(3);
        if (digits.length() == 9 && !digits.startsWith("0")) digits = "0" + digits;
        if (!digits.matches("0\\d{9}")) {
            throw ApiException.badRequest("Enter a valid Zambian mobile number, e.g. 0971234567");
        }
        return digits;
    }

    /** Mobile network for a Zambian number: 097/077 Airtel, 096/076 MTN, 095/075 Zamtel. */
    public static String operatorFor(String localPhone) {
        String prefix = localPhone.substring(0, 3);
        return switch (prefix) {
            case "097", "077" -> "airtel";
            case "096", "076" -> "mtn";
            case "095", "075" -> "zamtel";
            default -> throw ApiException.badRequest("Couldn't tell the mobile network for " + localPhone
                    + ". Please choose Airtel, MTN or Zamtel.");
        };
    }

    /** Uses an explicitly chosen operator when valid, otherwise infers it from the number. */
    public static String resolveOperator(String chosen, String localPhone) {
        if (chosen != null && Set.of("airtel", "mtn", "zamtel").contains(chosen.trim().toLowerCase())) {
            return chosen.trim().toLowerCase();
        }
        return operatorFor(localPhone);
    }
}
