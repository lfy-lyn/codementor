import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const teacherId   = '93671772-2183-48da-8b2c-7c9230bfb156'
const classroomId = 'e7766c70-3e5a-4816-9947-77b9b0a3467a'

async function main() {
  console.log('🌱 Mulai seeding...')

  // ── 1. TAMBAH SISWA BARU ────────────────────────────────
  console.log('👤 Membuat siswa...')
  const passwordHash = await bcrypt.hash('password123', 10)

  const siswaData = [
    { name: 'Budi Santoso',   email: 'budi@gmail.com' },    // sudah ada, skip kalau error
    { name: 'Ani Putri',      email: 'ani@gmail.com' },
    { name: 'Dimas Prasetyo', email: 'dimas@gmail.com' },
    { name: 'Sari Dewi',      email: 'sari@gmail.com' },
    { name: 'Rizki Aditya',   email: 'rizki@gmail.com' },
    { name: 'Maya Lestari',   email: 'maya@gmail.com' },
    { name: 'Fajar Nugroho',  email: 'fajar@gmail.com' },
  ]

  const siswaList = []
  for (const s of siswaData) {
    // upsert = update kalau ada, create kalau belum ada
    const user = await prisma.user.upsert({
      where : { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, passwordHash, role: 'student' }
    })
    siswaList.push(user)
    console.log(`  ✓ ${user.name}`)
  }

  // ── 2. DAFTARKAN SEMUA SISWA KE KELAS ──────────────────
  console.log('🏫 Mendaftarkan siswa ke kelas...')
  for (const siswa of siswaList) {
    await prisma.classroomMember.upsert({
      where : { classroomId_studentId: { classroomId, studentId: siswa.id } },
      update: {},
      create: { classroomId, studentId: siswa.id }
    })
  }
  console.log(`  ✓ ${siswaList.length} siswa terdaftar`)

  // ── 3. BUAT MATERI + SOAL ───────────────────────────────
  console.log('📚 Membuat materi...')

  const materiList = [
    {
      title        : 'Variabel & Tipe Data',
      topicCategory: 'Variabel',
      description  : 'Memahami konsep dasar variabel di JavaScript',
      videoUrl     : 'https://ruangkerja.com/video/variabel-js',
      orderIndex   : 1,
      questions    : [
        { questionText: 'Keyword untuk variabel yang nilainya tidak bisa diubah?', optionA: 'var', optionB: 'let', optionC: 'const', optionD: 'static', correctAnswer: 'C', difficulty: 'mudah' },
        { questionText: 'Output dari console.log(typeof 42)?', optionA: 'integer', optionB: 'number', optionC: 'string', optionD: 'float', correctAnswer: 'B', difficulty: 'sedang' },
        { questionText: 'Tipe data primitif di JavaScript?', optionA: 'Array', optionB: 'Object', optionC: 'Boolean', optionD: 'Function', correctAnswer: 'C', difficulty: 'mudah' },
      ]
    },
    {
      title        : 'Operator & Ekspresi',
      topicCategory: 'Operator',
      description  : 'Memahami operator aritmatika, perbandingan, dan logika',
      videoUrl     : 'https://ruangkerja.com/video/operator-js',
      orderIndex   : 2,
      questions    : [
        { questionText: 'Hasil dari 10 % 3?', optionA: '3', optionB: '1', optionC: '0', optionD: '2', correctAnswer: 'B', difficulty: 'mudah' },
        { questionText: 'Operator untuk membandingkan nilai DAN tipe data?', optionA: '==', optionB: '!=', optionC: '===', optionD: '>=', correctAnswer: 'C', difficulty: 'sedang' },
        { questionText: 'Hasil dari true && false?', optionA: 'true', optionB: 'false', optionC: 'null', optionD: 'undefined', correctAnswer: 'B', difficulty: 'sedang' },
      ]
    },
    {
      title        : 'Percabangan (If/Else)',
      topicCategory: 'If/Else',
      description  : 'Memahami penggunaan if, else if, dan else',
      videoUrl     : 'https://ruangkerja.com/video/ifelse-js',
      orderIndex   : 3,
      questions    : [
        { questionText: 'Keyword untuk kondisi alternatif jika if tidak terpenuhi?', optionA: 'elif', optionB: 'else if', optionC: 'otherwise', optionD: 'when', correctAnswer: 'B', difficulty: 'mudah' },
        { questionText: 'Manakah yang benar untuk cek nilai ganda?', optionA: 'if x = 1', optionB: 'if (x == 1)', optionC: 'if x == 1', optionD: 'if [x == 1]', correctAnswer: 'B', difficulty: 'sedang' },
        { questionText: 'Apa fungsi dari switch-case?', optionA: 'Perulangan', optionB: 'Percabangan banyak kondisi', optionC: 'Deklarasi variabel', optionD: 'Fungsi rekursif', correctAnswer: 'B', difficulty: 'sedang' },
      ]
    },
    {
      title        : 'Perulangan (Looping)',
      topicCategory: 'Looping',
      description  : 'Mempelajari for, while, do-while',
      videoUrl     : 'https://ruangkerja.com/video/looping-js',
      orderIndex   : 4,
      questions    : [
        { questionText: 'Perulangan yang selalu dijalankan minimal sekali?', optionA: 'for', optionB: 'while', optionC: 'do-while', optionD: 'foreach', correctAnswer: 'C', difficulty: 'sedang' },
        { questionText: 'Keyword untuk menghentikan perulangan?', optionA: 'stop', optionB: 'exit', optionC: 'break', optionD: 'end', correctAnswer: 'C', difficulty: 'mudah' },
        { questionText: 'Keyword untuk lanjut ke iterasi berikutnya?', optionA: 'next', optionB: 'continue', optionC: 'skip', optionD: 'pass', correctAnswer: 'B', difficulty: 'sedang' },
      ]
    },
    {
      title        : 'Array',
      topicCategory: 'Array',
      description  : 'Memahami array dan method-methodnya',
      videoUrl     : 'https://ruangkerja.com/video/array-js',
      orderIndex   : 5,
      questions    : [
        { questionText: 'Method untuk menambah elemen di akhir array?', optionA: 'push()', optionB: 'pop()', optionC: 'shift()', optionD: 'add()', correctAnswer: 'A', difficulty: 'mudah' },
        { questionText: 'Index pertama array dimulai dari?', optionA: '1', optionB: '-1', optionC: '0', optionD: '2', correctAnswer: 'C', difficulty: 'mudah' },
        { questionText: 'Method untuk menggabungkan dua array?', optionA: 'merge()', optionB: 'join()', optionC: 'concat()', optionD: 'combine()', correctAnswer: 'C', difficulty: 'sedang' },
      ]
    },
    {
      title        : 'Function',
      topicCategory: 'Function',
      description  : 'Memahami deklarasi dan penggunaan function',
      videoUrl     : 'https://ruangkerja.com/video/function-js',
      orderIndex   : 6,
      questions    : [
        { questionText: 'Keyword untuk mendeklarasikan function?', optionA: 'func', optionB: 'def', optionC: 'function', optionD: 'fn', correctAnswer: 'C', difficulty: 'mudah' },
        { questionText: 'Keyword untuk mengembalikan nilai dari function?', optionA: 'send', optionB: 'return', optionC: 'output', optionD: 'give', correctAnswer: 'B', difficulty: 'mudah' },
        { questionText: 'Arrow function ditulis dengan simbol?', optionA: '->', optionB: '=>', optionC: '::', optionD: '-->', correctAnswer: 'B', difficulty: 'sedang' },
      ]
    },
  ]

  const materiIds = {}
  for (const m of materiList) {
    const { questions, ...materiData } = m
    const materi = await prisma.learningMaterial.create({
      data: {
        ...materiData,
        classroomId,
        status   : 'published',
        questions: { create: questions.map((q, i) => ({ ...q, orderIndex: i })) }
      },
      include: { questions: true }
    })
    materiIds[m.topicCategory] = { id: materi.id, questions: materi.questions }
    console.log(`  ✓ ${materi.title} (${materi.questions.length} soal)`)
  }

  // ── 4. BUAT HASIL TES DUMMY ─────────────────────────────
  console.log('📊 Membuat hasil tes...')

  // Skor per siswa per topik — sesuai dashboard guru (Looping, Array, Function tinggi gagalnya)
  const skorData = [
    // { nama, email, skor per topik [Variabel, Operator, IfElse, Looping, Array, Function] }
    { email: 'budi@gmail.com',  skor: [60,  70,  65,  30,  25,  35],  waktu: [900, 850, 920, 1800, 2100, 1950] },
    { email: 'ani@gmail.com',   skor: [55,  60,  50,  25,  20,  30],  waktu: [950, 1000, 1100, 2200, 2400, 2100] },
    { email: 'dimas@gmail.com', skor: [80,  75,  85,  45,  40,  50],  waktu: [600, 650, 580, 1200, 1400, 1100] },
    { email: 'sari@gmail.com',  skor: [90,  85,  88,  82,  78,  80],  waktu: [500, 520, 480, 600,  650,  580] },
    { email: 'rizki@gmail.com', skor: [95,  90,  92,  88,  85,  90],  waktu: [450, 480, 460, 520,  540,  500] },
    { email: 'maya@gmail.com',  skor: [88,  82,  85,  75,  70,  72],  waktu: [550, 580, 560, 720,  750,  700] },
    { email: 'fajar@gmail.com', skor: [75,  70,  72,  65,  60,  62],  waktu: [700, 720, 680, 850,  900,  820] },
  ]

  const topikKeys = ['Variabel', 'Operator', 'If/Else', 'Looping', 'Array', 'Function']

  for (const siswaScore of skorData) {
    const siswa = await prisma.user.findUnique({ where: { email: siswaScore.email } })
    if (!siswa) continue

    for (let i = 0; i < topikKeys.length; i++) {
      const topik   = topikKeys[i]
      const materi  = materiIds[topik]
      if (!materi) continue

      const skor    = siswaScore.skor[i]
      const waktu   = siswaScore.waktu[i]

      // Buat jawaban dummy berdasarkan skor
      // Kalau skor 100 semua benar, kalau skor 0 semua salah
      const answersJson = {}
      materi.questions.forEach((q, idx) => {
        const benar = Math.random() * 100 < skor
        answersJson[`q${idx + 1}`] = benar ? q.correctAnswer : 'A'
      })

      await prisma.testResult.create({
        data: {
          studentId   : siswa.id,
          materialId  : materi.id,
          score       : skor,
          answersJson,
          timeSpentSec: waktu,
          aiFeedback  : skor < 50
            ? `Kamu perlu banyak latihan di topik ${topik}. Coba ulangi materinya.`
            : skor < 75
            ? `Lumayan! Tapi masih ada beberapa konsep ${topik} yang perlu diperkuat.`
            : `Bagus! Pemahaman kamu di topik ${topik} sudah baik.`
        }
      })

      // Update student progress
      await prisma.studentProgress.upsert({
        where : { studentId_materialId: { studentId: siswa.id, materialId: materi.id } },
        update: { status: 'done', completionPct: 100, lastAccessed: new Date() },
        create: { studentId: siswa.id, materialId: materi.id, status: 'done', completionPct: 100, lastAccessed: new Date() }
      })
    }
    console.log(`  ✓ hasil tes ${siswa.name} selesai`)
  }

  // ── 5. BUAT RISK FLAGS ──────────────────────────────────
  console.log('⚠️  Membuat risk flags...')

  const riskData = [
    { email: 'budi@gmail.com',  level: 'critical', reason: 'Menghabiskan 15 menit untuk 1 soal variabel', weakTopics: ['Looping', 'Array', 'Function'] },
    { email: 'ani@gmail.com',   level: 'critical', reason: 'Gagal 3x berturut-turut di modul Looping',    weakTopics: ['Looping', 'Array', 'Function'] },
    { email: 'dimas@gmail.com', level: 'warning',  reason: 'Penurunan signifikan dari If/Else ke Looping', weakTopics: ['Looping', 'Array'] },
    { email: 'sari@gmail.com',  level: 'warning',  reason: 'Belum login selama 3 hari',                   weakTopics: [] },
  ]

  for (const r of riskData) {
    const siswa = await prisma.user.findUnique({ where: { email: r.email } })
    if (!siswa) continue

    await prisma.studentRiskFlag.create({
      data: {
        studentId  : siswa.id,
        classroomId,
        riskLevel  : r.level,
        reason     : r.reason,
        weakTopics : r.weakTopics,
        lastActive : new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        isResolved : false
      }
    })
    console.log(`  ✓ risk flag ${siswa.name} (${r.level})`)
  }

  console.log('\n✅ Seeding selesai!')
  console.log(`   - ${siswaList.length} siswa`)
  console.log(`   - ${materiList.length} materi`)
  console.log(`   - ${siswaList.length * materiList.length} hasil tes`)
  console.log(`   - ${riskData.length} risk flags`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())