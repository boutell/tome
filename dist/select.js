"use strict";
export default ({ editor, move }) => {
    const _row = editor.row, _col = editor.col;
    if (!move()) {
        return false;
    }
    if (!editor.selectMode) {
        return true;
    }
    if (editor.selRow === false) {
        editor.selRow = _row;
        editor.selCol = _col;
    }
    if ((editor.selRow === editor.row) && (editor.selCol === editor.col)) {
        return false;
    }
    return {
        selecting: true
    };
};
