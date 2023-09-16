function find(editor, target, fromRow = 0, fromCol = 0, direction = 1, repeat = true) {
  if ((fromRow === 0) && (fromCol === 0)) {
    repeat = false;
  }
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
  if (repeat) {
    return find(editor, target, 0, 0, direction, false);
  }
  return false;
}
  
module.exports = find;
