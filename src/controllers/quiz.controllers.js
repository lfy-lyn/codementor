import prisma from "../database/prisma.js";
import { generateLearningFeedback } from "../services/aiService.js";

export const submitQuiz = async (req, res) => {
  try {

    const { materialId, answers } = req.body;

    let correct = 0;
    let wrongQuestions = [];

    for (const a of answers) {

      const question = await prisma.question.findUnique({
        where: { id: a.questionId }
      });

      if (question.correctAnswer === a.answer) {
        correct++;
      } else {

        wrongQuestions.push({
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          studentAnswer: a.answer,
          correctAnswer: question.correctAnswer
        });

      }

    }



    const score = Math.round((correct / answers.length) * 100);

    let aiFeedback = null;

    if (score < 70) {

      const material = await prisma.learningMaterial.findUnique({
        where: { id: materialId }
      });

      console.log("===== MATERI KE AI =====");
      console.log("TITLE:", material?.title);
      console.log("DESCRIPTION:", material?.description);
      console.log("========================");

      const wrongText = wrongQuestions.map(q => `
Pertanyaan: ${q.questionText}

Pilihan jawaban:
A. ${q.optionA}
B. ${q.optionB}
C. ${q.optionC}
D. ${q.optionD}

Jawaban siswa: ${q.studentAnswer}
Jawaban benar: ${q.correctAnswer}
`).join("\n")

      const materialText = `
Judul materi:
${material.title}

Materi:
${material.description}

Soal yang salah dijawab siswa:
${wrongText}
`
      try {
        aiFeedback = await generateLearningFeedback(materialText);
      } catch (err) {

        console.log("AI ERROR:", err.message);

        aiFeedback = "AI sedang sibuk. Silakan pelajari kembali materi.";

      }
    }

    res.json({
      status: "success",
      data: {
        score,
        correct,
        total: answers.length,
        passed: score >= 70,
        aiFeedback
      }
    });

  } catch (error) {

    res.status(500).json({
      status: "error",
      message: error.message
    });

  }
};