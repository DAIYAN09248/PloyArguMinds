package com.example.PolyArguMindsBackend.model;

import com.example.PolyArguMindsBackend.model.enums.AgentRole;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "agents")
public class Agent {

    @Id
    private String id;

    @Field("name")
    private String name;

    @Field("role")
    private AgentRole role;

    @Field("system_prompt")
    private String systemPrompt;

    @Field("session_id")
    private String sessionId;

    // --- STANDARD GETTERS AND SETTERS ---

    public Agent() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AgentRole getRole() {
        return role;
    }

    public void setRole(AgentRole role) {
        this.role = role;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public void setSystemPrompt(String systemPrompt) {
        this.systemPrompt = systemPrompt;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}