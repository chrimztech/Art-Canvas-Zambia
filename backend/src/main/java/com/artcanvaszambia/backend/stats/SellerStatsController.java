package com.artcanvaszambia.backend.stats;

import com.artcanvaszambia.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Shop analytics for sellers: earnings over time, views, favourites, followers and best performers. */
@RestController
@RequiredArgsConstructor
public class SellerStatsController {
    private final JdbcTemplate jdbc;

    public record MonthPoint(String month, BigDecimal grossZmw, BigDecimal earningsZmw, long itemsSold) {
    }

    public record TopArtwork(UUID id, String title, String slug, String status, long views, long favorites, BigDecimal priceZmw) {
    }

    public record SellerStats(BigDecimal grossZmw, BigDecimal earningsZmw, long itemsSold, long orders, long totalViews,
                              long totalFavorites, long followers, double averageRating, long reviewCount,
                              long activeListings, BigDecimal averageOrderZmw, List<MonthPoint> monthly,
                              List<TopArtwork> topArtworks) {
    }

    private static final String PAID_ITEMS = """
            from order_items oi join orders o on o.id = oi.order_id
            where oi.seller_id = ? and o.status in ('paid','fulfilled') and oi.refunded_at is null
            """;

    @GetMapping("/api/me/stats")
    public SellerStats stats() {
        UUID me = SecurityUtils.currentUserId();
        Map<String, Object> totals = jdbc.queryForMap("select coalesce(sum(oi.line_total_zmw - oi.discount_zmw), 0) gross, "
                + "coalesce(sum(oi.artist_payout_zmw), 0) earnings, coalesce(sum(oi.quantity), 0) items, count(distinct oi.order_id) orders "
                + PAID_ITEMS, me);

        // Last 12 calendar months, including months with no sales.
        LocalDate from = YearMonth.now(ZoneOffset.UTC).minusMonths(11).atDay(1);
        Map<String, MonthPoint> months = new LinkedHashMap<>();
        for (int i = 0; i < 12; i++) {
            String key = YearMonth.from(from).plusMonths(i).toString();
            months.put(key, new MonthPoint(key, BigDecimal.ZERO, BigDecimal.ZERO, 0));
        }
        jdbc.query("select to_char(date_trunc('month', o.created_at at time zone 'UTC'), 'YYYY-MM') m, "
                        + "sum(oi.line_total_zmw - oi.discount_zmw) gross, sum(oi.artist_payout_zmw) earnings, sum(oi.quantity) items "
                        + PAID_ITEMS + " and o.created_at >= ? group by 1",
                rs -> {
                    months.put(rs.getString("m"), new MonthPoint(rs.getString("m"), rs.getBigDecimal("gross"),
                            rs.getBigDecimal("earnings"), rs.getLong("items")));
                }, me, java.sql.Timestamp.valueOf(from.atStartOfDay()));

        List<TopArtwork> top = jdbc.query("select a.id, a.title, a.slug, a.status, a.view_count, a.price_zmw, "
                        + "(select count(*) from favorites f where f.artwork_id = a.id) favs "
                        + "from artworks a where a.artist_id = ? order by a.view_count desc, favs desc limit 8",
                (rs, i) -> new TopArtwork(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("slug"),
                        rs.getString("status"), rs.getLong("view_count"), rs.getLong("favs"), rs.getBigDecimal("price_zmw")), me);

        long views = number("select coalesce(sum(view_count), 0) from artworks where artist_id = ?", me);
        long favorites = number("select count(*) from favorites f join artworks a on a.id = f.artwork_id where a.artist_id = ?", me);
        long followers = number("select count(*) from follows where artist_id = ?", me);
        long reviews = number("select count(*) from reviews where seller_id = ?", me);
        Double avg = jdbc.queryForObject("select avg(rating) from reviews where seller_id = ?", Double.class, me);
        long listings = number("select (select count(*) from artworks where artist_id = ? and status = 'published') "
                + "+ (select count(*) from supplies where seller_id = ? and status = 'published') "
                + "+ (select count(*) from classes where instructor_id = ? and status = 'published') "
                + "+ (select count(*) from exhibitions where organizer_id = ? and status = 'published')", me, me, me, me);

        BigDecimal gross = (BigDecimal) totals.get("gross");
        long orders = ((Number) totals.get("orders")).longValue();
        BigDecimal aov = orders == 0 ? BigDecimal.ZERO : gross.divide(BigDecimal.valueOf(orders), 2, java.math.RoundingMode.HALF_UP);
        return new SellerStats(gross, (BigDecimal) totals.get("earnings"), ((Number) totals.get("items")).longValue(), orders,
                views, favorites, followers, avg == null ? 0 : Math.round(avg * 10) / 10.0, reviews, listings, aov,
                new ArrayList<>(months.values()), top);
    }

    private long number(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }
}
