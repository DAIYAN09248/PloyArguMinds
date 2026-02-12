package com.example.PolyArguMindsBackend.controller;

import com.example.PolyArguMindsBackend.dto.StartSessionRequest;
import com.example.PolyArguMindsBackend.dto.UserMessageRequest; // Make sure to create this DTO
import com.example.PolyArguMindsBackend.model.Message;
import com.example.PolyArguMindsBackend.model.Session;
import com.example.PolyArguMindsBackend.service.DiscussionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discussion")
@CrossOrigin(origins = "*") // Allow frontend access
public class DiscussionController {

    @Autowired
    private DiscussionService discussionService;

    @Autowired
    private com.example.PolyArguMindsBackend.service.FileService fileService;

    // --- START SESSION ---
    @PostMapping("/start")
    public ResponseEntity<Session> startSession(@RequestBody StartSessionRequest request) {
        return ResponseEntity.ok(discussionService.startSession(request));
    }

    // --- START SESSION WITH FILE ---
    @PostMapping(value = "/start-with-file", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Session> startSessionWithFile(
            @RequestParam("topic") String topic,
            @RequestParam("mode") com.example.PolyArguMindsBackend.model.enums.SessionMode mode,
            @RequestParam(value = "totalTurns", required = false, defaultValue = "10") int totalTurns,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        StringBuilder fullTopic = new StringBuilder(topic);

        if (file != null && !file.isEmpty()) {
            String extractedText = fileService.extractText(file);
            // Limit context size if needed, but for now append all
            fullTopic.append("\n\n[Context from File (").append(file.getOriginalFilename()).append(")]:\n")
                    .append(extractedText);
        }

        StartSessionRequest request = new StartSessionRequest();
        request.setTopic(fullTopic.toString());
        request.setMode(mode);
        request.setTotalTurns(totalTurns);

        // Populate File Data for Persistence
        if (file != null && !file.isEmpty()) {
            try {
                request.setFileName(file.getOriginalFilename());
                request.setFileType(file.getContentType());
                request.setFileData(file.getBytes());
            } catch (java.io.IOException e) {
                e.printStackTrace();
            }
        }

        return ResponseEntity.ok(discussionService.startSession(request));
    }

    // --- DOWNLOAD FILE ---
    @GetMapping("/{sessionId}/file")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFile(@PathVariable String sessionId) {
        Session session = discussionService.getSessionById(sessionId); // Ensure this method exists or use repo
        if (session == null || session.getFileData() == null) {
            return ResponseEntity.notFound().build();
        }

        org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(
                session.getFileData());

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + session.getFileName() + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType(
                        session.getFileType() != null ? session.getFileType() : "application/octet-stream"))
                .body(resource);
    }

    // --- AUTOMATION LOOP (Next Turn) ---
    @PostMapping("/{sessionId}/next-turn")
    public ResponseEntity<Message> triggerNextTurn(@PathVariable String sessionId) {
        try {
            Message response = discussionService.proceedWithConversation(sessionId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // --- USER INTERACTION (Missing in your code!) ---
    @PostMapping("/send")
    public ResponseEntity<Message> sendUserMessage(@RequestBody UserMessageRequest request) {
        try {
            // Check if DiscussionService has this method (see Step 3 below)
            Message savedMsg = discussionService.saveUserMessage(request.getSessionId(), request.getContent());
            return ResponseEntity.ok(savedMsg);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // --- EXTEND SESSION ---
    @PostMapping("/{sessionId}/extend")
    public ResponseEntity<Session> extendSession(@PathVariable String sessionId,
            @RequestParam("extraMinutes") int extraMinutes) {
        try {
            return ResponseEntity.ok(discussionService.extendSession(sessionId, extraMinutes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // --- END SESSION & SUMMARIZE ---
    @PostMapping("/{sessionId}/end")
    public ResponseEntity<Message> endSession(@PathVariable String sessionId) {
        try {
            Message summary = discussionService.endSessionEarly(sessionId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // --- FETCH HISTORY ---
    @GetMapping("/sessions")
    public ResponseEntity<List<Session>> getAllSessions() {
        return ResponseEntity.ok(discussionService.getAllSessions());
    }

    @GetMapping("/{sessionId}/history")
    public ResponseEntity<List<Message>> getHistory(@PathVariable String sessionId) {
        return ResponseEntity.ok(discussionService.getHistory(sessionId));
    }

    // --- DELETE SESSION ---
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable String sessionId) {
        try {
            discussionService.deleteSession(sessionId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}