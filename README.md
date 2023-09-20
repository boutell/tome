# tome

`tome`, aka Tom's Editor. Maybe should be THE (Tom's Hubristic Editor).

This is:

* A brand new command line editor
* Written in Node.js
* Intended to stay small and scrappy
* A mostly modeless editing experience, to the greatest extent limited meta key support will allow me to get away with
* Following ordinary UI conventions as much as that fits with the above and isn't totally weird in a terminal (control-z should still be suspend)
* Focused on editing JS, HTML, Vue single-file components and markdown
* Released under GPLv3 so contributions come back (this **does not** mean the code you write with it
is subject to the GPL)

## Status

* Alpha quality. I'm using it to write it, so I'll probably know pretty quick if it's a hot mess, but you should definitely
use `git` and watch out for surprises.

## Plan

* Bootstrap this very quickly into something I can stand to use to edit JavaScript, just enough to work on it and see the problems. DONE
* Fix the flicker. DONE
* Undo. DONE
* Redo. DONE
* Refactor such that this doesn't all have to be one file and multiple instances of the editor become technically possible. DONE
* "Sub-editors" for editing fields like "Find" with access to all of the same conveniences. DONE
* Bare-bones Find feature. DONE
* Find Again DONE
* What's going on with emoji? DONE
* Prevent nonprintable characters tome doesn't understand from winding up as text in the document. DONE
* Prompt for "Find: " DONE
* "Find" loops around DONE
* Mac-friendly keyboard selection DONE
* "Find" supports regexps, case insensitive DONE
* Situational instructions at bottom of screen DONE
* Alternate page-up, page-down keys for Mac DONE
* Find and Replace
* Parens-aware indent
* Continuous parsing so indent is performant
* String-aware indent
* Control-Q should not offer to save if there are no changes
* Help Screen (as a scrollable read-only editor)
* Comment toggling
* File locking for the actual file
* Make the js stuff file extension specific
* Make the js stuff work in a script tag too
* Add some HTML stuff
* Add some markdown stuff, might be as basic as auto word wrap support, maybe color coding to catch runaway blocks
* More efficient rendering in more situations, for slow links
* Case-insensitive Find
* RegExp Find

## Install

I publish a new alpha release whenever it seems stable-ish and
I can get work done with it myself:

```bash
npm install @boutell/tome
```

Or, for the absolute bleeding edge, use `git`:

```bash
git clone https://github.com/boutell/tome
cd tome
npm link
```

## Usage

tome some-file-you-want-to-edit

It's fine to create a new file.

## Commands

* Type stuff
* Move around with arrow keys
* Control-up and Control-down for Page Up and Page Down, or Control-O and Control-P on Mac
* Keyboard select by pressing ESC, then moving around with arrow keys
(can press ESC again if you change your mind)
* Cut, copy, paste with control-X, control-C, control-V
* "Find" with control-F, type prompt and press Enter, or ESC to skip
* "Find Again" with control-G
* "Undo" with control-Z
* "Redo" with control-Y
* Save and keep working with Control-S
* Exit, with optional save, via Control-Q
* Tab key indents two spaces

## Working with multiple files

Start as many `tome` commands as you want in separate terminals. The clipboard is automatically shared. Just copy in one and paste in another.
