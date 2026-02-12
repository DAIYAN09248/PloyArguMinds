package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

// Changed <Session, Long> to <Session, String>
@Repository
public interface SessionRepository extends MongoRepository<Session, String> {
    java.util.List<Session> findAllByOrderByCreatedAtDesc();
}