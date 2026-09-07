import fs from 'fs';

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const fileEntries = [];
  let localHeadersLength = 0;

  for (const f of files) {
    const data = typeof f.content === 'string' ? encoder.encode(f.content) : f.content;
    const nameBytes = encoder.encode(f.name);
    const checksum = crc32(data);
    fileEntries.push({
      nameBytes,
      data,
      checksum,
      size: data.length,
      offset: 0
    });
  }

  // 1. Local headers + data
  const parts = [];
  let currentOffset = 0;

  for (const entry of fileEntries) {
    entry.offset = currentOffset;
    const header = new Uint8Array(30 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true);  // flags
    view.setUint16(8, 0, true);  // compression = 0 (stored)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, entry.checksum, true);
    view.setUint32(18, entry.size, true); // compressed size
    view.setUint32(22, entry.size, true); // uncompressed size
    view.setUint16(26, entry.nameBytes.length, true);
    view.setUint16(28, 0, true); // extra length
    header.set(entry.nameBytes, 30);

    parts.push(header);
    parts.push(entry.data);
    currentOffset += header.length + entry.data.length;
  }

  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  // 2. Central directory
  for (const entry of fileEntries) {
    const cdir = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdir.buffer);
    
    view.setUint32(0, 0x02014b50, true); // Central dir signature
    view.setUint16(4, 20, true);  // version made by
    view.setUint16(6, 20, true);  // version needed
    view.setUint16(8, 0, true);   // flags
    view.setUint16(10, 0, true);  // compression = 0
    view.setUint16(12, 0, true);  // mod time
    view.setUint16(14, 0, true);  // mod date
    view.setUint32(16, entry.checksum, true);
    view.setUint32(20, entry.size, true);
    view.setUint32(24, entry.size, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);  // extra length
    view.setUint16(32, 0, true);  // comment length
    view.setUint16(34, 0, true);  // disk #
    view.setUint16(36, 0, true);  // internal attr
    view.setUint32(38, 0, true);  // external attr
    view.setUint32(42, entry.offset, true); // relative offset
    cdir.set(entry.nameBytes, 46);

    parts.push(cdir);
    centralDirSize += cdir.length;
  }

  // 3. End of Central Directory Record
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true); // disk number
  view.setUint16(6, 0, true); // central dir disk
  view.setUint16(8, fileEntries.length, true); // entries on disk
  view.setUint16(10, fileEntries.length, true); // total entries
  view.setUint32(12, centralDirSize, true);
  view.setUint32(16, centralDirStart, true);
  view.setUint16(20, 0, true); // comment length
  parts.push(eocd);

  // Concatenate
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

function generateDocx(title) {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
          <w:color w:val="1E40AF"/>
        </w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>Enterprise Document Management Platform Export</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Timestamp: ${new Date().toLocaleString()}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="16A34A"/>
        </w:rPr>
        <w:t>Status: Verified &amp; Active</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>--------------------------------------------------</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>This official document is managed under the centralized Digital Workspace system. Full versioning and RBAC access control are active.</w:t>
      </w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;

  const files = [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: 'word/document.xml', content: docXml }
  ];

  return createZip(files);
}

const docxBytes = generateDocx('lkuhyvasjkl.docx');
fs.writeFileSync('test_output.docx', docxBytes);
console.log('Successfully generated test_output.docx, size:', docxBytes.length);
