const axios = require('axios');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const username = process.argv[2] || 'jci_sidi_mansour';
  try {
    const res = await axios.get(`https://www.instagram.com/${username}/`, {
      timeout: 10000,
      responseType: 'text',
      responseEncoding: 'utf8',
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const hasOG = html.includes('og:title');
    console.log(JSON.stringify({
      source: hasOG ? 'meta' : 'default',
      length: html.length,
      ogTitle: hasOG ? (html.match(/og:title[^>]+content="([^"]+)"/) || [])[1] || '' : '',
    }));
  } catch (e) {
    console.log(JSON.stringify({ source: 'default', error: e.message }));
  }
}

main();
