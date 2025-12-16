import { Router } from 'express';
import CheckoutController from '../controllers/CheckoutController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/pix', authMiddleware, CheckoutController.finalizarPix.bind(CheckoutController));

export default router;
