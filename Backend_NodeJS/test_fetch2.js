const https = require('https');
https.get('https://loremflickr.com/400/400/drink', (res) => {
  console.log('Status:', res.statusCode);
  process.exit(0);
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
