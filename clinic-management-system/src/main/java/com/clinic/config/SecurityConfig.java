
package com.clinic.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import com.clinic.service.CustomUserDetailsService;

@Configuration
public class SecurityConfig {

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            CustomUserDetailsService userDetailsService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider authenticationProvider)
            throws Exception {

        http
            // Enable CORS for the Angular frontend.
            .cors(Customizer.withDefaults())

            // Disable CSRF for this HTTP Basic API configuration.
            .csrf(csrf -> csrf.disable())

            .authenticationProvider(authenticationProvider)

            .authorizeHttpRequests(auth -> auth

                // Anyone can register a STAFF account.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/users/register"
                ).permitAll()

                // Any authenticated user can access their own profile.
                // Keep this before the general /api/users/** rule.
                .requestMatchers("/api/users/me")
                .authenticated()

                // Only ADMIN can manage user accounts.
                .requestMatchers("/api/users/**")
                .hasRole("ADMIN")

                // ADMIN and DOCTOR can view medical records.
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/medical-records/**"
                ).hasAnyRole("ADMIN", "DOCTOR")

                // ADMIN and DOCTOR can create medical records.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/medical-records"
                ).hasAnyRole("ADMIN", "DOCTOR")

                // ADMIN and DOCTOR can update medical records.
                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/medical-records/**"
                ).hasAnyRole("ADMIN", "DOCTOR")

                // Only ADMIN can delete medical records.
                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/medical-records/**"
                ).hasRole("ADMIN")

                // ADMIN and STAFF can create invoices.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/invoices",
                    "/api/invoices/**"
                ).hasAnyRole("ADMIN", "STAFF")

                // ADMIN and STAFF can update invoice statuses.
                .requestMatchers(
                    HttpMethod.PATCH,
                    "/api/invoices/**"
                ).hasAnyRole("ADMIN", "STAFF")

                // ADMIN and STAFF can update invoices.
                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/invoices/**"
                ).hasAnyRole("ADMIN", "STAFF")

                // ADMIN and STAFF can delete invoices.
                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/invoices/**"
                ).hasAnyRole("ADMIN", "STAFF")

                // All other endpoints require authentication.
                .anyRequest().authenticated()
            )

            // Enable HTTP Basic authentication.
            .httpBasic(Customizer.withDefaults())

            // Disable the default login page.
            .formLogin(form -> form.disable());

        return http.build();
    }
}
