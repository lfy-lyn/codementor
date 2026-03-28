import { Router } from "express";
import {
  createMaterial,
  getMaterialsByClassroom,
  getQuestionsByMaterial,
  getMaterialDetail,
  updateMaterial,
  updateMaterialStatus,
  deleteMaterial,
} from "../controllers/material.controllers.js";
import authenticate, { teacherOnly } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// POST /api/materials — guru tambah materi + soal
router.post("/", teacherOnly, createMaterial);

// GET /api/materials/classroom/:classroomId — list materi di kelas
router.get("/classroom/:classroomId", getMaterialsByClassroom);

// GET /api/materials/:id — detail materi lengkap (guru)
router.get("/:id", getMaterialDetail);

// GET /api/materials/:id/questions — ambil soal untuk siswa (tanpa jawaban)
router.get("/:id/questions", getQuestionsByMaterial);

// PUT /api/materials/:id — edit materi
router.put("/:id", teacherOnly, updateMaterial);

// PATCH /api/materials/:id/status — ubah draft/publish
router.patch("/:id/status", teacherOnly, updateMaterialStatus);

// DELETE /api/materials/:id — hapus materi
router.delete("/:id", teacherOnly, deleteMaterial);

export default router;
