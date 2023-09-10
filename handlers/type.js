module.exports = ({ editor }) => ({
  do(key) {
    if (key.charCodeAt(0) < 32) {
      return false;
    }
    let appending = false;
    if (editor.col === editor.chars[editor.row].length) {  
      appending = true;
    }
    let undo;
    // Append to previous undo object if it is also typed text and does not end with a word break
    let lastUndo = editor.undos[editor.undos.length - 1];
    if (lastUndo) {
      if (lastUndo.action === 'type') {
        const lastChar = lastUndo.chars.length > 0 && lastUndo.chars[lastUndo.chars.length - 1];
        if (lastChar !== ' ') {
          undo = lastUndo;
        } else {
          lastUndo = false;
        }   
      } else {
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
    return {
      appending,
      ...(lastUndo ? {} : {
        undo
      })
    };
  },
  undo(undo) {
    editor.chars[undo.row].splice(undo.col, undo.chars.length);
    editor.row = undo.row;
    editor.col = undo.col;
  },
  redo(redo) {
    editor.row = redo.row;
    editor.col = redo.col;
    for (char of redo.chars) {
      editor.handlers.type.do(char);
    }
  }
});
