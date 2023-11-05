"use strict";

// Fallback language engine. Used when nothing better matches the file extension.
// Also serves as an interface definition for writing new langugae engines

export { extensions, parse, newState, shouldCloseBlock, style, styleBehind, isComment, commentLine };

const extensions = [];

// Return initial state, which will be passed to `parse` with each character crossed.
// The state must be compatible with structuredClone() and generally shouldn't need
// to be large, e.g. a stack of open containers, a parsing state machine state, and
// hints to resolve multicharacter operators etc.
//
// depth must be provided for indentation purposes and typically defaults to 0.
// No other properties of the state are currently inspected outside of the language engine

function newState() {
  return {
    // Currently the only property of the state that code outside the language
    // engine is allowed to inspect
    depth: 0
  };
}

// Parse a character, updating the parse state for purposes of indentation,
// syntax highlighting, etc. Modifies state.

function parse(state, char) {
  // modifies state
}

// Should return true if typing char should close a block (drop to next line,
// decrease depth, indent, insert char) given current state

function shouldCloseBlock(state, char) {
  return false;
}

// Should return a style name (see state-styles.js) or false based on state

function style(state) {
  return false;
}

// Should return a style name only if the style of the character we just
// advanced over should be changed to reflect the new state. This makes
// sense e.g. for a character that caused the parser to enter an "error"
// state. If you're not sure just return false and see what it's like.
// If false is returned, the return value of the style() call made
// immediately before advancing over the character is honored instead

function styleBehind(state) {
  return false;
}

// Return true if the characters in "chars' represent a line that
// is entirely commented out with a single-line comment like JavaScript //

function isComment(chars) {
  return false;
}

// array of characters to be used to comment out a line, like
// JavaScript [ '/', '/' ]
const commentLine = [];
