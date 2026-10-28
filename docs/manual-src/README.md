# Manual source

`../Ethio-Referral-Linkage-User-Manual.docx` is generated from `manual.txt`.
Edit the text file, then regenerate:

```bash
npm install docx          # once, anywhere; the script takes its path from M
node gen-docx.js manual.txt ../Ethio-Referral-Linkage-User-Manual.docx
```

`gen-docx.js` points `M` at a `node_modules` directory holding the `docx`
package — change that constant to wherever you installed it.

## Markup understood by the generator

| Mark | Result |
| --- | --- |
| `@title` / `@sub` / `@meta` | Cover-page title, subtitle, rule-topped meta line |
| `# ` `## ` `### ` | Heading levels 1–3 |
| `- ` | Bulleted list (em-dash bullet) |
| `1. ` | Numbered list, restarting per block |
| `\| a \| b \|` | Table; first row is the header. Precede with `[cols:30,70]` to set column percentages |
| `> ` | Callout with a left rule |
| `***` | Page break |
| `**bold**`, `*italic*` | Inline emphasis |

Black and white only by design — no accent colour, no images.
