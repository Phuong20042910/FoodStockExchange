const https = require('https');
https.get('https://image.pollinations.ai/prompt/Takoyaki?width=400&height=400&nologo=true', (res) => {
  console.log('Pollinations Status:', res.statusCode);
});

https.get('https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=Takoyaki', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Wiki:', data.substring(0, 100)));
});
