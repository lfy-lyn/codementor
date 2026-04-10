import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const generateLearningFeedback = async (materialText) => {

  const prompt = `
Kamu adalah AI tutor yang membantu siswa memahami materi programming.

Buat ringkasan yang:
- bahasa sederhana
- mudah dipahami pemula
- maksimal 150 kata
- boleh pakai bullet point

Materi:
${materialText}
`

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest"
  ]

  for (const modelName of models) {
    try {

      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent(prompt)
      const response = await result.response

      return response.text()

    } catch (err) {

      console.log(`Model ${modelName} gagal, mencoba model lain...`)
      await sleep(1000)

    }
  }

  return "AI sedang sibuk. Silakan pelajari kembali materi utama."
}