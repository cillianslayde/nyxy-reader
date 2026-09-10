# Nyxy Reader

A dual-format e-reader for EPUB and PDF, with a two-page spread view, zoom,
and a slide-out library sidebar.

**Live:** https://cillianslayde.github.io/nyxy-reader/

---

## What it is

- Upload an EPUB or PDF and read it right in the browser
- Two-page spread or single-page toggle
- Zoom in/out — scales PDF render resolution, or EPUB font size
- Jump to a specific page (PDF) via the page counter
- A running library list of everything you've opened this session

Everything runs client-side. Rendering is powered by
[PDF.js](https://mozilla.github.io/pdf.js/) and
[epub.js](https://github.com/futurepress/epub.js/) via CDN — no server, no
account, no upload of your files anywhere.

## Format support

EPUB and PDF are fully supported. MOBI is not — Amazon ended MOBI support
for new content back in 2022–2025, and it's not read anywhere but old
Kindle devices these days. If you have old MOBI files, converting them to
EPUB (free tools like Calibre do this in one step) is the practical path.

## Running it

Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).

## License

All Rights Reserved — see [LICENSE](./LICENSE). Free to use as-is via the
hosted link above; not licensed for redistribution or reuse of the source.
