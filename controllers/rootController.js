/**
 * Root Controller
 * Handles root endpoints and API documentation
 */

import { log } from '../utils/logger.js';

// Welcome endpoint - Root path handler
export const welcome = (req, res) => {
  log.info(`Welcome endpoint accessed from ${req.ip}`);
  
  res.json({
    message: "¡Hola! 👋😁 Welcome to the Enterprise File Upload Service",
    subtitle: "Because your files deserve better treatment",
    remember: "Entrete nunca es malo... y siempre es bueno! 😎",
    // Fancy COOL reference
    poweredBy: {
      name: "COOL Logger",
      fullName: "Completely Organized Outstanding Logger",
      description: "Making logs beautiful, one color at a time... 💃",
      features: ["ANSI colored output", "Multiple log levels", "Future file logging support"]
    },
    
    // Minimal endpoints documentation
    quickStart: {
      "Upload": "POST /images (multipart/form-data)",
      "Delete": "DELETE /images/:filename", 
      "Health": "GET /health",
      "Docs  ": "GET /api"
    },
    
    info: {
      version: "1.0.0",
      environment: process.env.NODE_ENV || 'development',
      uptime: `${Math.floor(process.uptime())}s`,
      features: "Enterprise-grade • Transactional • Secure"
    },
    
    tip: "Pro tip: Check GET /api for complete documentation 📚"
  });
};

// Health check endpoint
export const healthCheck = (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
};

// API documentation endpoint
export const getApiDocumentation = (req, res) => {
  res.json({
    name: 'M8.AE3 File Upload API',
    version: '1.0.0',
    description: 'Enterprise file upload service with transactional operations',
    endpoints: {
      'POST /images': 'Upload and validate files with MIME type verification',
      'DELETE /images/:filename': 'Delete files with transactional rollback',
      'GET /health': 'Service health check',
      'GET /api': 'This documentation'
    },
    features: [
      'MIME type validation against file signatures',
      'Database-backed metadata management', 
      'Transactional file operations',
      'Cleanup queue for consistency',
      'Memory validation before disk writes'
    ],
    security: [
      'File signature verification',
      'Extension and MIME type cross-validation',
      'Size limits (5MB maximum)',
      'Memory-first validation approach'
    ],
    usage: {
      'File Upload': 'POST /images with multipart/form-data, field name: "image"',
      'File Delete': 'DELETE /images/{filename} where filename is the server-generated name',
      'Supported Types': ['.jpg', '.png', '.gif', '.pdf', '.txt'],
      'Max Size': '5MB per file'
    }
  });
};