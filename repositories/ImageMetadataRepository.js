/**
 * Image Metadata Repository
 * 
 * Data access layer for images_metadata table.
 * Handles all CRUD operations for image metadata with proper error handling.
 * Follows repository pattern to abstract database implementation details.
 */

import db from '../config/database.js';
import { log } from '../utils/logger.js';

export class ImageMetadataRepository {
  /**
   * Create new image metadata record
   */
  static async create(metadata) {
    const { name, maskName, path, mime, size } = metadata;
    
    const query = `
      INSERT INTO images_metadata (name, mask_name, path, mime, size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [name, maskName, path, mime, size];
    
    try {
      log.info(`Creating metadata record for: ${name}`);
      const result = await db.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create metadata record');
      }
      
      log.pass(`Metadata record created successfully: ${name}`);
      return result.rows[0];
      
    } catch (error) {
      log.error(`Failed to create metadata: ${error.message}`);
      
      // Handle duplicate key error
      if (error.code === '23505') {
        const duplicateError = new Error('File with this name already exists');
        duplicateError.statusCode = 409;
        throw duplicateError;
      }
      
      // Re-throw as database error
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Find image metadata by filename
   */
  static async findByName(name) {
    const query = `
      SELECT * FROM images_metadata 
      WHERE name = $1
    `;
    
    try {
      log.info(`Finding metadata for: ${name}`);
      const result = await db.pool.query(query, [name]);
      
      if (result.rows.length === 0) {
        log.info(`No metadata found for: ${name}`);
        return null;
      }
      
      log.info(`Metadata found for: ${name}`);
      return result.rows[0];
      
    } catch (error) {
      log.error(`Failed to find metadata: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get all image metadata with pagination
   */
  static async findAll(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM images_metadata 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      log.info(`Finding all metadata (limit: ${limit}, offset: ${offset})`);
      const result = await db.pool.query(query, [limit, offset]);
      
      log.info(`Found ${result.rows.length} metadata records`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to find all metadata: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Update image metadata
   */
  static async update(name, updates) {
    const allowedFields = ['mask_name', 'path', 'mime', 'size'];
    const setClause = [];
    const values = [];
    let valueIndex = 1;

    // Build dynamic SET clause
    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        setClause.push(`${field} = $${valueIndex}`);
        values.push(updates[field]);
        valueIndex++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add name parameter for WHERE clause
    values.push(name);

    const query = `
      UPDATE images_metadata 
      SET ${setClause.join(', ')} 
      WHERE name = $${valueIndex}
      RETURNING *
    `;

    try {
      log.info(`Updating metadata for: ${name}`);
      const result = await db.pool.query(query, values);
      
      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      log.pass(`Metadata updated successfully: ${name}`);
      return result.rows[0];
      
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }
      
      log.error(`Failed to update metadata: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Delete image metadata
   */
  static async delete(name) {
    const query = `
      DELETE FROM images_metadata 
      WHERE name = $1
      RETURNING *
    `;
    
    try {
      log.info(`Deleting metadata for: ${name}`);
      const result = await db.pool.query(query, [name]);
      
      if (result.rows.length === 0) {
        const error = new Error('File not found');
        error.statusCode = 404;
        throw error;
      }
      
      log.pass(`Metadata deleted successfully: ${name}`);
      return result.rows[0];
      
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }
      
      log.error(`Failed to delete metadata: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get count of all images
   */
  static async getCount() {
    const query = `SELECT COUNT(*) as count FROM images_metadata`;
    
    try {
      const result = await db.pool.query(query);
      return parseInt(result.rows[0].count, 10);
      
    } catch (error) {
      log.error(`Failed to get count: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get all filenames (useful for cleanup operations)
   */
  static async getAllFilenames() {
    const query = `SELECT name FROM images_metadata`;
    
    try {
      log.info('Retrieving all filenames');
      const result = await db.pool.query(query);
      
      const filenames = result.rows.map(row => row.name);
      log.info(`Retrieved ${filenames.length} filenames`);
      return filenames;
      
    } catch (error) {
      log.error(`Failed to get all filenames: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Find images by MIME type
   */
  static async findByMimeType(mimeType, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM images_metadata 
      WHERE mime = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      log.info(`Finding images by MIME type: ${mimeType}`);
      const result = await db.pool.query(query, [mimeType, limit, offset]);
      
      log.info(`Found ${result.rows.length} images with MIME type: ${mimeType}`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to find by MIME type: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats() {
    const query = `
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        AVG(size) as average_size,
        mime,
        COUNT(*) as count_by_type
      FROM images_metadata 
      GROUP BY mime
    `;
    
    try {
      log.info('Retrieving storage statistics');
      const result = await db.pool.query(query);
      
      log.info('Storage statistics retrieved successfully');
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to get storage stats: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }
}

export default ImageMetadataRepository;