package com.example.PolyArguMindsBackend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "messages")
public class Message {

    @Id
    private String id;

    @Field("sender_name")
    private String senderName;

    @Field("content")
    private String content;

    @Field("is_ai")
    private boolean isAi;

    @Field("timestamp")
    private LocalDateTime timestamp = LocalDateTime.now();

    @Field("session_id")
    private String sessionId;

    public Message() {
        this.timestamp = LocalDateTime.now();
    }

    // --- STANDARD GETTERS AND SETTERS ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public boolean isAi() {
        return isAi;
    }

    public void setAi(boolean isAi) {
        this.isAi = isAi;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}