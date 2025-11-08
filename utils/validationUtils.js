/**
 * Validation Utilities
 * 
 * Cross-cutting validation functions for various data types.
 * Provides reusable validation logic across the application.
 */

export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate if string is a valid integer
   */
  static isValidInteger(value, min = null, max = null) {
    const num = parseInt(value, 10);
    if (isNaN(num) || !Number.isInteger(num)) {
      return false;
    }
    
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    
    return true;
  }

  /**
   * Validate if string is a valid float
   */
  static isValidFloat(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num) || !Number.isFinite(num)) {
      return false;
    }
    
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    
    return true;
  }

  /**
   * Validate string length
   */
  static isValidStringLength(str, minLength = 0, maxLength = null) {
    if (typeof str !== 'string') return false;
    if (str.length < minLength) return false;
    if (maxLength !== null && str.length > maxLength) return false;
    return true;
  }

  /**
   * Validate if string contains only alphanumeric characters
   */
  static isAlphanumeric(str) {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
  }

  /**
   * Validate if string contains only alphanumeric characters and allowed special chars
   */
  static isAlphanumericWithSpecialChars(str, allowedChars = '_-') {
    const regex = new RegExp(`^[a-zA-Z0-9${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`);
    return regex.test(str);
  }

  /**
   * Validate filename format (no path traversal, valid characters)
   */
  static isValidFilename(filename) {
    if (!filename || typeof filename !== 'string') return false;
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) {
      return false;
    }
    
    // Check length
    if (filename.length === 0 || filename.length > 255) {
      return false;
    }
    
    // Check for reserved names on Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExtension = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExtension)) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate UUID v4 format
   */
  static isValidUUIDv4(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate timestamp format (ISO 8601)
   */
  static isValidTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Validate MIME type format
   */
  static isValidMimeType(mimeType) {
    const mimeRegex = /^[a-zA-Z][a-zA-Z0-9]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^]*$/;
    return mimeRegex.test(mimeType);
  }

  /**
   * Validate file extension format
   */
  static isValidFileExtension(extension) {
    if (!extension || typeof extension !== 'string') return false;
    
    // Must start with dot and contain only alphanumeric characters
    const extRegex = /^\.[a-zA-Z0-9]+$/;
    return extRegex.test(extension) && extension.length <= 10;
  }

  /**
   * Validate pagination parameters
   */
  static validatePaginationParams(limit, offset) {
    const errors = [];
    
    if (limit !== undefined) {
      if (!this.isValidInteger(limit, 1, 1000)) {
        errors.push('Limit must be an integer between 1 and 1000');
      }
    }
    
    if (offset !== undefined) {
      if (!this.isValidInteger(offset, 0)) {
        errors.push('Offset must be a non-negative integer');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate image transformation parameters
   */
  static validateTransformationParams(params) {
    const errors = [];
    const validFormats = ['jpg', 'png', 'webp']; // Real-world formats only
    
    // Validate format (support both 'convert' and legacy 'type')
    const formatParam = params.convert || params.type;
    if (formatParam && !validFormats.includes(formatParam.toLowerCase())) {
      errors.push(`Invalid format. Allowed formats: ${validFormats.join(', ')}`);
    }
    
    // Validate resize parameter
    if (params.resize) {
      const resizeRegex = /^(\d+)?x?(\d+)?$/i;
      if (!resizeRegex.test(params.resize)) {
        errors.push('Invalid resize format. Use: WIDTHxHEIGHT, WIDTH, or xHEIGHT');
      } else {
        const match = params.resize.match(resizeRegex);
        const width = match[1] ? parseInt(match[1], 10) : null;
        const height = match[2] ? parseInt(match[2], 10) : null;
        
        if (!width && !height) {
          errors.push('At least width or height must be specified in resize parameter');
        }
        
        if ((width && width > 4000) || (height && height > 4000)) {
          errors.push('Maximum dimension is 4000px');
        }
        
        // Real-world validation: minimum dimensions
        if ((width && width < 200) || (height && height < 200)) {
          errors.push('Dimensions too small for real-world usage. Minimum dimension: 200px');
        }
      }
    }
    
    // Validate quality parameter
    if (params.quality) {
      if (!this.isValidInteger(params.quality, 1, 100)) {
        errors.push('Quality must be an integer between 1 and 100');
      } else if (parseInt(params.quality, 10) < 50) {
        errors.push('Quality too low for real-world usage. Minimum quality: 50%');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input (remove potentially dangerous characters)
   */
  static sanitizeString(input, maxLength = 255) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, maxLength);
  }

  /**
   * Validate and sanitize query parameters
   */
  static sanitizeQueryParams(query) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // Sanitize key and value
        const cleanKey = this.sanitizeString(key, 50);
        const cleanValue = this.sanitizeString(value, 100);
        
        if (cleanKey && cleanValue) {
          sanitized[cleanKey] = cleanValue;
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Validate request rate limiting parameters
   */
  static validateRateLimitInfo(ip, userAgent) {
    const errors = [];
    
    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ip && !ipRegex.test(ip) && ip !== '::1' && ip !== 'localhost') {
      errors.push('Invalid IP address format');
    }
    
    // Validate user agent length
    if (userAgent && userAgent.length > 500) {
      errors.push('User agent string too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ValidationUtils;