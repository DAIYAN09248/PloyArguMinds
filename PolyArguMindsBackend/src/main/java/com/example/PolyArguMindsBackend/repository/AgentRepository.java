package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Agent;
import com.example.PolyArguMindsBackend.model.enums.AgentRole;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentRepository extends MongoRepository<Agent, String> {
    List<Agent> findBySessionId(String sessionId);

    Optional<Agent> findBySessionIdAndRole(String sessionId, AgentRole role);

    void deleteBySessionId(String sessionId);
}