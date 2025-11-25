const nodeFetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Handle node-fetch v3+ ESM exports
const fetch = nodeFetch.default || nodeFetch;

const API_URL = 'http://localhost:3000/api/extract-text';
const API_KEY = 'test-api-key'; // For testing authentication

// Test files
const PDF_PATH = path.join(__dirname, 'public', 'resume-example', 'laverne-resume.pdf');
const TEXT_PATH = path.join(__dirname, 'test-production.txt');

// Utility function for making authenticated requests
async function apiRequest(body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'User-Agent': 'Production-API-Test/1.0'
  };
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

// Test 1: PDF Processing with Enhanced Response
async function testPDFProcessing() {
  console.log('🧪 Test 1: PDF Processing with Enhanced Response');
  
  const buffer = fs.readFileSync(PDF_PATH);
  const base64 = buffer.toString('base64');
  
  const { status, data } = await apiRequest({
    fileBase64: base64,
    fileName: 'resume.pdf'
  });
  
  console.log(`Status: ${status}`);
  console.log(`Success: ${data.success}`);
  
  if (data.success) {
    console.log('✅ PDF processed successfully');
    console.log(`File Type: ${data.data.fileType}`);
    console.log(`Text Preview: ${data.data.extractedText.substring(0, 200)}...`);
    console.log(`Metadata:`, data.data.metadata);
  } else {
    console.log('❌ PDF processing failed:', data.error);
  }
  
  console.log('---');
}

// Test 2: Text File Processing
async function testTextProcessing() {
  console.log('🧪 Test 2: Text File Processing');
  
  // Create a test text file with various content
  const textContent = `
Sample Resume Text Extraction Test
==================================

Name: John Doe
Email: john.doe@example.com
Phone: +1-555-0123

Experience:
- Senior Developer at Tech Corp (2020-Present)
- Full Stack Developer at Startup Inc (2018-2020)

Skills: JavaScript, TypeScript, React, Node.js, Python

Education:
- Bachelor of Science in Computer Science, University of Example (2014-2018)

This is a comprehensive test of the text extraction API with multiple lines and special characters.
  `.trim();
  
  fs.writeFileSync(TEXT_PATH, textContent);
  const buffer = fs.readFileSync(TEXT_PATH);
  const base64 = buffer.toString('base64');
  
  const { status, data } = await apiRequest({
    fileBase64: base64,
    fileName: 'resume.txt'
  });
  
  console.log(`Status: ${status}`);
  console.log(`Success: ${data.success}`);
  
  if (data.success) {
    console.log('✅ Text processed successfully');
    console.log(`File Type: ${data.data.fileType}`);
    console.log(`Lines: ${data.data.metadata.lines}`);
    console.log(`Text Length: ${data.data.metadata.textLength} characters`);
    console.log(`First 150 chars: ${data.data.extractedText.substring(0, 150)}...`);
  } else {
    console.log('❌ Text processing failed:', data.error);
  }
  
  console.log('---');
}

// Test 3: Authentication (Missing API Key)
async function testAuthentication() {
  console.log('🧪 Test 3: Authentication Test');
  
  const buffer = fs.readFileSync(TEXT_PATH);
  const base64 = buffer.toString('base64');
  
  // Request without API key
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64: base64,
      fileName: 'test.txt'
    })
  });
  
  const data = await response.json();
  console.log(`Status: ${response.status}`);
  
  if (response.status === 401) {
    console.log('✅ Authentication working correctly');
    console.log('Error:', data.error);
  } else {
    console.log('❌ Authentication test failed - API key requirement not enforced');
    console.log('Response:', data);
  }
  
  console.log('---');
}

// Test 4: File Size Limits
async function testFileSizeLimits() {
  console.log('🧪 Test 4: File Size Limit Test');
  
  // Create a large text file
  const largeContent = 'X'.repeat(60 * 1024 * 1024); // 60MB (should exceed default limit)
  const largeBuffer = Buffer.from(largeContent);
  const base64 = largeBuffer.toString('base64');
  
  const { status, data } = await apiRequest({
    fileBase64: base64,
    fileName: 'large-file.txt'
  });
  
  console.log(`Status: ${status}`);
  
  if (!data.success && data.error && data.error.message && data.error.message.includes('too large')) {
    console.log('✅ File size limits working correctly');
    console.log('Error:', data.error);
  } else {
    console.log('❌ File size limit test failed');
  }
  
  console.log('---');
}

// Test 5: CORS and Security Headers
async function testCORSandSecurity() {
  console.log('🧪 Test 5: CORS and Security Headers Test');
  
  const response = await fetch(API_URL, {
    method: 'OPTIONS', // Preflight request
    headers: {
      'Origin': 'https://n8n.io',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, X-API-Key'
    }
  });
  
  console.log('OPTIONS Status:', response.status);
  console.log('CORS Headers:');
  response.headers.forEach((value, name) => {
    if (name.toLowerCase().includes('access-control') || name.toLowerCase().includes('security')) {
      console.log(`  ${name}: ${value}`);
    }
  });
  
  console.log('---');
}

// Test 6: Error Handling (Invalid File)
async function testErrorHandling() {
  console.log('🧪 Test 6: Error Handling - Invalid File');
  
  const { status, data } = await apiRequest({
    fileBase64: 'invalid-base64-data',
    fileName: 'test.bin'
  });
  
  console.log(`Status: ${status}`);
  
  if (!data.success) {
    console.log('✅ Error handling working correctly');
    console.log('Error:', data.error);
    if (data.error.hint) {
      console.log('Hint:', data.error.hint);
    }
  } else {
    console.log('❌ Error handling test failed');
  }
  
  console.log('---');
}

// Test 7: n8n-Compatible Response Format
async function testN8nResponseFormat() {
  console.log('🧪 Test 7: n8n-Compatible Response Format');
  
  const buffer = fs.readFileSync(TEXT_PATH);
  const base64 = buffer.toString('base64');
  
  const { status, data } = await apiRequest({
    fileBase64: base64,
    fileName: 'n8n-test.txt'
  });
  
  console.log(`Status: ${status}`);
  
  if (data.success) {
    console.log('✅ n8n response format correct');
    console.log('Response structure:');
    console.log('- success:', data.success);
    console.log('- data.extractedText:', typeof data.data.extractedText);
    console.log('- data.fileName:', data.data.fileName);
    console.log('- data.fileType:', data.data.fileType);
    console.log('- data.metadata:', typeof data.data.metadata);
    console.log('- executionTime:', data.executionTime);
  } else {
    console.log('❌ n8n response format test failed');
  }
  
  console.log('---');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Production API Tests\n');
  
  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 3000));
  
  try {
    await testPDFProcessing();
    await testTextProcessing();
    await testAuthentication();
    await testFileSizeLimits();
    await testCORSandSecurity();
    await testErrorHandling();
    await testN8nResponseFormat();
    
    console.log('🎉 All tests completed!');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

runAllTests();