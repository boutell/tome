"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import find from '../find.js';
export default ({ editor, clipboard, log }) => ({
    keyName: 'control-g',
    do(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor.lastFind == null) {
                return false;
            }
            const findArgs = Object.assign({}, editor.lastFind);
            if (findArgs.direction === 1) {
                findArgs.fromCol = findArgs.fromCol + 1;
                if (findArgs.fromCol === editor.chars[findArgs.fromRow].length) {
                    findArgs.fromCol = 0;
                    findArgs.fromRow++;
                    if (findArgs.fromRow === editor.chars.length) {
                        findArgs.fromRow = 0;
                    }
                }
            }
            else {
                findArgs.fromCol = findArgs.fromCol - 1;
                if (findArgs.fromCol < 0) {
                    findArgs.fromRow--;
                    if (findArgs.fromRow < 0) {
                        findArgs.fromRow = editor.chars.length - 1;
                    }
                    findArgs.fromCol = editor.chars[findArgs.fromRow].length - 1;
                }
            }
            const result = find(editor, findArgs);
            if (result) {
                editor.lastFind.fromRow = editor.row;
                editor.lastFind.fromCol = editor.col;
                editor.draw();
            }
            return result;
        });
    }
});
