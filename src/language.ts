export default interface Language {
  extensions: Array<string>;
  parse(state: any, char: string): void;
  newState(): any;
  shouldCloseBlock(state: any, char: string): boolean;
  style(state: any): false | string;
  styleBehind(state: any): false | string;
  isComment(chars: Array<string>): boolean;
  commentLine: Array<string>;
}
