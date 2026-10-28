/* Renders a lightly-marked-up text file into a clean black-and-white .docx. */
const fs = require('fs');
const path = require('path');
const M = '/home/abel/.claude/jobs/869eddbd/tmp/node_modules';
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType, Header, Footer, PageNumber,
  LevelFormat, PageBreak,
} = require(path.join(M, 'docx'));

const SRC = process.argv[2];
const OUT = process.argv[3];
const BODY = 'Georgia';
const SANS = 'Arial';
const CONTENT_W = 9020; // A4 minus 1in margins, in DXA

const lines = fs.readFileSync(SRC, 'utf8').split('\n');

/* ---------------------------------------------------------------- inline */
function runs(text, base = {}) {
  const out = [];
  for (const part of String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      out.push(new TextRun({ ...base, text: part.slice(1, -1), italics: true }));
    } else {
      out.push(new TextRun({ ...base, text: part }));
    }
  }
  return out.length ? out : [new TextRun({ ...base, text: '' })];
}

const P = (text, opts = {}) => new Paragraph({
  children: runs(text, { font: BODY, size: 21, ...(opts.run || {}) }),
  spacing: { after: opts.after ?? 140, line: 288 },
  ...opts.para,
});

/* ----------------------------------------------------------------- table */
function makeTable(rows, colPct) {
  const cols = rows[0].length;
  const pct = colPct && colPct.length === cols ? colPct : Array(cols).fill(100 / cols);
  const widths = pct.map((p) => Math.round((CONTENT_W * p) / 100));
  widths[cols - 1] = CONTENT_W - widths.slice(0, -1).reduce((a, b) => a + b, 0);

  const cell = (txt, i, header) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    shading: header ? { type: ShadingType.CLEAR, fill: 'EFEFEF', color: 'auto' } : undefined,
    children: [new Paragraph({
      children: runs(txt, { font: header ? SANS : BODY, size: header ? 18 : 19, bold: !!header }),
      spacing: { after: 0, line: 264 },
    })],
  });

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'C9C9C9' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((c, ci) => cell(c, ci, ri === 0)),
    })),
  });
}

/* ------------------------------------------------------------------ parse */
const children = [];
let listInstance = 0;
let i = 0;
let pendingCols = null;

while (i < lines.length) {
  const line = lines[i].replace(/\s+$/, '');

  if (!line.trim()) { i++; continue; }

  if (line.startsWith('[cols:')) {
    pendingCols = line.slice(6, -1).split(',').map(Number);
    i++; continue;
  }

  if (line === '***') {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    i++; continue;
  }

  if (line.startsWith('@title ')) {
    children.push(new Paragraph({
      children: runs(line.slice(7), { font: SANS, size: 54, bold: true }),
      spacing: { before: 2600, after: 220 },
    }));
    i++; continue;
  }
  if (line.startsWith('@sub ')) {
    children.push(new Paragraph({
      children: runs(line.slice(5), { font: BODY, size: 25, color: '444444' }),
      spacing: { after: 120, line: 300 },
    }));
    i++; continue;
  }
  if (line.startsWith('@meta ')) {
    children.push(new Paragraph({
      children: runs(line.slice(6), { font: SANS, size: 18, color: '666666' }),
      spacing: { before: 420, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 8 } },
    }));
    i++; continue;
  }

  if (line.startsWith('# ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: runs(line.slice(2), { font: SANS, size: 32, bold: true, color: '000000' }),
      spacing: { before: 400, after: 180 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 6 } },
      keepNext: true,
    }));
    i++; continue;
  }
  if (line.startsWith('## ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: runs(line.slice(3), { font: SANS, size: 24, bold: true, color: '000000' }),
      spacing: { before: 320, after: 130 },
      keepNext: true,
    }));
    i++; continue;
  }
  if (line.startsWith('### ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: runs(line.slice(4), { font: SANS, size: 21, bold: true, color: '222222' }),
      spacing: { before: 240, after: 100 },
      keepNext: true,
    }));
    i++; continue;
  }

  if (line.startsWith('> ')) {
    children.push(new Paragraph({
      children: runs(line.slice(2), { font: BODY, size: 20, color: '222222' }),
      spacing: { before: 140, after: 180, line: 288 },
      indent: { left: 260 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 10 } },
    }));
    i++; continue;
  }

  if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
      if (!cells.every((c) => /^-{2,}$/.test(c) || c === '')) rows.push(cells);
      i++;
    }
    children.push(makeTable(rows, pendingCols));
    pendingCols = null;
    children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 160 } }));
    continue;
  }

  if (/^[-*] /.test(line)) {
    listInstance++;
    while (i < lines.length && /^[-*] /.test(lines[i])) {
      children.push(new Paragraph({
        children: runs(lines[i].slice(2), { font: BODY, size: 21 }),
        numbering: { reference: 'erl-bullets', level: 0, instance: listInstance },
        spacing: { after: 80, line: 288 },
      }));
      i++;
    }
    children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 60 } }));
    continue;
  }

  if (/^\d+\. /.test(line)) {
    listInstance++;
    while (i < lines.length && /^\d+\. /.test(lines[i])) {
      children.push(new Paragraph({
        children: runs(lines[i].replace(/^\d+\. /, ''), { font: BODY, size: 21 }),
        numbering: { reference: 'erl-numbers', level: 0, instance: listInstance },
        spacing: { after: 90, line: 288 },
      }));
      i++;
    }
    children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 60 } }));
    continue;
  }

  children.push(P(line));
  i++;
}

/* -------------------------------------------------------------- document */
const doc = new Document({
  creator: 'Ethio Referral Linkage',
  title: 'Ethio Referral Linkage - User Manual',
  description: 'Operational user manual for the Ethio Referral Linkage pilot',
  numbering: {
    config: [
      {
        reference: 'erl-bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '—', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340, hanging: 230 } }, run: { font: BODY } },
        }],
      },
      {
        reference: 'erl-numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 250 } }, run: { font: SANS, bold: true } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      titlePage: true,
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: 'Ethio Referral Linkage — User Manual', font: SANS, size: 16, color: '777777' })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 160 },
        })],
      }),
      first: new Header({ children: [new Paragraph('')] }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 16, color: '777777' })],
        })],
      }),
      first: new Footer({ children: [new Paragraph('')] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('wrote', OUT, buf.length, 'bytes');
});
