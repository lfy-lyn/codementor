import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../database/prisma.js'

// ── REGISTER ────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    // Ambil data yang dikirim dari frontend
    const { name, email, password, role } = req.body

    // Validasi — pastikan semua field terisi
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status : 'error',
        message: 'Semua field harus diisi'
      })
    }

    // Validasi role — hanya boleh 'student' atau 'teacher'
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        status : 'error',
        message: 'Role harus student atau teacher'
      })
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(409).json({
        status : 'error',
        message: 'Email sudah terdaftar'
      })
    }

    // Enkripsi password — angka 10 adalah tingkat keamanan (salt rounds)
    const passwordHash = await bcrypt.hash(password, 10)

    // Simpan user baru ke database
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role }
    })

    // Buat token JWT
    const token = jwt.sign(
      // Isi token — data yang bisa dibaca dari token nanti
      { id: user.id, role: user.role },
      // Secret key dari .env
      process.env.JWT_SECRET,
      // Token expired dalam 7 hsari
      { expiresIn: '7d' }
    )

    res.status(201).json({
      status: 'success',
      data  : {
        token,
        user: {
          id   : user.id,
          name : user.name,
          email: user.email,
          role : user.role
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

// ── LOGIN ───────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validasi field
    if (!email || !password) {
      return res.status(400).json({
        status : 'error',
        message: 'Email dan password harus diisi'
      })
    }

    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Kalau email tidak ditemukan
    if (!user) {
      return res.status(401).json({
        status : 'error',
        message: 'Email atau password salah'
      })
    }

    // Ngebaandingkan password yang diketik dengan yang ada di database
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    // Kalau password salah
    if (!isPasswordValid) {
      return res.status(401).json({
        status : 'error',
        message: 'Email atau password salah'
      })
    }

    // Buat token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      status: 'success',
      data  : {
        token,
        user: {
          id   : user.id,
          name : user.name,
          email: user.email,
          role : user.role
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