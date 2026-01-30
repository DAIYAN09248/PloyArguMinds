package com.example.PolyArguMindsBackend.dto;

import com.example.PolyArguMindsBackend.model.enums.SessionMode;
import lombok.Data;

@Data
// DTO for starting a session
public class StartSessionRequest {
	private String topic;

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

	public Integer getTotalTurns() {
		return totalTurns;
	}

	public void setTotalTurns(Integer totalTurns) {
		this.totalTurns = totalTurns;
	}

	private SessionMode mode; // DEBATE or COLLABORATION

	private Integer totalTurns;

	// File Data
	private String fileName;
	private String fileType;
	private byte[] fileData;

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