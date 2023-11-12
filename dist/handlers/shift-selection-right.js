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
export default ({ editor }) => ({
    keyName: ']',
    selectionRequired: true,
    do() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                selecting: true,
                undo: editor.shiftSelection(1)
            };
        });
    },
    undo(undo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.setSelection(undo);
            for (const [row, chars] of Object.entries(undo.chars)) {
                editor.chars[row] = chars;
            }
        });
    },
    redo(redo) {
        return __awaiter(this, void 0, void 0, function* () {
            editor.setSelection(redo);
            return editor.handlers.shiftSelectionLeft.do();
        });
    }
});
