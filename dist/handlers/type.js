export default ({ editor }) => ({
    do(key) {
        // Block function keys, control keys, etc. from winding up in content
        // without blocking emoji, which count as a single iterable in a string.
        // TODO: we need a representation of keys that doesn't require this
        // inefficiency
        let count = 0;
        for (const b of key) {
            count++;
        }
        if (count > 1) {
            return;
        }
        let appending = false;
        if (editor.eol()) {
            appending = true;
        }
        let undo;
        // Append to previous undo object if it is also typed text, it does not end with a word break,
        // and we haven't moved since
        let lastUndo = editor.undos[editor.undos.length - 1];
        if (lastUndo) {
            if ((lastUndo.lastRow === editor.row) && (lastUndo.lastCol === editor.col)) {
                if (lastUndo.action === 'type') {
                    const lastChar = lastUndo.chars.length > 0 && lastUndo.chars[lastUndo.chars.length - 1];
                    if (lastChar !== ' ') {
                        undo = lastUndo;
                    }
                    else {
                        lastUndo = false;
                    }
                }
                else {
                    lastUndo = false;
                }
            }
            else {
                lastUndo = false;
            }
        }
        if (!lastUndo) {
            undo = {
                action: 'type',
                row: editor.row,
                col: editor.col,
                chars: []
            };
        }
        undo.chars.push(key);
        editor.insertChar(key);
        undo.lastRow = editor.row;
        undo.lastCol = editor.col;
        return Object.assign({ appending }, (lastUndo ? {} : {
            undo
        }));
    },
    undo(undo) {
        editor.moveTo(undo.row, undo.col);
        for (let i = 0; (i < undo.chars.length); i++) {
            editor.erase();
        }
    },
    redo(redo) {
        editor.moveTo(redo.row, redo.col);
        for (const char of redo.chars) {
            editor.handlers.type.do(char);
        }
    }
});
