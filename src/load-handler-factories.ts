import * as url from 'url';
import fs from 'fs';
import camelize from './camelize.js';

export type Undo = {
  type: string,
  [propName: string]: any
}
export type HandlerResult = true | false | {
  selecting: Boolean | undefined,
  appending: Boolean | undefined,
  undo: Undo | undefined
}
export type Handler = {
  keyName?: string,
  keyNames?: Array<string>,
  do: () => HandlerResult,
  undo?: (undo: Undo) => void,
  redo?: (undo: Undo) => void
};
export type Handlers = Record<string,Handler>;
export type HandlerFactory = ({
  editor : Editor,
  clipboard ?: Clipboard,
  log ?: Log,
  selectorsByName ?: Record<string,string>
}) => Handler;
export type HandlerFactories = Record<string,HandlerFactory>;

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export async function loadHandlerFactories() : HandlerFactories {
  const handlerFactories : HandlerFactories = {};
  const names = fs.readdirSync(`${__dirname}/handlers`);
  for (let name of names) {
    const handlerFactory : HandlerFactory = await import(`${__dirname}/handlers/${name}`);
    name = camelize(name.replace('.js', ''));
    handlerFactories[name] = handlerFactory.default;
  }
  return handlerFactories;
};
