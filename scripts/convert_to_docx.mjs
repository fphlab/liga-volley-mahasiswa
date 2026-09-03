import fs from 'fs';
import path from 'path';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  ShadingType
} from 'docx';

const docsDir = path.join(process.cwd(), 'docs');

function parseMarkdownToDocx(mdContent) {
  const lines = mdContent.split('\n');
  const children = [];

  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      const docxRows = tableRows.map((rowCells, rIdx) => {
        const isHeader = rIdx === 0;
        return new TableRow({
          tableHeader: isHeader,
          children: rowCells.map(cellText => {
            // Clean markdown bold inside cells
            const cleanText = cellText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<br\s*\/?>/gi, '\n').trim();
            return new TableCell({
              width: { size: 100 / rowCells.length, type: WidthType.PERCENTAGE },
              shading: isHeader ? { fill: '0F172A', type: ShadingType.CLEAR } : (rIdx % 2 === 1 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined),
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              },
              children: cleanText.split('\n').map(line => new Paragraph({
                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: line,
                    bold: isHeader,
                    color: isHeader ? 'FFFFFF' : '0F172A',
                    font: 'Calibri',
                    size: 20, // 10pt
                  }),
                ],
              })),
            });
          }),
        });
      });

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: docxRows,
      }));
      children.push(new Paragraph({ spacing: { after: 120 } }));
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      if (inTable) flushTable();
      continue;
    }

    // Horizontal Rule
    if (rawLine === '---' || rawLine === '***') {
      if (inTable) flushTable();
      children.push(new Paragraph({
        border: { bottom: { color: 'CBD5E1', size: 6, style: BorderStyle.SINGLE } },
        spacing: { before: 100, after: 100 },
      }));
      continue;
    }

    // Tables
    if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
      inTable = true;
      // Skip separator row |---|---|
      if (rawLine.includes('---')) continue;
      const cells = rawLine.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (rawLine.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: rawLine.replace('# ', ''),
            bold: true,
            size: 32, // 16pt
            color: '0F172A',
            font: 'Calibri',
          }),
        ],
      }));
      continue;
    }

    if (rawLine.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: rawLine.replace('## ', ''),
            bold: true,
            size: 26, // 13pt
            color: '1E293B',
            font: 'Calibri',
          }),
        ],
      }));
      continue;
    }

    if (rawLine.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: rawLine.replace('### ', ''),
            bold: true,
            size: 22, // 11pt
            color: '334155',
            font: 'Calibri',
          }),
        ],
      }));
      continue;
    }

    // Bullet lists
    if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
      const text = rawLine.replace(/^[-*]\s+/, '');
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        children: parseFormattedText(text),
      }));
      continue;
    }

    // Numbered lists
    const numMatch = rawLine.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      children.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: `${numMatch[1]}. `, bold: true, font: 'Calibri', size: 22 }),
          ...parseFormattedText(numMatch[2]),
        ],
      }));
      continue;
    }

    // Standard Paragraph
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: parseFormattedText(rawLine),
    }));
  }

  if (inTable) flushTable();

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });
}

function parseFormattedText(text) {
  const runs = [];
  // Split by bold (**...**) and italic (*...*)
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: 'Calibri',
        size: 22, // 11pt
        color: '0F172A',
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
        font: 'Calibri',
        size: 22,
        color: '334155',
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        font: 'Calibri',
        size: 22,
        color: '0F172A',
      }));
    }
  }

  return runs;
}

async function convertAll() {
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files to convert in ${docsDir}`);

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const mdContent = fs.readFileSync(filePath, 'utf-8');
    const docTitle = file.replace('.md', '');
    const outPath = path.join(docsDir, `${docTitle}.docx`);

    console.log(`Generating ${docTitle}.docx...`);
    const doc = parseMarkdownToDocx(mdContent, docTitle);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ Created: ${outPath}`);
  }

  console.log('All DOCX files generated successfully!');
}

convertAll().catch(err => {
  console.error('Error generating DOCX:', err);
  process.exit(1);
});
