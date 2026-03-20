import { Router } from 'express';

const router = Router();

// GET /api/materials — ambil semua materi
router.get('/', (req, res) => {
  res.json({ message: 'List materi — coming soon' });
});

// POST /api/materials — guru tambah materi baru
router.post('/', (req, res) => {
  res.json({ message: 'Tambah materi — coming soon' });
});

// GET /api/materials/:id — detail 1 materi
router.get('/:id', (req, res) => {
  res.json({ message: `Detail materi ${req.params.id} — coming soon` });
});

export default router;