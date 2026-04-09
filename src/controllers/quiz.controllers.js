import prisma from "../database/prisma.js";

export const submitQuiz = async (req, res) => {
  try {
    const { materialId, answers } = req.body;

    const questions = await prisma.question.findMany({
      where: { materialId }
    });

    let correct = 0;

    for (const a of answers) {
      const q = questions.find(q => q.id === a.questionId);

      if (q && q.correctAnswer === a.answer) {
        correct++;
      }
    }

    const score = Math.round((correct / questions.length) * 100);

    res.json({
      status: "success",
      data: {
        score,
        correct,
        total: questions.length
      }
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};