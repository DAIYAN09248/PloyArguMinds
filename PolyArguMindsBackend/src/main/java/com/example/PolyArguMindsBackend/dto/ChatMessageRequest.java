package com.example.PolyArguMindsBackend.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String sessionId;
    private String content; // The user's input
	public String getSessionId() {
		return sessionId;
	}
	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}
	public String getContent() {
		return content;
	}
	public void setContent(String content) {
		this.content = content;
	}
}