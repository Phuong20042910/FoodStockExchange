const axios = require('axios');

async function searchImage(query) {
  try {
    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    console.log(res.data.Image);
    
    // DuckDuckGo API only returns an image if there is an exact wiki match. 
  } catch(e) {
    console.log(e.message);
  }
}
searchImage('Takoyaki');
