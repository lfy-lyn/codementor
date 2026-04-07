import { Router } from 'express'
import { getStudentDashboard, submitJawabanPilihanGanda } from '../controllers/student.controllers.js'
import { scoreSubmission } from '../controllers/studentcontrollers.js'
import authenticate, { studentOnly } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// GET /api/students/dashboard — dashboard siswa
router.get('/dashboard', studentOnly, getStudentDashboard)

// POST /api/students/submit — submit jawaban pilihan ganda
router.post('/submit', studentOnly, submitJawabanPilihanGanda)

// POST /api/students/score — automated scoring kode programming
router.post('/score', scoreSubmission)

export default router