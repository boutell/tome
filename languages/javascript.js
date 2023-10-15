"use strict";

export { extensions, parse, newState, shouldCloseBlock, style, styleBehind };

const extensions = [ 'js', 'mjs', 'ts' ];

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

function last(state) {
  return state.stack[state.stack.length - 1];
}

// Return initial state, which will be passed to parse with each character crossed

function newState() {
  return {
    state: 'code',
    stack: [],
    depth: 0
  };
}

// Parse a character, updating the parse state for purposes of indentation,
// syntax highlighting, etc. Modifies state.

function parse(state, char) {
  let maybeComment = false;
  let maybeCloseComment = false;
  let maybeCode = false;
  if (state.state === 'code') {
    if ((char === '}') && (last(state) === 'backtick')) {
      state.stack.pop();
      state.state = 'backtick';
      return;
    } else if (openers[char]) {
      state.depth++;
      state.stack.push(char);
    } else if (closers[char]) {
      const lastOpener = last(state);
      const opener = closers[char];
      if (lastOpener === opener) {
        state.stack.pop();
        state.depth--;
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
      state.stack.push('backtick');
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
    }
  } else if (state.state === '/*') {
    if (char === '*') {
      maybeCloseComment = true;
    } else if (char === '/') {
      if (state.maybeCloseComment) {
        state.state = 'code';
      }
    }
  }
  state.maybeComment = maybeComment;
  state.maybeCloseComment = maybeCloseComment;
  state.maybeCode = maybeCode;
}

function shouldCloseBlock(state, char) {
  return (state.state === 'code') && closers[char];
}

function style(state) {
  return state.state;
}

function styleBehind(state) {
  if ((state.state === 'code') || (state.state === 'error')) {
    return state.state;
  }
  return false;
}
