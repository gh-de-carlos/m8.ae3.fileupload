# Tests Directory

This directory contains test scripts for the M8.AE3 File Upload project.

## Available Tests

### `database.test.js`

Tests database connectivity and initialization.

**Purpose:**
- Verify PostgreSQL connection
- Initialize database tables (images_metadata, cleanup_queue)  
- Validate table creation and structure
- Test basic query execution

### `uploading.test.js`

Tests image upload functionality through the complete API flow.

**Purpose:**
- Verify server connectivity and availability
- Test image upload with multipart form data
- Validate server response format and content
- Check uploaded file accessibility
- Provide detailed logging for debugging

**Usage:**
```bash
# Run upload tests
npm run test:upload

# Or run directly
node tests/uploading.test.js

# Run database tests
npm test
npm run test:db
npm run db:init

# Or run directly
node tests/database.test.js
```

**Requirements:**
- Server running on http://localhost:3000 (start with: `node server.js`)
- PostgreSQL database properly configured and accessible
- Test image available in `tests/assets/` directory
- `curl` command available in system PATH

**Test Assets:**
- `tests/assets/img.1.png` (or img.1.jpg) - Primary test image
- `tests/assets/img.2.jpg` - Secondary test image  
- `tests/assets/malicious.image.png.js` - Security testing file

**Database Test Requirements:**
- PostgreSQL server running
- Valid `.env` file with database credentials
- Database `m8_img_server` exists

## Adding New Tests

When adding new test files:

1. Use descriptive filenames: `*.test.js`
2. Follow the ASCII logging pattern: `[INFO]`, `[TEST]`, `[PASS]`, `[FAIL]`, `[WARN]`
3. Include proper cleanup in `finally` blocks
4. Add npm script entries in `package.json`
5. Document the test purpose and usage in this README

## CI/CD Integration

These tests are designed to be:
- **Standalone** - No server startup required
- **Fast** - Quick connection and validation only
- **Reliable** - Proper error handling and cleanup
- **Informative** - Clear logging for debugging

Perfect for automated testing pipelines and development workflows.