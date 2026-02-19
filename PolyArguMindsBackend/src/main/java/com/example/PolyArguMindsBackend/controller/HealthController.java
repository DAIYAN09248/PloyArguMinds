package com.example.PolyArguMindsBackend.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "*")
public class HealthController {

    @GetMapping("/api/health")
    public String health() {
        return "OK";
    }
}
