/**
 * Multer Configuration Middleware
 * 
 * Configures multer for file upload handling with memory storage
 * for validation-first approach. Implements security measures
 * and integrates with our validation service.
 */

import multer from 'multer';
import { log } from '../utils/logger.js';
import FileValidationService from '../services/FileValidationService.js';

// Configure multer with memory storage for validation-first approach
const storage = multer.memoryStorage();

// File filter function for initial validation
const fileFilter = (req, file, cb) => {
  try {
    log.info(`Initial file filter check: ${file.originalname}`);
    
    // Check if filename has extension
    const extension = FileValidationService.extractExtension(file.originalname);
    
    // Check if extension is allowed
    if (!FileValidationService.ALLOWED_FILES[extension]) {
      const allowedExtensions = FileValidationService.getAllowedExtensions().join(', ');
      const error = new Error(`File extension not allowed. Allowed extensions: ${allowedExtensions}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    log.info(`File filter passed: ${file.originalname}`);
    cb(null, true);
    
  } catch (error) {
    log.warn(`File filter failed: ${error.message}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FileValidationService.getMaxFileSize(), // 5MB
    files: 1, // Only one file at a time
    fields: 10, // Limit form fields
    fieldNameSize: 50, // Limit field name size
    fieldSize: 1024 // Limit field value size (1KB)
  }
});

/**
 * Single file upload middleware
 * Expects field name 'image'
 */
export const uploadSingle = upload.single('image');

/**
 * Enhanced error handling middleware for multer errors
 */
export const handleMulterErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    log.warn(`Multer error: ${error.code} - ${error.message}`);
    
    let statusCode = 400;
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413;
        const maxSizeMB = FileValidationService.getMaxFileSize() / (1024 * 1024);
        message = `File too large. Maximum size allowed: ${maxSizeMB}MB`;
        break;
        
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file allowed per upload';
        break;
        
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name. Use "image" as the field name';
        break;
        
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many form fields';
        break;
        
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
        
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
        
      default:
        message = `Upload error: ${error.message}`;
    }
    
    return res.status(statusCode).json({
      error: message,
      code: error.code
    });
  }
  
  // Handle custom file filter errors
  if (error.code === 'INVALID_FILE_TYPE') {
    log.warn(`File type validation error: ${error.message}`);
    return res.status(400).json({
      error: error.message,
      code: error.code
    });
  }
  
  // Pass other errors to the main error handler
  next(error);
};

/**
 * Request validation middleware
 * Ensures proper multipart/form-data content type
 */
export const validateUploadRequest = (req, res, next) => {
  const contentType = req.get('Content-Type');
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    log.warn(`Invalid content type for upload: ${contentType}`);
    return res.status(400).json({
      error: 'Invalid content type',
      message: 'Please use multipart/form-data for file uploads',
      expected: 'Content-Type: multipart/form-data'
    });
  }
  
  log.info('Upload request validation passed');
  next();
};

/**
 * Combined upload middleware that handles the complete upload flow
 */
export const processFileUpload = (req, res, next) => {
  // First validate the request
  validateUploadRequest(req, res, (err) => {
    if (err) return;
    
    // Then process the upload
    uploadSingle(req, res, (uploadError) => {
      if (uploadError) {
        return handleMulterErrors(uploadError, req, res, next);
      }
      
      // Log successful upload processing
      if (req.file) {
        log.info(`File upload processed: ${req.file.originalname} (${req.file.size} bytes)`);
      }
      
      next();
    });
  });
};

/**
 * Middleware to log file upload attempts
 */
export const logUploadAttempt = (req, res, next) => {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const contentLength = req.get('Content-Length') || 'Unknown';
  
  log.info(`Upload attempt from ${req.ip} - Content-Length: ${contentLength} - User-Agent: ${userAgent}`);
  next();
};

// Export multer configuration for testing
export const multerConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: FileValidationService.getMaxFileSize(),
    files: 1,
    fields: 10,
    fieldNameSize: 50,
    fieldSize: 1024
  }
};

export default {
  uploadSingle,
  handleMulterErrors,
  validateUploadRequest,
  processFileUpload,
  logUploadAttempt,
  multerConfig
};