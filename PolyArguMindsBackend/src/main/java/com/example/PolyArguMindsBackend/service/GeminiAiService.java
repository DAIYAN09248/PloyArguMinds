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

    @org.springframework.beans.factory.annotation.Value("${gemini.model}")
    private String modelName;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key.pro}")
    private String apiKeyPro;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key.con}")
    private String apiKeyCon;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key.judge}")
    private String apiKeyJudge;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key.default}")
    private String apiKeyDefault;

    public String generateResponse(String systemPrompt, List<Message> history, AgentRole role) {

        // Determine API Key based on Role
        String currentApiKey = apiKeyDefault;
        if (role != null) {
            switch (role) {
                case PRO:
                    currentApiKey = apiKeyPro;
                    break;
                case CON:
                    currentApiKey = apiKeyCon;
                    break;
                case JUDGE:
                    currentApiKey = apiKeyJudge;
                    break;
                default:
                    currentApiKey = apiKeyDefault;
            }
        }

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
        requestBody.put("model", modelName);

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
        headers.set("Authorization", "Bearer " + currentApiKey);
        // OpenRouter optional headers
        headers.set("HTTP-Referer", "http://localhost:5173");
        headers.set("X-Title", "PolyArguMinds");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            System.out.println("🚀 Sending Prompt to OpenRouter (" + modelName + ")...\n");

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