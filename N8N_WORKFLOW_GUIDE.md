# n8n Workflow Guide for Text Extraction API

## Overview
This guide provides step-by-step instructions for setting up and running n8n workflows to test your production-ready Text Extraction API.

## 📋 Prerequisites

### Required Before Starting:
1. **n8n Instance**: Self-hosted or n8n.cloud account
2. **Deployed API**: Your Vercel deployment URL
3. **API Keys**: Use the n8n-specific key from `API_KEYS.md`

### Your Configuration Values:
- **API Base URL**: `https://your-vercel-domain.vercel.app` (replace with your actual domain)
- **n8n API Key**: `2dd3f5497cf6e1320cd29dd77174496d4869eda736c671f3eec3edf9ef622015`

## 🚀 Quick Start - Manual Test

### 1. Import Quick Test Workflow
1. Open your n8n instance
2. Go to **Workflows** → **Import from file**
3. Upload: `n8n-quick-test.json`
4. Update the API URL in the "Text Extraction API" node:
   - Replace `https://your-vercel-domain.vercel.app` with your actual Vercel domain

### 2. Run the Test
1. Click **Execute Workflow** button
2. Wait for the results
3. Check the output in the "Process Results" node

### Expected Successful Output:
```json
{
  "status": "✅ SUCCESS",
  "fileName": "n8n-test-file.txt",
  "fileType": "text",
  "textLength": 87,
  "lines": 1,
  "executionTime": "125ms",
  "extractedTextPreview": "Hello World! This is a test text file for the n8n workflow. It has multiple lines and various content...."
}
```

## 🔄 Production Test Workflow

### 1. Import Production Test Workflow
1. Upload: `n8n-test-workflow.json`
2. Update variables in the workflow settings:
   - **API_BASE_URL**: Your actual Vercel domain
   - **TEST_PDF_URL**: A real PDF URL for testing

### 2. Configure Variables
Edit workflow variables:
```json
{
  "API_BASE_URL": "https://your-actual-domain.vercel.app",
  "API_KEY": "2dd3f5497cf6e1320cd29dd77174496d4869eda736c671f3eec3edf9ef622015",
  "TEST_PDF_URL": "https://example.com/real-resume.pdf"
}
```

### 3. Tests Included in Production Workflow

#### Test 1: PDF URL Extraction
- Tests downloading and processing PDF from URL
- Validates file type detection and text extraction

#### Test 2: Base64 Text Extraction  
- Tests direct base64 encoded text processing
- Validates metadata (line count, text length)

#### Test 3: Image File Rejection
- Tests security by rejecting unsupported image files
- Validates error handling for invalid file types

#### Test 4: Authentication
- Tests API key authentication
- Validates security by rejecting requests without API key

## 🛠️ Workflow Customization

### Adding New Test Cases

#### Example: Test Large File Handling
```json
{
  "parameters": {
    "authentication": "headerAuth",
    "bodyParameters": {
      "parameters": [
        {
          "name": "fileBase64",
          "value": "={{ 'large_base64_content_here' }}"
        }
      ]
    },
    "method": "POST",
    "url": "={{ $vars.API_BASE_URL }}/api/extract-text"
  }
}
```

### Modifying Response Processing
Edit the JavaScript code in "Process Results" nodes to:
- Add custom validation logic
- Extract specific data fields
- Implement business rules

## 📊 Monitoring and Alerts

### Success/Failure Notifications
The production workflow includes email notifications:
- **Success**: All tests passed
- **Failure**: One or more tests failed

### Custom Alert Channels
You can add additional notification nodes:
- **Slack**: For team notifications
- **Webhook**: For integration with monitoring systems
- **SMS**: For critical failures

## 🔒 Security Considerations

### API Key Security
- Store API keys in n8n variables (not in workflow JSON)
- Use different keys for different environments
- Rotate keys regularly

### Request Security
- Always use HTTPS
- Validate responses before processing
- Implement retry logic for transient failures

## 🚨 Troubleshooting

### Common Issues

#### 1. Connection Timeout
**Symptoms**: Request hangs or times out
**Solution**: 
- Check API URL is correct
- Verify network connectivity
- Increase timeout in HTTP Request node

#### 2. Authentication Failure
**Symptoms**: 401 Unauthorized errors
**Solution**:
- Verify API key is correct
- Check header name is `X-API-Key`
- Ensure `REQUIRE_API_KEY=true` in production

#### 3. Invalid Response Format
**Symptoms**: JSON parsing errors
**Solution**:
- Check API is returning valid JSON
- Validate response structure in code node
- Add error handling for malformed responses

### Debug Steps
1. **Test API Directly**:
   ```bash
   curl -X POST https://your-domain.com/api/extract-text \
     -H "X-API-Key: your-key" \
     -d '{"fileBase64":"dGVzdA=="}'
   ```

2. **Check n8n Execution Logs**:
   - View detailed execution history
   - Examine input/output for each node

3. **Validate Workflow Variables**:
   - Confirm all variables are set correctly
   - Check for typos in URLs and keys

## 📈 Performance Optimization

### Best Practices
1. **Batch Processing**: Process multiple files in parallel
2. **Caching**: Cache frequent requests when appropriate
3. **Error Handling**: Implement retry logic for transient failures
4. **Monitoring**: Track API response times and success rates

### Rate Limiting
- Respect API rate limits (500 requests/minute)
- Implement backoff for rate limit errors
- Monitor usage through API response headers

## 🌐 Integration Examples

### Example: Resume Processing Pipeline
```json
{
  "workflow": [
    "Upload Resume (PDF)",
    "Extract Text via API",
    "Parse Resume Data",
    "Store in Database",
    "Send Notification"
  ]
}
```

### Example: Document Processing Service
```json
{
  "workflow": [
    "Receive Document URL",
    "Extract Text via API",
    "Analyze Content",
    "Generate Summary",
    "Update CRM"
  ]
}
```

## 🔮 Future Enhancements

### Planned Workflow Features
- [ ] Real-time monitoring dashboard
- [ ] Automated performance testing
- [ ] Multi-environment testing (dev/staging/prod)
- [ ] Advanced error analysis and reporting

### Integration Opportunities
- **CRM Systems**: Auto-process uploaded documents
- **HR Platforms**: Resume parsing and scoring
- **Content Management**: Text extraction for SEO
- **Data Analysis**: Document content analysis

---

**Last Updated**: November 25, 2025  
**Compatibility**: n8n 1.0+, Text Extraction API v1.0+

## 📞 Support
For workflow issues:
1. Check n8n community forums
2. Review API documentation
3. Test with simple curl commands first
4. Examine execution logs for detailed errors