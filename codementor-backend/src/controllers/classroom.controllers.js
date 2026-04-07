import prisma from '../database/prisma.js'

// Generate class code random 6 karakster (contoh: "AB12CD")
const generateClassCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ── BUAT KELAS BARU (khusus guru) ───────────────────────
export const createClassroom = async (req, res) => {
  try {
    const { name, description } = req.body
    // req.user diisi oleh middleware authenticate
    const teacherId = req.user.id

    if (!name) {
      return res.status(400).json({
        status : 'error',
        message: 'Nama kelas harus diisi'
      })
    }

    // Generate class code yang aksan unik
    let classCode
    let isUnique = false

    while (!isUnique) {
      classCode = generateClassCode()
      // Cek apakah code sudah dipakai
      const existing = await prisma.classroom.findUnique({
        where: { classCode }
      })
      if (!existing) isUnique = true
    }

    const classroom = await prisma.classroom.create({
      data: {
        teacherId,
        name,
        description,
        classCode
      }
    })

    res.status(201).json({
      status: 'success',
      data  : classroom
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}

// ── JOIN KELAS PAKAI CLASS CODE (khusus siswa) ──────────
export const joinClassroom = async (req, res) => {
  try {
    const { classCode } = req.body
    const studentId = req.user.id

    if (!classCode) {
      return res.status(400).json({
        status : 'error',
        message: 'Class code harus diisi'
      })
    }

    // Cari kelas berdasarkan class code
    const classroom = await prisma.classroom.findUnique({
      where: { classCode: classCode.toUpperCase() }
    })

    if (!classroom) {
      return res.status(404).json({
        status : 'error',
        message: 'Kelas tidak ditemukan, cek kembali class code kamu'
      })
    }

    if (!classroom.isActive) {
      return res.status(400).json({
        status : 'error',
        message: 'Kelas ini sudah tidak aktif'
      })
    }

    // Cek apakah siswa sudah join kelas ini sebelumnya
    const alreadyJoined = await prisma.classroomMember.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId
        }
      }
    })

    if (alreadyJoined) {
      return res.status(409).json({
        status : 'error',
        message: 'Kamu sudah bergabung di kelas ini'
      })
    }

    // Daftarkan siswa ke kelas
    await prisma.classroomMember.create({
      data: {
        classroomId: classroom.id,
        studentId
      }
    })

    res.json({
      status: 'success',
      data  : {
        message  : `Berhasil bergabung ke kelas ${classroom.name}`,
        classroom: {
          id       : classroom.id,
          name     : classroom.name,
          classCode: classroom.classCode
        }
      }
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}

// ── LIHAT KELAS SAYA ────────────────────────────────────
export const getMyClassrooms = async (req, res) => {
  try {
    const userId = req.user.id
    const role   = req.user.role

    let classrooms

    if (role === 'teacher') {
      // Kalau guru, ambil kelas yang dia buat
      classrooms = await prisma.classroom.findMany({
        where  : { teacherId: userId },
        include: {
          // Hitung jumlah siswa di tiap kelas
          _count: { select: { members: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Kalau siswa, ambil kelas yang dia ikuti
      const memberships = await prisma.classroomMember.findMany({
        where  : { studentId: userId, status: 'active' },
        include: {
          classroom: {
            include: {
              _count : { select: { members: true } },
              teacher: { select: { name: true } }
            }
          }
        }
      })
      classrooms = memberships.map(m => m.classroom)
    }

    res.json({
      status: 'success',
      data  : classrooms
    })

  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message
    })
  }
}