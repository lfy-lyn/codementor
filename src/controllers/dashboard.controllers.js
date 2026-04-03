import prisma from '../database/prisma.js'

export const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id

    // Ambil semua kelas milik guru 
    const classroom = await prisma.classroom.findFirst({
      where: { teacherId }
    })

    if (!classroom) {
      return res.status(404).json({
        status : 'error',
        message: 'Kamu belum punya kelas'
      })
    }

    const classroomId = classroom.id

    // ── 1. TOTAL SISWA ────────────────────────────────────
    const totalSiswa = await prisma.classroomMember.count({
      where: { classroomId, status: 'active' }
    })

    // ── 2. JUMLAH SISWA CRITICAL & WARNING ───────────────
    // Ambil risk flags yang belum resolved
    const riskFlags = await prisma.studentRiskFlag.findMany({
      where    : { classroomId, isResolved: false },
      include  : {
        student: { select: { id: true, name: true } }
      }
    })

    const siswaCritical = riskFlags.filter(r => r.riskLevel === 'critical').length
    const siswaWarning  = riskFlags.filter(r => r.riskLevel === 'warning').length

    // ── 3. TINGKAT KEGAGALAN PER TOPIK ───────────────────
    // Gagal = skor di bawah 65
    const THRESHOLD = 65

    // Ambil semua materi di kelas ini
    const materiList = await prisma.learningMaterial.findMany({
      where: { classroomId, status: 'published' },
      select: { id: true, title: true, topicCategory: true }
    })

    const kegagalanPerTopik = []
    for (const materi of materiList) {
      const totalHasilTes = await prisma.testResult.count({
        where: { materialId: materi.id }
      })

      const jumlahGagal = await prisma.testResult.count({
        where: {
          materialId: materi.id,
          score     : { lte: THRESHOLD } // lte = less than or equal
        }
      })

      const persentaseGagal = totalHasilTes > 0
        ? Math.round((jumlahGagal / totalHasilTes) * 100)
        : 0

      kegagalanPerTopik.push({
        topik           : materi.topicCategory,
        judul           : materi.title,
        totalSiswa      : totalHasilTes,
        jumlahGagal,
        persentaseGagal
      })
    }

    // Urutkan dari yang paling banyak gagalnya
    kegagalanPerTopik.sort((a, b) => b.persentaseGagal - a.persentaseGagal)

    // ── 4. SEBARAN NILAI (A/B/C/D) ────────────────────────
    // A = 80-100, B = 60-79, C = 40-59, D = 0-39
    const semuaHasilTes = await prisma.testResult.findMany({
      where: {
        material: { classroomId }
      },
      select: { score: true }
    })

    const sebaranNilai = { A: 0, B: 0, C: 0, D: 0 }
    for (const hasil of semuaHasilTes) {
      const skor = hasil.score ?? 0
      if (skor >= 80)      sebaranNilai.A++
      else if (skor >= 60) sebaranNilai.B++
      else if (skor >= 40) sebaranNilai.C++
      else                 sebaranNilai.D++
    }

    // ── 5. KEAKTIFAN KELAS HARIAN ─────────────────────────
    // Hitung berapa siswa yang submit tes per hari dalam 7 hari terakhir
    const today     = new Date()
    const sevenDays = new Date(today)
    sevenDays.setDate(today.getDate() - 6) // 7 hari termasuk hari ini

    const hasilTes7Hari = await prisma.testResult.findMany({
      where: {
        material     : { classroomId },
        submittedAt  : { gte: sevenDays }
      },
      select: { submittedAt: true, studentId: true }
    })

    // Kelompokkan per hari
    const hariLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const keaktifanHarian = []

    for (let i = 6; i >= 0; i--) {
      const tanggal = new Date(today)
      tanggal.setDate(today.getDate() - i)
      const tanggalStr = tanggal.toDateString()

      // Hitung siswa unik yang aktif di hari itu
      const siswaAktif = new Set(
        hasilTes7Hari
          .filter(h => new Date(h.submittedAt).toDateString() === tanggalStr)
          .map(h => h.studentId)
      ).size

      keaktifanHarian.push({
        hari      : hariLabels[tanggal.getDay()],
        tanggal   : tanggal.toLocaleDateString('id-ID'),
        siswaAktif
      })
    }

    // ── 6. LIST SISWA DENGAN STATUS ───────────────────────
    const members = await prisma.classroomMember.findMany({
      where  : { classroomId, status: 'active' },
      include: {
        student: {
          select: {
            id         : true,
            name       : true,
            // Ambil hasil tes terakhir untuk tau kapan terakhir aktif
            testResults: {
              where  : { material: { classroomId } },
              orderBy: { submittedAt: 'desc' },
              take   : 1,
              select : { submittedAt: true, score: true }
            },
            // Ambil risk flag yang aktif
            riskFlags: {
              where  : { classroomId, isResolved: false },
              orderBy: { createdAt: 'desc' },
              take   : 1,
              select : { riskLevel: true, reason: true, weakTopics: true }
            }
          }
        }
      }
    })

    const listSiswa = members.map(m => {
      const siswa       = m.student
      const riskFlag    = siswa.riskFlags[0]
      const lastTest    = siswa.testResults[0]

      return {
        id          : siswa.id,
        nama        : siswa.name,
        status      : riskFlag ? riskFlag.riskLevel : 'safe',
        alasan      : riskFlag ? riskFlag.reason    : null,
        topikLemah  : riskFlag ? riskFlag.weakTopics : [],
        terakhirAktif: lastTest ? lastTest.submittedAt : null,
      }
    })

    // Urutkan: critical dulu, lalu warning, lalu safe
    const urutan = { critical: 0, warning: 1, safe: 2 }
    listSiswa.sort((a, b) => urutan[a.status] - urutan[b.status])

    // ── RESPONSE ──────────────────────────────────────────
    res.json({
      status: 'success',
      data  : {
        kelas: {
          id       : classroom.id,
          nama     : classroom.name,
          classCode: classroom.classCode
        },
        ringkasan: {
          totalSiswa,
          siswaCritical,
          siswaWarning
        },
        kegagalanPerTopik,
        sebaranNilai,
        keaktifanHarian,
        listSiswa
      }
    })

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}