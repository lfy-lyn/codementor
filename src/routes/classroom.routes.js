import { Router } from 'express';

const router = Router();

// POST /api/classrooms — guru buat kelas baru
router.post('/', (req, res) => {
  res.json({ message: 'Buat kelas — coming soon' });
});

// POST /api/classrooms/join — siswa join pakai class_code
router.post('/join', (req, res) => {
  res.json({ message: 'Join kelas — coming soon' });
});

// GET /api/classrooms/:id — lihat detail kelas
router.get('/:id', (req, res) => {
  res.json({ message: `Detail kelas ${req.params.id} — coming soon` });
});

export default router;