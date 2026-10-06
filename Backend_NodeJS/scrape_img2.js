const axios = require('axios');

async function searchImage(query) {
  try {
    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    console.log(res.data.Image);
  } catch(e) {
    console.log(e.message);
  }
}
searchImage('Mì tương đen');
