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
export default ({ editor, clipboard }) => ({
    keyName: 'control-v',
    do(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const eraseSelectionUndo = {};
            editor.eraseSelection(eraseSelectionUndo);
            const chars = yield clipboard.get();
            if (chars === false) {
                return false;
            }
            const undo = {
                action: 'paste',
                row: editor.row,
                col: editor.col,
                chars,
                erasedChars: eraseSelectionUndo.chars
            };
            editor.insert(chars);
            undo.rowAfter = editor.row;
            undo.colAfter = editor.col;
            return {
                undo
            };
        });
    },
    undo(undo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.moveTo(undo.rowAfter, undo.colAfter);
            for (let i = 0; (i < undo.chars.length); i++) {
                editor.back();
                editor.erase();
            }
            if (undo.erasedChars) {
                editor.insert(undo.erasedChars);
            }
        });
    },
    redo(redo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.moveTo(editor.row, editor.col);
            return editor.handlers.paste.do();
        });
    }
});
