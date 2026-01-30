package com.example.PolyArguMindsBackend.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class FileService {

    public String extractText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "";
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null) return "";

        String lowerCaseName = fileName.toLowerCase();

        try {
            if (lowerCaseName.endsWith(".pdf")) {
                return extractPdf(file);
            } else if (lowerCaseName.endsWith(".docx")) {
                return extractDocx(file);
            } else {
                return " [File Attached: " + fileName + " (Content extraction not supported for this file type)]";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return " [Error parsing file: " + e.getMessage() + "]";
        }
    }

    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractDocx(MultipartFile file) throws IOException {
        StringBuilder text = new StringBuilder();
        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            List<XWPFParagraph> paragraphs = document.getParagraphs();
            for (XWPFParagraph para : paragraphs) {
                text.append(para.getText()).append("\n");
            }
        }
        return text.toString();
    }
}
