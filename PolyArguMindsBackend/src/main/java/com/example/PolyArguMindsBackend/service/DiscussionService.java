package com.example.PolyArguMindsBackend.service;

import com.example.PolyArguMindsBackend.dto.StartSessionRequest;
import com.example.PolyArguMindsBackend.model.Agent;
import com.example.PolyArguMindsBackend.model.Message;
import com.example.PolyArguMindsBackend.model.Session;
import com.example.PolyArguMindsBackend.model.enums.AgentRole;
import com.example.PolyArguMindsBackend.model.enums.SessionMode;
import com.example.PolyArguMindsBackend.model.enums.SessionStatus;
import com.example.PolyArguMindsBackend.repository.AgentRepository;
import com.example.PolyArguMindsBackend.repository.MessageRepository;
import com.example.PolyArguMindsBackend.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Service
public class DiscussionService {

    // Service to manage discussion sessions
    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private GeminiAiService geminiAiService;

    // --- PROMPTS (UPDATED FOR GOVERNANCE) ---
    private static final String PROMPT_PRO = "You are the PRO debater. Your goal is to convince the audience that the statement is TRUE. You MUST argue IN FAVOR of the topic: '%s'. Plan your response to form a complete logical unit with a clear claim, supporting reasoning, and conclusion. Use **bold** for key sub-topics or emphasis. IMPORTANT: Do NOT declare a winner. Do NOT judge the debate. Focus only on your arguments.";
    private static final String PROMPT_CON = "You are the CON debater. Your goal is to convince the audience that the statement is FALSE. You MUST argue AGAINST the topic: '%s'. Plan your response to form a complete logical unit with a clear claim, supporting reasoning, and conclusion. Use **bold** for key sub-topics or emphasis. IMPORTANT: Do NOT declare a winner. Do NOT judge the debate. Focus only on your counter-arguments.";
    private static final String PROMPT_JUDGE = "You are the Judge. The debate is ending. Your task is to DECLARE A WINNER immediately based on the history so far. 1. Summarize the key points using **bold** headers. 2. Declare the winner (ProBot or ConBot) based on logic and persuasion. 3. Format your final line: 'WINNER: [Name]'. Do NOT ask for more arguments. This is final.";

    private static final String PROMPT_ANALYST = "You are LogicLens, a data-driven Analyst. Analyze the topic: '%s'. Focus on feasibility, facts, constraints, and logical steps. Plan your response to form a complete logical unit. Use **bold** for key sub-topics. Do NOT wrap up the session.";
    private static final String PROMPT_CREATIVE = "You are IdeaSpark, a Creative Thinker. Brainstorm solutions for: '%s'. Think outside the box, suggest innovative features. Be inspiring. Plan your response to form a complete logical unit. Use **bold** for key sub-topics. Do NOT wrap up the session.";
    private static final String PROMPT_SUMMARIZER = "You are the Session Summarizer. The session is ending. Create a 'Discussion Summary Report'. 1. List Top Ideas. 2. List Key Risks. 3. Provide an Action Plan. Use **bold** for headers. This is the final output.";

    @Transactional
    public Session startSession(StartSessionRequest request) {
        Session session = new Session();
        session.setTopic(request.getTopic());
        session.setMode(request.getMode());

        // Initialize Turn Budget (Default to 20 if null)
        // Initialize Turn Budget
        // User Input "5 turns" means "5 turns for EACH bot" (i.e. 5 Rounds).
        // So we store Total System Turns = Input * 2.
        Integer rounds = request.getTotalTurns();
        if (rounds == null || rounds <= 0) {
            rounds = 10; // Default 10 rounds -> 20 turns
        }
        session.setMaxTurns(rounds * 2);

        session.setStatus(SessionStatus.ACTIVE);
        session.setStartTime(LocalDateTime.now());

        // Save File Data
        if (request.getFileName() != null) {
            session.setFileName(request.getFileName());
            session.setFileType(request.getFileType());
            session.setFileData(request.getFileData());
        }

        session = sessionRepository.save(session);

        List<Agent> agents = new ArrayList<>();
        if (request.getMode() == SessionMode.DEBATE) {
            agents.add(createAgent(session, "ProBot", AgentRole.PRO, String.format(PROMPT_PRO, request.getTopic())));
            agents.add(createAgent(session, "ConBot", AgentRole.CON, String.format(PROMPT_CON, request.getTopic())));
            agents.add(createAgent(session, "JudgeDredd", AgentRole.JUDGE, PROMPT_JUDGE));
        } else {
            agents.add(createAgent(session, "LogicLens", AgentRole.ANALYST,
                    String.format(PROMPT_ANALYST, request.getTopic())));
            agents.add(createAgent(session, "IdeaSpark", AgentRole.CREATIVE,
                    String.format(PROMPT_CREATIVE, request.getTopic())));
            agents.add(createAgent(session, "WrapUp", AgentRole.SUMMARIZER, PROMPT_SUMMARIZER));
        }
        agentRepository.saveAll(agents);

        return session;
    }

    // --- NEW: SAVE USER MESSAGE (THIS WAS MISSING) ---
    @Transactional
    public Message saveUserMessage(String sessionId, String content) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new RuntimeException("Session is closed");
        }

        Message userMsg = new Message();
        userMsg.setSession(session);
        userMsg.setSenderName("You"); // Or "User"
        userMsg.setContent(content);
        userMsg.setAi(false); // Mark as User
        userMsg.setTimestamp(LocalDateTime.now());

        return messageRepository.save(userMsg);
    }
    // -------------------------------------------------

    @Transactional
    public Session extendSession(String sessionId, int extraMinutes) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.COMPLETED) {
            session.setStatus(SessionStatus.ACTIVE);
            session.setEndTime(null);
        }

        // EXTEND TURN BUDGET
        int currentLimit = (session.getMaxTurns() != null) ? session.getMaxTurns() : 20;
        // Interpret input as "Extra Rounds" (Turns per bot)
        session.setMaxTurns(currentLimit + (extraMinutes * 2));

        // Insert System Divider
        Message systemMsg = new Message();
        systemMsg.setSession(session);
        systemMsg.setSenderName("System");
        systemMsg.setContent("--- SESSION EXTENDED BY USER (+" + extraMinutes + " Rounds) ---");
        systemMsg.setAi(false); // Or true, but SenderName System logic is key
        systemMsg.setTimestamp(LocalDateTime.now());
        messageRepository.save(systemMsg);

        return sessionRepository.save(session);
    }

    @Transactional
    public Message endSessionEarly(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new RuntimeException("Session is already completed.");
        }

        AgentRole summaryRole = (session.getMode() == SessionMode.DEBATE) ? AgentRole.JUDGE : AgentRole.SUMMARIZER;

        // Force the summary generation
        Message summaryMsg = triggerAgentResponse(sessionId, summaryRole);

        // Close Session
        session.setEndTime(LocalDateTime.now());
        session.setStatus(SessionStatus.COMPLETED);
        sessionRepository.save(session);

        return summaryMsg;
    }

    @Transactional
    public Message proceedWithConversation(String sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.COMPLETED)
            return null;

        // Check Turn Limit (Excluding Judge, WrapUp, System, and User)
        long currentTurnCount = messageRepository.countBySessionIdAndSenderNameNotIn(sessionId,
                Arrays.asList("JudgeDredd", "WrapUp", "System", "You", "User"));
        boolean isTurnLimitReached = (currentTurnCount >= session.getMaxTurns());

        // 1. AUTO START: If no messages, start the first agent
        List<Message> history = messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
        if (history.isEmpty()) {
            if (session.getMode() == SessionMode.DEBATE)
                return triggerAgentResponse(sessionId, AgentRole.PRO);
            else
                return triggerAgentResponse(sessionId, AgentRole.ANALYST);
        }

        // Find Last RELEVANT Message (Ignore "System" and "User" for turn logic)
        Message lastMessage = null;
        for (int i = history.size() - 1; i >= 0; i--) {
            String sender = history.get(i).getSenderName();
            if (!sender.equals("System") && !sender.equals("You") && !sender.equals("User")) {
                lastMessage = history.get(i);
                break;
            }
        }

        // If no relevant bot message found (e.g. User spoke first), start fresh
        if (lastMessage == null) {
            if (session.getMode() == SessionMode.DEBATE)
                return triggerAgentResponse(sessionId, AgentRole.PRO);
            else
                return triggerAgentResponse(sessionId, AgentRole.ANALYST);
        }

        String lastSender = lastMessage.getSenderName();

        // 2. TURN LIMIT LOGIC (Triggers End)
        if (isTurnLimitReached) {
            // Only trigger the Judge if he hasn't spoken yet to avoid loops
            if (!lastSender.equals("JudgeDredd") && !lastSender.equals("WrapUp")) {
                return endSessionEarly(sessionId);
            }
            // If Judge just spoke, we do nothing (Lifecycle logic elsewhere ensures
            // strictly closed)
            if (lastSender.equals("JudgeDredd") || lastSender.equals("WrapUp")) {
                if (session.getStatus() != SessionStatus.COMPLETED) {
                    session.setStatus(SessionStatus.COMPLETED);
                    sessionRepository.save(session);
                }
                return null;
            }
            return null;
        }

        // 3. STANDARD TURN LOGIC (UPDATED WITH ROUND SYSTEM)
        int turnNumber = (int) currentTurnCount + 1;
        String roundInstruction = getInstructionForRound(turnNumber, session.getMaxTurns());

        if (session.getMode() == SessionMode.DEBATE) {
            // FIX: If Judge spoke last (Resumed Session), restart with PRO
            // FIX: If Judge spoke last, the session should be over.
            // If Judge spoke last (but we are here, so we have turns left -> Extended
            // Session),
            // we restart the cycle with PRO.
            if (lastSender.equals("JudgeDredd")) {
                return triggerAgentResponseWithOverride(sessionId, AgentRole.PRO, roundInstruction);
            }

            // Cycle: Pro -> Con -> Pro
            if (lastSender.equals("ProBot"))
                return triggerAgentResponseWithOverride(sessionId, AgentRole.CON, roundInstruction);
            if (lastSender.equals("ConBot"))
                return triggerAgentResponseWithOverride(sessionId, AgentRole.PRO, roundInstruction);

        } else {
            // FIX: If WrapUp spoke last (Resumed Session), restart with ANALYST
            // FIX: If WrapUp spoke last, the session should be over.
            // If WrapUp spoke last (Extended Session), restart with LOGIC
            if (lastSender.equals("WrapUp")) {
                return triggerAgentResponseWithOverride(sessionId, AgentRole.ANALYST, roundInstruction);
            }

            // Cycle: Logic -> Idea -> Logic
            if (lastSender.equals("LogicLens"))
                return triggerAgentResponseWithOverride(sessionId, AgentRole.CREATIVE, roundInstruction);
            if (lastSender.equals("IdeaSpark"))
                return triggerAgentResponseWithOverride(sessionId, AgentRole.ANALYST, roundInstruction);
        }

        return null;
    }

    private String getInstructionForRound(int turnNumber, int totalTurns) {
        // Dynamic Phases based on percentages of total turns

        // Phase 1: Opening (First 25%)
        if (turnNumber <= totalTurns * 0.25) {
            return "SYSTEM INSTRUCTION: Define your terms clearly and state your core ethical or logical premise. Do not get bogged down in details yet.";
        }
        // Phase 2: Evidence (Next 50% -> 25% to 75%)
        else if (turnNumber <= totalTurns * 0.75) {
            return "SYSTEM INSTRUCTION: You MUST introduce a concrete real-world example, case study, or historical precedent to support your claim. Abstract philosophy is NOT allowed in this turn.";
        }
        // Phase 3: Closing / Clash (Last 25%)
        else {
            return "SYSTEM INSTRUCTION: Identify a specific logical fallacy or factual error in the opponent's last message. direct your entire argument to dismantling that specific point. Do NOT just repeat your previous claims.";
        }
    }

    @Transactional
    public Message triggerAgentResponse(String sessionId, AgentRole role) {
        return triggerAgentResponseWithOverride(sessionId, role, null);
    }

    // --- GOVERNANCE: REPETITION CHECK ---
    private boolean isRepetitive(String newResponse, List<Message> history, String senderName) {
        if (history.isEmpty())
            return false;

        // Check last 3 messages from THIS agent
        List<Message> agentHistory = new ArrayList<>();
        for (Message m : history) {
            if (m.getSenderName().equals(senderName)) {
                agentHistory.add(m);
            }
        }

        if (agentHistory.isEmpty())
            return false;

        // Check against last 3
        int start = Math.max(0, agentHistory.size() - 3);
        List<Message> recentMessages = agentHistory.subList(start, agentHistory.size());

        Set<String> newWords = new HashSet<>(Arrays.asList(newResponse.toLowerCase().split("\\s+")));

        for (Message oldMsg : recentMessages) {
            Set<String> oldWords = new HashSet<>(Arrays.asList(oldMsg.getContent().toLowerCase().split("\\s+")));
            Set<String> intersection = new HashSet<>(newWords);
            intersection.retainAll(oldWords);
            Set<String> union = new HashSet<>(newWords);
            union.addAll(oldWords);

            if (union.isEmpty())
                continue;

            double similarity = (double) intersection.size() / union.size();
            if (similarity > 0.6)
                return true; // Stricter threshold check
        }
        return false;
    }

    @Transactional
    public Message triggerAgentResponseWithOverride(String sessionId, AgentRole role, String instructionOverride) {
        Session session = sessionRepository.findById(sessionId).orElseThrow();

        // 1. STRICT TERMINAL CHECK
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new RuntimeException("Session is CLOSED. No further agent responses allowed.");
        }

        // --- GOVERNANCE: TURN LIMIT ---
        // Count total messages (User + AI)
        // --- GOVERNANCE: TURN LIMIT ---
        // Double check against maxTurns from DB
        // --- GOVERNANCE: TURN LIMIT ---
        // Double check against maxTurns from DB (Excluding Judge/WrapUp/System/User)
        long currentTurnCount = messageRepository.countBySessionIdAndSenderNameNotIn(sessionId,
                Arrays.asList("JudgeDredd", "WrapUp", "System", "You", "User"));
        int maxTurns = (session.getMaxTurns() != null) ? session.getMaxTurns() : 20;

        if (currentTurnCount >= maxTurns) {
            // Force End if limit reached (unless it's already ending)
            if (role != AgentRole.JUDGE && role != AgentRole.SUMMARIZER) {
                return endSessionEarly(sessionId);
            }
        }

        Agent agent = agentRepository.findBySessionId(sessionId).stream()
                .filter(a -> a.getRole() == role)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Agent role not found: " + role));

        List<Message> history = messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);

        // Append override instruction to the system prompt if present
        String finalPrompt = agent.getSystemPrompt();
        if (instructionOverride != null && !instructionOverride.isEmpty()) {
            finalPrompt += "\n\n" + instructionOverride;
        }

        String aiResponseText = geminiAiService.generateResponse(finalPrompt, history, role);

        // --- GOVERNANCE: VALIDATION LOOP (LENGTH + NOVELTY) ---
        int maxRetries = 2;
        int retryCount = 0;

        while (retryCount < maxRetries) {
            boolean repetitionError = isRepetitive(aiResponseText, history, agent.getName());

            if (!repetitionError) {
                break; // Validation Passed
            }

            StringBuilder retryInstruction = new StringBuilder();
            retryInstruction.append("SYSTEM ALERT: Your previous response was rejected.");

            if (repetitionError) {
                retryInstruction.append(" It was too similar to your previous turns. ")
                        .append("You MUST provide a NOVEL argument or a different perspective/insight. Do not repeat yourself.");
            }

            // Regenerate with rebuke
            String retryPrompt = finalPrompt + "\n\n" + retryInstruction.toString();
            aiResponseText = geminiAiService.generateResponse(retryPrompt, history, role);
            retryCount++;
        }

        // HARD TRUNCATE REMOVED per user request
        // (Previously truncated at 200 words)

        // --- CLEANUP: STRIP SYSTEM ARTIFACTS ---
        aiResponseText = aiResponseText
                .replaceAll("(?i)^(ConBot:|ProBot:|LogicLens:|IdeaSpark:|WrapUp:|JudgeDredd:)\\s*", "");
        aiResponseText = aiResponseText.replaceAll("(?i)SYSTEM ALERT:.*", "");
        aiResponseText = aiResponseText.replaceAll("(?i)### YOUR RESPONSE ###.*", "");
        aiResponseText = aiResponseText.replaceAll("(?i)Response:\\s*", "");
        aiResponseText = aiResponseText.trim();

        Message aiMsg = new Message();
        aiMsg.setSession(session);
        aiMsg.setSenderName(agent.getName());
        aiMsg.setContent(aiResponseText);
        aiMsg.setAi(true);
        aiMsg.setTimestamp(LocalDateTime.now());

        return messageRepository.save(aiMsg);
    }

    public List<Message> getHistory(String sessionId) {
        return messageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    public Session getSessionById(String sessionId) {
        return sessionRepository.findById(sessionId).orElse(null);
    }

    // EXCLUDE FILE DATA FOR LIST VIEW TO SAVE BANDWIDTH
    public List<Session> getAllSessions() {
        List<Session> sessions = sessionRepository.findAllByOrderByCreatedAtDesc();
        sessions.forEach(s -> s.setFileData(null));
        return sessions;
    }

    private Agent createAgent(Session session, String name, AgentRole role, String prompt) {
        Agent agent = new Agent();
        agent.setSession(session);
        agent.setName(name);
        agent.setRole(role);
        agent.setSystemPrompt(prompt);
        return agent;
    }
}