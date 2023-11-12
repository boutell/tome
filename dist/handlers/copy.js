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
    keyName: 'control-c',
    do(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const { selected, selRow1, selCol1, selRow2, selCol2 } = editor.getSelection();
            if (!selected) {
                return false;
            }
            const chars = editor.getSelectionChars();
            yield clipboard.set(chars);
            editor.selectMode = false;
            return true;
        });
    }
});
