# Aurum — Gold Price Comparator (Vietnam vs India)

A premium, dependency-free web app that converts a Vietnamese gold quote (VND per chi)
and an Indian quote (INR per gram) into a single comparable currency, then exports a
print-ready PDF report.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

No build step, no bundler, no tracking — the calculation runs entirely client-side.

## Standard conversions

| Unit  | Grams  |
| ----- | ------ |
| Chi (mace) | 3.75 g |
| Pavan (sovereign) | 8 g |
| Tola | 11.664 g |

## Features

- **Live normalisation** — Vietnamese rate per chi → per gram → INR, using your exchange rate
  (invertible with one click).
- **Verdict card** — which market is cheaper, by how much, and the relative gap in percent.
- **Unit ledger** — gram, chi, pavan, tola, 10 g and 100 g side by side, with difference and winner.
- **Highlights** — per-unit conversions, the applied FX rate, savings on a 10 g purchase, and an
  illustrative India +3% GST scenario.
- **Saved snapshots** — up to 8 comparisons kept in `localStorage`.
- **CSV export** — the current ledger as a spreadsheet-friendly file.
- **PDF export** — a dedicated A4 report (inputs, ledger, assessment, methodology, signature lines)
  via the browser's print-to-PDF. Choose *Save as PDF* as the destination.
- **Theme toggle** — obsidian & gold by default, warm ivory light mode; the choice is remembered.
- **Accessible & responsive** — keyboard focus rings, ARIA live results, reduced-motion support.

## PDF notes

`Export PDF` opens the browser print dialog with a purpose-built report layout: the dark UI is
hidden and a light A4 document is rendered instead. For exact colours, enable
**Background graphics** in the print dialog. No server or third-party PDF library is involved.
