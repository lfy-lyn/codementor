import prisma from '../database/prisma.js'

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
          nama     : m.classroom.name,
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

