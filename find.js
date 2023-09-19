function find(editor, { target, fromRow = 0, fromCol = 0, caseSensitive = false, regExp = false, direction = 1 }, repeat = true) {
  const normalizeChar = caseSensitive ? ch => { return ch; } : ch => { return ((typeof ch) === 'string') ? ch.toLowerCase() : ch; };
  if ((fromRow === 0) && (fromCol === 0)) {
    repeat = false;
  }
  if (direction === 1) {
    for (let row = fromRow; (row < editor.chars.length); row++) {
      const editorChars = editor.chars[row];
      for (let col = fromCol; (col < editorChars.length); col++) {
        let j;
        for (j = 0; (j < target.length); j++) {
          if (normalizeChar(editorChars[col + j]) !== normalizeChar(target[j])) {
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
      return find(editor, {
        target,
        fromRow: 0,
        fromCol: 0,
        caseSensitive,
        regExp, direction
      }, false);
    }
  } else {
    for (let row = fromRow; (row >= 0); row--) {
      const editorChars = editor.chars[row];
      if (fromCol === false) {
        fromCol = editorChars.length - 1;
      }
      for (let col = fromCol; (col >= 0); col--) {
        let j;
        for (j = 0; (j < target.length); j++) {
          if (col - j < 0) {
            break;
          }
          if (normalizeChar(editorChars[col - j]) !== normalizeChar(target[target.length - j - 1])) {
            break;
          }
        }
        if (j === target.length) {
          editor.row = row;
          editor.col = col - target.length + 1;
          return true;
        }
      }
      fromCol = false;
    }    
    if (repeat) {
      return find(editor, {
        target,
        fromRow: editor.chars.length - 1,
        fromCol: editor.chars[editor.chars.length - 1].length - 1,
        caseSensitive,
        regExp, direction
      }, false);
    }
  }
  return false;
}
  
module.exports = find;
