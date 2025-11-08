/**
 * Image Controller
 * 
 * Orchestrates image upload and deletion operations by coordinating
 * between services and repositories. Handles business logic flow
 * while delegating specific tasks to appropriate services.
 */

import { log } from '../utils/logger.js';
import { HTTP_STATUS, PAGINATION } from '../config/constants/index.js';
import FileValidationService from '../services/FileValidationService.js';
import ImageTransformationService from '../services/ImageTransformationService.js';
import FileStorageService from '../services/FileStorageService.js';
import TransactionService from '../services/TransactionService.js';
import ImageMetadataRepository from '../repositories/ImageMetadataRepository.js';
import CleanupQueueRepository from '../repositories/CleanupQueueRepository.js';

export class ImageController {
  /**
   * Handle file upload with validation, transformation, and storage
   */
  static async uploadImage(req, res) {
    try {
      log.info('Starting image upload process');
      
      // 1. Check if file was provided
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'No file provided',
          message: 'Please provide a file using the "image" field'
        });
      }

      const file = req.file;
      const queryParams = req.query;
      
      log.info(`Processing upload: ${file.originalname} (${file.size} bytes)`);

      // 2. Validate file
      const validationResult = await FileValidationService.validateFile(file);
      
      // 3. Check if transformations are requested and if file supports them
      let transformationResult = { buffer: file.buffer, extension: validationResult.extension, wasTransformed: false };
      
      if (ImageTransformationService.hasAnyTransformation(queryParams)) {
        if (ImageTransformationService.isTransformableImage(validationResult.mimeType)) {
          transformationResult = await ImageTransformationService.transformImage(
            file.buffer,
            validationResult.extension,
            queryParams
          );
          log.info(`Image transformation applied: ${transformationResult.wasTransformed}`);
        } else {
          return res.status(400).json({
            error: 'Transformation not supported',
            message: `File type ${validationResult.mimeType} does not support transformations`,
            supportedTypes: ['image/jpeg', 'image/png']
          });
        }
      }

      // 4. Generate unique filename
      const uniqueFilename = FileStorageService.generateUniqueFilename(transformationResult.extension);
      
      // 5. Prepare metadata
      const metadata = {
        name: uniqueFilename,
        maskName: file.originalname,
        path: FileStorageService.getRelativePath(uniqueFilename),
        mime: validationResult.mimeType,
        size: transformationResult.buffer.length
      };

      // 6. Execute transactional upload
      const result = await TransactionService.executeUploadTransaction({
        fileBuffer: transformationResult.buffer,
        filename: uniqueFilename,
        metadata,
        imageRepository: ImageMetadataRepository,
        cleanupRepository: CleanupQueueRepository
      });

      // 7. Send success response
      log.pass(`Image upload completed successfully: ${uniqueFilename}`);
      res.status(HTTP_STATUS.SUCCESS).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          filename: uniqueFilename,
          originalname: req.file.originalname,
          url: `/images/${uniqueFilename}`,
          mimetype: req.file.mimetype,
          size: req.file.buffer.length
        }
      });

    } catch (error) {
      log.error(`Image upload failed: ${error.message}`);
      
      const statusCode = error.statusCode || 500;
      const message = statusCode < 500 ? error.message : 'Internal server error';
      
      res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  /**
   * Handle file deletion with transactional rollback
   */
  static async deleteImage(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({
          error: 'Filename is required',
          message: 'Please provide a filename in the URL path'
        });
      }

      log.info(`Starting image deletion process for: ${filename}`);

      // Execute transactional deletion
      const result = await TransactionService.executeDeleteTransaction({
        filename,
        imageRepository: ImageMetadataRepository,
        cleanupRepository: CleanupQueueRepository
      });

      // Send success response
      log.pass(`Image deletion completed successfully: ${filename}`);
      res.status(200).json({
        message: 'File deleted successfully',
        file: {
          name: filename,
          originalName: result.originalMetadata.mask_name,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      log.error(`Image deletion failed: ${error.message}`);
      
      const statusCode = error.statusCode || 500;
      const message = statusCode < 500 ? error.message : 'Internal server error';
      
      res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  /**
   * Get list of uploaded images with pagination
   */
  static async getImages(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
      const offset = parseInt(req.query.offset) || 0;
      
      log.info(`Retrieving images list (limit: ${limit}, offset: ${offset})`);

      const images = await ImageMetadataRepository.findAll(limit, offset);
      const totalCount = await ImageMetadataRepository.getCount();

      res.status(200).json({
        message: 'Images retrieved successfully',
        data: {
          images: images.map(img => ({
            name: img.name,
            originalName: img.mask_name,
            size: img.size,
            mimeType: img.mime,
            path: img.path,
            uploadedAt: img.created_at
          })),
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + limit < totalCount
          }
        }
      });

    } catch (error) {
      log.error(`Failed to retrieve images: ${error.message}`);
      
      res.status(500).json({
        error: 'Failed to retrieve images',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  /**
   * Get specific image metadata
   */
  static async getImage(req, res) {
    try {
      const { filename } = req.params;
      
      log.info(`Retrieving metadata for: ${filename}`);

      const metadata = await ImageMetadataRepository.findByName(filename);
      
      if (!metadata) {
        return res.status(404).json({
          error: 'File not found',
          message: `No file found with name: ${filename}`
        });
      }

      res.status(200).json({
        message: 'File metadata retrieved successfully',
        file: {
          name: metadata.name,
          originalName: metadata.mask_name,
          size: metadata.size,
          mimeType: metadata.mime,
          path: metadata.path,
          uploadedAt: metadata.created_at
        }
      });

    } catch (error) {
      log.error(`Failed to retrieve file metadata: ${error.message}`);
      
      res.status(500).json({
        error: 'Failed to retrieve file metadata',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(req, res) {
    try {
      log.info('Retrieving storage statistics');

      const stats = await ImageMetadataRepository.getStorageStats();
      const cleanupStats = await CleanupQueueRepository.getStats();

      const totalFiles = stats.reduce((sum, stat) => sum + parseInt(stat.count_by_type), 0);
      const totalSize = stats.reduce((sum, stat) => sum + parseInt(stat.total_size || 0), 0);

      res.status(200).json({
        message: 'Storage statistics retrieved successfully',
        data: {
          summary: {
            totalFiles,
            totalSize,
            averageSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0,
            formattedSize: this.formatFileSize(totalSize)
          },
          byType: stats.map(stat => ({
            mimeType: stat.mime,
            count: parseInt(stat.count_by_type),
            totalSize: parseInt(stat.total_size || 0),
            formattedSize: this.formatFileSize(parseInt(stat.total_size || 0))
          })),
          cleanup: {
            totalItems: parseInt(cleanupStats.total_items),
            pendingItems: parseInt(cleanupStats.pending_items),
            processedItems: parseInt(cleanupStats.processed_items)
          }
        }
      });

    } catch (error) {
      log.error(`Failed to retrieve storage statistics: ${error.message}`);
      
      res.status(500).json({
        error: 'Failed to retrieve storage statistics',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  /**
   * Helper: Get applied transformations from query params
   */
  static getAppliedTransformations(queryParams) {
    const transformations = {};
    
    // Support both 'convert' (new) and 'type' (legacy)
    const formatParam = queryParams.convert || queryParams.type;
    if (formatParam) {
      transformations.format = formatParam;
      if (queryParams.type && !queryParams.convert) {
        transformations.note = 'Used legacy "type" parameter, consider using "convert"';
      }
    }
    
    if (queryParams.resize) transformations.resize = queryParams.resize;
    if (queryParams.quality) transformations.quality = queryParams.quality;
    
    return transformations;
  }

  /**
   * Helper: Format file size in human-readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ImageController;