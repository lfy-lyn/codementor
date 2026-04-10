import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq from "groq-sdk"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const generateLearningFeedback = async (materialText, wrongQuestions) => {
  console.log("MATERI:", materialText)
  console.log("SOAL SALAH:", wrongQuestions)

  const prompt = `
Kamu adalah AI tutor untuk siswa/mahasiswa/orang yang sedang belajar programming.

Tugasmu membantu siswa/mahasiswa/orang memahami konsep yang mereka salah pahami.

ATURAN:
- Jangan memberitahu jawaban yang benar
- Jangan menyebut pilihan A/B/C/D sebagai jawaban benar
- Berikan hanya HINT dan penjelasan konsep
- Gunakan bahasa sangat sederhana
- Maksimal 150 kata
- Boleh menggunakan bullet point

Materi yang sedang dipelajari:
${materialText}

Soal yang dijawab salah oleh siswa:
${wrongQuestions}

Tugasmu:
1. Jelaskan konsep yang kemungkinan belum dipahami siswa/mahasiswa/orang (intinya general)
2. Berikan hint agar siswa bisa berpikir ulang
3. Dorong siswa untuk membaca kembali materi
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