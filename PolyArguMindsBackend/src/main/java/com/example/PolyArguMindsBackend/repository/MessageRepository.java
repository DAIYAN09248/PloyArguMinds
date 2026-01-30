package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Changed <Message, Long> to <Message, String>
@Repository
public interface MessageRepository extends JpaRepository<Message, String> {
    // Ensuring the method signature accepts String sessionId
    List<Message> findBySessionIdOrderByTimestampAsc(String sessionId);

    long countBySessionId(String sessionId);

    long countBySessionIdAndSenderNameNotIn(String sessionId, java.util.Collection<String> excludedNames);
}