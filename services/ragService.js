const { GoogleGenerativeAI } = require('@google/generative-ai');
const DocumentChunk = require('../models/DocumentChunk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function calculateSimilarity(query, text) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const word of queryWords) {
    if (textWords.some(tw => tw.includes(word) || word.includes(tw))) {
      matches++;
    }
  }
  
  return queryWords.length > 0 ? matches / queryWords.length : 0;
}

async function retrieveRelevantChunks(subjectId, userId, query) {
  const allChunks = await DocumentChunk.find({ 
    subjectId, 
    userId 
  }).lean();

  if (allChunks.length === 0) {
    return [];
  }

  const chunksWithScore = allChunks.map(chunk => ({
    ...chunk,
    score: calculateSimilarity(query, chunk.content)
  }));

  chunksWithScore.sort((a, b) => b.score - a.score);

  return chunksWithScore.slice(0, 5);
}

function getConfidence(chunks) {
  if (chunks.length === 0) return 'Low';
  
  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
  
  if (avgScore > 0.5) return 'High';
  if (avgScore > 0.3) return 'Medium';
  return 'Low';
}

async function answerQuestion(subjectId, userId, question, subjectName) {
  try {
    const relevantChunks = await retrieveRelevantChunks(subjectId, userId, question);

    if (relevantChunks.length === 0 || relevantChunks[0].score < 0.15) {
      return {
        answer: `Not found in your notes for ${subjectName}`,
        confidence: 'Low',
        citations: [],
        evidence: []
      };
    }

    const confidence = getConfidence(relevantChunks);

    const context = relevantChunks.map((chunk, idx) => 
      `Source ${idx + 1} from ${chunk.originalName} section ${chunk.chunkIndex + 1}:\n${chunk.content}`
    ).join('\n\n');

    const prompt = `You are answering questions using only the provided notes.

Rules:
1. Only use information from the context below
2. If the answer is not in the context, say "Not found in your notes for ${subjectName}"
3. Do not make up information
4. Cite sources as [Source 1], [Source 2], etc.
5. Be clear and direct

Context:
${context}

Question: ${question}

Answer:`;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    const citations = relevantChunks.map(chunk => ({
      filename: chunk.originalName,
      chunkIndex: chunk.chunkIndex + 1,
      score: chunk.score.toFixed(3)
    }));

    const evidence = relevantChunks.slice(0, 3).map(chunk => ({
      text: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
      source: chunk.originalName,
      chunk: chunk.chunkIndex + 1
    }));

    return {
      answer,
      confidence,
      citations,
      evidence
    };

  } catch (error) {
    console.error('Error in answerQuestion:', error);
    return {
      answer: `Error: ${error.message}`,
      confidence: 'Low',
      citations: [],
      evidence: []
    };
  }
}

module.exports = {
  answerQuestion
};
