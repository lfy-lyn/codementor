const { evaluateCode } = require('../services/scoringservice'); // Import engine
const prisma = require('../prisma'); // Prisma client

// ENDPOINT: POST /students/score
exports.scoreSubmission = async (req, res) => {
  try {
    console.log('📥 Menerima submission dari:', req.user?.email);
    
    // Ambil data dari frontend
    const { 
      userCode,           // Kode yang dikirim user
      testCases,         // Array test cases tersembunyi (server-side only)
      exerciseId         // ID soal
    } = req.body;
    
    // VALIDASI input
    if (!userCode || !testCases || testCases.length === 0) {
      return res.status(400).json({ 
        error: 'Kode dan test cases wajib ada!' 
      });
    }
    
    // 🚀 JALANKAN PENILAIAN OTOMATIS
    const score = evaluateCode(userCode, testCases);
    
    // 💾 SIMPAN KE DATABASE (Prisma)
    const submission = await prisma.submission.create({
      data: {
        userCode,
        score,
        exerciseId,
        studentId: req.user.id, // Dari middleware auth
        submittedAt: new Date()
      }
    });
    
    // 📤 KIRIM HASIL KE FRONTEND
    res.status(200).json({
      success: true,
      score: score,
      passed: score >= 80,  // Threshold lulus
      totalTests: testCases.length,
      submissionId: submission.id,
      message: score >= 80 ? '🎉 Lulus!' : 'Coba lagi ya!'
    });
    
  } catch (error) {
    console.error('❌ Error scoring:', error);
    res.status(500).json({ 
      error: 'Server error saat penilaian',
      details: error.message 
    });
  }
};