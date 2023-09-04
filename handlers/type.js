module.exports = ({ editor }) => ({
  do(key) {
    let appending = false;
    console.log(editor.col, editor.row, editor.chars);
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
        row: this.row,
        col: this.col,
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
  }
});
