package com.clinic.controller;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.clinic.entity.Doctor;
import com.clinic.entity.User;
import com.clinic.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(Authentication authentication) {

        User user = userService.getUserByUsername(authentication.getName());

        return ResponseEntity.ok(user);
    }

    // Public registration: creates a STAFF account.
    @PostMapping("/register")
    public ResponseEntity<User> registerUser(
            @Valid @RequestBody User user) {

        User savedUser = userService.registerUser(user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedUser);
    }

    // ADMIN: Get all users.
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    // ADMIN: Get user by ID.
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(
            @PathVariable Long id) {

        return ResponseEntity.ok(userService.getUserById(id));
    }

    // ADMIN: Delete user by ID.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id) {

        userService.deleteUser(id);

        return ResponseEntity.noContent().build();
    }

    // ADMIN: Create a doctor login account without a profile link.
    @PostMapping("/doctors")
    public ResponseEntity<User> createDoctor(
            @Valid @RequestBody User user) {

        User savedUser = userService.createDoctor(user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedUser);
    }

    // ADMIN: Create a doctor profile and linked login account together.
    @PostMapping("/doctors/onboard")
    public ResponseEntity<User> onboardDoctor(
            @Valid @RequestBody DoctorOnboardingRequest request) {

        User savedUser = userService.onboardDoctor(
                request.getDoctor(),
                request.getUser());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedUser);
    }

    // Link an existing doctor account to an existing doctor profile.
    @PostMapping("/{userId}/link-doctor")
    public ResponseEntity<User> linkDoctorAccount(
            @PathVariable Long userId,
            @RequestParam Long doctorId) {

        User linkedUser = userService.linkDoctorAccount(userId, doctorId);

        return ResponseEntity.ok(linkedUser);
    }

    // Request DTO for doctor onboarding.
    public static class DoctorOnboardingRequest {

        @Valid
        private Doctor doctor;

        @Valid
        private User user;

        public DoctorOnboardingRequest() {
        }

        public Doctor getDoctor() {
            return doctor;
        }

        public void setDoctor(Doctor doctor) {
            this.doctor = doctor;
        }

        public User getUser() {
            return user;
        }

        public void setUser(User user) {
            this.user = user;
        }
    }
}
