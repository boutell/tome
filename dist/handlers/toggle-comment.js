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
import startsWith from '../starts-with.js';
export default ({ editor }) => ({
    keyName: 'c',
    selectionRequired: true,
    do() {
        return __awaiter(this, void 0, void 0, function* () {
            let { selected, selRow1, selCol1, selRow2, selCol2 } = editor.getSelection();
            editor.moveTo(selRow1, 0);
            editor.selRow = selRow2;
            editor.selCol = editor.chars[selRow2].length;
            if (selCol2 === 0) {
                selRow2--;
                editor.selCol = 0;
            }
            const undo = {
                action: 'toggleComment',
                row: editor.row,
                col: editor.col,
                selRow: editor.selRow,
                selCol: editor.selCol,
                chars: []
            };
            const isComment = editor.language.isComment(editor.chars[selRow1]);
            const commentLine = [...editor.language.commentLine, ' '];
            for (let row = selRow1; (row <= selRow2); row++) {
                const chars = editor.chars[row];
                if (isComment) {
                    for (let col = 0; (col < chars.length); col++) {
                        if (startsWith(chars, col, commentLine)) {
                            undo.chars[row] = [...chars];
                            editor.chars[row] = [...chars.slice(0, col), ...chars.slice(col + commentLine.length)];
                        }
                    }
                }
                else {
                    for (let col = 0; (col < chars.length); col++) {
                        if (chars[col] !== ' ') {
                            undo.chars[row] = [...chars];
                            editor.chars[row] = [...chars.slice(0, col), ...commentLine, ...chars.slice(col)];
                            break;
                        }
                    }
                }
            }
            return {
                selecting: true,
                undo
            };
        });
    },
    undo(undo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.setSelection(undo);
            for (const [row, chars] of Object.entries(undo.chars)) {
                editor.chars[row] = [...chars];
            }
        });
    },
    redo(redo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.setSelection(redo);
            editor.handlers.toggleComment.do();
        });
    }
});
