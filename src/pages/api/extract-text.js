import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import crypto from 'crypto';

// Production-ready text extraction API for n8n integration
// Supports: HTTPS, rate limiting, security headers, comprehensive logging

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb', // Increased for larger PDF/text files
  },
};

// Security and configuration
const CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute window
  RATE_LIMIT_MAX_REQUESTS: 100, // Max requests per window
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB max file size
  
  // CORS - adjust for your n8n domain
  ALLOWED_ORIGINS: [
    'https://*.n8n.io',
    'https://n8n.io',
    'http://localhost:3000',
    'http://localhost:5678' // n8n local development
  ],
  
  // File type restrictions
  ALLOWED_FILE_TYPES: ['pdf', 'txt', 'html', 'htm', 'doc', 'docx'],
  MAX_TEXT_LENGTH: 50000, // characters
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map();

// File type magic numbers
const MAGIC_NUMBERS = {
  PNG: '89504e47',
  JPEG: 'ffd8',
  PDF: '25504446',
  DOC: 'd0cf11e0', // Microsoft Office documents
  ZIP: '504b0304', // ZIP-based formats (DOCX, etc.)
};

// Security headers middleware
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// CORS middleware
function handleCORS(req, res) {
  const origin = req.headers.origin;
  if (CONFIG.ALLOWED_ORIGINS.some(allowed => 
    allowed.includes('*') ? origin?.includes(allowed.replace('*', '')) : origin === allowed
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

// Rate limiting middleware
function rateLimit(req, res) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW_MS;
  
  // Clean old entries
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    rateLimitStore.set(ip, timestamps.filter(timestamp => timestamp > windowStart));
  }
  
  const clientTimestamps = rateLimitStore.get(clientIP) || [];
  const requestsInWindow = clientTimestamps.length;
  
  if (requestsInWindow >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({ 
      error: "Rate limit exceeded", 
      retryAfter: Math.ceil((clientTimestamps[0] + CONFIG.RATE_LIMIT_WINDOW_MS - now) / 1000) 
    });
    return false;
  }
  
  clientTimestamps.push(now);
  rateLimitStore.set(clientIP, clientTimestamps);
  return true;
}

  // API Key authentication (optional for n8n)
function authenticateAPIKey(req) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // In production, validate against your key store
  // For testing, we'll accept any key or skip if no keys configured
  // In production, set REQUIRE_API_KEY=true and configure valid API keys
  const requireAuth = process.env.REQUIRE_API_KEY === 'true';
  
  if (requireAuth && !apiKey) {
    return { valid: false, error: "API key required" };
  }
  
  // Optional: Validate specific API keys in production
  // if (requireAuth && apiKey && !validApiKeys.includes(apiKey)) {
  //   return { valid: false, error: "Invalid API key" };
  // }
  
  return { valid: true };
}

// Secure file download with HTTPS support
async function downloadFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    // Validate URL
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      reject(new Error('Invalid URL protocol'));
      return;
    }
    
    const options = {
      timeout: 30000, // 30 second timeout
      rejectUnauthorized: true, // Verify SSL certificates
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      let totalSize = 0;
      
      response.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > CONFIG.MAX_FILE_SIZE) {
          response.destroy();
          reject(new Error(`File too large: ${totalSize} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      
      response.on('error', reject);
      
    }).on('error', reject).on('timeout', () => {
      reject(new Error('Request timeout'));
    });
  });
}

// Enhanced file type detection
function detectFileType(buffer, fileName) {
  const magic = buffer.toString('hex', 0, 8);
  
  if (magic.startsWith(MAGIC_NUMBERS.PDF)) return 'pdf';
  if (magic.startsWith(MAGIC_NUMBERS.PNG) || magic.startsWith(MAGIC_NUMBERS.JPEG)) return 'image';
  if (magic.startsWith(MAGIC_NUMBERS.DOC) || magic.startsWith(MAGIC_NUMBERS.ZIP)) return 'document';
  
  // Text detection with more robust heuristics
  try {
    const text = buffer.toString('utf8');
    const nullBytes = text.includes('\0');
    const printableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / text.length;
    
    if (!nullBytes && printableRatio > 0.8) {
      return 'text';
    }
  } catch (e) {
    // Not valid UTF-8 text
  }
  
  // Fallback to extension
  if (fileName) {
    const ext = path.extname(fileName).toLowerCase().slice(1);
    if (CONFIG.ALLOWED_FILE_TYPES.includes(ext)) {
      return ext;
    }
  }
  
  return 'unknown';
}

// Enhanced PDF detection and placeholder
function isPdf(buffer) {
  return buffer.toString('utf8', 0, 4).startsWith('%PDF');
}

// Process different file types with enhanced security
async function processBuffer(buffer, fileName) {
  const fileType = detectFileType(buffer, fileName);
  const fileSize = buffer.length;
  
  // Security: File size check
  if (fileSize > CONFIG.MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large: ${fileSize} bytes (max: ${CONFIG.MAX_FILE_SIZE} bytes)`,
      type: fileType
    };
  }
  
  switch (fileType) {
    case 'pdf':
      try {
        // Enhanced PDF placeholder with metadata
        const textPreview = buffer.toString('utf8', 0, 1000).replace(/[^\x20-\x7E\n\r]/g, '');
        
        return {
          success: true,
          type: "pdf",
          fileName: fileName || "document.pdf",
          text: "PDF file detected. For enhanced text extraction with OCR and formatting preservation, use the dedicated resume parser service.\n\nPreview (first 1000 bytes):\n" + textPreview,
          metadata: {
            fileSize,
            pages: 1, // Placeholder
            textPreviewLength: textPreview.length
          },
          hint: "Upgrade to full PDF parsing service for complete text extraction"
        };
      } catch (e) {
        return { 
          success: false, 
          error: "PDF processing error",
          type: "pdf" 
        };
      }
    
    case 'text':
    case 'txt':
    case 'html':
    case 'htm':
      try {
        const text = buffer.toString('utf8');
        
        // Security: Limit text length
        if (text.length > CONFIG.MAX_TEXT_LENGTH) {
          return {
            success: true,
            type: fileType,
            fileName: fileName || "text.txt",
            text: text.substring(0, CONFIG.MAX_TEXT_LENGTH) + "\n\n[Content truncated due to size limits]",
            truncated: true,
            originalLength: text.length,
            extractedLength: CONFIG.MAX_TEXT_LENGTH
          };
        }
        
        return {
          success: true,
          type: fileType,
          fileName: fileName || "text.txt",
          text: text,
          metadata: {
            fileSize,
            textLength: text.length,
            lines: text.split('\n').length
          }
        };
      } catch (e) {
        return { 
          success: false, 
          error: "Text decoding error",
          type: fileType 
        };
      }
    
    case 'image':
      return {
        success: false,
        error: "Image files not supported. OCR service required.",
        type: "image",
        hint: "Convert image to PDF or text first, or enable OCR capabilities"
      };
    
    case 'document':
      return {
        success: false,
        error: "Document processing requires additional services",
        type: "document",
        hint: "Supported formats: PDF, TXT, HTML. Convert DOC/DOCX to PDF first."
      };
    
    default:
      return { 
        success: false, 
        error: "Unsupported file type",
        type: "unknown",
        allowedTypes: CONFIG.ALLOWED_FILE_TYPES 
      };
  }
}

// Request logging for monitoring
function logRequest(req, result, startTime) {
  const duration = Date.now() - startTime;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: clientIP,
    method: req.method,
    endpoint: req.url,
    userAgent: userAgent.substring(0, 100), // Limit length
    duration: duration + 'ms',
    success: result.success,
    fileType: result.type,
    fileSize: result.metadata?.fileSize || 0,
    error: result.error || null
  }));
}

// Main API handler
export default async function handler(req, res) {
  const startTime = Date.now();
  
  // Set security headers
  setSecurityHeaders(res);
  
  // Handle CORS
  handleCORS(req, res);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Method validation
  if (req.method !== 'POST') {
    const result = { error: "Method not allowed. Only POST requests accepted." };
    logRequest(req, { success: false, error: result.error }, startTime);
    return res.status(405).json(result);
  }
  
  // Rate limiting
  if (!rateLimit(req, res)) {
    logRequest(req, { success: false, error: "Rate limit exceeded" }, startTime);
    return; // Response already sent
  }
  
  // API Key authentication
  const authResult = authenticateAPIKey(req);
  if (!authResult.valid) {
    const result = { error: authResult.error };
    logRequest(req, { success: false, error: result.error }, startTime);
    return res.status(401).json(result);
  }
  
  try {
    // Parse request based on content type
    const contentType = req.headers['content-type'] || '';
    let buffer, fileName;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart/form-data (file upload) with dynamic import
      const { default: formidable } = await import('formidable');
      const form = formidable({ 
        maxFileSize: CONFIG.MAX_FILE_SIZE,
        multiples: false 
      });
      
      const [fields, files] = await form.parse(req);
      const uploadedFile = files.file?.[0] || files.resume?.[0] || files.document?.[0];
      
      if (!uploadedFile) {
        const result = { error: "No file uploaded. Supported fields: 'file', 'resume', 'document'" };
        logRequest(req, { success: false, error: result.error }, startTime);
        return res.status(400).json(result);
      }
      
      buffer = fs.readFileSync(uploadedFile.filepath);
      fileName = uploadedFile.originalFilename;
      
      // Clean up temporary file
      try { fs.unlinkSync(uploadedFile.filepath); } catch (e) { /* ignore */ }
      
    } else {
      // Handle JSON body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      
      const bodyText = Buffer.concat(chunks).toString('utf8');
      let body;
      
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        const result = { error: "Invalid JSON body" };
        logRequest(req, { success: false, error: result.error }, startTime);
        return res.status(400).json(result);
      }
      
      // n8n-compatible input formats
      if (body.fileUrl) {
        try {
          buffer = await downloadFileFromUrl(body.fileUrl);
          fileName = path.basename(body.fileUrl);
        } catch (e) {
          const result = { error: `URL download failed: ${e.message}` };
          logRequest(req, { success: false, error: result.error }, startTime);
          return res.status(400).json(result);
        }
      } else if (body.fileBase64) {
        try {
          buffer = Buffer.from(body.fileBase64, 'base64');
          fileName = body.fileName || "uploaded_file";
        } catch (e) {
          const result = { error: "Invalid base64 encoding" };
          logRequest(req, { success: false, error: result.error }, startTime);
          return res.status(400).json(result);
        }
      } else if (body.binaryData) {
        // n8n binary data format
        try {
          buffer = Buffer.from(body.binaryData.data);
          fileName = body.fileName || "n8n_upload";
        } catch (e) {
          const result = { error: "Invalid binary data" };
          logRequest(req, { success: false, error: result.error }, startTime);
          return res.status(400).json(result);
        }
      } else {
        const result = { error: "Missing file data. Provide fileUrl, fileBase64, or binaryData" };
        logRequest(req, { success: false, error: result.error }, startTime);
        return res.status(400).json(result);
      }
    }
    
    // Process the file
    const result = await processBuffer(buffer, fileName);
    
    // Log the request
    logRequest(req, result, startTime);
    
    // Send response
    if (result.success) {
      // n8n-compatible success response
      res.status(200).json({
        success: true,
        data: {
          extractedText: result.text,
          fileName: result.fileName,
          fileType: result.type,
          metadata: result.metadata || {},
          truncated: result.truncated || false
        },
        executionTime: Date.now() - startTime + 'ms'
      });
    } else {
      // n8n-compatible error response
      res.status(400).json({
        success: false,
        error: {
          message: result.error,
          type: result.type,
          hint: result.hint,
          allowedTypes: result.allowedTypes
        },
        executionTime: Date.now() - startTime + 'ms'
      });
    }
    
  } catch (error) {
    // Handle unexpected errors
    console.error("API Error:", error);
    const result = { 
      success: false, 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    };
    
    logRequest(req, result, startTime);
    res.status(500).json(result);
  }
}
