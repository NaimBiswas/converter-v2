# fix: make PDF/DOCX conversions produce real, valid files

| | |
|---|---|
| **Branch** | `fix/real-pdf-docx-conversions` → `main` |

## What

Merge PDF, Split PDF, Compress PDF, PDF-to-DOCX, PDF-to-Image, and PDF-to-TXT
previously wrote a fixed placeholder string into a file mislabeled with a
`.pdf`/`.docx` extension, producing a corrupt download that would not open
in the target application. DOCX/DOC as a source file had no real handling
at all and fell through to reading the binary zip as text. This PR makes
every one of these produce genuinely valid, openable output.

## Why

Found while reviewing the converter for a feature to add: several PDF/DOCX
tools were advertised on the tools list and homepage but never worked.
`converter.ts` had no PDF text-extraction or rendering library and no OOXML
writer wired in, so those paths faked their output with a plain-text
`generateFormattedDoc()` helper instead.

## Changes

`src/utils/converter.ts` (+~300 / -~40)

| Tool | Before | Now |
|---|---|---|
| PDF → JPG/PNG | Placeholder canvas text | Real page render via `pdfjs-dist` |
| PDF → TXT | Binary read as text (garbled) | Real per-page text extraction |
| PDF → DOCX | Plain text mislabeled `.docx` | Real OOXML via `docx`, fed by real extracted text |
| Merge PDF | Fixed placeholder sentence | Real multi-file merge via `pdf-lib`, combines every uploaded PDF |
| Split PDF | Fixed placeholder sentence | Real per-page split, bundled as a `.zip` |
| Compress PDF | Fixed placeholder sentence | Real `pdf-lib` re-save (object streams) |
| DOCX/DOC as source | Unhandled, binary read as text | Real extraction via `mammoth` → PDF/TXT/HTML/MD |
| MD/TXT → DOCX | Same fake-text bug | Now uses the same real `docx` writer |

The dead `generateFormattedDoc()` fake-content generator was removed.

`package.json` (+4): added `pdfjs-dist`, `docx`, `jszip`, `mammoth`.

`src/App.tsx` (+21 / -4): `convertSingleFile` now receives the current file
list so Merge can combine every uploaded PDF, not just the one clicked; the
merge success toast reports how many files were merged.

Scope decision: bundle size grew (main chunk ~1.5MB) since these libraries
aren't code-split. Left as-is for this fix; flagged as a follow-up.

## Verification

- `npm run lint` (`tsc --noEmit`) - clean.
- `npm run build` - clean; confirmed the `pdfjs-dist` worker bundles
  correctly under Vite, the one real integration risk in this change.
- Manually tested in a browser against real generated PDF/DOCX fixtures:
  - PDF → JPG: rendered page showed real source content.
  - PDF → TXT: extracted text matched the source PDF exactly.
  - Merge: 2 PDFs (2 pages + 1 page) merged into a real 3-page PDF, correct order.
  - Split: confirmed `PK\x03\x04` zip signature on the output.
  - Compress: confirmed valid `%PDF-` signature on the output.
  - PDF → DOCX: confirmed real zip/OOXML signature.
  - DOCX → PDF: real extracted text rendered in the output PDF.

## Screenshots

Not applicable, no UI change.
