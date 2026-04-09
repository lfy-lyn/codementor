import { Router } from "express";
import { submitQuiz } from "../controllers/quiz.controllers.js";
import authenticate from "../middleware/auth.middleware.js";

const router = Router();

router.post("/submit", authenticate, submitQuiz);

export default router;