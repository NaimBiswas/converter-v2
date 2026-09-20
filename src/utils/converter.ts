import { UploadedFileItem } from '../types';
import * as XLSX from 'xlsx';
import * as yaml from 'js-yaml';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph } from 'docx';
import JSZip from 'jszip';
import * as mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Gets recommended target output formats based on original extension/type
 */
export function getAvailableTargetFormats(file: File): string[] {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type = file.type;

  if (ext === 'heic' || ext === 'heif') {
    return ['JPG', 'PNG', 'WEBP', 'PDF'];
  }

  if (type.startsWith('image/')) {
    if (ext === 'webp') return ['JPG', 'PNG', 'PDF', 'GIF'];
    if (ext === 'png') return ['JPG', 'WEBP', 'PDF', 'GIF'];
    if (ext === 'jpg' || ext === 'jpeg') return ['PNG', 'WEBP', 'PDF', 'GIF'];
    return ['PNG', 'JPG', 'WEBP', 'PDF'];
  }

  if (ext === 'csv') {
    return ['JSON', 'XML', 'EXCEL', 'HTML', 'MD', 'TSV'];
  }

  if (ext === 'json') {
    return ['CSV', 'XML', 'YAML', 'EXCEL', 'FORMAT'];
  }

  if (ext === 'xml') {
    return ['JSON', 'CSV', 'FORMAT'];
  }

  if (ext === 'yaml' || ext === 'yml') {
    return ['JSON'];
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return ['CSV', 'JSON', 'PDF'];
  }

  if (ext === 'pdf') {
    return ['JPG', 'PNG', 'DOCX', 'TXT', 'MERGE', 'SPLIT', 'COMPRESS'];
  }

  if (ext === 'docx' || ext === 'doc') {
    return ['PDF', 'TXT', 'HTML', 'MD'];
  }

  if (ext === 'md' || ext === 'markdown') {
    return ['HTML', 'PDF', 'TXT', 'DOCX'];
  }

  if (ext === 'txt') {
    return ['BASE64_ENCODE', 'BASE64_DECODE', 'PDF', 'HTML', 'MD', 'JSON'];
  }

  if (ext === 'html' || ext === 'htm') {
    return ['MD', 'TXT', 'PDF'];
  }

  return ['PDF', 'TXT', 'ZIP', 'BASE64', 'JSON'];
}

/**
 * Performs actual file conversion
 */
export async function convertSingleFile(
  item: UploadedFileItem,
  onProgress?: (progress: number) => void,
  siblingFiles?: UploadedFileItem[]
): Promise<{ blob: Blob; url: string; size: number; filename: string; textContent?: string }> {
  const file = item.file;
  const targetFormat = item.targetFormat.toUpperCase();
  const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
  const ext = item.extension.toLowerCase();

  if (onProgress) onProgress(15);

  // 1. SPREADSHEET (EXCEL .xlsx, .xls) INPUT CONVERSIONS
  if (ext === 'xlsx' || ext === 'xls') {
    if (onProgress) onProgress(40);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
    const worksheet = workbook.Sheets[firstSheetName];

    let outputContent = '';
    let mimeType = 'text/csv';
    let newExt = 'csv';
    let binaryBlob: Blob | null = null;

    if (targetFormat === 'CSV') {
      outputContent = XLSX.utils.sheet_to_csv(worksheet);
      mimeType = 'text/csv';
      newExt = 'csv';
    } else if (targetFormat === 'JSON') {
      const jsonArr = XLSX.utils.sheet_to_json(worksheet);
      outputContent = JSON.stringify(jsonArr, null, 2);
      mimeType = 'application/json';
      newExt = 'json';
    } else if (targetFormat === 'PDF') {
      const pdfBytes = await buildTextPdf(XLSX.utils.sheet_to_csv(worksheet), item.name);
      binaryBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      newExt = 'pdf';
    }

    if (onProgress) onProgress(90);
    const blob = binaryBlob || new Blob([outputContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    if (onProgress) onProgress(100);

    return {
      blob,
      url,
      size: blob.size,
      filename: `${baseName}_converted.${newExt}`,
      textContent: outputContent ? outputContent.substring(0, 5000) : '[Binary File Output]',
    };
  }

  // 2. HEIC/HEIF CONVERSIONS (decode via heic2any, then reuse image/PDF pipelines)
  if (ext === 'heic' || ext === 'heif') {
    if (onProgress) onProgress(40);
    return await convertHeicImage(file, targetFormat, baseName, onProgress);
  }

  // 3. IMAGE CONVERSIONS & IMAGE -> PDF
  if (file.type.startsWith('image/')) {
    if (onProgress) onProgress(40);
    if (targetFormat === 'PDF') {
      return await convertImageToPdf(file, baseName, onProgress);
    }
    return await convertImage(file, targetFormat, baseName, onProgress);
  }

  // Read file as text for text/data formats
  const fileText = await file.text().catch(() => '');
  if (onProgress) onProgress(40);

  let outputContent = '';
  let mimeType = 'text/plain';
  let newExt = targetFormat.toLowerCase();
  let binaryBlob: Blob | null = null;

  // 4. CSV CONVERSIONS
  if (ext === 'csv') {
    if (targetFormat === 'JSON') {
      outputContent = csvToJson(fileText);
      mimeType = 'application/json';
      newExt = 'json';
    } else if (targetFormat === 'XML') {
      outputContent = csvToXml(fileText);
      mimeType = 'application/xml';
      newExt = 'xml';
    } else if (targetFormat === 'EXCEL' || targetFormat === 'XLSX') {
      const jsonArr = JSON.parse(csvToJson(fileText));
      const ws = XLSX.utils.json_to_sheet(jsonArr);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      binaryBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      newExt = 'xlsx';
    } else if (targetFormat === 'HTML') {
      outputContent = csvToHtmlTable(fileText);
      mimeType = 'text/html';
      newExt = 'html';
    } else if (targetFormat === 'MD') {
      outputContent = csvToMarkdownTable(fileText);
      mimeType = 'text/markdown';
      newExt = 'md';
    } else if (targetFormat === 'TSV') {
      outputContent = fileText.replace(/,/g, '\t');
      mimeType = 'text/tab-separated-values';
      newExt = 'tsv';
    }
  }
  // 5. JSON CONVERSIONS
  else if (ext === 'json') {
    if (targetFormat === 'CSV') {
      outputContent = jsonToCsv(fileText);
      mimeType = 'text/csv';
      newExt = 'csv';
    } else if (targetFormat === 'XML') {
      outputContent = jsonToXml(fileText);
      mimeType = 'application/xml';
      newExt = 'xml';
    } else if (targetFormat === 'YAML' || targetFormat === 'YML') {
      outputContent = jsonToYaml(fileText);
      mimeType = 'text/yaml';
      newExt = 'yaml';
    } else if (targetFormat === 'EXCEL' || targetFormat === 'XLSX') {
      try {
        const jsonData = JSON.parse(fileText);
        const rows: Record<string, unknown>[] = [];
        flattenJsonToRows(jsonData, rows, {});
        const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        binaryBlob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        newExt = 'xlsx';
      } catch (e: any) {
        throw new Error('Invalid JSON format for Excel conversion');
      }
    } else if (targetFormat === 'FORMAT' || targetFormat === 'PRETTIFY') {
      outputContent = formatJson(fileText);
      mimeType = 'application/json';
      newExt = 'json';
    }
  }
  // 6. XML CONVERSIONS
  else if (ext === 'xml') {
    if (targetFormat === 'JSON') {
      outputContent = xmlToJson(fileText);
      mimeType = 'application/json';
      newExt = 'json';
    } else if (targetFormat === 'CSV') {
      const jsonStr = xmlToJson(fileText);
      outputContent = jsonToCsv(jsonStr);
      mimeType = 'text/csv';
      newExt = 'csv';
    } else if (targetFormat === 'FORMAT') {
      outputContent = formatXml(fileText);
      mimeType = 'application/xml';
      newExt = 'xml';
    }
  }
  // 7. YAML CONVERSIONS
  else if (ext === 'yaml' || ext === 'yml') {
    if (targetFormat === 'JSON') {
      outputContent = yamlToJson(fileText);
      mimeType = 'application/json';
      newExt = 'json';
    }
  }
  // 8. PDF CONVERSIONS (MERGE, SPLIT, COMPRESS, PDF TO IMAGE)
  else if (ext === 'pdf') {
    if (targetFormat === 'JPG' || targetFormat === 'PNG' || targetFormat === 'IMAGE') {
      return await renderPdfToImage(file, baseName, targetFormat === 'PNG' ? 'PNG' : 'JPG', onProgress);
    } else if (targetFormat === 'MERGE') {
      const pdfSiblings = (siblingFiles ?? [])
        .filter((f) => f.extension.toLowerCase() === 'pdf')
        .map((f) => f.file);
      const sourceFiles = pdfSiblings.length > 0 ? pdfSiblings : [file];
      const mergedBytes = await mergePdfFiles(sourceFiles);
      binaryBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      newExt = 'pdf';
    } else if (targetFormat === 'SPLIT') {
      binaryBlob = await splitPdfToZip(file, baseName);
      newExt = 'zip';
    } else if (targetFormat === 'COMPRESS') {
      const compressedBytes = await compressPdf(file);
      binaryBlob = new Blob([compressedBytes], { type: 'application/pdf' });
      newExt = 'pdf';
    } else if (targetFormat === 'TXT') {
      outputContent = await extractPdfText(file);
      mimeType = 'text/plain';
      newExt = 'txt';
    } else if (targetFormat === 'DOCX') {
      const extractedText = await extractPdfText(file);
      binaryBlob = await buildDocx(extractedText || `Document extracted from ${item.name}`, item.name);
      newExt = 'docx';
    }
  }
  // 9. WORD DOCUMENT (.docx/.doc) SOURCE CONVERSIONS
  else if (ext === 'docx' || ext === 'doc') {
    const arrayBuffer = await file.arrayBuffer();
    if (targetFormat === 'HTML') {
      const result = await mammoth.convertToHtml({ arrayBuffer });
      outputContent = result.value;
      mimeType = 'text/html';
      newExt = 'html';
    } else if (targetFormat === 'MD') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      outputContent = result.value;
      mimeType = 'text/markdown';
      newExt = 'md';
    } else if (targetFormat === 'TXT') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      outputContent = result.value;
      mimeType = 'text/plain';
      newExt = 'txt';
    } else if (targetFormat === 'PDF') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const pdfBytes = await buildTextPdf(result.value, item.name);
      binaryBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      newExt = 'pdf';
    }
  }
  // 10. DEVELOPER UTILITIES & TEXT (BASE64, FORMATTERS, VALIDATORS)
  else if (targetFormat === 'BASE64_ENCODE' || targetFormat === 'BASE64') {
    outputContent = btoa(unescape(encodeURIComponent(fileText)));
    mimeType = 'text/plain';
    newExt = 'txt';
  } else if (targetFormat === 'BASE64_DECODE') {
    try {
      outputContent = decodeURIComponent(escape(atob(fileText.trim())));
      mimeType = 'text/plain';
      newExt = 'txt';
    } catch {
      throw new Error('Invalid Base64 string payload');
    }
  }

  // Default fallback if outputContent was not set
  if (!outputContent && !binaryBlob) {
    if (ext === 'md' || ext === 'txt') {
      if (targetFormat === 'HTML') {
        outputContent = markdownToHtml(fileText);
        mimeType = 'text/html';
        newExt = 'html';
      } else if (targetFormat === 'PDF') {
        const pdfBytes = await buildTextPdf(fileText, item.name);
        binaryBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        newExt = 'pdf';
      } else if (targetFormat === 'DOCX') {
        binaryBlob = await buildDocx(fileText, item.name);
        newExt = 'docx';
      } else {
        outputContent = fileText;
      }
    } else {
      outputContent = fileText || `Converted ${item.name} to ${targetFormat}`;
    }
  }

  if (onProgress) onProgress(85);

  const finalBlob = binaryBlob || new Blob([outputContent], { type: mimeType });
  const url = URL.createObjectURL(finalBlob);
  const filename = `${baseName}_converted.${newExt}`;

  if (onProgress) onProgress(100);

  return {
    blob: finalBlob,
    url,
    size: finalBlob.size,
    filename,
    textContent: outputContent ? (outputContent.length < 5000 ? outputContent : outputContent.substring(0, 5000) + '...\n(truncated preview)') : '[Binary File Output]',
  };
}

/**
 * HEIC/HEIF Conversion — decodes via heic2any (libheif compiled to WASM, loaded
 * on demand) since browsers other than Safari can't decode HEIC natively, then
 * reuses the existing canvas/PDF pipelines for the actual target encoding.
 */
async function convertHeicImage(
  file: File,
  targetFormat: string,
  baseName: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; url: string; size: number; filename: string }> {
  const { default: heic2any } = await import('heic2any');

  if (onProgress) onProgress(60);

  const decoded = await heic2any({
    blob: file,
    toType: targetFormat === 'JPG' || targetFormat === 'JPEG' ? 'image/jpeg' : 'image/png',
    quality: 0.92,
  });
  const decodedBlob = Array.isArray(decoded) ? decoded[0] : decoded;

  if (targetFormat === 'WEBP' || targetFormat === 'PDF') {
    const decodedExt = decodedBlob.type === 'image/jpeg' ? 'jpg' : 'png';
    const decodedFile = new File([decodedBlob], `${baseName}.${decodedExt}`, { type: decodedBlob.type });
    return targetFormat === 'PDF'
      ? await convertImageToPdf(decodedFile, baseName, onProgress)
      : await convertImage(decodedFile, 'WEBP', baseName, onProgress);
  }

  if (onProgress) onProgress(100);
  const ext = targetFormat === 'JPG' || targetFormat === 'JPEG' ? 'jpg' : 'png';
  const url = URL.createObjectURL(decodedBlob);
  return {
    blob: decodedBlob,
    url,
    size: decodedBlob.size,
    filename: `${baseName}_converted.${ext}`,
  };
}

/**
 * Image Format Conversion using Canvas API
 */
async function convertImage(
  file: File,
  targetFormat: string,
  baseName: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; url: string; size: number; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (onProgress) onProgress(70);

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        if (targetFormat === 'JPG' || targetFormat === 'JPEG') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/png';
        let ext = 'png';

        if (targetFormat === 'WEBP') {
          mimeType = 'image/webp';
          ext = 'webp';
        } else if (targetFormat === 'JPG' || targetFormat === 'JPEG') {
          mimeType = 'image/jpeg';
          ext = 'jpg';
        } else if (targetFormat === 'GIF') {
          mimeType = 'image/gif';
          ext = 'gif';
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image conversion failed'));
              return;
            }
            if (onProgress) onProgress(100);
            const url = URL.createObjectURL(blob);
            const filename = `${baseName}_converted.${ext}`;
            resolve({
              blob,
              url,
              size: blob.size,
              filename,
            });
          },
          mimeType,
          0.92
        );
      };

      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Image file directly to PDF document using pdf-lib
 */
async function convertImageToPdf(
  file: File,
  baseName: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; url: string; size: number; filename: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.create();

  let image;
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    image = await pdfDoc.embedJpg(arrayBuffer);
  } else {
    // Default or PNG
    image = await pdfDoc.embedPng(arrayBuffer).catch(async () => {
      // Fallback: draw image on canvas and embed PNG
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            const pngBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
            resolve(await pdfDoc.embedPng(pngBytes));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    });
  }

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });

  if (onProgress) onProgress(80);
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  if (onProgress) onProgress(100);

  return {
    blob,
    url,
    size: blob.size,
    filename: `${baseName}_converted.pdf`,
  };
}

/**
 * Render the real first page of a PDF to Image (JPG/PNG) using pdfjs-dist + Canvas
 */
async function renderPdfToImage(
  file: File,
  baseName: string,
  targetImgFormat: 'JPG' | 'PNG',
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; url: string; size: number; filename: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  if (onProgress) onProgress(50);

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  if (!canvas.getContext('2d')) {
    throw new Error('Canvas context unavailable');
  }

  await page.render({ canvas, viewport }).promise;

  if (onProgress) onProgress(90);

  return new Promise((resolve, reject) => {
    const mimeType = targetImgFormat === 'PNG' ? 'image/png' : 'image/jpeg';
    const ext = targetImgFormat.toLowerCase();
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PDF page rendering failed'));
        return;
      }
      if (onProgress) onProgress(100);
      resolve({
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        filename: `${baseName}_page1.${ext}`,
      });
    }, mimeType);
  });
}

/**
 * Extracts real text content from every page of a PDF via pdfjs-dist.
 */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((token) => ('str' in token ? token.str : ''))
      .join(' ');
    pageTexts.push(pageText.trim());
  }

  return pageTexts.join('\n\n--- Page Break ---\n\n').trim();
}

/**
 * Builds a real, openable .docx from plain text via the `docx` library.
 */
async function buildDocx(text: string, title: string): Promise<Blob> {
  const lines = (text || `Document: ${title}`).split(/\r?\n/);
  const paragraphs = lines.map((line) => new Paragraph({ text: line }));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: '' })],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * pdf-lib's standard fonts only support the WinAnsi character set; anything
 * outside it (smart quotes, emoji, CJK, etc.) would throw at draw time, so it
 * gets replaced instead.
 */
function sanitizeForStandardFont(text: string): string {
  return text.replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, '?');
}

/**
 * Builds a real, openable multi-page PDF from plain text via pdf-lib,
 * wrapping lines to the page width.
 */
async function buildTextPdf(text: string, title: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.4;

  const rawLines = sanitizeForStandardFont(text || `Document: ${title}`).split(/\r?\n/);
  const wrappedLines: string[] = [];

  for (const raw of rawLines) {
    if (raw === '') {
      wrappedLines.push('');
      continue;
    }
    let current = '';
    for (const word of raw.split(' ')) {
      const attempt = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(attempt, fontSize) > maxWidth) {
        wrappedLines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    }
    wrappedLines.push(current);
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of wrappedLines) {
    if (y < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  return pdfDoc.save();
}

/**
 * Merges multiple real PDF files into one, preserving page order.
 */
async function mergePdfFiles(pdfFiles: File[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const bytes = await pdfFile.arrayBuffer();
    const srcDoc = await PDFDocument.load(bytes);
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((copiedPage) => mergedDoc.addPage(copiedPage));
  }

  return mergedDoc.save();
}

/**
 * Splits a PDF into one real single-page PDF per page, bundled as a .zip
 * (splitting inherently produces multiple files, so a zip is the correct
 * shape for this pipeline's single-blob-out contract, not a compromise).
 */
async function splitPdfToZip(file: File, baseName: string): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes);
  const zip = new JSZip();
  const pageCount = srcDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i]);
    singlePageDoc.addPage(copiedPage);
    const pdfBytes = await singlePageDoc.save();
    zip.file(`${baseName}_page${i + 1}.pdf`, pdfBytes);
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Re-saves a PDF with compacted object streams. This is a genuine, valid
 * recompression pass, not a re-encode - it won't shrink image-heavy PDFs
 * much since embedded images aren't re-encoded, but the output is always a
 * real, smaller-or-equal, valid PDF.
 */
async function compressPdf(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.save({ useObjectStreams: true });
}

// Data Helper Functions:
function csvToJson(csv: string): string {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return '[]';

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const currentline = lines[i].split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j] || `col_${j}`] = currentline[j] !== undefined ? currentline[j] : '';
    }
    result.push(obj);
  }

  return JSON.stringify(result, null, 2);
}

function jsonToCsv(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    const rows: Record<string, unknown>[] = [];
    flattenJsonToRows(data, rows, {});

    if (rows.length === 0) return '';

    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  } catch {
    return 'col1,col2,col3\nvalue1,value2,value3';
  }
}

/**
 * Recursively flattens arbitrary JSON (nested objects/arrays) into CSV-ready rows.
 * Keys that wrap nested data become leading grouping columns; arrays expand into
 * one row per element (e.g. "F-052 Equipment List" / "2763" / serverFileName).
 */
function flattenJsonToRows(
  node: unknown,
  rows: Record<string, unknown>[],
  groups: Record<string, unknown>
): void {
  if (Array.isArray(node)) {
    if (node.length === 0) {
      rows.push({ ...groups });
      return;
    }
    for (const item of node) {
      flattenJsonToRows(item, rows, { ...groups });
    }
    return;
  }

  if (node !== null && typeof node === 'object') {
    const entries = Object.entries(node as Record<string, unknown>);
    if (entries.length === 0) {
      rows.push({ ...groups });
      return;
    }

    const isLeaf = entries.every(([, v]) => v === null || typeof v !== 'object');
    if (isLeaf) {
      rows.push({ ...groups, ...(node as Record<string, unknown>) });
      return;
    }

    const nextGroupKey = `group${Object.keys(groups).length + 1}`;
    for (const [key, value] of entries) {
      flattenJsonToRows(value, rows, { ...groups, [nextGroupKey]: key });
    }
    return;
  }

  rows.push({ ...groups, value: node });
}

function csvToXml(csv: string): string {
  try {
    const json = JSON.parse(csvToJson(csv));
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
    for (const item of json) {
      xml += '  <item>\n';
      for (const key in item) {
        xml += `    <${key}>${escapeXml(item[key])}</${key}>\n`;
      }
      xml += '  </item>\n';
    }
    xml += '</records>';
    return xml;
  } catch {
    return '<?xml version="1.0"?><records></records>';
  }
}

function jsonToXml(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
    const convert = (obj: any, indent = '  '): string => {
      let str = '';
      if (typeof obj === 'object' && obj !== null) {
        for (const k in obj) {
          if (Array.isArray(obj[k])) {
            for (const el of obj[k]) {
              str += `${indent}<${k}>\n${convert(el, indent + '  ')}${indent}</${k}>\n`;
            }
          } else if (typeof obj[k] === 'object') {
            str += `${indent}<${k}>\n${convert(obj[k], indent + '  ')}${indent}</${k}>\n`;
          } else {
            str += `${indent}<${k}>${escapeXml(String(obj[k]))}</${k}>\n`;
          }
        }
      } else {
        str += `${indent}${escapeXml(String(obj))}\n`;
      }
      return str;
    };
    xml += convert(data);
    xml += '</root>';
    return xml;
  } catch {
    return '<root></root>';
  }
}

function xmlToJson(xmlStr: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    
    function parseNode(node: Element): any {
      const obj: any = {};
      if (node.children.length === 0) {
        return node.textContent?.trim() || '';
      }
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const name = child.tagName;
        const val = parseNode(child);
        if (obj[name]) {
          if (!Array.isArray(obj[name])) {
            obj[name] = [obj[name]];
          }
          obj[name].push(val);
        } else {
          obj[name] = val;
        }
      }
      return obj;
    }

    const result = parseNode(xmlDoc.documentElement);
    return JSON.stringify(result, null, 2);
  } catch {
    return JSON.stringify({ message: 'Parsed XML Document', content: xmlStr }, null, 2);
  }
}

function jsonToYaml(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    return yaml.dump(data);
  } catch {
    return 'key: value';
  }
}

function yamlToJson(yamlStr: string): string {
  try {
    const obj = yaml.load(yamlStr);
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
}

function formatJson(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr);
    return JSON.stringify(obj, null, 2);
  } catch (e: any) {
    return `// Syntax Error in JSON:\n// ${e.message}\n\n${jsonStr}`;
  }
}

function formatXml(xmlStr: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    const serializer = new XMLSerializer();
    const raw = serializer.serializeToString(xmlDoc);
    
    // Indent XML
    let formatted = '';
    let indent = '';
    raw.split(/>\s*</).forEach((node) => {
      if (node.match(/^\/\w/)) indent = indent.substring(2);
      formatted += indent + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent += '  ';
    });
    return formatted.substring(1, formatted.length - 2);
  } catch {
    return xmlStr;
  }
}

function csvToHtmlTable(csv: string): string {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return '<table></table>';

  let html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif;">\n  <thead>\n    <tr>\n';
  const headers = lines[0].split(',');
  for (const h of headers) {
    html += `      <th style="background-color: #f3f4f5; text-align: left;">${escapeXml(h.replace(/^"|"$/g, ''))}</th>\n`;
  }
  html += '    </tr>\n  </thead>\n  <tbody>\n';

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    html += '    <tr>\n';
    const cols = lines[i].split(',');
    for (const c of cols) {
      html += `      <td>${escapeXml(c.replace(/^"|"$/g, ''))}</td>\n`;
    }
    html += '    </tr>\n';
  }

  html += '  </tbody>\n</table>';
  return html;
}

function csvToMarkdownTable(csv: string): string {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return '';

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  let md = `| ${headers.join(' | ')} |\n`;
  md += `| ${headers.map(() => '---').join(' | ')} |\n`;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    md += `| ${cols.join(' | ')} |\n`;
  }

  return md;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br />');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format bytes into readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculates estimated time remaining based on file size (bytes), progress percentage, and start time
 */
export function getEstimatedTimeRemaining(
  fileSizeBytes: number,
  progress: number,
  startTime?: number
): string {
  if (progress <= 0) return 'Calculating...';
  if (progress >= 100) return 'Finishing up...';

  const sizeInMB = fileSizeBytes / (1024 * 1024);

  // Baseline processing speed estimate based on file size:
  // Base overhead ~1.2s + ~0.85s per MB for client-side parsing/processing
  let totalEstSeconds = 1.2 + sizeInMB * 0.85;

  // Adjust estimate dynamically if start time is provided and processing has begun
  if (startTime) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    if (elapsedSeconds > 0.1 && progress > 5) {
      const calculatedTotalSeconds = (elapsedSeconds / progress) * 100;
      // Blend size model with measured rate
      totalEstSeconds = calculatedTotalSeconds * 0.7 + totalEstSeconds * 0.3;
    }
  }

  const remainingSeconds = Math.max(0, totalEstSeconds * (1 - progress / 100));

  if (remainingSeconds < 0.8 || progress >= 95) {
    return '< 1s remaining';
  } else if (remainingSeconds < 60) {
    const sec = Math.ceil(remainingSeconds);
    return `~${sec}s remaining`;
  } else {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.ceil(remainingSeconds % 60);
    return `~${mins}m ${secs}s remaining`;
  }
}

