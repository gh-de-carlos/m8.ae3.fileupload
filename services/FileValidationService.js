/**
 * File Validation Service
 * 
 * Handles all file validation logic including MIME type verification,
 * file signature validation, size checks, and extension validation.
 * Implements security-first approach with "no trust" principle.
 */

import mime from 'mime-types';
import { log } from '../utils/logger.js';
import { FILE_LIMITS, SECURITY } from '../config/constants/index.js';

export class FileValidationService {
  // Import configuration from centralized constants
  static ALLOWED_FILES = SECURITY.ALLOWED_FILE_TYPES;
  static MAX_FILE_SIZE = FILE_LIMITS.MAX_FILE_SIZE;
  static FILE_SIGNATURES = SECURITY.FILE_SIGNATURES;

  /**
   * Validate complete file including size, extension, MIME type, and signature
   */
  static async validateFile(file) {
    log.info(`Starting validation for file: ${file.originalname}`);

    // 1. Size validation
    this.validateFileSize(file);

    // 2. Extension validation
    const extension = this.validateExtension(file.originalname);

    // 3. MIME type validation
    const detectedMimeType = this.validateMimeType(file);

    // 4. Cross-validation: extension vs MIME type
    this.crossValidateExtensionAndMime(extension, detectedMimeType);

    // 5. File signature validation
    await this.validateFileSignature(file, detectedMimeType);

    log.pass(`File validation successful: ${file.originalname}`);
    return {
      isValid: true,
      extension,
      mimeType: detectedMimeType,
      size: file.size
    };
  }

  /**
   * Validates file size
   */
  static validateFileSize(buffer) {
    if (buffer.length > FILE_LIMITS.MAX_FILE_SIZE) {
      const sizeMB = (buffer.length / FILE_LIMITS.BYTES_PER_MB).toFixed(2);
      const maxSizeMB = (FILE_LIMITS.MAX_FILE_SIZE / FILE_LIMITS.BYTES_PER_MB).toFixed(2);
      
      log(`File size validation failed: ${sizeMB}MB exceeds ${maxSizeMB}MB limit`, 'error');
      return {
        isValid: false,
        error: `File size ${sizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
        errorCode: 'FILE_TOO_LARGE'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate file extension
   */
  static validateExtension(filename) {
    const extension = this.extractExtension(filename);
    
    if (!this.ALLOWED_FILES[extension]) {
      log.warn(`Invalid extension detected: ${extension}`);
      const allowedExtensions = Object.keys(this.ALLOWED_FILES).join(', ');
      const error = new Error(`File extension not allowed. Allowed extensions: ${allowedExtensions}`);
      error.statusCode = 400;
      throw error;
    }

    log.info(`Extension validation passed: ${extension}`);
    return extension;
  }

  /**
   * Validate MIME type using mime-types library
   */
  static validateMimeType(file) {
    const detectedMimeType = mime.lookup(file.originalname);
    
    if (!detectedMimeType) {
      log.warn(`Could not determine MIME type for: ${file.originalname}`);
      const error = new Error('Could not determine file type');
      error.statusCode = 400;
      throw error;
    }

    log.info(`MIME type detected: ${detectedMimeType}`);
    return detectedMimeType;
  }

  /**
   * Cross-validate extension and MIME type consistency
   */
  static crossValidateExtensionAndMime(extension, mimeType) {
    const allowedMimeTypes = this.ALLOWED_FILES[extension];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      log.warn(`Extension/MIME mismatch: ${extension} vs ${mimeType}`);
      const error = new Error('¿Te creí hacker acaso?');
      error.statusCode = 400;
      throw error;
    }

    log.info(`Extension/MIME cross-validation passed`);
  }

  /**
   * Validate file signature (magic numbers)
   */
  static async validateFileSignature(file, expectedMimeType) {
    const signatures = this.FILE_SIGNATURES[expectedMimeType];
    
    // Skip signature validation for text files
    if (!signatures || signatures.length === 0) {
      log.info('Skipping signature validation for text file');
      return;
    }

    const buffer = file.buffer;
    let signatureMatch = false;

    for (const signature of signatures) {
      if (this.bufferStartsWith(buffer, signature)) {
        signatureMatch = true;
        break;
      }
    }

    if (!signatureMatch) {
      log.warn(` File signature validation failed for MIME type: ${expectedMimeType}`);
      const error = new Error('¿Te creí hacker acaso?');
      error.statusCode = 400;
      throw error;
    }

    log.info('File signature validation passed');
  }

  /**
   * Check if buffer starts with specific byte sequence
   */
  static bufferStartsWith(buffer, signature) {
    if (buffer.length < signature.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    
    return true;
  }

  /**
   * Extract file extension from filename
   */
  static extractExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      const error = new Error('File must have a valid extension');
      error.statusCode = 400;
      throw error;
    }
    
    return filename.substring(lastDot).toLowerCase();
  }

  /**
   * Get allowed extensions for API documentation
   */
  static getAllowedExtensions() {
    return Object.keys(this.ALLOWED_FILES);
  }

  /**
   * Get maximum file size for API documentation
   */
  static getMaxFileSize() {
    return this.MAX_FILE_SIZE;
  }
}

export default FileValidationService;