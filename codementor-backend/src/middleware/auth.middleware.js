import jwt from 'jsonwebtoken'

const authenticate = (req, res, next) => {
  // Ambil token dari header Authorization

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status : 'error',
      message: 'Akses ditolak, token tidak ada'
    })
  }

  
  const token = authHeader.split(' ')[1]

  try {
    // Verifikasi token — kalau palsu atau expired akan throw error
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Simpan data uhser ke req supaya bisa dipakai di controller
    req.user = decoded

    // Lanjut ke contoller
    next()

  } catch (error) {
    res.status(401).json({
      status : 'error',
      message: 'Token tidak valid atau sudah expired'
    })
  }
}

// Middleware khusus untuk route yang hanya boleh diakses guru
export const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({
      status : 'error',
      message: 'Akses ditolak, hanya untuk guru'
    })
  }
  next()
}

// Middleware khusus untuk route yang hanya boleh diakses siswa
export const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      status : 'error',
      message: 'Akses ditolak, hanya untuk siswa'
    })
  }
  next()
}

export default authenticate