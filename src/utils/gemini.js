import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateFeedback = async (userCode, score, exerciseId) => {
  if (score >= 70) return null;
  
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Score user: ${score}% (rendah). 
Kode salah: 
\`\`\`
${userCode}
\`\`\`
Rangkuman materi + 3 tips perbaikan (Indonesia, ramah, singkat):`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
};