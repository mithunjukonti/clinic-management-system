
package com.clinic.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.clinic.entity.Doctor;
import com.clinic.entity.User;
import com.clinic.entity.UserRole;
import com.clinic.exception.ResourceNotFoundException;
import com.clinic.repository.DoctorRepository;
import com.clinic.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DoctorRepository doctorRepository;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            DoctorRepository doctorRepository) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.doctorRepository = doctorRepository;
    }

    // Public registration: users can only register as STAFF.
    @Transactional
    public User registerUser(User user) {

        validateUniqueCredentials(user);

        user.setRole(UserRole.STAFF);
        user.setDoctor(null);
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    // ADMIN: Create a doctor login account without linking a profile.
    @Transactional
    public User createDoctor(User user) {

        validateUniqueCredentials(user);

        user.setRole(UserRole.DOCTOR);
        user.setDoctor(null);
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    // ADMIN: Create a doctor profile and its login account together.
    @Transactional
    public User onboardDoctor(Doctor doctor, User user) {

        validateUniqueCredentials(user);

        if (doctor.getEmail() == null || doctor.getEmail().isBlank()) {
            throw new IllegalArgumentException(
                    "Doctor email is required");
        }

        if (user.getEmail() == null
                || !doctor.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException(
                    "Doctor email and user account email must match");
        }

        Doctor savedDoctor = doctorRepository.save(doctor);

        user.setRole(UserRole.DOCTOR);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setDoctor(savedDoctor);

        return userRepository.save(user);
    }

    // ADMIN: Create a doctor login account linked to an existing profile.
    @Transactional
    public User createLinkedDoctorAccount(User user, Long doctorId) {

        validateUniqueCredentials(user);

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor not found: " + doctorId));

        if (userRepository.existsByDoctorId(doctorId)) {
            throw new IllegalArgumentException(
                    "This doctor already has a linked user account");
        }

        // Ensure the login email belongs to the selected doctor profile.
        if (doctor.getEmail() == null
                || user.getEmail() == null
                || !doctor.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException(
                    "The account email must match the selected doctor's email");
        }

        user.setRole(UserRole.DOCTOR);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setDoctor(doctor);

        return userRepository.save(user);
    }

    // Validate username and email uniqueness.
    private void validateUniqueCredentials(User user) {

        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException(
                    "Username already exists");
        }

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException(
                    "Email already exists");
        }
    }

    // Find a user by username.
    public User getUserByUsername(String username) {

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + username));
    }

    // ADMIN: List all users.
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Find a user by ID.
    public User getUserById(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with ID: " + id));
    }

    // ADMIN: Delete a user by ID.
    @Transactional
    public void deleteUser(Long id) {

        User user = getUserById(id);
        userRepository.delete(user);
    }

    // ADMIN: Link an existing doctor account to an existing profile.
    @Transactional
    public User linkDoctorAccount(Long userId, Long doctorId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + userId));

        if (user.getRole() != UserRole.DOCTOR) {
            throw new IllegalArgumentException(
                    "Only users with the DOCTOR role can be linked");
        }

        if (user.getDoctor() != null) {
            throw new IllegalArgumentException(
                    "This user is already linked to a doctor record");
        }

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor not found: " + doctorId));

        if (userRepository.existsByDoctorId(doctorId)) {
            throw new IllegalArgumentException(
                    "This doctor record is already linked to a user account");
        }

        // The account email must match the doctor profile.
        if (user.getEmail() == null
                || doctor.getEmail() == null
                || !user.getEmail().equalsIgnoreCase(doctor.getEmail())) {
            throw new IllegalArgumentException(
                    "The user email must match the doctor's email");
        }

        user.setDoctor(doctor);

        return userRepository.save(user);
    }
}
