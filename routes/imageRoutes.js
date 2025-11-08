/**
 * Image Routes
 * API endpoints for file upload and management with complete implementation
 */

import express from 'express';
import ImageController from '../controllers/ImageController.js';
import { processFileUpload, logUploadAttempt } from '../middleware/multerConfig.js';

const router = express.Router();

// POST /images - Upload file with optional transformations
// Query parameters: ?type=png&resize=800x600&quality=90
router.post('/', 
  logUploadAttempt,      // Log upload attempts
  processFileUpload,     // Handle file upload with multer
  ImageController.uploadImage
);

// DELETE /images/:filename - Delete file with transactional rollback
router.delete('/:filename', ImageController.deleteImage);

// GET /images - List all images with pagination
// Query parameters: ?limit=50&offset=0
router.get('/', ImageController.getImages);

// GET /images/:filename - Get specific image metadata
router.get('/:filename', ImageController.getImage);

// GET /images/stats/storage - Get storage statistics
router.get('/stats/storage', ImageController.getStorageStats);

export default router;