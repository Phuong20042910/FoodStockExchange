const https = require('https');
https.get('https://picsum.photos/400/400', (res) => {
  console.log('Status:', res.statusCode);
  process.exit(0);
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
