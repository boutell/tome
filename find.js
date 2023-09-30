function find(editor, { target, replacement = false, fromRow = 0, fromCol = 0, caseSensitive = false, regExp = false, direction = 1 }, repeat = true) {
  const normalizeChar = caseSensitive ? ch => { return ch; } : ch => { return ((typeof ch) === 'string') ? ch.toLowerCase() : ch; };
  if ((fromRow === 0) && (fromCol === 0)) {
    repeat = false;
  }
  if (direction === 1) {
    const expression = regExp && new RegExp(target.join(''), caseSensitive ? '' : 'i');
    editor.log(expression);
    for (let row = fromRow; (row < editor.chars.length); row++) {
      const editorChars = editor.chars[row];
      if (regExp) {
        const s = editorChars.slice(fromCol).join('');
        const indexOf = s.search(expression);
        if (indexOf >= 0) {
          return replaceAndOrMove(editorChars, row, indexOf);
        }
      } else {
        // TODO pick up with replacement logic here
        for (let col = fromCol; (col < editorChars.length); col++) {
          let j;
          for (j = 0; (j < target.length); j++) {
            if (normalizeChar(editorChars[col + j]) !== normalizeChar(target[j])) {
              break;
            }
          }
          if (j === target.length) {
            return replaceAndOrMove(editorChars, row, col);
          }
        }
      }
      fromCol = 0;
    }
    if (repeat) {
      return find(editor, {
        target,
        replacement,
        fromRow: 0,
        fromCol: 0,
        caseSensitive,
        regExp,
        direction
      }, false);
    }
  } else {
    const expression = regExp && new RegExp(target.join(''), 'g' + (caseSensitive ? '' : 'i'));
    for (let row = fromRow; (row >= 0); row--) {
      const editorChars = editor.chars[row];
      if (fromCol === false) {
        fromCol = editorChars.length - 1;
      }
      if (regExp) {
        const s = editorChars.slice(0, fromCol).join('');
        const matches = s.matchAll(expression);
        const [match] = matches;
        editor.log('M:', target, expression, s, match);
        if (match) {
          const indexOf = match.index;
          return replaceAndOrMove(editorChars, row, indexOf);
        }
      } else {
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
            return replaceAndOrMove(editorChars, row, col - target.length + 1);
          }
        }
      }
      fromCol = false;
    }    
    if (repeat) {
      return find(editor, {
        target,
        replacement,
        fromRow: editor.chars.length - 1,
        fromCol: editor.chars[editor.chars.length - 1].length - 1,
        caseSensitive,
        regExp,
        direction
      }, false);
    }
  }
  return false;
  function replaceAndOrMove(chars, row, col) {
    if (replacement !== false) {
      chars.splice(col, target.length, ...replacement);
    }
    editor.row = row;
    if (direction === 1) {
      editor.col = (replacement === false) ? col : col + replacement.length;
    } else {
      editor.col = col;
    }
    return true;
  }
}
  
export default find;
