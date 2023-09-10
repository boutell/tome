# tome

`tome`, aka Tom's Editor. Maybe should be THE (Tom's Hubristic Editor).

This is:

* A brand new command line editor
* Written in Node.js
* Intended to stay small and scrappy
* A modeless editing experience, to the greatest extent limited meta key support will allow me to get away with
* following ordinary UI conventions as much as that fits with the above
* Focused on editing JS, HTML, Vue single-file components and markdown
* Released under GPLv3 (this **does not** mean the code you write with it
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
* Prevent nonprintable characters tome doesn't understand from winding up as text in the document
* Case-insensitive Find
* RegExp Find
* "Find" loops around
* Find and Replace
* Parens-aware indent
* Continuous parsing so indent is performant
* String-aware indent
* Control-W should not offer to save if there are no changes
* Help Screen (as a scrollable read-only editor)
* Comment toggling
* File locking for the actual file
* Make the js stuff file extension specific
* Make the js stuff work in a script tag too
* Add some HTML stuff
* Add some markdown stuff, might be as basic as auto word wrap support, maybe color coding to catch runaway blocks
* More efficient rendering in more situations, for slow links

## Install

For now, because this is not in npm yet:

```bash
git clone https://github.com/boutell/tome
cd tome
npm link
```

## Usage

tome some-file-you-want-to-edit

It's fine to create a new file.

## Commands

* Keyboard select by holding down shift with up, down, left, right
* Cut, copy, paste with control-X, control-C, control-V
* Save and keep working with Control-S
* Exit, with optional save, via Control-W

## Working with multiple files

Start as many `tome` commands as you want in separate terminals. The clipboard is automatically shared. Just copy in one and paste in another.
