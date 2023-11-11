# Changelog

## 0.13.1

* Fix bug where regular expression literals can be misparsed.

## 0.13.0

* Use terminal escape sequences to scroll up and down, reducing overhead.
Unfortunately there's just no such thing for scrolling left or right.

## 0.11.0

* Control-Q only offers to save if changes have been made.

## 0.10.0

* Control-L toggles between languages. Useful when editing a standalone
utility written in Node.js, since the filename will not have a `.js` extension.

## 0.9.0

* Control-B now bounces between opening and closing marks like
`{}`, `[]` and `()`. Pressing this key currently only makes sense
when the cursor is on such a mark.

## 0.8.1

* `.` is not a sensible character before a regexp. Accepting it as
such causes confusion when it appears inside a regexp just before
the closing `/`.
* Never treat the closing `/` of a regexp as the potential start
of a new one in any analysis. This implementation of regexp highlighting
is obviously clunky and full of edge cases, eventually full JS parsing
will do a better job.

## 0.8.0

* Fixed several bugs with "undo" for plain ol' typing.
* `({` no longer results in double indentation.
* `[` and `]` can be used to shift the currently selected text one tabstop at a time.
* Page-Up and Page-Down can contribute to text selection.
* Contextual help for selection mode.

## 0.7.3

* Regular expressions beginning with an \ escape sequence are now highlighted properly.
* Character ranges [...] in regular expressions may now contain un-escaped / charcters.

## 0.7.2

* Just packaging stuff, no code changes.

## 0.7.1

* Fixed bug in horizontal scrolling.

## 0.7.0

* Syntax highlighting for regular expressions. Gee, that one thing was actually quite difficult without
a real JavaScript parser. To take this to the next step I'll have to implement a real-ish JavaScript
parser. Without it, I'd probably never be able to do proper keyword highlighting, recognize when a
keyword is merely a property name in an object literal, etc.
* Better colors. Hey, it's the little things.

## 0.6.0

* Language engines. The JavaScript engine is factored out to `language/javascript.js` and is
triggered by file extension, so it no longer interferes with editing plaintext. For other
extensions, the default language engine does nothing, as a safe fallback and as further documentation
of the interface for language engines.

## 0.5.0, 0.5.1 (2023-10-14)

* Syntax-aware, with basic syntax highlighting. Indentation now takes into account `{` `[` and `(` and
  understands when these are part of a quoted string and should not affect code indentation. All three
  types of quoted strings are supported. Invalid syntax is called out in no uncertain terms. Maybe this
  is too much if you're still typing something and haven't had a chance to close a bracket yet...
  will think about that.

  This version is much more specific to JavaScript because the syntax highlighting is strict and I haven't
  yet distinguished JavaScript from editing plaintext. That will happen next.

## 0.4.1 (2023-09-30)

* ESC key followed instantly by arrow key now works as expected.

## 0.4.0 (2023-09-30)

* Search and Replace.

## 0.3.2 (2023-09-29)

* Always update cursor position in `draw`.

## 0.3.1 (2023-09-29)

* Happy birthday to me!
* Fixed a few errata from last night's virtual screen release.

## 0.3.0 (2023-09-28)

* Redraw only where changes occur using virtual screen, also cleans up the main editor draw logic a lot.
A lot more can be done here, like detecting when it's smart to scroll the screen with a single escape code.

## 0.2.6 (2023-09-25)

* One more stab at a possible race condition causing dropped keystrokes,
sorry about all these dumb version bumps to test over ssh

## 0.2.5 (2023-09-25)

* Don't drop keystrokes between calls to `getKey`

## 0.2.3 (2023-09-25)

* A proper fix for the Mystery Spaces race condition this time, without breaking
nested experiences. `getKey()` is for everybody!

## 0.2.2 (2023-09-25)

* Oops, broke `control-q` and `control-f` when I started awaiting the outcome of each keystroke because they nest editing experiences that require keystrokes.

## 0.2.1 (2023-09-25)

* Fixed a subtle race condition that led to unexpected spaces onscreen when typing very fast.

## 0.2.0 (2023-09-24)

* Use the built-in `readline` module to handle keyboard escape sequences correctly even when
individual keys arrive in pieces.
* Use `ansi-escape` and `ansi-styles` rather than my amusing but wholly incomplete termcap
implementation, which was scribbled on a plane ride without Internet, based only on manpages.
* ES modules, to be compatible with the above and generally in touch with 2023.

## 0.1.5 (2023-09-23)

* Behaves correctly when you type fast enough to deliver several keystrokes a single
`data` event.
