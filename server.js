/**
 * M8.AE3 File Upload Server
 * "Enterprise-grade" (I think 😅) file upload service with transactional operations
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration and lifecycle
import { startServer, setupServerShutdown } from './config/serverConfig.js';

// Controllers  
import { getApiDocumentation, healthCheck, welcome } from './controllers/rootController.js';
import { 
  securityHeaders,
  requestLogger, 
  notFoundHandler, 
  errorHandler 
} from './controllers/middlewareController.js';

// Routes
import imageRoutes from './routes/imageRoutes.js';

// ES Modules __dirname equivalent  
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app initialization
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE STACK
// ============================================================================

app.use(securityHeaders);                           // Security headers
app.use(requestLogger);                             // HTTP request logging
app.use(express.json({ limit: '1mb' }));            // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // URL encoded parsing

// Static file serving (for uploaded files)
app.use('/static', express.static(path.join(__dirname, 'uploads')));

// ============================================================================
// API ROUTES
// ============================================================================

app.get('/', welcome);                             // Welcome endpoint with COOL reference
app.get('/health', healthCheck);                   // Health check endpoint
app.get('/api', getApiDocumentation);              // API documentation  
app.use('/images', imageRoutes);                   // Image upload/delete routes
app.use(notFoundHandler);                          // 404 handler
app.use(errorHandler);                             // Error handling (must be last)

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

(async () => {
  const server = await startServer(app, PORT);
  setupServerShutdown(server);
})();
