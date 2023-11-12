import * as url from 'url';
import fs from 'fs';
import camelize from './camelize.js';

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
