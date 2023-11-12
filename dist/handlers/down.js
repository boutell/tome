"use strict";
import select from '../select.js';
export default ({ editor }) => ({
    keyName: 'down',
    do() {
        if (editor.row === (editor.chars.length - 1)) {
            return false;
        }
        return select({
            editor,
            move() {
                return editor.down();
            }
        });
    }
});
