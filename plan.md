# Plan: In-App PDF Page Viewer for Water Table Analysis (Real PDFs)

## Overview
When a user clicks a row in the Water Table Analysis table, a modal overlay opens showing the **actual PDF page** from the uploaded report. The 4 real PDF files (`geotech_report1.pdf` through `geotech_report4.pdf`) will be placed in `public/reports/` and rendered using `react-pdf` (pdfjs-dist). The page number from the mock data `waterTable[].pageNumber` maps directly to the PDF page to display.

## Flow
1. User uploads `geotech_report1.pdf` → mock data loads → dashboard shows water table rows
2. User clicks a row (e.g., Boring B-1, Page 8) → modal opens showing page 8 of `geotech_report1.pdf`
3. The PDF file path is derived from the `uploadedFileName` in `projectSummary` → `/reports/geotech_report1.pdf`

## Architecture

### 1. Install `react-pdf`
```
npm install react-pdf
```
This provides `<Document>` and `<Page>` components powered by pdfjs-dist for rendering PDF pages in React.

### 2. New Component: `PdfViewerModal` (`src/components/PdfViewerModal.tsx`)
**Props:**
```typescript
interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPath: string;           // e.g., "/reports/geotech_report1.pdf"
  pageNumber: number;         // page to display
  title?: string;             // e.g., "B-1 — Groundwater at 12.5 ft"
}
```

**Visual design:**
- Semi-transparent dark backdrop (click to close, Escape to close)
- Centered modal with toolbar at top: title, page indicator, prev/next page buttons, close (X) button
- `react-pdf` `<Document>` + `<Page>` renders the actual PDF page
- Loading spinner while PDF page loads
- Error state if PDF fails to load
- Animation: fade-in backdrop + scale-up content

### 3. Place PDFs in `public/reports/`
The user will place their 4 PDF files here:
- `public/reports/geotech_report1.pdf`
- `public/reports/geotech_report2.pdf`
- `public/reports/geotech_report3.pdf`
- `public/reports/geotech_report4.pdf`

These are served statically by Vite at `/reports/geotech_reportX.pdf`.

### 4. Modify `DashboardPage.tsx`
- Add state: `selectedEntry` (WaterTableEntry | null)
- Make water table `<tr>` rows clickable → `onClick={() => setSelectedEntry(entry)}`
- Add cursor-pointer + visual click affordance (e.g., subtle icon or hover style)
- Render `<PdfViewerModal>` with:
  - `pdfPath` = `/reports/${projectSummary.uploadedFileName}`
  - `pageNumber` = `selectedEntry.pageNumber`
  - `title` = `"${entry.boringId} — ${entry.groundwaterDepth}"`

### 5. Modify `BoreLogsPage.tsx`
- Same pattern: clickable water table rows, state for selected entry, render PdfViewerModal

### 6. CSS additions to `index.css`
- `@keyframes modalBackdropIn` (opacity 0→1)
- `@keyframes modalContentIn` (opacity 0→1, scale 0.95→1)
- Corresponding `@utility` directives

## Files to Create
- `src/components/PdfViewerModal.tsx`
- `public/reports/` directory (user places PDFs here)

## Files to Modify
- `src/pages/DashboardPage.tsx` — clickable rows + modal
- `src/pages/BoreLogsPage.tsx` — clickable rows + modal
- `src/index.css` — modal animation keyframes/utilities

## Dependencies to Install
- `react-pdf` (includes pdfjs-dist)
