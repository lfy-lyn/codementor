import prisma from '../database/prisma.js'

// ── DASHBOARD SISWA ─────────────────────────────────────
export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id

    // Ambil kelas yang diikuti siswa
    const memberships = await prisma.classroomMember.findMany({
      where  : { studentId, status: 'active' },
      include: { classroom: true }
    })

    if (memberships.length === 0) {
      return res.json({
        status: 'success',
        data  : {
          student       : null,
          belumJoinKelas: true
        }
      })
    }

    // Ambil data siswa
    const student = await prisma.user.findUnique({
      where : { id: studentId },
      select: { id: true, name: true, email: true }
    })

    // Ambil semua kelas yang diikuti
    const classroomIds = memberships.map(m => m.classroomId)

    // Ambil semua materi dari kelas-kelas tersebut
    const allMateri = await prisma.learningMaterial.findMany({
      where  : { classroomId: { in: classroomIds }, status: 'published' },
      include: { _count: { select: { questions: true } } },
      orderBy: { orderIndex: 'asc' }
    })

    // Ambil progress siswa
    const progressList = await prisma.studentProgress.findMany({
      where: { studentId, materialId: { in: allMateri.map(m => m.id) } }
    })

    // Buat map progress berdasarkan materialId
    const progressMap = {}
    progressList.forEach(p => { progressMap[p.materialId] = p })

    // Hitung statistik
    const totalModul   = allMateri.length
    const modulSelesai = progressList.filter(p => p.status === 'done').length

    // Ambil semua hasil tes siswa
    const hasilTes = await prisma.testResult.findMany({
      where: {
        studentId,
        materialId: { in: allMateri.map(m => m.id) }
      },
      select: { score: true, timeSpentSec: true }
    })

    // Hitung rata-rata skor
    const rataSkor = hasilTes.length > 0
      ? Math.round(hasilTes.reduce((sum, h) => sum + (h.score ?? 0), 0) / hasilTes.length)
      : 0

    // Hitung total waktu belajar (dalam menit)
    const totalWaktuMenit = Math.round(
      hasilTes.reduce((sum, h) => sum + (h.timeSpentSec ?? 0), 0) / 60
    )

    // Persentase progress keseluruhan
    const progressPct = totalModul > 0
      ? Math.round((modulSelesai / totalModul) * 100)
      : 0

    // Cari modul berikutnya yang belum selesai
    const modulBerikutnya = allMateri.find(m => {
      const progress = progressMap[m.id]
      return !progress || progress.status !== 'done'
    })

    // Buat list semua modul dengan statusnya
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
        student: {
          id   : student.id,
          name : student.name,
          email: student.email
        },
        kelas: memberships.map(m => ({
          id       : m.classroom.id,
          nama     : m.classroom.name,
          classCode: m.classroom.classCode
        })),
        statistik: {
          progressPct,
          modulSelesai,
          totalModul,
          rataSkor,
          totalWaktuMenit
        },
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
    const studentId          = req.user.id
    const { materialId, answers } = req.body
    // answers bentuknya: { "questionId1": "A", "questionId2": "C", ... }

    // Validasi input
    if (!materialId || !answers || Object.keys(answers).length === 0) {
      return res.status(400).json({
        status : 'error',
        message: 'materialId dan answers harus diisi'
      })
    }

    // Cek materi ada atau tidak
    const material = await prisma.learningMaterial.findUnique({
      where: { id: materialId }
    })

    if (!material) {
      return res.status(404).json({
        status : 'error',
        message: 'Materi tidak ditemukan'
      })
    }

    // Ambil semua soal beserta jawaban benar
    // correctAnswer diambil di sini (server side) — tidak dikirim ke siswa
    const questions = await prisma.question.findMany({
      where: { materialId }
    })

    if (questions.length === 0) {
      return res.status(404).json({
        status : 'error',
        message: 'Tidak ada soal di materi ini'
      })
    }

    // Koreksi jawaban
    let benar = 0
    const hasilPerSoal = questions.map(q => {
      const jawabanSiswa = answers[q.id]
      const correct      = jawabanSiswa === q.correctAnswer

      if (correct) benar++

      return {
        questionId   : q.id,
        jawabanSiswa : jawabanSiswa || null,
        // TIDAK kirim correctAnswer ke siswa
        // hanya kasih tau benar atau salah
        isCorrect    : correct
      }
    })

    // Hitung skor
    const score = Math.round((benar / questions.length) * 100)
    const lulus = score > 65

    // Simpan hasil ke database
    const testResult = await prisma.testResult.create({
      data: {
        studentId,
        materialId,
        score,
        // Simpan jawaban siswa saja, bukan jawaban benar
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

    // Kalau tidak lulus, cari materi pengayaan
    // (nanti diisi hasil generate Gemini, sekarang kasih video & artikel referensi dulu)
    let rekomendasiMateri = null
    if (!lulus) {
      rekomendasiMateri = {
        materialId  : material.id,
        title       : material.title,
        videoUrl    : material.videoUrl,
        articleUrl  : material.articleUrl,
        pesan       : 'Pelajari kembali materi ini sebelum melanjutkan'
      }
    }

    // Response ke siswa — tanpa jawaban benar!
    res.json({
      status: 'success',
      data  : {
        score,
        benar,
        totalSoal   : questions.length,
        lulus,
        hasilPerSoal, // hanya isCorrect per soal, tidak ada correctAnswer
        rekomendasiMateri,
        feedback    : testResult.aiFeedback
      }
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}