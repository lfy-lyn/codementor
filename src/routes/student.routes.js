import { Router } from 'express';

const router = Router();

// GET /api/students/dashboard — data dashboard siswa
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Dashboard siswa — coming soon' });
});

// GET /api/students/progress — progress modul siswa
router.get('/progress', (req, res) => {
  res.json({ message: 'Progress siswa — coming soon' });
});

// ——— AUTOMATED SCORING - PENILAIAN OTOMATIS ───────────────────────────

// Import controller untuk penilaian
import studentControllers from '../controllers/studentcontrollers.js';

// OST /api/students/score — endpoint utama automated scoring
// Frontend kirim kode user → backend nilai otomatis → return score
router.post('/score', studentControllers.scoreSubmission);

export default router;