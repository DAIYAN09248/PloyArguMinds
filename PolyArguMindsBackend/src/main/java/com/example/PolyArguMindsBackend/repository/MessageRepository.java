package com.example.PolyArguMindsBackend.repository;

import com.example.PolyArguMindsBackend.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findBySessionIdOrderByTimestampAsc(String sessionId);

    long countBySessionId(String sessionId);

    long countBySessionIdAndSenderNameNotIn(String sessionId, java.util.Collection<String> excludedNames);

    void deleteBySessionId(String sessionId);
}