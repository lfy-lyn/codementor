import { Router } from 'express'
import {
  createMaterial,
  getMaterialsByClassroom,
  getQuestionsByMaterial
} from '../controllers/material.controllers.js'
import authenticate, { teacherOnly } from '../middleware/auth.middleware.js'

const router = Router()

// Semua route butuh login
router.use(authenticate)

// POST /api/materials — guru tambah materi + soal
router.post('/', teacherOnly, createMaterial)

// GET /api/materials/classroom/:classroomId — ambil semua materi di kelas
router.get('/classroom/:classroomId', getMaterialsByClassroom)

// GET /api/materials/:id/questions — ambil soal dari satu materi
router.get('/:id/questions', getQuestionsByMaterial)

export default router