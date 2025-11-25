# API Keys for Text Extraction API

## Your Generated API Keys

Here are the API keys I generated for you:

### 1. **Primary API Key** (for general use):
`c5634ee99511d1d3272b076fc595e701cf3d323abbfc7cafbf1bf356ab13b0b0`

### 2. **Backup API Key** (for backup services):
`a25742124980f435f6c547fe8d3285b15c1989fc224e51d73d70649475b29cba`

### 3. **n8n Integration Key** (for n8n workflows):
`2dd3f5497cf6e1320cd29dd77174496d4869eda736c671f3eec3edf9ef622015`

## How to Use These Keys

### For Testing (Right Now):
```javascript
// Use this in your test script
const API_KEY = 'c5634ee99511d1d3272b076fc595e701cf3d323abbfc7cafbf1bf356ab13b0b0';
```

### For n8n Integration:
- **Header Name**: `X-API-Key`
- **Header Value**: `2dd3f5497cf6e1320cd29dd77174496d4869eda736c671f3eec3edf9ef622015`

### For Production Deployment:
Add to your `.env.production` file:
```env
API_KEYS=c5634ee99511d1d3272b076fc595e701cf3d323abbfc7cafbf1bf356ab13b0b0,a25742124980f435f6c547fe8d3285b15c1989fc224e51d73d70649475b29cba,2dd3f5497cf6e1320cd29dd77174496d4869eda736c671f3eec3edf9ef622015
REQUIRE_API_KEY=true
```

## Quick Test Command
```bash
curl -X POST http://localhost:3000/api/extract-text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: c5634ee99511d1d3272b076fc595e701cf3d323abbfc7cafbf1bf356ab13b0b0" \
  -d '{"fileBase64":"dGVzdCBjb250ZW50","fileName":"test.txt"}'
```

**Note**: Keep these keys secure and don't share them publicly!    