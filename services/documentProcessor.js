const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function extractTextFromTXT(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function chunkText(text) {
  const chunkSize = 1000;
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    chunks.push({
      content: chunk.trim(),
      chunkIndex: index
    });
    start = end;
    index++;
  }

  return chunks;
}

module.exports = {
  extractTextFromPDF,
  extractTextFromTXT,
  chunkText
};
