package com.example.PolyArguMindsBackend.model;

import com.example.PolyArguMindsBackend.model.enums.SessionMode;
import com.example.PolyArguMindsBackend.model.enums.SessionStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "sessions")
public class Session {

    @Id
    private String id;

    @Field("topic")
    private String topic;

    @Field("mode")
    private SessionMode mode;

    @Field("status")
    private SessionStatus status;

    @Field("start_time")
    private LocalDateTime startTime;

    @Field("end_time")
    private LocalDateTime endTime;

    @Field("max_turns")
    private Integer maxTurns;

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // --- FILE PERSISTENCE ---
    @Field("file_name")
    private String fileName;

    @Field("file_type")
    private String fileType;

    @Field("file_data")
    private byte[] fileData;

    // Relationships removed for MongoDB referencing pattern
    // Agents and Messages will store sessionId

    public Session() {
        this.status = SessionStatus.CREATED;
        this.createdAt = LocalDateTime.now();
    }

    // --- STANDARD GETTERS AND SETTERS ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public SessionMode getMode() {
        return mode;
    }

    public void setMode(SessionMode mode) {
        this.mode = mode;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public Integer getMaxTurns() {
        return maxTurns;
    }

    public void setMaxTurns(Integer maxTurns) {
        this.maxTurns = maxTurns;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public byte[] getFileData() {
        return fileData;
    }

    public void setFileData(byte[] fileData) {
        this.fileData = fileData;
    }
}