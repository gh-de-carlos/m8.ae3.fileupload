#!/usr/bin/env node
/**
 * Status Script - Check server status using COOL logger
 */

import { log } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkStatus() {
  try {
    log.info('Checking server status...');
    
    const { stdout } = await execAsync('pgrep -f "node.*server.js"');
    
    if (stdout.trim()) {
      const pid = stdout.trim().split('\n')[0];
      log.pass(`Server is running (PID: ${pid})`);
      
      // Try to get additional info
      try {
        const { stdout: portInfo } = await execAsync(`lsof -i :3000 2>/dev/null | grep LISTEN`);
        if (portInfo) {
          log.ok('Server listening on port 3000');
        }
      } catch {
        log.info('Server process found, checking port availability...');
      }
      
    } else {
      log.info('Server is not running');
    }
    
  } catch (error) {
    log.info('Server is not running');
  }
}

checkStatus();