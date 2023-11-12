"use strict";
import select from '../select.js';
export default ({ editor }) => ({
    keyNames: ['control-down', 'control-p'],
    do() {
        if (editor.row === (editor.chars.length - 1)) {
            return false;
        }
        return select({
            editor,
            move() {
                editor.moveTo(Math.min(editor.row + editor.height, editor.chars.length - 1), editor.col);
                return true;
            }
        });
    }
});
