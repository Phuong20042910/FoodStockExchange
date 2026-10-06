const https = require('https');
https.get('https://image.pollinations.ai/prompt/Takoyaki?width=400&height=400&nologo=true', (res) => {
  console.log('Status:', res.statusCode);
  process.exit(0);
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
