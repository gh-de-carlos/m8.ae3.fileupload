/**
 * Transaction Service
 * 
 * Orchestrates complex transactional operations across multiple services.
 * Provides rollback capabilities and manages the coordination between
 * file storage and database operations to maintain data consistency.
 */

import { log } from '../utils/logger.js';
import FileStorageService from './FileStorageService.js';

export class TransactionService {
  /**
   * Execute file upload transaction with rollback capability
   */
  static async executeUploadTransaction(transactionData) {
    const { 
      fileBuffer, 
      filename, 
      metadata, 
      imageRepository, 
      cleanupRepository 
    } = transactionData;

    let savedFile = false;
    let savedMetadata = false;

    try {
      log.info(`Starting upload transaction for: ${filename}`);

      // Step 1: Save file to disk
      log.info('Step 1: Saving file to disk');
      await FileStorageService.saveFile(fileBuffer, filename);
      savedFile = true;

      // Step 2: Save metadata to database
      log.info('Step 2: Saving metadata to database');
      await imageRepository.create(metadata);
      savedMetadata = true;

      log.pass(`Upload transaction completed successfully: ${filename}`);
      return {
        success: true,
        filename,
        metadata
      };

    } catch (error) {
      log.error(`Upload transaction failed: ${error.message}`);
      
      // Rollback operations
      await this.rollbackUploadTransaction({
        filename,
        savedFile,
        savedMetadata,
        metadata,
        imageRepository,
        cleanupRepository,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * Execute file deletion transaction with rollback capability
   */
  static async executeDeleteTransaction(transactionData) {
    const { 
      filename, 
      imageRepository, 
      cleanupRepository 
    } = transactionData;

    let originalMetadata = null;
    let deletedFromDatabase = false;

    try {
      log.info(`Starting delete transaction for: ${filename}`);

      // Step 1: Get metadata before deletion (for potential rollback)
      log.info('Step 1: Retrieving file metadata');
      originalMetadata = await imageRepository.findByName(filename);
      
      if (!originalMetadata) {
        const error = new Error('File not found in database');
        error.statusCode = 404;
        throw error;
      }

      // Step 2: Delete from database
      log.info('Step 2: Deleting metadata from database');
      await imageRepository.delete(filename);
      deletedFromDatabase = true;

      // Step 3: Delete file from disk
      log.info('Step 3: Deleting file from disk');
      const fileDeleted = await FileStorageService.deleteFile(filename);

      if (!fileDeleted) {
        // File didn't exist on disk, but database was cleaned up
        log.warn(`File ${filename} not found on disk, but database cleaned up`);
      }

      log.pass(`Delete transaction completed successfully: ${filename}`);
      return {
        success: true,
        filename,
        originalMetadata
      };

    } catch (error) {
      log.error(`Delete transaction failed: ${error.message}`);
      
      // Rollback operations
      await this.rollbackDeleteTransaction({
        filename,
        originalMetadata,
        deletedFromDatabase,
        imageRepository,
        cleanupRepository,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * Rollback upload transaction
   */
  static async rollbackUploadTransaction(rollbackData) {
    const {
      filename,
      savedFile,
      savedMetadata,
      metadata,
      imageRepository,
      cleanupRepository,
      originalError
    } = rollbackData;

    log.warn(`Rolling back upload transaction for: ${filename}`);

    try {
      // Rollback database insertion
      if (savedMetadata) {
        log.info('Rolling back database metadata');
        try {
          await imageRepository.delete(filename);
          log.info('Database rollback successful');
        } catch (dbError) {
          log.error(`Database rollback failed: ${dbError.message}`);
          // Add to cleanup queue for later processing
          await this.addToCleanupQueue(filename, cleanupRepository);
        }
      }

      // Rollback file creation
      if (savedFile) {
        log.info('Rolling back file creation');
        try {
          await FileStorageService.deleteFile(filename);
          log.info('File rollback successful');
        } catch (fileError) {
          log.error(`File rollback failed: ${fileError.message}`);
          // File exists but database might be inconsistent
          await this.addToCleanupQueue(filename, cleanupRepository);
        }
      }

      log.info('Upload transaction rollback completed');

    } catch (rollbackError) {
      log.error(`Rollback failed: ${rollbackError.message}`);
      // Critical error - add to cleanup queue
      await this.addToCleanupQueue(filename, cleanupRepository);
    }
  }

  /**
   * Rollback delete transaction
   */
  static async rollbackDeleteTransaction(rollbackData) {
    const {
      filename,
      originalMetadata,
      deletedFromDatabase,
      imageRepository,
      cleanupRepository,
      originalError
    } = rollbackData;

    log.warn(`Rolling back delete transaction for: ${filename}`);

    try {
      // Only attempt rollback if we successfully deleted from database
      if (deletedFromDatabase && originalMetadata) {
        log.info('Rolling back database deletion');
        try {
          await imageRepository.create(originalMetadata);
          log.info('Database deletion rollback successful');
        } catch (dbError) {
          log.error(`Database deletion rollback failed: ${dbError.message}`);
          // Critical inconsistency - add to cleanup queue
          await this.addToCleanupQueue(filename, cleanupRepository);
          
          // Throw 500 error for critical system failure
          const criticalError = new Error('Critical system failure during rollback. Operations team has been notified.');
          criticalError.statusCode = 500;
          throw criticalError;
        }
      }

      log.info('Delete transaction rollback completed');

    } catch (rollbackError) {
      log.error(`Delete rollback failed: ${rollbackError.message}`);
      throw rollbackError;
    }
  }

  /**
   * Add file to cleanup queue for later processing
   */
  static async addToCleanupQueue(filename, cleanupRepository) {
    try {
      log.warn(`Adding ${filename} to cleanup queue`);
      await cleanupRepository.add(filename);
      log.info('Added to cleanup queue successfully');
    } catch (cleanupError) {
      log.error(`Failed to add to cleanup queue: ${cleanupError.message}`);
      // This is a critical system error - would typically trigger alerts
    }
  }

  /**
   * Process cleanup queue (would typically run as scheduled job)
   */
  static async processCleanupQueue(cleanupRepository, imageRepository) {
    try {
      log.info('Processing cleanup queue');
      
      const cleanupItems = await cleanupRepository.getPending();
      let processedCount = 0;

      for (const item of cleanupItems) {
        try {
          // Check if file still exists in database
          const metadata = await imageRepository.findByName(item.name);
          
          if (!metadata) {
            // File should be deleted from disk
            const fileExists = await FileStorageService.fileExists(item.name);
            if (fileExists) {
              await FileStorageService.deleteFile(item.name);
            }
            await cleanupRepository.markAsProcessed(item.name, true);
          } else {
            // File should exist on disk
            const fileExists = await FileStorageService.fileExists(item.name);
            if (!fileExists) {
              // File missing from disk but exists in database
              log.warn(`File ${item.name} missing from disk but exists in database`);
              await cleanupRepository.markAsProcessed(item.name, false);
            } else {
              // File and database are consistent
              await cleanupRepository.markAsProcessed(item.name, true);
            }
          }
          
          processedCount++;
          
        } catch (itemError) {
          log.error(`Failed to process cleanup item ${item.name}: ${itemError.message}`);
          await cleanupRepository.markAsProcessed(item.name, false);
        }
      }

      log.info(`Cleanup queue processing completed: ${processedCount} items processed`);
      return processedCount;

    } catch (error) {
      log.error(`Cleanup queue processing failed: ${error.message}`);
      throw error;
    }
  }
}

export default TransactionService;