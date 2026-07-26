const https = require('https');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const username = process.argv[2] || 'jci_sidi_mansour';
  try {
    const html = await fetchHTML(`https://www.instagram.com/${username}/`);
    const hasOG = html.includes('og:title');
    const data = hasOG ? {
      ogTitle: (html.match(/og:title[^>]+content="([^"]+)"/) || [])[1] || '',
      ogDesc: (html.match(/og:description[^>]+content="([^"]+)"/) || [])[1] || '',
      ogImage: (html.match(/og:image[^>]+content="([^"]+)"/i) || [])[1] || '',
      source: 'meta',
    } : { source: 'default' };
    data.length = html.length;
    console.log(JSON.stringify(data));
  } catch (e) {
    console.log(JSON.stringify({ source: 'default', error: e.message }));
  }
}

main();
