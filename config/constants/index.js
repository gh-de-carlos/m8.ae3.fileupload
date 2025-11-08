/**
 * Application Constants
 * 
 * Centralized configuration for all magic numbers and constants used throughout
 * the application. This improves maintainability, consistency, and makes it easy
 * to adjust values without hunting through the codebase.
 */

// File Processing Constants
export const FILE_LIMITS = {
  // File size limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_FILE_SIZE_MB: 5, // For display purposes
  BYTES_PER_MB: 1024 * 1024, // Conversion factor
  
  // Filename constraints
  MAX_FILENAME_LENGTH: 255,
  MAX_FIELD_NAME_SIZE: 50,
  MAX_FIELD_VALUE_SIZE: 1024,
  
  // Upload constraints
  MAX_FILES_PER_REQUEST: 1,
  MAX_FORM_FIELDS: 10
};

// Image Processing Constants
export const IMAGE_PROCESSING = {
  // Dimension limits
  MIN_DIMENSION: 200, // Real-world minimum for usable images
  MAX_DIMENSION: 4000, // Maximum dimension to prevent abuse
  
  // Quality settings
  MIN_QUALITY: 50, // Real-world minimum for acceptable quality
  MAX_QUALITY: 100,
  DEFAULT_QUALITY: 80,
  
  // Supported formats (real-world web formats only)
  SUPPORTED_FORMATS: ['jpg', 'png', 'webp'],
  
  // PNG quality scale conversion (Sharp uses 0-9 for PNG)
  PNG_QUALITY_DIVISOR: 10
};

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success codes
  SUCCESS: 200,
  OK: 200,
  CREATED: 201,
  
  // Client error codes
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  
  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501
};

// Pagination Constants
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  MAX_TOTAL_LIMIT: 1000, // For validation utilities
  DEFAULT_OFFSET: 0
};

// Database Constants
export const DATABASE = {
  // PostgreSQL error codes
  DUPLICATE_KEY_ERROR: '23505',
  
  // Cleanup settings
  DEFAULT_CLEANUP_DAYS: 30,
  CLEANUP_BATCH_SIZE: 100,
  
  // Connection settings
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_RETRY_ATTEMPTS: 3
};

// File Security Constants
export const SECURITY = {
  // File signatures (magic numbers) for validation
  FILE_SIGNATURES: {
    'image/jpeg': [
      [0xFF, 0xD8, 0xFF] // JPEG signature
    ],
    'image/png': [
      [0x89, 0x50, 0x4E, 0x47] // PNG signature
    ],
    'image/gif': [
      [0x47, 0x49, 0x46, 0x38] // GIF87a/89a signature
    ],
    'application/pdf': [
      [0x25, 0x50, 0x44, 0x46] // %PDF signature
    ],
    'text/plain': [] // Text files don't have reliable signatures
  },
  
  // Allowed file extensions with their MIME types
  ALLOWED_FILE_TYPES: {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain']
  },
  
  // Allowed image MIME types (for multer configuration)
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // Input sanitization
  MAX_INPUT_LENGTH: 255,
  MAX_USER_AGENT_LENGTH: 500,
  MAX_QUERY_KEY_LENGTH: 50,
  MAX_QUERY_VALUE_LENGTH: 100
};

// Server Configuration
export const SERVER = {
  DEFAULT_PORT: 3000,
  SHUTDOWN_TIMEOUT: 10000, // 10 seconds for graceful shutdown
  
  // Static file serving
  STATIC_PATH: '/static',
  UPLOADS_DIRECTORY: 'uploads',
  UPLOADS_PATH: '/uploads'
};

// File Storage Constants
export const STORAGE = {
  // Directory permissions
  DIRECTORY_MODE: 0o755,
  
  // File cleanup
  TEMP_FILE_MAX_AGE_MINUTES: 60,
  
  // Orphaned file cleanup
  ORPHAN_CLEANUP_BATCH_SIZE: 100,
  
  // File path security
  UPLOADS_RELATIVE_PATH: '/uploads'
};

// Validation Constants
export const VALIDATION = {
  // String validation
  MIN_STRING_LENGTH: 0,
  
  // Numeric validation
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100,
  
  // Quality validation (duplicate of IMAGE_PROCESSING for validation layer)
  MIN_QUALITY: IMAGE_PROCESSING.MIN_QUALITY,
  MAX_QUALITY: IMAGE_PROCESSING.MAX_QUALITY,
  
  // Dimension validation (duplicate for validation layer)
  MIN_DIMENSION: IMAGE_PROCESSING.MIN_DIMENSION,
  MAX_DIMENSION: IMAGE_PROCESSING.MAX_DIMENSION
};

// Logging Constants
export const LOGGING = {
  // Log levels
  LEVELS: {
    INFO: 'INFO',
    ERROR: 'ERROR',
    WARN: 'WARN',
    DEBUG: 'DEBUG',
    PASS: 'PASS',
    FAIL: 'FAIL',
    OK: 'OK',
    STOP: 'STOP',
    TEST: 'TEST',
    HELP: 'HELP',
    HTTP: 'HTTP'
  }
};

// Business Logic Constants
export const BUSINESS_RULES = {
  // Image transformation rules
  TRANSFORMABLE_MIME_TYPES: ['image/jpeg', 'image/png'], // GIF excluded
  NON_TRANSFORMABLE_MIME_TYPES: ['image/gif'],
  
  // Security messages
  HACKER_MESSAGE: '¿Te creí hacker acaso?',
  
  // File naming
  FILENAME_SEPARATOR: '_',
  
  // Rate limiting (if implemented in future)
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_UPLOAD_SIZE_PER_HOUR: 100 * 1024 * 1024 // 100MB per hour
};

// Export grouped constants for easy importing
export const CONSTANTS = {
  FILE_LIMITS,
  IMAGE_PROCESSING,
  HTTP_STATUS,
  PAGINATION,
  DATABASE,
  SECURITY,
  SERVER,
  STORAGE,
  VALIDATION,
  LOGGING,
  BUSINESS_RULES
};

// Default export for convenience
export default CONSTANTS;