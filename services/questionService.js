const { GoogleGenerativeAI } = require('@google/generative-ai');
const DocumentChunk = require('../models/DocumentChunk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateMCQs(subjectId, userId, subjectName) {
  try {
    console.log('=== MCQ Generation Started ===');
    
    const allChunks = await DocumentChunk.find({ 
      subjectId, 
      userId 
    }).lean();

    if (allChunks.length === 0) {
      return { error: 'No documents found for this subject' };
    }

    const relevantChunks = allChunks.slice(0, 10);

    const context = relevantChunks.map((chunk, idx) => 
      `Source ${idx + 1} from ${chunk.originalName}:\n${chunk.content}`
    ).join('\n\n');

    const prompt = `You are creating practice questions from study notes.

Context:
${context}

Generate exactly 5 multiple-choice questions based on the notes above.

Return ONLY a JSON object in this format (no markdown, no extra text):
{
  "questions": [
    {
      "question": "question text here",
      "options": ["A) first option", "B) second option", "C) third option", "D) fourth option"],
      "correct": "A",
      "explanation": "brief explanation here",
      "citation": "filename.pdf"
    }
  ]
}

Rules:
1. Base questions strictly on the provided notes
2. Include exactly 4 options (A, B, C, D)
3. Mark correct answer as A, B, C, or D
4. Keep explanations brief
5. Cite the source filename`;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json/g, '');
    cleanText = cleanText.replace(/```/g, '');
    cleanText = cleanText.replace(/^\s*[^{]*/, '');
    cleanText = cleanText.replace(/[^}]*\s*$/, '');

    const parsed = JSON.parse(cleanText);

    console.log('=== MCQ Generation Success ===');
    return parsed;

  } catch (error) {
    console.error('Error in generateMCQs:', error);
    return {
      error: error.message
    };
  }
}

async function generateShortAnswer(subjectId, userId, subjectName) {
  try {
    console.log('=== Short Answer Generation Started ===');
    
    const allChunks = await DocumentChunk.find({ 
      subjectId, 
      userId 
    }).lean();

    if (allChunks.length === 0) {
      return { error: 'No documents found for this subject' };
    }

    const relevantChunks = allChunks.slice(0, 10);

    const context = relevantChunks.map((chunk, idx) => 
      `Source ${idx + 1} from ${chunk.originalName}:\n${chunk.content}`
    ).join('\n\n');

    const prompt = `You are creating practice questions from study notes.

Context:
${context}

Generate exactly 3 short-answer questions with detailed model answers based on the notes above.

Return ONLY a JSON object in this format (no markdown, no extra text):
{
  "questions": [
    {
      "question": "question text here",
      "answer": "detailed model answer in 3-5 sentences",
      "citation": "filename.pdf"
    }
  ]
}

Rules:
1. Base questions strictly on the provided notes
2. Provide detailed answers (3-5 sentences)
3. Cite the source filename`;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let cleanText = text.trim();
    cleanText = cleanText.replace(/```json/g, '');
    cleanText = cleanText.replace(/```/g, '');
    cleanText = cleanText.replace(/^\s*[^{]*/, '');
    cleanText = cleanText.replace(/[^}]*\s*$/, '');

    const parsed = JSON.parse(cleanText);

    console.log('=== Short Answer Generation Success ===');
    return parsed;

  } catch (error) {
    console.error('Error in generateShortAnswer:', error);
    return {
      error: error.message
    };
  }
}

module.exports = {
  generateMCQs,
  generateShortAnswer
};
