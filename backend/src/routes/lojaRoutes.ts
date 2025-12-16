import { Router } from 'express';
import LojaController from '../controllers/LojaController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', LojaController.list.bind(LojaController));
router.get('/:id/produtos', LojaController.getProdutos.bind(LojaController));

router.get(
  '/minha',
  authMiddleware,
  LojaController.getMinhaLoja.bind(LojaController)
);

router.get(
  '/minhas',
  authMiddleware,
  LojaController.getMinhasLojas.bind(LojaController)
);

router.get('/:id', LojaController.getById.bind(LojaController));
router.post('/', authMiddleware, LojaController.create.bind(LojaController));
router.put('/:id', authMiddleware, LojaController.update.bind(LojaController));

export default router;
