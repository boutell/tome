import * as url from 'url';
import fs from 'fs';
import camelize from './camelize.js';
import Language from './language.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export default async (): Record<string, Language> => {
  const languages = {};
  const names = fs.readdirSync(`${__dirname}/languages`);
  for (let name of names) {
    const language = await import(`${__dirname}/languages/${name}`);
    name = camelize(name.replace('.js', ''));
    languages[name] = language;
  }
  return languages;
};
