"use strict";

import startsWith from '../starts-with.js';

export {
  extensions,
  parse,
  newState,
  shouldOpenBlock,
  shouldCloseBlock,
  forwardToCloser,
  backToOpener,
  style,
  styleBehind,
  isComment,
  commentLine
};

const extensions = [ 'js', 'mjs', 'ts' ];

const validBeforeRegexp = [
  null,
  '{',
  '!',
  '&',
  '|',
  '(',
  ',',
  '=',
  ';'
];

const openers = {
  '{': '}',
  '[': ']',
  '(': ')'
};

const closers = {
  '}': '{',
  ']': '[',
  ')': '('
};

const needsStyleBehind = [ 'code', 'error', 'regexp' ];

// Last on the stack of nested containers
function last(state) {
  return state.stack[state.stack.length - 1];
}

// Look back one or more nonspace characters (currently capped at 10)
function behind(state, n) {
  return (n <= state.marks.length) ? state.marks[state.marks.length - n] : null;
}

// Return initial state, which will be passed to parse with each character crossed

function newState() {
  return {
    state: 'code',
    stack: [],
    // Indentation depth, in tabstops. Might not match stack.length because
    // we respect a developer's choice to put ({ on a single line etc.
    depth: 0,
    marks: []
  };
}

// Parse a character, updating the parse state for purposes of indentation,
// syntax highlighting, etc. Modifies state.

function parse(state, char, {
  log,
  row,
  col
}) {
  let maybeComment = false;
  let maybeCloseComment = false;
  let maybeCode = false;
  let skipMark = false;
  if (state.state === 'code') {
    if (
      (behind(state, 1) === '/') &&
      validBeforeRegexp.includes(behind(state, 2)) &&
      (char !== '/') &&
      (char !== '*')
    ) {
      if (char === '\\') {
        state.state = 'regexpEscape';
      } else {
        state.state = 'regexp';
      }
    } else if ((char === '}') && (last(state)?.type === 'backtick')) {
      state.stack.pop();
      state.state = 'backtick';
    } else if (openers[char]) {
      // Don't indent twice if two openers appear on the same row, like the
      // common pattern ({
      const indents = !state.stack.find(block => block.row === row);
      if (indents) {
        state.depth++;
      }
      state.stack.push({
        type: char,
        row,
        indents
      });
    } else if (closers[char]) {
      const lastOpener = last(state)?.type;
      const opener = closers[char];
      if (lastOpener === opener) {
        if (last(state).indents) {
          state.depth--;
        }
        state.stack.pop();
      } else {
        state.state = 'error';
      }
    } else if (char === '\'') {
      state.state = 'single';
    } else if (char === '"') {
      state.state = 'double';
    } else if (char === '`') {
      state.state = 'backtick';
    } else if (char === '/') {
      if (state.maybeComment) {
        state.state = '//';
      } else {
        maybeComment = true;
      }
    } else if (char === '*') {
      if (state.maybeComment) {
        state.state = '/*';
      } else {
        maybeComment = true;
      }
    }
  } else if (state.state === 'regexp') {
    if (char === '\\') {
      state.state = 'regexpEscape';
    } else if (char === '/') {
      state.state = 'code';
      // So it can't be misread as the start of another
      skipMark = true;
    } else if (char === '[') {
      state.state = 'regexpRange';
    }
  } else if (state.state === 'regexpEscape') {
    state.state = 'regexp';
  } else if (state.state === 'regexpRange') {
    if (char === '\\') {
      state.state = 'regexpRangeEscape';
    } else if (char === ']') {
      state.state = 'regexp';
    }
  } else if (state.state === 'regexpRangeEscape') {
    state.state = 'regexpRange';
  } else if (state.state === 'single') {
    if (char === '\\') {
      state.state = 'singleEscape';
    } else if (char === '\'') {
      state.state = 'code';
    } else if (char === '\r') {
      state.state = 'error';
    }
  } else if (state.state === 'singleEscape') {
    state.state = 'single';
  } else if (state.state === 'singleEscape') {
    state.state = 'single';
  } else if (state.state === 'double') {
    if (char === '\\') {
      state.state = 'doubleEscape';
    } else if (char === '"') {
      state.state = 'code';
    } else if (char === '\r') {
      state.state = 'error';
    }
  } else if (state.state === 'doubleEscape') {
    state.state = 'double';
  } else if (state.state === 'backtick') {
    if (char === '\\') {
      state.state = 'backtickEscape';
    } else if (char === '`') {
      state.state = 'code';
    } else if (char === '$') {
      maybeCode = true;
    } else if ((state.maybeCode) && (char === '{')) {
      state.maybeCode = false;
      state.state = 'code';
      state.stack.push({
        type: 'backtick',
        indents: false
      });
    }
  } else if (state.state === 'backtickEscape') {
    state.state = 'backtick';
  } else if (state.state === 'error') {
    // Cool is a rule, but sometimes... bad is bad.
    // The developer very definitely has to fix something above
    // this point, so stick to our highlighting as "bad!"
  } else if (state.state === '//') {
    if (char === '\r') {
      state.state = 'code';
      state.marks.pop();
    }
  } else if (state.state === '/*') {
    if (char === '*') {
      maybeCloseComment = true;
    } else if (char === '/') {
      if (state.maybeCloseComment) {
        state.state = 'code';
        state.marks.pop();
        skipMark = true;
      }
    }
  }
  state.maybeComment = maybeComment;
  state.maybeCloseComment = maybeCloseComment;
  state.maybeCode = maybeCode;
  if ((!skipMark) && (state.state !== '//') && (state.state !== '/*') && (char !== ' ') && (char !== '\r')) {
    state.marks.push(char);
    if (state.marks.length === 11) {
      state.marks.shift();
    }
  }
}

function shouldCloseBlock(state, char) {
  return (state.state === 'code') && closers[char];
}

function shouldOpenBlock(state, char) {
  return (state.state === 'code') && openers[char];
}

function forwardToCloser(state, { forward, back, log }) {
  // We are sitting right before the opener
  if (!forward()) {
    return false;
  }
  const length = state.stack.length;
  do {
    state = forward();
    if (!state) {
      // A position change has occurred, even if the result is surprising
      return true;
    }
  } while (state.stack.length >= length);
  // We overshot by advancing over the closer
  return back();
}

function backToOpener(state, { forward, back, log }) {
  // We are already right before the closer so we don't have to back over it
  const length = state.stack.length;
  let once = false;
  do {
    state = back();
    if (!state) {
      return once;
    }
    once = true;
  } while (state.stack.length >= length);
  // The cursor is now sitting on (before) the opener
  return true;
}

function style(state) {
  return state.state;
}

function styleBehind(state) {
  return needsStyleBehind.includes(state.state) ? state.state : false;
}

function isComment(rowOfChars) {
  for (let i = 0; (i < rowOfChars.length); i++) {
    if (startsWith(rowOfChars, i, commentLine)) {
      return true;
    }
    if (rowOfChars[i] !== ' ') {
      return false;
    }
  }
}

const commentLine = [ '/', '/' ];
