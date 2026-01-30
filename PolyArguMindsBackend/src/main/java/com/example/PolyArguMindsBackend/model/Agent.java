package com.example.PolyArguMindsBackend.model;

import com.example.PolyArguMindsBackend.model.enums.AgentRole;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "agents")
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AgentRole role;

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonBackReference
    private Session session;

    // --- STANDARD GETTERS AND SETTERS ---

    public Agent() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AgentRole getRole() { return role; }
    public void setRole(AgentRole role) { this.role = role; }

    public String getSystemPrompt() { return systemPrompt; }
    public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }

    public Session getSession() { return session; }
    public void setSession(Session session) { this.session = session; }
}