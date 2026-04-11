import { Router } from 'express'
import { getStudentDashboard } from '../controllers/student.controllers.js'
import authenticate, { studentOnly } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// GET /api/students/dashboard — dashboard siswa
router.get('/dashboard', studentOnly, getStudentDashboard)

export default router