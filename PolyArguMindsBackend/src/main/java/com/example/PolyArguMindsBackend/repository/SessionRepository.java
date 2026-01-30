package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Changed <Session, Long> to <Session, String>
@Repository
public interface SessionRepository extends JpaRepository<Session, String> {
    java.util.List<Session> findAllByOrderByCreatedAtDesc();
}