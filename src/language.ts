export default interface Language {
  extensions: Array<string>;
  parse(state: any, char: string, state: { log: (...args: Array<any>) => void, row: number, col: number }): void;
  newState(): any;
  shouldCloseBlock(state: any, char: string): boolean;
  style(state: any): false | string;
  styleBehind(state: any): false | string;
  isComment(chars: Array<string>): boolean;
  commentLine: Array<string>;
}
