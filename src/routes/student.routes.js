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

export default router;