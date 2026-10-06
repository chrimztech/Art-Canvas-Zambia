package com.artcanvaszambia.backend.notifications;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Sends transactional email over SMTP. Delivery runs asynchronously and never throws into the
 * caller: a mail outage must not break checkout, payouts or sign-in. Without SMTP_HOST, emails
 * are logged (development).
 */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    public EmailService(ObjectProvider<JavaMailSender> mailSender) {
        this.mailSender = mailSender;
    }

    /** One call-to-action email. {@code paragraphs} are plain text (escaped); {@code path} is a site path like "/orders/123". */
    @Async
    public void send(String to, String subject, List<String> paragraphs, String ctaLabel, String path) {
        if (to == null || to.isBlank()) return;
        String link = path != null ? frontendBaseUrl + path : null;
        String text = String.join("\n\n", paragraphs) + (link != null ? "\n\n" + ctaLabel + ": " + link : "")
                + "\n\n— ChrisEpic Arts";
        if (smtpHost == null || smtpHost.isBlank()) {
            log.info("[email not sent: SMTP_HOST unset] To: {} | Subject: {}\n{}", to, subject, text);
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No mail sender available; dropping email to {} ({})", to, subject);
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(from));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html(subject, paragraphs, ctaLabel, link));
            sender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email '{}' to {}: {}", subject, to, e.getMessage());
        }
    }

    private String html(String subject, List<String> paragraphs, String ctaLabel, String link) {
        StringBuilder body = new StringBuilder();
        for (String p : paragraphs) {
            body.append("<p style=\"margin:0 0 14px;line-height:1.55\">")
                    .append(HtmlUtils.htmlEscape(p).replace("\n", "<br>")).append("</p>");
        }
        if (link != null) {
            body.append("<p style=\"margin:24px 0\"><a href=\"").append(HtmlUtils.htmlEscape(link))
                    .append("\" style=\"background:#d7b65f;color:#1a1410;padding:12px 20px;border-radius:999px;"
                            + "text-decoration:none;font-weight:600\">")
                    .append(HtmlUtils.htmlEscape(ctaLabel)).append("</a></p>");
        }
        return "<!doctype html><html><body style=\"margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#1a1410\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"center\" style=\"padding:32px 16px\">"
                + "<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;background:#fff;border-radius:16px;padding:32px\">"
                + "<tr><td><p style=\"font-family:Georgia,serif;font-size:22px;margin:0 0 20px\">ChrisEpic Arts</p>"
                + "<h1 style=\"font-size:20px;margin:0 0 18px\">" + HtmlUtils.htmlEscape(subject) + "</h1>"
                + body
                + "<p style=\"margin:28px 0 0;font-size:12px;color:#7a7067\">You're receiving this because of activity on your ChrisEpic Arts account.</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }
}
