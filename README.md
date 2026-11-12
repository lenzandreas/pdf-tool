# PDF-Tool

Edit PDFs right in your browser: merge, split, blacken and more.
**Your files never leave your device.** The web server only delivers the app;
every PDF is opened, changed and saved inside the browser tab.

*Deutsch: PDFs direkt im Browser bearbeiten – zusammenfügen, aufteilen,
schwärzen und mehr. Die Dateien werden nie hochgeladen. Die Oberfläche gibt es
auf Deutsch und Englisch.*

## Tools

| Tool | What it does |
| --- | --- |
| Merge | Combine several PDFs, optionally only some pages of each. |
| Split | Every page as its own file, every *n* pages, custom parts (`1-3, 4-6, 7-`) or extract selected pages. Several parts come as one ZIP. |
| Blacken | Draw black boxes, or let it find text, e-mail addresses, IBANs and phone numbers. The covered content is removed for good (see below). |
| Organize pages | Reorder (drag and drop), rotate, duplicate and delete pages, also across several files. |
| Images to PDF | JPG, PNG, WebP … into one PDF (A4, US Letter or image size). Phone photos are turned upright. |
| PDF to images | Every page as PNG or JPG at 72, 150 or 300 dpi. |
| Page numbers | Stamp page numbers in six positions and several formats. |
| Metadata | View, edit or remove title, author and the like. |

## Privacy

- No PDF is ever uploaded. There is no backend, no analytics, no cookies,
  no CDN; all code and fonts are served from your own server.
- A strict Content Security Policy (`connect-src 'self'`) stops the page
  from talking to any other server, even by mistake.
- The automated tests check that the app makes no request to any other host.

## How blackening works and why it cannot be undone

Drawing a black rectangle on top of text is not enough: the text is still in
the file and can be copied out. This tool instead:

1. renders every page that has a box to a picture (150, 200 or 300 dpi),
2. paints the boxes black into that picture, and
3. writes a **new** PDF in which that page is only the picture.

The original text, fonts, vector graphics, images and annotations of a
blackened page are not copied to the output at all, so there is nothing
"under" the black box. The output is a brand-new file, so the original's
metadata, XMP data, bookmarks, attachments, form data, JavaScript and earlier
revisions are not carried over either. Pages without boxes are copied as they
are and stay searchable; links from them to other pages are removed so they
cannot drag a blackened page back into the file. Tick **Flatten all pages**
to turn every page into a picture.

Things to keep in mind:

- Text search finds text, not pictures. Scanned pages have no text, so mark
  them by hand. Always look through the pages before downloading.
- Blackened pages are no longer selectable or searchable.
- Check the result before you share it.

The browser tests build a PDF with secrets hidden on the page, in the
metadata, in an attachment, in private page data and behind a link, blacken
it through the real user interface, and then search every byte of the result
(including compressed and unreferenced data) to make sure none of them is left.

## Hosting on netcup (or any web space)

The app is a set of static files. You need Node.js 22 or newer only to build it.

```bash
npm ci
npm run build      # creates the folder dist/
```

Without Node.js: open the latest successful run under **Actions → CI** on
GitHub and download the artifact `pdf-tool-website`; it contains the same files.

**netcup Webhosting (Apache):** upload the *contents* of `dist/` (including
the hidden file `.htaccess`) with SFTP/FTP or the file manager in the
WebHosting Control Panel into the document root of your domain or subdomain,
e.g. `httpdocs/` or `httpdocs/pdf/`. The `.htaccess` sets the security
headers and the right file types. Turn on the free Let's Encrypt certificate
for the domain in the control panel.

**netcup VPS / root server (nginx):** copy `dist/` to e.g. `/var/www/pdf-tool`
and use [`docs/nginx.conf`](docs/nginx.conf) as a starting point.

The app works from any sub-folder because all paths are relative.

## Development

```bash
npm ci
npm run dev        # local dev server
npm test           # unit tests (Node's built-in test runner)
npm run test:e2e   # builds, then drives the app in Chromium (needs pdftotext from poppler-utils)
```

Stack: TypeScript, [Vite](https://vite.dev), [pdf-lib](https://pdf-lib.js.org)
for writing PDFs, [pdf.js](https://mozilla.github.io/pdf.js/) for rendering and
text search, [fflate](https://github.com/101arrowz/fflate) for ZIP files. No
UI framework.

```
src/lib/      PDF logic (merge, split, redact, …), independent of the UI
src/tools/    one file per tool
src/ui/       small UI helpers
src/i18n.ts   German and English texts
tests/        unit tests, browser tests and the leak scanner
```

## Licence

MIT, see [LICENSE](LICENSE). Bundled libraries keep their own licences:
pdf.js (Apache-2.0), pdf-lib (MIT), fflate (MIT).
