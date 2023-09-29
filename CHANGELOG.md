# Changelog

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
