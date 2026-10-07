# HALF-OFFSET.LSP — offset a line to BOTH sides

AutoLISP utility: pick a line, type a distance, and the routine builds **two**
copies of that line — one offset to the left, one offset to the right — then
erases the line you picked.

```
Select LINE(s) to offset:      -> click one line (or window-select several)
Offset distance (applied to EACH side) <10.0000>:  -> 10
```

Result: the picked line is gone and two parallel lines remain, 10 units away on
each side (20 units apart in total).

## Install

| Step | Action |
| --- | --- |
| 1 | AutoCAD → `APPLOAD` (or drag the file into the drawing window) |
| 2 | Load `half-offset.lsp` |
| 3 | Type `OHLR` — aliases `OH` and `HALFOFF` also work |

To load it automatically in every drawing, add the folder to
`Options ▸ Files ▸ Support File Search Path` and put `(load "half-offset")`
into your `acad.lsp` / `acaddoc.lsp`.

## Settings

Two globals, set at the command line or edited at the top of the file. They are
installed on the first load only, so re-loading never overwrites your choice.

| Variable | Value | Meaning |
| --- | --- | --- |
| `*ohlr-split-total*` | `nil` (default) | the distance you type is used on **each** side → total spread = 2 × distance |
| | `T` | the distance you type is the **total** spread → half goes left, half goes right |
| `*ohlr-keep-original*` | `nil` (default) | erase the picked line(s) after offsetting |
| | `T` | keep them (they stay as the centre line) |
| `*ohlr-dist*` | — | remembers the last distance and offers it as the `<default>` |

```lisp
Command: (setq *ohlr-split-total* T)   ; now: type 20 -> 10 left / 10 right
```

## Behaviour notes

* Accepts **LINE** objects only (as requested); polylines/arcs/circles are
  filtered out of the selection.
* Works on several lines at once — one distance for all of them.
* New lines inherit layer, colour, linetype and lineweight from the source line.
* Primary method is `vla-Offset` (exact in any UCS, works on 3D lines). If the
  COM bridge is missing it falls back to plain vector maths + `ENTMAKE`, and if
  one side fails the other side is rolled back so you never get a stray line.
* Zero-length lines are reported and skipped instead of crashing.
* The whole run is a single `UNDO` step.
