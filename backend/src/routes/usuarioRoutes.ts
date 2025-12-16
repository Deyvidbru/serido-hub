import { Router } from "express";
import UsuarioController from "../controllers/UsuarioController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.get("/me", authMiddleware, UsuarioController.me.bind(UsuarioController));
router.patch("/me", authMiddleware, UsuarioController.updateMe.bind(UsuarioController));
router.patch("/me/senha", authMiddleware, UsuarioController.updatePassword.bind(UsuarioController));
router.delete("/me", authMiddleware, UsuarioController.deleteMe.bind(UsuarioController));

export default router;
