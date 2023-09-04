# tome

Tom's Editor. Maybe should be THE (Tom's Hubristic Editor).

This is:

* A brand new command line editor
* Written in Node.js
* Intended to stay small and scrappy
* A modeless editing experience
* following ordinary UI conventions as much as that fits with the above
* Focused on editing JS, HTML, Vue single-file components and markdown

## Status

* Alpha quality. I'm using it to write it, so I'll probably know pretty quick if it's a hot mess, but you should definitely
use `git` and watch out for surprises.

## Plan

* Bootstrap this very quickly into something I can stand to use to edit JavaScript, just enough to work on it and see the problems. DONE
  (sorta; shows me what I can't live without)
* Fix the flicker. DONE
* Undo. DONE
* Redo
* Refactor such that this doesn't all have to be one file, and I can use the core editor for things like editing
  the content of a "Find" field
* Find
* Find and Replace
* Comment toggling
* File locking for the actual file
* Make the js stuff file extension specific
* Make the js stuff work in a script tag too
* Add some HTML stuff
* Add some markdown stuff, might be as basic as auto word wrap support, maybe color coding to catch runaway blocks
* More efficient rendering in more situations, for slow links

## Install

```bash
npm install -g @boutell/tome
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
