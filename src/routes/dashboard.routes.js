import { Router } from 'express'
import { getTeacherDashboard } from '../controllers/dashboard.controllers.js'
import authenticate, { teacherOnly } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// GET /api/dashboard/teacher — data dashboard guru
router.get('/teacher', teacherOnly, getTeacherDashboard)

export default router