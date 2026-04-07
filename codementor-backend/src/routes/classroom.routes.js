import { Router } from "express";
import {
  createClassroom,
  joinClassroom,
  getMyClassrooms,
} from "../controllers/classroom.controllers.js";
import authenticate, {
  teacherOnly,
  studentOnly,
} from "../middleware/auth.middleware.js";

const router = Router();

// Semua route classroom butuh login
router.use(authenticate);

// GET /api/classrooms/my — lihat kelas saya (guru atau siswa)
router.get("/my", getMyClassrooms);

// POST /api/classrooms — guru buat kelas baru
router.post("/", teacherOnly, createClassroom);

// POST /api/classrooms/join — siswa join pakai class code
router.post("/join", studentOnly, joinClassroom);

export default router;
