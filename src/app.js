import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import morgan  from 'morgan';
import prisma from './database/prisma.js';

// Import semua routes
import authRoutes      from './routes/auth.routes.js';
import classroomRoutes from './routes/classroom.routes.js';
import materialRoutes  from './routes/material.routes.js';
import studentRoutes   from './routes/student.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js'

const app = express();

// ── MIDDLEWARE ──────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin     : process.env.CLIENT_URL,
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());

// Health check — test server dan database sekaligus

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status  : 'ok',
      message : 'CodeMentor API berjalan!',
      database: 'tersambung ✅',
      time    : new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status  : 'error',
      database: 'tidak tersambung ❌',
      message : error.message
    });
  }
});

// ── ROUTES ──────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/materials',  materialRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/dashboard', dashboardRoutes)

// ── ERROR HANDLER ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status : 'error',
    message: err.message || 'Terjadi kesalahan pada server'
  });
});

export default app;