package com.artcanvaszambia.backend.admin;

import com.artcanvaszambia.backend.admin.dto.AdminUserDto;
import com.artcanvaszambia.backend.admin.dto.AdminCommissionDto;
import com.artcanvaszambia.backend.admin.dto.AdminOrderDto;
import com.artcanvaszambia.backend.admin.dto.AdminSupplyDto;
import com.artcanvaszambia.backend.admin.dto.CategoryUpsertRequest;
import com.artcanvaszambia.backend.admin.dto.PasswordResetDto;
import com.artcanvaszambia.backend.admin.dto.PermissionDto;
import com.artcanvaszambia.backend.admin.dto.PermissionOverrideRequest;
import com.artcanvaszambia.backend.admin.dto.PlatformSettingsDto;
import com.artcanvaszambia.backend.admin.dto.PlatformSettingsUpdateRequest;
import com.artcanvaszambia.backend.admin.dto.RolePermissionsDto;
import com.artcanvaszambia.backend.admin.dto.RolePermissionsUpdateRequest;
import com.artcanvaszambia.backend.admin.dto.RoleRequest;
import com.artcanvaszambia.backend.admin.dto.StatusUpdateRequest;
import com.artcanvaszambia.backend.admin.dto.UserPermissionsDto;
import com.artcanvaszambia.backend.admin.dto.VerifyRequest;
import com.artcanvaszambia.backend.admin.dto.WalletBalanceDto;
import com.artcanvaszambia.backend.audit.AuditService;
import com.artcanvaszambia.backend.audit.dto.AuditLogDto;
import com.artcanvaszambia.backend.catalog.dto.CategoryDto;
import com.artcanvaszambia.backend.catalog.dto.ArtworkSummaryDto;
import com.artcanvaszambia.backend.classes.dto.ClassDto;
import com.artcanvaszambia.backend.exhibitions.dto.ExhibitionDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminController {
    private final AdminService adminService;
    private final AuditService auditService;

    @GetMapping("/audit-logs")
    public List<AuditLogDto> auditLogs() {
        return auditService.recent(200);
    }

    @GetMapping("/settings")
    public PlatformSettingsDto getSettings() {
        return adminService.getSettings();
    }

    @PutMapping("/settings")
    public PlatformSettingsDto updateSettings(@RequestBody PlatformSettingsUpdateRequest req) {
        return adminService.updateSettings(req);
    }

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return adminService.listUsers();
    }

    @GetMapping("/categories")
    public List<CategoryDto> listCategories() {
        return adminService.listCategories();
    }

    @PostMapping("/categories")
    public CategoryDto createCategory(@Valid @RequestBody CategoryUpsertRequest req) {
        return adminService.createCategory(req);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryUpsertRequest req) {
        return adminService.updateCategory(id, req);
    }

    @DeleteMapping("/categories/{id}")
    public void deleteCategory(@PathVariable UUID id) {
        adminService.deleteCategory(id);
    }

    @PostMapping("/users/{id}/roles")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void grantRole(@PathVariable UUID id, @Valid @RequestBody RoleRequest req) {
        adminService.grantRole(id, req.role());
    }

    @DeleteMapping("/users/{id}/roles/{role}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void revokeRole(@PathVariable UUID id, @PathVariable String role) {
        adminService.revokeRole(id, role);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void deleteUser(@PathVariable UUID id) {
        adminService.deleteUser(id);
    }

    @PatchMapping("/users/{id}/verify")
    public AdminUserDto setVerified(@PathVariable UUID id, @Valid @RequestBody VerifyRequest req) {
        return adminService.setVerified(id, req.verified());
    }

    @PostMapping("/users/{id}/reset-password")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN') and hasAuthority('PERM_USERS_RESET_PASSWORD')")
    public PasswordResetDto resetPassword(@PathVariable UUID id) {
        return adminService.resetPassword(id);
    }

    @GetMapping("/permissions")
    public List<PermissionDto> listPermissions() {
        return adminService.listPermissions();
    }

    @GetMapping("/roles/{role}/permissions")
    public RolePermissionsDto getRolePermissions(@PathVariable String role) {
        return adminService.getRolePermissions(role);
    }

    @PutMapping("/roles/{role}/permissions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public RolePermissionsDto updateRolePermissions(@PathVariable String role, @Valid @RequestBody RolePermissionsUpdateRequest req) {
        return adminService.updateRolePermissions(role, req.permissions());
    }

    @GetMapping("/users/{id}/permissions")
    public UserPermissionsDto getUserPermissions(@PathVariable UUID id) {
        return adminService.getUserPermissions(id);
    }

    @PutMapping("/users/{id}/permissions/{permission}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserPermissionsDto setUserPermissionOverride(@PathVariable UUID id, @PathVariable String permission,
                                                         @Valid @RequestBody PermissionOverrideRequest req) {
        return adminService.setUserPermissionOverride(id, permission, req.granted());
    }

    @DeleteMapping("/users/{id}/permissions/{permission}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserPermissionsDto clearUserPermissionOverride(@PathVariable UUID id, @PathVariable String permission) {
        return adminService.clearUserPermissionOverride(id, permission);
    }

    @GetMapping("/artworks")
    public List<ArtworkSummaryDto> listArtworks() {
        return adminService.listAllArtworks();
    }

    @GetMapping("/supplies")
    public List<AdminSupplyDto> listSupplies() {
        return adminService.listAllSupplies();
    }

    @PatchMapping("/supplies/{id}/status")
    public AdminSupplyDto updateSupplyStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return adminService.updateSupplyStatus(id, req.status());
    }

    @GetMapping("/classes")
    public List<ClassDto> listClasses() {
        return adminService.listAllClasses();
    }

    @PatchMapping("/classes/{id}/status")
    public ClassDto updateClassStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return adminService.updateClassStatus(id, req.status());
    }

    @GetMapping("/exhibitions")
    public List<ExhibitionDto> listExhibitions() {
        return adminService.listAllExhibitions();
    }

    @PatchMapping("/exhibitions/{id}/status")
    public ExhibitionDto updateExhibitionStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return adminService.updateExhibitionStatus(id, req.status());
    }

    @GetMapping("/commissions")
    public List<AdminCommissionDto> listCommissions() {
        return adminService.listAllCommissions();
    }

    @PatchMapping("/commissions/{id}/status")
    public AdminCommissionDto updateCommissionStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return adminService.updateCommissionStatus(id, req.status());
    }

    @GetMapping("/orders")
    public List<AdminOrderDto> listOrders() {
        return adminService.listAllOrders();
    }

    @PatchMapping("/orders/{id}/status")
    public AdminOrderDto updateOrderStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest req) {
        return adminService.updateOrderStatus(id, req.status());
    }

    @GetMapping("/wallet-balance")
    public WalletBalanceDto walletBalance() {
        return adminService.getWalletBalance();
    }
}
