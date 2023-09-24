import * as url from 'url';
import fs from 'fs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export default async () => {
  const handlers = {};
  const names = fs.readdirSync(`${__dirname}/handlers`);
  for (let name of names) {
    const handler = await import(`${__dirname}/handlers/${name}`);
    name = camelize(name.replace('.js', ''));
    handlers[name] = handler.default;
  }
  return handlers;
};

function camelize(s) {
  const words = s.split('-');
  let result = '';
  for (let i = 0; (i < words.length); i++) {
    if (i > 0) {
      result += words[i].charAt(0).toUpperCase() + words[i].substring(1);
    } else {
      result += words[i];
    }
  }
  return result;
}
