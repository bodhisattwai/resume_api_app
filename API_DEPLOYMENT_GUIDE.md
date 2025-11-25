# Production-Ready Text Extraction API Deployment Guide

## Overview
This document provides comprehensive deployment instructions for the upgraded, production-ready text extraction API service designed for n8n integration.

## 🚀 Key Features

- **Production-Ready Security**: HTTPS support, API key authentication, CORS, rate limiting
- **n8n Compatibility**: JSON responses designed for seamless n8n workflow integration
- **Enhanced Stability**: Comprehensive error handling, logging, and monitoring
- **File Processing**: PDF detection, text extraction, file size limits
- **Scalable Architecture**: Redis-ready rate limiting, configurable security settings

## 📋 Prerequisites

### Software Requirements
- Node.js 18+ 
- npm/yarn package manager
- SSL certificate (for HTTPS in production)
- Redis (optional, for production rate limiting)

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see Configuration section)

## 🔧 Configuration

### Environment Variables (.env.production)
```env
# Security
REQUIRE_API_KEY=true
API_KEYS=your-production-api-key-1,your-n8n-api-key

# Rate Limiting  
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=500

# File Processing
MAX_FILE_SIZE=104857600
MAX_TEXT_LENGTH=100000

# CORS
ALLOWED_ORIGINS=https://*.n8n.io,https://n8n.io,https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_REQUESTS=true
```

## 🛠️ Deployment Steps

### 1. Build the Application
```bash
npm run build
```

### 2. Start Production Server
```bash
npm start
```

### 3. Configure Reverse Proxy (nginx example)
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /api/extract-text {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔐 Security Configuration

### API Key Authentication
1. Generate secure API keys:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Configure in environment:
```env
API_KEYS=your-generated-key-1,your-generated-key-2
REQUIRE_API_KEY=true
```

### HTTPS Setup
1. Obtain SSL certificate (Let's Encrypt or commercial)
2. Configure your reverse proxy (nginx/Apache)
3. Test SSL configuration: `openssl s_client -connect your-domain.com:443`

## 📊 n8n Integration

### HTTP Request Node Configuration
```json
{
  "method": "POST",
  "url": "https://your-domain.com/api/extract-text",
  "authentication": "headerAuth",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "{{ $vars.API_KEY }}"
  },
  "body": {
    "fileUrl": "{{ $input.fileUrl }}"
  }
}
```

### Supported Input Formats

#### 1. File URL
```json
{
  "fileUrl": "https://example.com/document.pdf"
}
```

#### 2. Base64 Encoding
```json
{
  "fileBase64": "base64-encoded-content",
  "fileName": "document.pdf"
}
```

#### 3. n8n Binary Data
```json
{
  "binaryData": "{{ $input.binaryData }}",
  "fileName": "uploaded-file"
}
```

### Expected Response Format
**Success:**
```json
{
  "success": true,
  "data": {
    "extractedText": "Full text content...",
    "fileName": "document.pdf",
    "fileType": "pdf",
    "metadata": {
      "fileSize": 12345,
      "textLength": 567,
      "lines": 10
    },
    "truncated": false
  },
  "executionTime": "125ms"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "File too large",
    "type": "validation",
    "hint": "Maximum file size is 50MB"
  },
  "executionTime": "5ms"
}
```

## 🧪 Testing Procedures

### Local Testing
```bash
# Run comprehensive tests
node test-production-api.js

# Test specific endpoints
curl -X POST http://localhost:3000/api/extract-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"fileUrl":"https://example.com/test.txt"}'
```

### Production Testing
1. Verify HTTPS connectivity
2. Test API key authentication
3. Validate CORS headers
4. Check rate limiting behavior
5. Test file upload limits

## 📈 Monitoring & Logging

### Request Logs
The API logs all requests in JSON format:
```json
{
  "timestamp": "2025-11-25T10:30:00.000Z",
  "ip": "192.168.1.1",
  "method": "POST",
  "endpoint": "/api/extract-text",
  "userAgent": "n8n-workflow/1.0",
  "duration": "125ms",
  "success": true,
  "fileType": "pdf",
  "fileSize": 12345,
  "error": null
}
```

### Health Checks
Implement monitoring endpoints:
```javascript
// Add to your API routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

## 🔄 Rate Limiting Configuration

### In-Memory (Default)
- Window: 60 seconds
- Max requests: 100 per window

### Redis (Production)
Update the rate limiting function to use Redis:
```javascript
// Replace in-memory store with Redis client
const redisClient = require('redis').createClient(process.env.REDIS_URL);
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify ALLOWED_ORIGINS configuration
   - Check n8n domain matches allowed patterns

2. **Authentication Failures**
   - Validate API key headers
   - Check REQUIRE_API_KEY environment variable

3. **File Processing Errors**
   - Verify file size limits
   - Check supported file types

4. **Performance Issues**
   - Monitor request logs
   - Adjust rate limiting settings
   - Check server resources

### Debug Mode
Enable detailed logging for troubleshooting:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📞 Support

### API Documentation
- Base URL: `https://your-domain.com`
- Endpoint: `/api/extract-text`
- Methods: POST, OPTIONS

### Error Codes
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid API key)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## 🔮 Future Enhancements

### Planned Features
- [ ] OCR integration for image processing
- [ ] Advanced PDF text extraction
- [ ] Multiple language support
- [ ] Batching capabilities
- [ ] Webhook notifications

### Scalability Considerations
- Implement Redis for distributed rate limiting
- Add load balancing for high traffic
- Consider serverless deployment options
- Implement circuit breaker patterns

---

**Last Updated**: November 25, 2025  
**Version**: 1.0.1  
**Compatibility**: n8n 1.0+, Node.js 18+
**Build Status**: Fixed formidable dependency issue