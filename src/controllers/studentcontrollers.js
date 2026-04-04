import { evaluateCode } from '../services/scoringservice.js';  // + .js
import prisma from '../database/prisma.js';  // + .js (atau sesuaikan path)
import { generateFeedback } from '../utils/gemini.js';


// ENDPOINT: POST /api/students/score - AUTOMATED SCORING
// Frontend kirim kode → backend test otomatis → simpan DB → return score
// —————————————————————————————————————————————————————————————————
const scoreSubmission = async (req, res) => {
  try {
    console.log('Menerima submission dari:', req.user?.email);
    
    const { userCode, testCases, exerciseId } = req.body;
    
    if (!userCode || !testCases?.length) {
      return res.status(400).json({ 
        error: 'userCode dan testCases wajib ada!' 
      });
    }
    
    // SCORING (FUNGSI UDAH ADA)
    const score = await evaluateCode(userCode, testCases);
    
    // AI FEEDBACK
    let aiFeedback = null;
    if (score < 70) {
      aiFeedback = await generateFeedback(userCode, score, exerciseId);
    }
    
    // RESPONSE
    res.status(200).json({
      success: true,
      score,
      passed: score >= 70,
      totalTests: testCases.length,
      aiFeedback,
      message: score >= 70 ? 'Lulus!' : 'Coba lagi ya!'
    });
    
  } catch (error) {
    console.error('Error scoring:', error);
    res.status(500).json({ 
      error: 'Server error saat penilaian',
      details: error.message 
    });
  }
};

export { scoreSubmission };
export default { scoreSubmission };