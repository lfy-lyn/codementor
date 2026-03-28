import prisma from '../database/prisma.js'

// ── TAMBAH MATERI + SOAL (khusus guru) ─────────────────
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
      questions
    } = req.body

    if (!classroomId || !title || !topicCategory) {
      return res.status(400).json({
        status : 'error',
        message: 'classroomId, title, dan topicCategory harus diisi'
      })
    }

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
        questions : questions?.length > 0 ? {
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
      include: { _count: { select: { questions: true } } },
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

// ── AMBIL SOAL DARI SATU MATERI (untuk siswa, tanpa jawaban) ───────
export const getQuestionsByMaterial = async (req, res) => {
  try {
    const { id } = req.params

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
      // correctAnswer sengaja tidak di-select — disembunyikan dari siswa
      select : {
        id          : true,
        questionText: true,
        optionA     : true,
        optionB     : true,
        optionC     : true,
        optionD     : true,
        difficulty  : true,
        orderIndex  : true
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

// ── DETAIL SATU MATERI LENGKAP (untuk guru, dengan jawaban) ────────
export const getMaterialDetail = async (req, res) => {
  try {
    const { id } = req.params

    const material = await prisma.learningMaterial.findUnique({
      where  : { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    res.json({
      status: 'success',
      data  : material
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ── EDIT MATERI ─────────────────────────────────────────
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      topicCategory,
      description,
      videoUrl,
      articleUrl,
      orderIndex,
      questions
    } = req.body

    const material = await prisma.learningMaterial.findUnique({
      where: { id }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: material.classroomId }
    })

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({
        status : 'error',
        message: 'Kamu tidak punya akses untuk edit materi ini'
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (questions && questions.length > 0) {
        await tx.question.deleteMany({
          where: { materialId: id }
        })
      }

      return tx.learningMaterial.update({
        where: { id },
        data : {
          title        : title         ?? material.title,
          topicCategory: topicCategory ?? material.topicCategory,
          description  : description   ?? material.description,
          videoUrl     : videoUrl      ?? material.videoUrl,
          articleUrl   : articleUrl    ?? material.articleUrl,
          orderIndex   : orderIndex    ?? material.orderIndex,
          questions    : questions?.length > 0 ? {
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
        include: { questions: true }
      })
    })

    res.json({
      status : 'success',
      message: 'Materi berhasil diupdate',
      data   : updated
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ── UBAH STATUS DRAFT / PUBLISH ─────────────────────────
export const updateMaterialStatus = async (req, res) => {
  try {
    const { id }     = req.params
    const { status } = req.body

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({
        status : 'error',
        message: 'Status harus draft atau published'
      })
    }

    const material = await prisma.learningMaterial.findUnique({
      where: { id }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: material.classroomId }
    })

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({
        status : 'error',
        message: 'Kamu tidak punya akses untuk mengubah status materi ini'
      })
    }

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data : { status }
    })

    res.json({
      status : 'success',
      message: `Materi berhasil diubah menjadi ${status}`,
      data   : updated
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ── HAPUS MATERI ────────────────────────────────────────
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params

    const material = await prisma.learningMaterial.findUnique({
      where  : { id },
      include: { _count: { select: { questions: true } } }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: material.classroomId }
    })

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({
        status : 'error',
        message: 'Kamu tidak punya akses untuk menghapus materi ini'
      })
    }

    // Hapus soal dulu, baru hapus materinya
    await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({
        where: { materialId: id }
      })
      await tx.learningMaterial.delete({
        where: { id }
      })
    })

    res.json({
      status : 'success',
      message: `Materi "${material.title}" berhasil dihapus beserta ${material._count.questions} soal`
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}