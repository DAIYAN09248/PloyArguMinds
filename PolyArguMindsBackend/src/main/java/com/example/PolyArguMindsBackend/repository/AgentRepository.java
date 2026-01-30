package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Changed <Agent, Long> to <Agent, String>
@Repository
public interface AgentRepository extends JpaRepository<Agent, String> {
    List<Agent> findBySessionId(String sessionId);
}