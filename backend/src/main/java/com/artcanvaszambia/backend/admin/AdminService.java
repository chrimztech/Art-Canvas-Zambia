package com.artcanvaszambia.backend.admin;

import com.artcanvaszambia.backend.admin.dto.AdminCommissionDto;
import com.artcanvaszambia.backend.admin.dto.AdminOrderDto;
import com.artcanvaszambia.backend.admin.dto.AdminSupplyDto;
import com.artcanvaszambia.backend.admin.dto.AdminUserDto;
import com.artcanvaszambia.backend.admin.dto.CategoryUpsertRequest;
import com.artcanvaszambia.backend.admin.dto.PasswordResetDto;
import com.artcanvaszambia.backend.admin.dto.PermissionDto;
import com.artcanvaszambia.backend.admin.dto.PermissionOverrideDto;
import com.artcanvaszambia.backend.admin.dto.PlatformSettingsDto;
import com.artcanvaszambia.backend.admin.dto.PlatformSettingsUpdateRequest;
import com.artcanvaszambia.backend.admin.dto.RolePermissionsDto;
import com.artcanvaszambia.backend.admin.dto.UserPermissionsDto;
import com.artcanvaszambia.backend.admin.dto.WalletBalanceDto;
import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.auth.User;
import com.artcanvaszambia.backend.auth.UserRepository;
import com.artcanvaszambia.backend.auth.UserRoleEntity;
import com.artcanvaszambia.backend.auth.UserRoleRepository;
import com.artcanvaszambia.backend.catalog.Category;
import com.artcanvaszambia.backend.catalog.CategoryRepository;
import com.artcanvaszambia.backend.catalog.Artwork;
import com.artcanvaszambia.backend.catalog.ArtworkRepository;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.catalog.dto.CategoryDto;
import com.artcanvaszambia.backend.classes.ClassEntity;
import com.artcanvaszambia.backend.classes.ClassRepository;
import com.artcanvaszambia.backend.classes.dto.ClassDto;
import com.artcanvaszambia.backend.commissions.Commission;
import com.artcanvaszambia.backend.commissions.CommissionRepository;
import com.artcanvaszambia.backend.common.ApiException;
import com.artcanvaszambia.backend.common.SlugUtil;
import com.artcanvaszambia.backend.exhibitions.Exhibition;
import com.artcanvaszambia.backend.exhibitions.ExhibitionRepository;
import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionDto;
import com.artcanvaszambia.backend.orders.PlatformSettings;
import com.artcanvaszambia.backend.orders.PlatformSettingsRepository;
import com.artcanvaszambia.backend.orders.Order;
import com.artcanvaszambia.backend.orders.OrderRepository;
import com.artcanvaszambia.backend.payments.ZynlePayClient;
import com.artcanvaszambia.backend.payments.ZynlePayResult;
import com.artcanvaszambia.backend.profile.Profile;
import com.artcanvaszambia.backend.profile.ProfileRepository;
import com.artcanvaszambia.backend.security.Permission;
import com.artcanvaszambia.backend.security.Role;
import com.artcanvaszambia.backend.security.RolePermissionEntity;
import com.artcanvaszambia.backend.security.RolePermissionRepository;
import com.artcanvaszambia.backend.security.SecurityUtils;
import com.artcanvaszambia.backend.security.UserPermissionOverrideEntity;
import com.artcanvaszambia.backend.security.UserPermissionOverrideRepository;
import com.artcanvaszambia.backend.supplies.Supply;
import com.artcanvaszambia.backend.supplies.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final int ADMIN_LIST_LIMIT = 100;
    private static final Sort CREATED_DESC = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Set<String> SUPPLY_STATUSES = Set.of(Supply.DRAFT, Supply.PUBLISHED, Supply.ARCHIVED);
    private static final Set<String> CLASS_STATUSES = Set.of(ClassEntity.DRAFT, ClassEntity.PUBLISHED, ClassEntity.CANCELLED, ClassEntity.COMPLETED);
    private static final Set<String> EXHIBITION_STATUSES = Set.of(Exhibition.DRAFT, Exhibition.PUBLISHED, Exhibition.CANCELLED, Exhibition.COMPLETED);
    private static final Set<String> COMMISSION_STATUSES = Set.of(
            Commission.REQUESTED,
            Commission.QUOTED,
            Commission.ACCEPTED,
            Commission.IN_PROGRESS,
            Commission.DELIVERED,
            Commission.COMPLETED,
            Commission.CANCELLED
    );
    private static final Set<String> ORDER_STATUSES = Set.of(Order.PAID, Order.FULFILLED, Order.CANCELLED, Order.REFUNDED);

    private final PlatformSettingsRepository platformSettingsRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CategoryRepository categoryRepository;
    private final ArtworkRepository artworkRepository;
    private final SupplyRepository supplyRepository;
    private final ClassRepository classRepository;
    private final com.artcanvaszambia.backend.classes.ClassEnrollmentRepository classEnrollmentRepository;
    private final com.artcanvaszambia.backend.exhibitions.ExhibitionTicketRepository exhibitionTicketRepository;
    private final ExhibitionRepository exhibitionRepository;
    private final CommissionRepository commissionRepository;
    private final OrderRepository orderRepository;
    private final com.artcanvaszambia.backend.orders.OrderFulfillmentService orderFulfillmentService;
    private final ZynlePayClient zynlePayClient;
    private final com.artcanvaszambia.backend.payments.LencoClient lencoClient;
    private final com.artcanvaszambia.backend.payments.PaymentProviders paymentProviders;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionOverrideRepository userPermissionOverrideRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    private static final Map<Permission, String> PERMISSION_DESCRIPTIONS = Map.ofEntries(
            Map.entry(Permission.USERS_RESET_PASSWORD, "Reset another user's password"),
            Map.entry(Permission.USERS_MANAGE_PERMISSIONS, "Grant or revoke roles and permissions"),
            Map.entry(Permission.CATEGORIES_MANAGE, "Create, edit and delete artwork categories"),
            Map.entry(Permission.ARTWORKS_MODERATE, "Publish, archive or remove any artwork"),
            Map.entry(Permission.ARTWORKS_PUBLISH, "Publish your own artworks"),
            Map.entry(Permission.SUPPLIES_MODERATE, "Publish, archive or remove any supply/equipment listing"),
            Map.entry(Permission.SUPPLIES_PUBLISH, "Publish your own supply/equipment listings"),
            Map.entry(Permission.CLASSES_MODERATE, "Publish, cancel or remove any class"),
            Map.entry(Permission.CLASSES_PUBLISH, "Publish your own classes"),
            Map.entry(Permission.EXHIBITIONS_MODERATE, "Publish, cancel or remove any exhibition"),
            Map.entry(Permission.EXHIBITIONS_PUBLISH, "Publish your own exhibitions"),
            Map.entry(Permission.COMMISSIONS_MODERATE, "Manage the status of any commission"),
            Map.entry(Permission.COMMISSIONS_ACCEPT, "Claim and accept open commission requests"),
            Map.entry(Permission.ORDERS_MANAGE, "Manage the status of any order"),
            Map.entry(Permission.PAYOUTS_VIEW, "View payout requests"),
            Map.entry(Permission.PAYOUTS_APPROVE, "Approve payout requests for disbursement"),
            Map.entry(Permission.PAYOUTS_REQUEST, "Request a payout of your own earnings"),
            Map.entry(Permission.PLATFORM_SETTINGS_VIEW, "View platform settings"),
            Map.entry(Permission.PLATFORM_SETTINGS_EDIT, "Edit platform settings"),
            Map.entry(Permission.WALLET_VIEW_BALANCE, "View the platform's payment wallet balance")
    );

    public WalletBalanceDto getWalletBalance() {
        if (com.artcanvaszambia.backend.payments.PaymentProviders.LENCO.equals(paymentProviders.active())) {
            var lenco = lencoClient.accountBalance();
            if (!lenco.accepted()) {
                return new WalletBalanceDto(null, null, lenco.failureReason());
            }
            // Lenco has a single account: available funds can be paid out, the ledger includes uncleared funds.
            return new WalletBalanceDto(lenco.dataField("availableBalance"), lenco.dataField("ledgerBalance"),
                    "Lenco account");
        }
        ZynlePayResult result = zynlePayClient.checkBalance();
        return new WalletBalanceDto(result.get("disbursement_balance"), result.get("collection_balance"), result.description());
    }

    public PlatformSettingsDto getSettings() {
        PlatformSettings s = platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new);
        return toDto(s);
    }

    @Transactional
    public PlatformSettingsDto updateSettings(PlatformSettingsUpdateRequest req) {
        PlatformSettings s = platformSettingsRepository.findById(1).orElseGet(PlatformSettings::new);
        if (req.developerRoyaltyPercent() != null
                && req.developerRoyaltyPercent().compareTo(s.getDeveloperRoyaltyPercent()) != 0
                && !SecurityUtils.isSuperAdmin()) {
            throw ApiException.forbidden("Only a super admin may change the developer royalty percentage");
        }
        boolean changesDeveloperAccount = req.developerPayoutMethod() != null || req.developerPayoutPhone() != null
                || req.developerPayoutBankName() != null || req.developerPayoutReceiverId() != null;
        if (changesDeveloperAccount && !SecurityUtils.isSuperAdmin()) {
            throw ApiException.forbidden("Only a super admin may change the developer payout account");
        }
        if (req.platformFeePercent() != null) s.setPlatformFeePercent(req.platformFeePercent());
        if (req.developerRoyaltyPercent() != null && SecurityUtils.isSuperAdmin()) {
            s.setDeveloperRoyaltyPercent(req.developerRoyaltyPercent());
        }
        if (req.currency() != null) s.setCurrency(req.currency());
        if (req.paymentProvider() != null && !req.paymentProvider().isBlank()) {
            String provider = req.paymentProvider().trim().toLowerCase();
            if (!com.artcanvaszambia.backend.payments.PaymentProviders.ALL.contains(provider)) {
                throw ApiException.badRequest("Payment provider must be zynlepay or lenco");
            }
            if (com.artcanvaszambia.backend.payments.PaymentProviders.LENCO.equals(provider) && !lencoClient.isConfigured()) {
                throw ApiException.badRequest("Set LENCO_API_TOKEN on the server before switching to Lenco");
            }
            s.setPaymentProvider(provider);
        }
        if (req.heroImageUrl() != null) s.setHeroImageUrl(req.heroImageUrl());
        if (changesDeveloperAccount) {
            s.setDeveloperPayoutMethod(req.developerPayoutMethod());
            s.setDeveloperPayoutPhone(req.developerPayoutPhone());
            s.setDeveloperPayoutBankName(req.developerPayoutBankName());
            s.setDeveloperPayoutReceiverId(req.developerPayoutReceiverId());
        }
        if (req.ownerPayoutMethod() != null) s.setOwnerPayoutMethod(req.ownerPayoutMethod());
        if (req.ownerPayoutPhone() != null) s.setOwnerPayoutPhone(req.ownerPayoutPhone());
        if (req.ownerPayoutBankName() != null) s.setOwnerPayoutBankName(req.ownerPayoutBankName());
        if (req.ownerPayoutReceiverId() != null) s.setOwnerPayoutReceiverId(req.ownerPayoutReceiverId());
        platformSettingsRepository.save(s);
        auditService.record("PLATFORM_SETTINGS_UPDATED", "PLATFORM_SETTINGS", null, null,
                "fee=" + s.getPlatformFeePercent() + ", royalty=" + s.getDeveloperRoyaltyPercent());
        return toDto(s);
    }

    public List<AdminUserDto> listUsers() {
        List<Profile> profiles = profileRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        List<UUID> ids = profiles.stream().map(Profile::getId).toList();
        Map<UUID, User> users = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<UUID, List<String>> rolesByUser = ids.stream().collect(Collectors.toMap(
                id -> id,
                id -> userRoleRepository.findByUserId(id).stream().map(r -> r.getRole().name()).toList()
        ));
        return profiles.stream().map(p -> {
            User u = users.get(p.getId());
            return new AdminUserDto(p.getId(), p.getDisplayName(), u != null ? u.getEmail() : null,
                    p.getCreatedAt(), rolesByUser.getOrDefault(p.getId(), List.of()), p.isVerified());
        }).toList();
    }

    @Transactional
    public AdminUserDto setVerified(UUID userId, boolean verified) {
        Profile profile = profileRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Profile not found"));
        profile.setVerified(verified);
        profileRepository.save(profile);
        auditService.record(verified ? "USER_VERIFIED" : "USER_UNVERIFIED", "USER", userId, profile.getDisplayName(), null);
        User user = userRepository.findById(userId).orElse(null);
        List<String> roles = userRoleRepository.findByUserId(userId).stream().map(r -> r.getRole().name()).toList();
        return new AdminUserDto(profile.getId(), profile.getDisplayName(), user != null ? user.getEmail() : null,
                profile.getCreatedAt(), roles, profile.isVerified());
    }

    public List<CategoryDto> listCategories() {
        return categoryRepository.findAll(Sort.by("sortOrder").ascending().and(Sort.by("name").ascending()))
                .stream().map(CategoryDto::from).toList();
    }

    @Transactional
    public CategoryDto createCategory(CategoryUpsertRequest req) {
        Category category = new Category();
        applyCategory(category, req);
        categoryRepository.save(category);
        return CategoryDto.from(category);
    }

    @Transactional
    public CategoryDto updateCategory(UUID id, CategoryUpsertRequest req) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Category not found"));
        applyCategory(category, req);
        categoryRepository.save(category);
        return CategoryDto.from(category);
    }

    @Transactional
    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Category not found"));
        categoryRepository.delete(category);
    }

    @Transactional
    public void grantRole(UUID userId, String roleName) {
        requireUser(userId);
        Role role = parseRole(roleName);
        if (!userRoleRepository.existsByUserIdAndRole(userId, role)) {
            userRoleRepository.save(new UserRoleEntity(userId, role));
        }
        auditService.record("ROLE_GRANTED", "USER", userId, roleName, null);
    }

    @Transactional
    public void revokeRole(UUID userId, String roleName) {
        requireUser(userId);
        Role role = parseRole(roleName);
        if (role == Role.SUPER_ADMIN
                && userRoleRepository.existsByUserIdAndRole(userId, role)
                && userRoleRepository.findByRole(Role.SUPER_ADMIN).size() <= 1) {
            throw ApiException.badRequest("You can't remove the last super admin");
        }
        userRoleRepository.deleteByUserIdAndRole(userId, role);
        auditService.record("ROLE_REVOKED", "USER", userId, roleName, null);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (userId.equals(SecurityUtils.currentUserId())) {
            throw ApiException.badRequest("You can't delete your own account");
        }
        boolean isLastSuperAdmin = userRoleRepository.existsByUserIdAndRole(userId, Role.SUPER_ADMIN)
                && userRoleRepository.findByRole(Role.SUPER_ADMIN).size() <= 1;
        if (isLastSuperAdmin) {
            throw ApiException.badRequest("You can't delete the last super admin");
        }
        try {
            userRepository.delete(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            log.warn("Could not delete user {}: {}", userId, ex.getMessage());
            throw ApiException.conflict("This user has order history and can't be deleted. Revoke their roles instead.");
        } catch (RuntimeException ex) {
            log.error("Unexpected error deleting user {}", userId, ex);
            throw ex;
        }
        auditService.record("USER_DELETED", "USER", userId, user.getEmail(), null);
    }

    private Role parseRole(String roleName) {
        try {
            return Role.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown role: " + roleName);
        }
    }

    private void requireUser(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw ApiException.notFound("User not found");
        }
    }

    private static final String TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public PasswordResetDto resetPassword(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        String tempPassword = sb.toString();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        userRepository.save(user);
        auditService.record("PASSWORD_RESET", "USER", userId, user.getEmail(), null);
        return new PasswordResetDto(tempPassword);
    }

    public List<PermissionDto> listPermissions() {
        return Arrays.stream(Permission.values())
                .map(p -> new PermissionDto(p.name(), PERMISSION_DESCRIPTIONS.getOrDefault(p, p.name())))
                .toList();
    }

    public RolePermissionsDto getRolePermissions(String roleName) {
        Role role = parseRole(roleName);
        List<String> permissions = rolePermissionRepository.findByRole(role).stream()
                .map(rp -> rp.getPermission().name())
                .toList();
        return new RolePermissionsDto(role.name(), permissions);
    }

    @Transactional
    public RolePermissionsDto updateRolePermissions(String roleName, List<String> permissionNames) {
        Role role = parseRole(roleName);
        Set<Permission> permissions = permissionNames.stream().map(this::parsePermission).collect(Collectors.toSet());
        rolePermissionRepository.deleteByRole(role);
        rolePermissionRepository.flush();
        permissions.forEach(p -> rolePermissionRepository.save(new RolePermissionEntity(role, p)));
        auditService.record("ROLE_PERMISSIONS_UPDATED", "ROLE", null, role.name(), String.join(",", permissionNames));
        return getRolePermissions(role.name());
    }

    public UserPermissionsDto getUserPermissions(UUID userId) {
        requireUser(userId);
        Set<Role> roles = userRoleRepository.findByUserId(userId).stream().map(UserRoleEntity::getRole).collect(Collectors.toSet());
        Set<Permission> effective = EnumSet.noneOf(Permission.class);
        if (!roles.isEmpty()) {
            rolePermissionRepository.findByRoleIn(roles).forEach(rp -> effective.add(rp.getPermission()));
        }
        List<UserPermissionOverrideEntity> overrides = userPermissionOverrideRepository.findByUserId(userId);
        for (UserPermissionOverrideEntity override : overrides) {
            if (override.isGranted()) effective.add(override.getPermission());
            else effective.remove(override.getPermission());
        }
        List<PermissionOverrideDto> overrideDtos = overrides.stream()
                .map(o -> new PermissionOverrideDto(o.getPermission().name(), o.isGranted()))
                .toList();
        List<String> effectiveNames = effective.stream().map(Enum::name).sorted().toList();
        return new UserPermissionsDto(userId, effectiveNames, overrideDtos);
    }

    @Transactional
    public UserPermissionsDto setUserPermissionOverride(UUID userId, String permissionName, boolean granted) {
        requireUser(userId);
        Permission permission = parsePermission(permissionName);
        UserPermissionOverrideEntity override = userPermissionOverrideRepository.findByUserIdAndPermission(userId, permission)
                .orElseGet(() -> new UserPermissionOverrideEntity(userId, permission, granted, SecurityUtils.currentUserId()));
        override.setGranted(granted);
        userPermissionOverrideRepository.save(override);
        auditService.record(granted ? "PERMISSION_GRANTED" : "PERMISSION_REVOKED", "USER", userId, permissionName, null);
        return getUserPermissions(userId);
    }

    @Transactional
    public UserPermissionsDto clearUserPermissionOverride(UUID userId, String permissionName) {
        requireUser(userId);
        Permission permission = parsePermission(permissionName);
        userPermissionOverrideRepository.deleteByUserIdAndPermission(userId, permission);
        auditService.record("PERMISSION_OVERRIDE_CLEARED", "USER", userId, permissionName, null);
        return getUserPermissions(userId);
    }

    private Permission parsePermission(String permissionName) {
        try {
            return Permission.valueOf(permissionName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown permission: " + permissionName);
        }
    }

    public List<ArtworkSummaryDto> listAllArtworks() {
        List<Artwork> artworks = artworkRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profileMap = profilesById(artworks.stream().map(Artwork::getArtistId).toList());
        return artworks.stream().map(a -> {
            Profile p = profileMap.get(a.getArtistId());
            return new ArtworkSummaryDto(a.getId(), a.getSlug(), a.getTitle(), a.getPriceZmw(), a.getCoverImageUrl(),
                    a.getMedium(), a.getArtistId(), p != null ? p.getDisplayName() : null, a.getStatus(),
                    a.getViewCount(), a.getCreatedAt());
        }).toList();
    }

    public List<AdminSupplyDto> listAllSupplies() {
        List<Supply> supplies = supplyRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profiles = profilesById(supplies.stream().map(Supply::getSellerId).toList());
        return supplies.stream().map(supply -> toAdminSupplyDto(supply, profiles)).toList();
    }

    @Transactional
    public AdminSupplyDto updateSupplyStatus(UUID id, String status) {
        String normalized = normalizeStatus(status);
        if (!SUPPLY_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid supply status");
        }
        Supply supply = supplyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Supply not found"));
        supply.setStatus(normalized);
        supplyRepository.save(supply);
        return toAdminSupplyDto(supply, profilesById(List.of(supply.getSellerId())));
    }

    public List<ClassDto> listAllClasses() {
        List<ClassEntity> classes = classRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profiles = profilesById(classes.stream().map(ClassEntity::getInstructorId).toList());
        return classes.stream().map(item -> toClassDto(item, profiles)).toList();
    }

    @Transactional
    public ClassDto updateClassStatus(UUID id, String status) {
        String normalized = normalizeStatus(status);
        if (!CLASS_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid class status");
        }
        ClassEntity classEntity = classRepository.findById(id).orElseThrow(() -> ApiException.notFound("Class not found"));
        classEntity.setStatus(normalized);
        classRepository.save(classEntity);
        return toClassDto(classEntity, profilesById(List.of(classEntity.getInstructorId())));
    }

    public List<ExhibitionDto> listAllExhibitions() {
        List<Exhibition> exhibitions = exhibitionRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profiles = profilesById(exhibitions.stream().map(Exhibition::getOrganizerId).toList());
        return exhibitions.stream().map(item -> toExhibitionDto(item, profiles)).toList();
    }

    @Transactional
    public ExhibitionDto updateExhibitionStatus(UUID id, String status) {
        String normalized = normalizeStatus(status);
        if (!EXHIBITION_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid exhibition status");
        }
        Exhibition exhibition = exhibitionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Exhibition not found"));
        exhibition.setStatus(normalized);
        exhibitionRepository.save(exhibition);
        return toExhibitionDto(exhibition, profilesById(List.of(exhibition.getOrganizerId())));
    }

    public List<AdminCommissionDto> listAllCommissions() {
        List<Commission> commissions = commissionRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profiles = profilesById(commissions.stream()
                .flatMap(commission -> Arrays.stream(new UUID[]{commission.getCustomerId(), commission.getArtistId()}))
                .filter(Objects::nonNull)
                .toList());
        return commissions.stream().map(commission -> toAdminCommissionDto(commission, profiles)).toList();
    }

    @Transactional
    public AdminCommissionDto updateCommissionStatus(UUID id, String status) {
        String normalized = normalizeStatus(status);
        if (!COMMISSION_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid commission status");
        }
        Commission commission = commissionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Commission not found"));
        commission.setStatus(normalized);
        commissionRepository.save(commission);
        return toAdminCommissionDto(commission, profilesById(List.of(commission.getCustomerId(), commission.getArtistId())));
    }

    public List<AdminOrderDto> listAllOrders() {
        List<Order> orders = orderRepository.findAll(PageRequest.of(0, ADMIN_LIST_LIMIT, CREATED_DESC)).getContent();
        Map<UUID, Profile> profiles = profilesById(orders.stream().map(Order::getBuyerId).toList());
        Map<UUID, User> users = usersById(orders.stream().map(Order::getBuyerId).toList());
        return orders.stream().map(order -> toAdminOrderDto(order, profiles, users)).toList();
    }

    @Transactional
    public AdminOrderDto updateOrderStatus(UUID id, String status) {
        String normalized = normalizeStatus(status);
        if (!ORDER_STATUSES.contains(normalized)) {
            throw ApiException.badRequest("Invalid order status");
        }
        Order order = orderRepository.findById(id).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (Order.PAID.equals(normalized)) {
            // Run the same fulfilment as a confirmed payment (enrollments, tickets, stock, sold status).
            orderFulfillmentService.markPaid(order);
        } else {
            order.setStatus(normalized);
            orderRepository.save(order);
        }
        auditService.record("ORDER_STATUS_UPDATED", "ORDER", order.getId(), order.getOrderNumber(), normalized);
        return toAdminOrderDto(order, profilesById(List.of(order.getBuyerId())), usersById(List.of(order.getBuyerId())));
    }

    private void applyCategory(Category category, CategoryUpsertRequest req) {
        category.setName(req.name().trim());
        category.setDescription(blankToNull(req.description()));
        category.setSortOrder(req.sortOrder());

        String slugBase = blankToNull(req.slug()) != null ? req.slug().trim() : req.name().trim();
        String currentSlug = category.getSlug();
        String slug = SlugUtil.uniqueSlug(slugBase, candidate ->
                categoryRepository.existsBySlug(candidate) && !candidate.equals(currentSlug));
        category.setSlug(slug);
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toLowerCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Map<UUID, Profile> profilesById(List<UUID> ids) {
        List<UUID> distinctIds = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) {
            return Map.of();
        }
        return profileRepository.findByIdIn(distinctIds).stream()
                .collect(Collectors.toMap(Profile::getId, Function.identity()));
    }

    private Map<UUID, User> usersById(List<UUID> ids) {
        List<UUID> distinctIds = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(distinctIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private AdminSupplyDto toAdminSupplyDto(Supply supply, Map<UUID, Profile> profiles) {
        Profile seller = profiles.get(supply.getSellerId());
        return new AdminSupplyDto(
                supply.getId(),
                supply.getSlug(),
                supply.getName(),
                supply.getPriceZmw(),
                supply.getCoverImageUrl(),
                supply.getCategory(),
                supply.getCondition(),
                supply.getStock(),
                supply.getStatus(),
                supply.getSellerId(),
                seller != null ? seller.getDisplayName() : null,
                supply.getCreatedAt()
        );
    }

    private ClassDto toClassDto(ClassEntity classEntity, Map<UUID, Profile> profiles) {
        Profile instructor = profiles.get(classEntity.getInstructorId());
        return new ClassDto(
                classEntity.getId(),
                classEntity.getSlug(),
                classEntity.getTitle(),
                classEntity.getDescription(),
                classEntity.getCoverImageUrl(),
                classEntity.getMode(),
                classEntity.getLocation(),
                classEntity.getMeetingUrl(),
                classEntity.getStartsAt(),
                classEntity.getEndsAt(),
                classEntity.getCapacity(),
                classEntity.getPriceZmw(),
                classEntity.getStatus(),
                classEntity.getInstructorId(),
                instructor != null ? instructor.getDisplayName() : null,
                classEntity.getSkillLevel(),
                classEntity.getPrerequisites(),
                classEntity.getSyllabus(),
                classEntity.getTags(),
                classEntity.isMaterialsIncluded(),
                classEnrollmentRepository.countByClassIdAndStatusIn(classEntity.getId(),
                        com.artcanvaszambia.backend.orders.CheckoutService.SEAT_HOLDING_STATUSES),
                false
        );
    }

    private ExhibitionDto toExhibitionDto(Exhibition exhibition, Map<UUID, Profile> profiles) {
        Profile organizer = profiles.get(exhibition.getOrganizerId());
        return new ExhibitionDto(
                exhibition.getId(),
                exhibition.getSlug(),
                exhibition.getTitle(),
                exhibition.getDescription(),
                exhibition.getCoverImageUrl(),
                exhibition.getVenue(),
                exhibition.getCity(),
                exhibition.getStartsAt(),
                exhibition.getEndsAt(),
                exhibition.getTicketPriceZmw(),
                exhibition.getCapacity(),
                exhibition.getStatus(),
                exhibition.getOrganizerId(),
                organizer != null ? organizer.getDisplayName() : null,
                exhibition.getCuratorName(),
                exhibition.getTheme(),
                exhibition.getTags(),
                exhibition.getContactEmail(),
                exhibition.getContactPhone(),
                exhibition.isFeatured(),
                exhibitionTicketRepository.sumQuantityByExhibitionIdAndStatusIn(exhibition.getId(),
                        com.artcanvaszambia.backend.orders.CheckoutService.SEAT_HOLDING_STATUSES)
        );
    }

    private AdminCommissionDto toAdminCommissionDto(Commission commission, Map<UUID, Profile> profiles) {
        Profile customer = profiles.get(commission.getCustomerId());
        Profile artist = profiles.get(commission.getArtistId());
        return new AdminCommissionDto(
                commission.getId(),
                commission.getCustomerId(),
                customer != null ? customer.getDisplayName() : null,
                commission.getArtistId(),
                artist != null ? artist.getDisplayName() : null,
                commission.getTitle(),
                commission.getBrief(),
                commission.getBudgetZmw(),
                commission.getQuotedPriceZmw(),
                commission.getDeadline(),
                commission.getStatus(),
                commission.getCreatedAt()
        );
    }

    private AdminOrderDto toAdminOrderDto(Order order, Map<UUID, Profile> profiles, Map<UUID, User> users) {
        Profile buyerProfile = profiles.get(order.getBuyerId());
        User buyer = users.get(order.getBuyerId());
        return new AdminOrderDto(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),
                order.getTotalZmw(),
                order.getPaymentProvider(),
                order.getPaymentReference(),
                order.getCreatedAt(),
                order.getBuyerId(),
                buyerProfile != null ? buyerProfile.getDisplayName() : null,
                buyer != null ? buyer.getEmail() : null
        );
    }

    private PlatformSettingsDto toDto(PlatformSettings s) {
        return new PlatformSettingsDto(s.getPlatformFeePercent(), s.getDeveloperRoyaltyPercent(), s.getCurrency(),
                s.getPaymentProvider(), s.getHeroImageUrl(),
                s.getDeveloperPayoutMethod(), s.getDeveloperPayoutPhone(), s.getDeveloperPayoutBankName(), s.getDeveloperPayoutReceiverId(),
                s.getOwnerPayoutMethod(), s.getOwnerPayoutPhone(), s.getOwnerPayoutBankName(), s.getOwnerPayoutReceiverId());
    }
}
