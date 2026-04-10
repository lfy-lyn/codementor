import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from "groq-sdk"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const generateLearningFeedback = async (materialText) => {

  const prompt = `
Kamu adalah AI tutor yang membantu siswa SMK memahami konsep programming.

Siswa baru saja menjawab beberapa soal quiz dengan salah.

Aturan penting:
- JANGAN menyebut huruf jawaban yang benar
- JANGAN menyebutkan teks jawaban yang benar
- JANGAN memberi jawaban langsung

Tugasmu:
- Berikan petunjuk (hint) agar siswa bisa menemukan jawabannya sendiri
- Jelaskan konsep yang diuji oleh soal
- Gunakan bahasa sangat sederhana
- Maksimal 120 kata
- Boleh menggunakan bullet point

Gunakan informasi dari soal untuk memahami konsep yang diuji.

Data soal:
${materialText}

Jika memungkinkan, gunakan analogi dunia nyata agar siswa lebih mudah memahami konsep.
`

  const geminiModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest"
  ]

  for (const modelName of geminiModels) {
    try {

      console.log("Mencoba Gemini:", modelName)

      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent(prompt)

      const response = await result.response

      const text = response.text()

      if (text && text.trim() !== "") {
        console.log("Gemini berhasil")
        return text
      }

    } catch (err) {

      console.log(`Gemini model ${modelName} gagal`)
      await sleep(1000)

    }
  }

  try {

    console.log("Gemini sibuk, mencoba Groq...")

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const text = completion.choices[0]?.message?.content

    if (text && text.trim() !== "") {
      console.log("Groq berhasil")
      return text
    }

  } catch (err) {

    console.log("Groq juga gagal:", err.message)

  }

  return "AI sedang sibuk. Silakan pelajari kembali materi utama."
}