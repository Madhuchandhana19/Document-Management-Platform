package com.dms.repository;

import com.dms.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByEmail(String email);
    Optional<Users> findByEmailIgnoreCase(String email);
    Optional<Users> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPhoneNumber(String phoneNumber);
    java.util.List<Users> findByRoleIn(java.util.List<com.dms.entity.Role> roles);
}
