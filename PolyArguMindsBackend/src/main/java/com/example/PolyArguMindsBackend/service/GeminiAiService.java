package com.example.PolyArguMindsBackend.service;

import com.example.PolyArguMindsBackend.model.Message;
import com.example.PolyArguMindsBackend.model.enums.AgentRole;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.*;

@Service
public class GeminiAiService {

    private final RestTemplate restTemplate = new RestTemplate();

    // Configuration for OpenRouter (OpenAI Compatible)
    private static final String API_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final String MODEL_NAME = "liquid/lfm-2.5-1.2b-instruct:free";
    private static final String API_KEY = "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";

    public String generateResponse(String systemPrompt, List<Message> history, AgentRole role) {

        // 1. Construct the Conversation Context
        StringBuilder fullContext = new StringBuilder();

        // STRICT SYSTEM INSTRUCTION (Injecting into context string for clarity for
        // these small models)
        fullContext.append("### SYSTEM INSTRUCTION ###\n");
        fullContext.append(systemPrompt).append("\n\n");

        // HISTORY
        fullContext.append("### CONVERSATION HISTORY ###\n");
        for (Message msg : history) {
            String sender = msg.getSenderName();
            String content = msg.getContent();
            fullContext.append(sender).append(": ").append(content).append("\n");
        }

        // TRIGGER
        fullContext.append("\n### YOUR RESPONSE ###\n");
        fullContext.append("Response:");

        // 2. Build JSON Payload for OpenRouter/OpenAI
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", MODEL_NAME);

        // OpenRouter uses 'messages' array
        List<Map<String, String>> messages = new ArrayList<>();
        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", fullContext.toString());
        messages.add(userMessage);

        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.7);

        // 3. Send Request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + API_KEY);
        // OpenRouter optional headers
        headers.set("HTTP-Referer", "http://localhost:5173");
        headers.set("X-Title", "PolyArguMinds");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            System.out.println("🚀 Sending Prompt to OpenRouter (" + MODEL_NAME + ")...\n");

            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, entity, Map.class);
            return extractTextFromOpenRouterResponse(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return "Error calling OpenRouter: " + e.getMessage();
        }
    }

    private String extractTextFromOpenRouterResponse(Map responseBody) {
        try {
            if (responseBody == null)
                return "";

            // OpenRouter/OpenAI returns { "choices": [ { "message": { "content": "..." } }
            // ] }
            List choices = (List) responseBody.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map firstChoice = (Map) choices.get(0);
                Map message = (Map) firstChoice.get("message");
                if (message != null) {
                    return (String) message.get("content");
                }
            }
            return "";
        } catch (Exception e) {
            return "Error parsing OpenRouter response.";
        }
    }
}