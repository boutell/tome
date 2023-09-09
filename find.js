module.exports = (editor, target, fromRow = 0, fromCol = 0) => {
  // TODO handle searches for multiline strings
  for (let row = fromRow; (row < editor.chars.length); row++) {
    const editorChars = editor.chars[row];
    for (let col = fromCol; (col < editorChars.length); col++) {
      let j;
      for (j = 0; (j < target.length); j++) {
        if (editorChars[col + j] !== target[j]) {
          break;
        }
      }
      if (j === target.length) {
        editor.row = row;
        editor.col = col;
        return true;
      }
    }
    fromCol = 0;
  }
  return false;
};
