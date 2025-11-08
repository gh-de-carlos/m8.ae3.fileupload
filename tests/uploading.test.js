#!/usr/bin/env node

/**
 * Image Upload Test Script
 * 
 * Tests image upload functionality by sending a test image to the server.
 * Validates the complete upload flow including file validation and response.
 * Usage: node tests/uploading.test.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import log from '../utils/logger.js';

// Convert exec to promise-based function
const execAsync = promisify(exec);

// Get current directory for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testImageUpload = async () => {
  log.info('Testing image upload functionality...\n');

  let testImagePath = path.join(__dirname, 'assets', 'img.1.png');
  const serverUrl = 'http://localhost:3000/images';
  
  try {
    // 1. Check if test image exists
    log.test('1. Checking test image availability...');
    if (!existsSync(testImagePath)) {
      // Try alternative extensions
      const alternatives = ['img.1.jpg', 'img.1.jpeg'];
      let found = false;
      
      for (let alt of alternatives) {
        const altPath = path.join(__dirname, 'assets', alt);
        if (existsSync(altPath)) {
          testImagePath = altPath;
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Test image not found. Tried: img.1.png, ${alternatives.join(', ')}`);
      }
    }
    log.pass(`Test image found: ${path.basename(testImagePath)}\n`);

    // 2. Check server availability
    log.test('2. Testing server connectivity...');
    try {
      const { stdout: pingResult } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${serverUrl.replace('/images', '/health')}`);
      if (pingResult.trim() !== '200') {
        throw new Error(`Server not responding correctly (HTTP ${pingResult.trim()})`);
      }
    } catch (pingError) {
      throw new Error('Server appears to be offline. Please start the server with: node server.js');
    }
    log.pass('Server is responding\n');

    // 3. Execute upload test
    log.test('3. Uploading test image...');
    const curlCommand = `curl -s -F "image=@${testImagePath}" ${serverUrl}`;
    
    log.info(`Executing: ${curlCommand}`);
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr && stderr.trim()) {
      log.warn(`curl stderr: ${stderr.trim()}`);
    }
    
    // 4. Parse and validate response
    log.test('4. Validating server response...');
    let response;
    try {
      response = JSON.parse(stdout);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);
    }
    
    // Check for successful upload
    if (response.success !== true) {
      throw new Error(`Upload failed: ${response.error || response.message || 'Unknown error'}`);
    }
    
    log.pass('Response parsed successfully\n');

    // 5. Display upload results
    log.test('5. Analyzing upload results...');
    console.log('        Upload Details:');
    console.log(`        - Original Name: ${response.data.originalname}`);
    console.log(`        - Server Filename: ${response.data.filename}`);
    console.log(`        - MIME Type: ${response.data.mimetype}`);
    console.log(`        - File Size: ${(response.data.size / 1024).toFixed(2)} KB`);
    console.log(`        - Server URL: ${response.data.url}`);
    
    log.pass('Upload details verified\n');

    // 6. Test file accessibility (optional)
    log.test('6. Testing uploaded file accessibility...');
    try {
      const fileUrl = `http://localhost:3000${response.data.url}`;
      const { stdout: fileCheck } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" "${fileUrl}"`);
      
      if (fileCheck.trim() === '200') {
        log.pass('Uploaded file is accessible');
      } else {
        log.warn(`File accessibility check returned HTTP ${fileCheck.trim()}`);
      }
    } catch (fileError) {
      log.warn('Could not verify file accessibility');
    }

    console.log('');
    log.pass('All upload tests passed!');
    
    // Display full response for debugging
    console.log('');
    log.info('Complete server response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    log.fail('Upload test failed:');
    console.error(`       Error: ${error.message}`);
    
    console.error('');
    log.help('Troubleshooting tips:');
    console.error('       - Ensure server is running: node server.js');
    console.error('       - Check server is listening on http://localhost:3000');
    console.error('       - Verify test image exists in tests/assets/ directory');
    console.error('       - Check server logs for detailed error information');
    console.error('       - Ensure database is properly configured and accessible');
    
    process.exit(1);
  }
};

// Run the test
testImageUpload();