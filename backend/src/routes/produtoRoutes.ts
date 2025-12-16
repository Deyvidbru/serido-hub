import { Router } from 'express';
import ProdutoController from '../controllers/ProdutoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get(
  '/minha-loja',
  authMiddleware,
  ProdutoController.listMine.bind(ProdutoController)
);

router.post(
  '/',
  authMiddleware,
  ProdutoController.createForSeller.bind(ProdutoController)
);

router.put(
  '/:id',
  authMiddleware,
  ProdutoController.updateForSeller.bind(ProdutoController)
);

router.delete(
  '/:id',
  authMiddleware,
  ProdutoController.deleteForSeller.bind(ProdutoController)
);

router.get('/', ProdutoController.listAll.bind(ProdutoController));
router.get('/loja/:lojaId', ProdutoController.listByLoja.bind(ProdutoController));
router.get('/:id', ProdutoController.getById.bind(ProdutoController));

export default router;
