import prisma from '../database/prisma.js'

// ── TAMBAH MATERI + SOAL (khusus guru - guru aja) ─────────────────
export const createMaterial = async (req, res) => {
  try {
    const {
      classroomId,
      title,
      topicCategory,
      description,
      videoUrl,
      articleUrl,
      orderIndex,
      questions // array soal
    } = req.body

    // Validasi field wajib
    if (!classroomId || !title || !topicCategory) {
      return res.status(400).json({
        status : 'error',
        message: 'classroomId, title, dan topicCategory harus diisi'
      })
    }

    // Pastikan kelas milik guru yang login - login aja wleeee
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    })

    if (!classroom) {
      return res.status(404).json({
        status : 'error',
        message: 'Kelas tidak ditemukan'
      })
    }

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({
        status : 'error',
        message: 'Kamu bukan guru di kelas ini'
      })
    }

    // Buat materi sekaligus dengan soal-soalnya
    const material = await prisma.learningMaterial.create({
      data: {
        classroomId,
        title,
        topicCategory,
        description,
        videoUrl,
        articleUrl,
        orderIndex: orderIndex || 0,
        status    : 'published',
        // Kalau ada soal, langsung dibuat sekaligus
        questions: questions?.length > 0 ? {
          create: questions.map((q, index) => ({
            questionText : q.questionText,
            optionA      : q.optionA,
            optionB      : q.optionB,
            optionC      : q.optionC,
            optionD      : q.optionD,
            correctAnswer: q.correctAnswer,
            difficulty   : q.difficulty || 'sedang',
            orderIndex   : index
          }))
        } : undefined
      },
      // Sertakan soal di response
      include: { questions: true }
    })

    res.status(201).json({
      status: 'success',
      data  : material
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}

// ── AMBIL SEMUA MATERI DI KELAS ─────────────────────────
export const getMaterialsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params

    // Cek apakah user punya akses ke kelas ini
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    })

    if (!classroom) {
      return res.status(404).json({
        status : 'error',
        message: 'Kelas tidak ditemukan'
      })
    }

    const materials = await prisma.learningMaterial.findMany({
      where  : { classroomId, status: 'published' },
      include: {
        // Hitung jumlah soal per materi
        _count: { select: { questions: true } }
      },
      orderBy: { orderIndex: 'asc' }
    })

    res.json({
      status: 'success',
      data  : materials
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}

// ── AMBIL SOAL-SOAL DARI SATU MATERI ───────────────────
// API pengambilan soal
export const getQuestionsByMaterial = async (req, res) => {
  try {
    const { id } = req.params // id materi

    const material = await prisma.learningMaterial.findUnique({
      where: { id }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    const questions = await prisma.question.findMany({
      where  : { materialId: id },
      // Sembunyikan correctAnswer dari siswa!
      // Jawaban benar hanya dikembalikan saat scoring
      select : {
        id          : true,
        questionText: true,
        optionA     : true,
        optionB     : true,
        optionC     : true,
        optionD     : true,
        difficulty  : true,
        orderIndex  : true
        // correctAnswer sengAJa tidak di-select
      },
      orderBy: { orderIndex: 'asc' }
    })

    res.json({
      status: 'success',
      data  : {
        material: {
          id           : material.id,
          title        : material.title,
          topicCategory: material.topicCategory,
          videoUrl     : material.videoUrl,
          articleUrl   : material.articleUrl
        },
        totalQuestions: questions.length,
        questions
      }
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}