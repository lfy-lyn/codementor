import prisma from '../database/prisma.js'
import { evaluateCode } from '../services/scoringservice.js'

// ── DASHBOARD SISWA ─────────────────────────────────────
export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id

    const memberships = await prisma.classroomMember.findMany({
      where  : { studentId, status: 'active' },
      include: { classroom: true }
    })

    if (memberships.length === 0) {
      return res.json({
        status: 'success',
        data  : { student: null, belumJoinKelas: true }
      })
    }

    const student = await prisma.user.findUnique({
      where : { id: studentId },
      select: { id: true, username: true, email: true }
    })

    const classroomIds = memberships.map(m => m.classroomId)

    const allMateri = await prisma.learningMaterial.findMany({
      where  : { classroomId: { in: classroomIds }, status: 'published' },
      include: { _count: { select: { questions: true } } },
      orderBy: { orderIndex: 'asc' }
    })

    const progressList = await prisma.studentProgress.findMany({
      where: { studentId, materialId: { in: allMateri.map(m => m.id) } }
    })

    const progressMap = {}
    progressList.forEach(p => { progressMap[p.materialId] = p })

    const totalModul   = allMateri.length
    const modulSelesai = progressList.filter(p => p.status === 'done').length

    const hasilTes = await prisma.testResult.findMany({
      where : { studentId, materialId: { in: allMateri.map(m => m.id) } },
      select: { score: true, timeSpentSec: true }
    })

    const rataSkor = hasilTes.length > 0
      ? Math.round(hasilTes.reduce((sum, h) => sum + (h.score ?? 0), 0) / hasilTes.length)
      : 0

    const totalWaktuMenit = Math.round(
      hasilTes.reduce((sum, h) => sum + (h.timeSpentSec ?? 0), 0) / 60
    )

    const progressPct = totalModul > 0
      ? Math.round((modulSelesai / totalModul) * 100)
      : 0

    const modulBerikutnya = allMateri.find(m => {
      const progress = progressMap[m.id]
      return !progress || progress.status !== 'done'
    })

    const listModul = allMateri.map(m => {
      const progress = progressMap[m.id]
      return {
        id           : m.id,
        title        : m.title,
        topicCategory: m.topicCategory,
        orderIndex   : m.orderIndex,
        totalSoal    : m._count.questions,
        status       : progress ? progress.status : 'locked',
        completionPct: progress ? progress.completionPct : 0
      }
    })

    res.json({
      status: 'success',
      data  : {
        student: { id: student.id, username: student.username, email: student.email },
        kelas  : memberships.map(m => ({
          id       : m.classroom.id,
          nama     : m.classroom.username,
          classCode: m.classroom.classCode
        })),
        statistik: { progressPct, modulSelesai, totalModul, rataSkor, totalWaktuMenit },
        modulBerikutnya: modulBerikutnya ? {
          id           : modulBerikutnya.id,
          title        : modulBerikutnya.title,
          topicCategory: modulBerikutnya.topicCategory,
          orderIndex   : modulBerikutnya.orderIndex,
          estimasiMenit: Math.round(modulBerikutnya._count.questions * 2)
        } : null,
        listModul
      }
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ── SUBMIT JAWABAN PILIHAN GANDA ────────────────────────
export const submitJawabanPilihanGanda = async (req, res) => {
  try {
    const studentId              = req.user.id
    const { materialId, answers } = req.body

    if (!materialId || !answers || Object.keys(answers).length === 0) {
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

    const questions = await prisma.question.findMany({
      where: { materialId }
    })

    if (questions.length === 0) {
      return res.status(404).json({
        status : 'error',
        message: 'Tidak ada soal di materi ini'
      })
    }

    // Koreksi jawaban — correctAnswer tidak dikirim ke siswa
    let benar = 0
    const hasilPerSoal = questions.map(q => {
      const jawabanSiswa = answers[q.id]
      const correct      = jawabanSiswa === q.correctAnswer
      if (correct) benar++
      return {
        questionId  : q.id,
        jawabanSiswa: jawabanSiswa || null,
        isCorrect   : correct
      }
    })

    const score = Math.round((benar / questions.length) * 100)
    const lulus = score > 65

    // Simpan hasil ke database
    const testResult = await prisma.testResult.create({
      data: {
        studentId,
        materialId,
        score,
        answersJson : answers,
        timeSpentSec: null,
        aiFeedback  : lulus
          ? `Bagus! Kamu lulus dengan skor ${score}. Lanjutkan ke materi berikutnya.`
          : `Kamu mendapat skor ${score}. Pelajari kembali materi ini sebelum melanjutkan.`
      }
    })

    // Update progress siswa
    await prisma.studentProgress.upsert({
      where : { studentId_materialId: { studentId, materialId } },
      update: { status: lulus ? 'done' : 'in_progress', completionPct: score, lastAccessed: new Date() },
      create: { studentId, materialId, status: lulus ? 'done' : 'in_progress', completionPct: score, lastAccessed: new Date() }
    })

    // Kalau tidak lulus, kasih rekomendasi materi (video & artikel dulu, Gemini nyusul)
    let rekomendasiMateri = null
    if (!lulus) {
      rekomendasiMateri = {
        materialId : material.id,
        title      : material.title,
        videoUrl   : material.videoUrl,
        articleUrl : material.articleUrl,
        pesan      : 'Pelajari kembali materi ini sebelum melanjutkan'
      }
    }

    res.json({
      status: 'success',
      data  : {
        score,
        benar,
        totalSoal        : questions.length,
        lulus,
        hasilPerSoal,
        rekomendasiMateri,
        feedback         : testResult.aiFeedback
      }
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ── AUTOMATED SCORING KODE PROGRAMMING ─────────────────
export const scoreSubmission = async (req, res) => {
  try {
    console.log('Menerima submission dari:', req.user?.email)

    const { userCode, testCases, exerciseId } = req.body

    if (!userCode || !testCases?.length) {
      return res.status(400).json({
        status : 'error',
        message: 'userCode dan testCases wajib ada!'
      })
    }

    // Jalankan scoring lewat scoringservice
    const score = await evaluateCode(userCode, testCases)

    // Simpan ke database kalau ada exerciseId
    if (exerciseId) {
      await prisma.testResult.create({
        data: {
          studentId   : req.user.id,
          materialId  : exerciseId,
          score,
          answersJson : { userCode },
          aiFeedback  : score >= 70 ? 'Lulus!' : 'Coba lagi ya!'
        }
      })
    }

    res.status(200).json({
      status    : 'success',
      score,
      passed    : score >= 70,
      totalTests: testCases.length,
      message   : score >= 70 ? 'Lulus!' : 'Coba lagi ya!'
    })

  } catch (error) {
    console.error('Error scoring:', error)
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}