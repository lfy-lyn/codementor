import prisma from '../database/prisma.js'
import { generateLearningFeedback } from '../services/aiService.js'

export const submitQuiz = async (req, res) => {
  try {
    const studentId              = req.user.id
    const { materialId, answers } = req.body
    // answers bentuknya array: [{ questionId: "...", answer: "A" }, ...]

    if (!materialId || !answers || answers.length === 0) {
      return res.status(400).json({
        status : 'error',
        message: 'materialId dan answers harus diisi'
      })
    }

    const material = await prisma.learningMaterial.findUnique({
      where: { id: materialId }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    // Koreksi jawaban
    let correct        = 0
    let wrongQuestions = []

    for (const a of answers) {
      const question = await prisma.question.findUnique({
        where: { id: a.questionId }
      })

      if (!question) continue

      if (question.correctAnswer === a.answer) {
        correct++
      } else {
        wrongQuestions.push({
          questionText : question.questionText,
          optionA      : question.optionA,
          optionB      : question.optionB,
          optionC      : question.optionC,
          optionD      : question.optionD,
          studentAnswer: a.answer
          // correctAnswer tidak disertakan — tidak bocor ke siswa
        })
      }
    }

    const score = Math.round((correct / answers.length) * 100)
    const lulus = score >= 70

    // Generate AI feedback kalau nilai di bawah 65
    let aiFeedback = lulus
      ? `Bagus! Kamu lulus dengan skor ${score}. Lanjutkan ke materi berikutnya.`
      : `Kamu mendapat skor ${score}. Pelajari kembali materi ini.`

    if (score <= 65 && wrongQuestions.length > 0) {
      try {
        const materialText = `Judul: ${material.title}\n\nMateri:\n${material.description}`
        const wrongText    = JSON.stringify(wrongQuestions, null, 2)
        aiFeedback         = await generateLearningFeedback(materialText, wrongText)
      } catch (err) {
        console.log('AI feedback gagal:', err.message)
        aiFeedback = 'AI sedang sibuk. Silakan pelajari kembali materi.'
      }
    }

    // Simpan hasil ke database
    await prisma.testResult.create({
      data: {
        studentId,
        materialId,
        score,
        // Simpan jawaban siswa saja, bukan jawaban benar
        answersJson : answers,
        aiFeedback,
        timeSpentSec: null
      }
    })

    // Update progress siswa
    await prisma.studentProgress.upsert({
      where : { studentId_materialId: { studentId, materialId } },
      update: {
        status       : lulus ? 'done' : 'in_progress',
        completionPct: score,
        lastAccessed : new Date()
      },
      create: {
        studentId,
        materialId,
        status       : lulus ? 'done' : 'in_progress',
        completionPct: score,
        lastAccessed : new Date()
      }
    })

    // Kalau tidak lulus, kasih rekomendasi materi
    let rekomendasiMateri = null
    if (!lulus) {
      rekomendasiMateri = {
        materialId : material.id,
        title      : material.title,
        videoUrl   : material.videoUrl,
        articleUrl : material.articleUrl,
        // Kalau ada generatedContent, sertakan juga
        kontenPengayaan: material.generatedContent ?? null,
        pesan      : 'Pelajari kembali materi ini sebelum melanjutkan'
      }
    }

    res.json({
      status: 'success',
      data  : {
        score,
        correct,
        total            : answers.length,
        lulus,
        aiFeedback,
        rekomendasiMateri
        // correctAnswer tidak ada di response sama sekali
      }
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}