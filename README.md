# tome

`tome`, aka Tom's Editor. Maybe should be THE (Tom's Hubristic Editor).

This is:

* A brand new command line text editor
* Written in Node.js with practically no libraries (certainly no Electron)
* Intended to stay small and scrappy
* A mostly modeless editing experience, to the extent limited meta key support will allow
* Following ordinary UI conventions as much as that fits with the above
* Focused on editing JS, HTML, Vue single-file components and markdown (JS for now)
* Released under GPLv3 so contributions come back (this **does not** mean the code you write with it
is subject to the GPL)

![Screenshot of tome in action](https://github.com/boutell/tome/blob/main/tome-screenshot.png?raw=true)


## Status

* Alpha quality. I'm using it to write it, so I'll probably know pretty quick if it's a hot mess, but you should definitely
use `git` and watch out for surprises.

## Install

You must have Node.js 18 or better. The laziest way to get modern Node.js is via [nvm](https://github.com/nvm-sh/nvm).

```bash
npm install -g @boutell/tome
```

I publish a new alpha release whenever it seems stable-ish and
I can get more work done with it myself.

Or, for the absolute bleeding edge, use `git`:

```bash
git clone https://github.com/boutell/tome
cd tome
npm link
```

## Usage

tome some-file-you-want-to-edit

if the file does not exist it will be created at save time.

## Where will it run?

Mac and Linux: definitely.
Windows Subsystem for Linux: definitely.
Windows: maybe.

There are minor issues around file paths that probably interfere with using this under plain Windows. The
terminal escapes used on output should be fine now in updated Windows 10 or Windows 11, but it's anybody's
guess what the keycodes are. Contributions to fix plain-Windows issues are welcome.

## Commands

* Type stuff
* Move around with arrow keys
* Control-up and Control-down for Page Up and Page Down, or Control-O and Control-P on Mac
* Keyboard select by pressing ESC, then moving around with arrow keys
(can press ESC again if you change your mind)
* Cut, copy, paste with control-X, control-C, control-V
* "Find" with control-F, variations and "Replace" are offered
* "Find Again" / "Replace Again" with control-G
* "Undo" with control-Z
* "Redo" with control-Y
* Save and keep working with Control-S
* Exit, with optional save, via Control-Q
* Tab key indents two spaces

## Working with multiple files

Start as many `tome` commands as you want in separate terminals. The clipboard is automatically shared. Just copy in one and paste in another.
I'm talking about the built-in `tome` cut, copy and paste here (ESC to select, then `control-x`, `control-c`, `control-v`). These are shared
as long as you are working in the same account.

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
* "Virtual DOM" haha. No, but seriously, we should update a virtual terminal and calculate what changes are really 
needed in `draw`. Make this finally feel good over ssh. DONE
* Find and Replace DONE
* Fix the delay before entering select mode with ESC works DONE
* Continuous parsing so indent is performant DONE
* Parens-aware indent DONE
* String-aware indent DONE
* Make the js stuff file extension specific DONE
* Syntax highlighting, round 1 DONE
* Indent-aware paste (autofix spacing of all pasted lines)
* Reindentation (auto? manual?)
* Control-Q should not offer to save if there are no changes
* Help Screen (as a scrollable read-only editor)
* Comment toggling
* File locking for the actual file
* Add some HTML stuff
* Add some markdown stuff, might be as basic as auto word wrap support, maybe color coding to catch runaway blocks
* Make the js stuff work in a script tag too
* True parsing, so keyword highlighting etc. can be implemented
* Plugin support flexible enough that anyone can install a feature from any source without shipping it in core,
e.g. not everyone wants AI copilot in their life but some people do
* More efficient rendering in more situations, for slow links
* Add `.editorconfig` support (including support for storing tabs, controlling # of spaces, etc)

## Contributions

Your contributions are welcome. The project is licensed under GPLv3 (see the `COPYING` file). This is an all-volunteer
project, abuse will not be tolerated. It's a good idea to discuss before embarking on a major feature just to make sure we
have the same overall architecture in mind.
