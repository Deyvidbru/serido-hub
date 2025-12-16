import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import EnderecoController from '../controllers/EnderecoController';

const router = Router();

router.use(authMiddleware);

router.get('/', EnderecoController.list.bind(EnderecoController));
router.post('/', EnderecoController.create.bind(EnderecoController));
router.put('/:id', EnderecoController.update.bind(EnderecoController));
router.delete('/:id', EnderecoController.remove.bind(EnderecoController));
router.patch('/:id/principal', EnderecoController.setPrincipal.bind(EnderecoController));

export default router;
