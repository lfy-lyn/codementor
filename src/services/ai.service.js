import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan .env terbaca
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateAiSummary = async (title, description) => {
  try {
    // Pakai 1.5-flash, ini yang paling lancar sekarang
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Siswa saya mendapatkan nilai di bawah 70 pada materi "${title}". 
      Bantulah dengan memberikan rangkuman poin-poin penting berdasarkan deskripsi materi berikut: 
      "${description || 'Materi umum'}"
      
      Gunakan format:
      - Kalimat penyemangat singkat.
      - Poin-poin inti materi (bullet points).
      - Pesan penutup untuk belajar kembali.
      
      Bahasa: Indonesia yang santai tapi edukatif.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("--- LOG ERROR GEMINI ---");
    console.error(error.message); 
    return "Maaf, rangkuman AI belum tersedia saat ini. Silakan pelajari materi manual ya!";
  }
};