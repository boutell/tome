"use strict";
export default ({ editor }) => ({
    keyName: 'control-left',
    do() {
        if (editor.col === 0) {
            return false;
        }
        while (!editor.sol()) {
            editor.back();
        }
        return true;
    }
});
