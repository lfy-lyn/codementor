import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateFeedback = async (userCode, score) => {
  if (score >= 70) return null;
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `Score: ${score}

Kode:
\`\`\`
${userCode}
\`\`\``;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Maaf, AI sedang maintenance. Coba lagi ya!";
  }
};