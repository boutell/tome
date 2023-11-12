var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as url from 'url';
import fs from 'fs';
import camelize from './camelize.js';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export default () => __awaiter(void 0, void 0, void 0, function* () {
    const languages = {};
    const names = fs.readdirSync(`${__dirname}/languages`);
    for (let name of names) {
        const language = yield import(`${__dirname}/languages/${name}`);
        name = camelize(name.replace('.js', ''));
        languages[name] = language;
    }
    return languages;
});
