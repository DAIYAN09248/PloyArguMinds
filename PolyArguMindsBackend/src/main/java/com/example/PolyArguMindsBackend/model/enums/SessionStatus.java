package com.example.PolyArguMindsBackend.model.enums;

public enum SessionStatus {
    CREATED,    // Setup complete, waiting to start
    ACTIVE,     // Discussion in progress
    COMPLETED,  // Finished naturally (time/rounds)
    TERMINATED  // Forced stop
}