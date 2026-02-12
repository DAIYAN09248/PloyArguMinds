package com.example.PolyArguMindsBackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Apply to all endpoints
                .allowedOrigins("http://localhost:5173", "http://localhost:3000", "*") // Explicitly allow frontend
                                                                                       // origin
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Explicitly allow DELETE
                .allowedHeaders("*")
                .allowCredentials(false) // Set to true if you strictly specify origins (not *)
                .maxAge(3600);
    }
}
