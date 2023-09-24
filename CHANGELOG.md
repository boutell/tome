# Changelog

## 0.2.0 (2023-09-24)

* Use the built-in `readline` module to handle keyboard escape sequences correctly even when
individual keys arrive in pieces.
* Use `ansi-escape` and `ansi-styles` rather than my amusing but wholly incomplete termcap
implementation, which was scribbled on a plane ride without Internet, based only on manpages.
* ES modules, to be compatible with the above and generally in touch with 2023.

## 0.1.5 (2023-09-23)

* Behaves correctly when you type fast enough to deliver several keystrokes a single
`data` event.
