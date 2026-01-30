package com.example.PolyArguMindsBackend.dto;

public class UserMessageRequest {
    private String sessionId;
    private String content;

    // Getters
    public String getSessionId() {
        return sessionId;
    }

    public String getContent() {
        return content;
    }

    // Setters
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public void setContent(String content) {
        this.content = content;
    }
}