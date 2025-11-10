/**
 * Image Transformation Service
 * 
 * Handles image transformations using Sharp library based on query parameters.
 * Supports format conversion, resizing, and quality adjustments.
 * Follows SRP by focusing solely on image manipulation logic.
 */

import sharp from 'sharp';
import Sharp from 'sharp';
import { log } from '../utils/logger.js';
import { IMAGE_PROCESSING } from '../config/constants/index.js';

export class ImageTransformationService {
  // Import configuration from centralized constants
  static SUPPORTED_FORMATS = IMAGE_PROCESSING.SUPPORTED_FORMATS;
  static MAX_DIMENSION = IMAGE_PROCESSING.MAX_DIMENSION;
  static MIN_DIMENSION = IMAGE_PROCESSING.MIN_DIMENSION;
  static MIN_QUALITY = IMAGE_PROCESSING.MIN_QUALITY;
  static MAX_QUALITY = IMAGE_PROCESSING.MAX_QUALITY;

  /**
   * Apply transformations based on query parameters
   */
  static async transformImage(fileBuffer, originalExtension, queryParams) {
    const hasTransformations = this.hasAnyTransformation(queryParams);
    
    if (!hasTransformations) {
      log.info('No transformations requested, returning original buffer');
      return {
        buffer: fileBuffer,
        extension: originalExtension,
        wasTransformed: false
      };
    }

    log.info(`Applying transformations: ${JSON.stringify(queryParams)}`);

    try {
      let sharpInstance = sharp(fileBuffer);
      let newExtension = originalExtension;
      let wasTransformed = false;

      // Apply format conversion (support both 'convert' and legacy 'type')
      const formatParam = queryParams.convert || queryParams.type;
      if (formatParam) {
        const result = this.applyFormatConversion(sharpInstance, formatParam);
        sharpInstance = result.sharpInstance;
        newExtension = result.extension;
        wasTransformed = true;
      }

      // Apply resizing
      if (queryParams.resize) {
        sharpInstance = this.applyResize(sharpInstance, queryParams.resize);
        wasTransformed = true;
      }

      // Apply quality adjustment
      if (queryParams.quality) {
        sharpInstance = this.applyQuality(sharpInstance, queryParams.quality);
        wasTransformed = true;
      }

      const transformedBuffer = await sharpInstance.toBuffer();
      
      log.pass(`Image transformation completed successfully`);
      return {
        buffer: transformedBuffer,
        extension: newExtension,
        wasTransformed
      };

    } catch (error) {
      log.error(`Image transformation failed: ${error.message}`);
      const transformError = new Error(`Image transformation failed: ${error.message}`);
      transformError.statusCode = 422;
      throw transformError;
    }
  }

  /**
   * Check if any transformations are requested
   */
  static hasAnyTransformation(queryParams) {
    return !!(queryParams.convert || queryParams.type || queryParams.resize || queryParams.quality);
  }

  /**
   * Apply format conversion
   */
  static applyFormatConversion(sharpInstance, targetFormat) {
    const format = targetFormat.toLowerCase();
    
    if (!this.SUPPORTED_FORMATS.includes(format)) {
      const error = new Error(`Unsupported format: ${format}. Supported: ${this.SUPPORTED_FORMATS.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    log.info(`Converting image to format: ${format}`);

    // Normalize format names for Sharp
    const sharpFormat = format === 'jpg' ? 'jpeg' : format;
    const extension = format === 'jpeg' ? '.jpg' : `.${format}`;

    return {
      sharpInstance: sharpInstance.toFormat(sharpFormat),
      extension
    };
  }

  /**
   * Apply image resizing
   */
  static applyResize(sharpInstance, resizeParam) {
    const dimensions = this.parseResizeParameter(resizeParam);
    
    log.info(`Resizing image to: ${dimensions.width}x${dimensions.height}`);
    
    return sharpInstance.resize(dimensions.width, dimensions.height, {
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true // Don't enlarge smaller images
    });
  }

  /**
   * Apply quality adjustment
   */
  static applyQuality(sharpInstance, qualityParam) {
    const quality = parseInt(qualityParam, 10);
    
    if (isNaN(quality) || quality < 1 || quality > 100) {
      const error = new Error('Quality must be a number between 1 and 100');
      error.statusCode = 400;
      throw error;
    }

    // Real-world validation: minimum quality check
    if (quality < this.MIN_QUALITY) {
      const error = new Error(`Quality too low for real-world usage. Minimum quality: ${this.MIN_QUALITY}%`);
      error.statusCode = 400;
      throw error;
    }

    log.info(`Setting image quality to: ${quality}%`);
    
    // Apply quality based on current format
    return sharpInstance.jpeg({ quality }).png({ quality: Math.round(quality / 10) });
  }

  /**
   * Parse resize parameter (e.g., "800x600", "800", "x600")
   */
  static parseResizeParameter(resizeParam) {
    const resizeRegex = /^(\d+)?x?(\d+)?$/i;
    const match = resizeParam.match(resizeRegex);
    
    if (!match) {
      const error = new Error('Invalid resize format. Use: WIDTHxHEIGHT, WIDTH, or xHEIGHT');
      error.statusCode = 400;
      throw error;
    }

    const width = match[1] ? parseInt(match[1], 10) : null;
    const height = match[2] ? parseInt(match[2], 10) : null;

    if (!width && !height) {
      const error = new Error('At least width or height must be specified');
      error.statusCode = 400;
      throw error;
    }

    // Validate maximum dimensions
    if ((width && width > this.MAX_DIMENSION) || (height && height > this.MAX_DIMENSION)) {
      const error = new Error(`Maximum dimension is ${this.MAX_DIMENSION}px`);
      error.statusCode = 400;
      throw error;
    }

    // Real-world validation: minimum dimensions check
    if ((width && width < this.MIN_DIMENSION) || (height && height < this.MIN_DIMENSION)) {
      const error = new Error(`Dimensions too small for real-world usage. Minimum dimension: ${this.MIN_DIMENSION}px`);
      error.statusCode = 400;
      throw error;
    }

    return { width, height };
  }

  /**
   * Check if file is an image that can be transformed
   */
  static isTransformableImage(mimeType) {
    return mimeType.startsWith('image/') && mimeType !== 'image/gif';
  }

  /**
   * Get supported formats for API documentation
   */
  static getSupportedFormats() {
    return this.SUPPORTED_FORMATS;
  }

  /**
   * Get transformation examples for API documentation
   */
  static getTransformationExamples() {
    return {
      format: 'POST /images?convert=png',
      legacy_format: 'POST /images?type=png (deprecated, use convert)',
      resize: 'POST /images?resize=800x600',
      quality: 'POST /images?quality=90',
      combined: 'POST /images?convert=webp&resize=1200x800&quality=85',
      constraints: {
        minDimension: `${this.MIN_DIMENSION}px`,
        maxDimension: `${this.MAX_DIMENSION}px`,
        minQuality: `${this.MIN_QUALITY}%`,
        supportedFormats: this.SUPPORTED_FORMATS.join(', ')
      }
    };
  }
}

export default ImageTransformationService;