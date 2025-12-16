import { Router } from 'express';
import PedidoController from '../controllers/PedidoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get(
  '/meus',
  authMiddleware,
  PedidoController.listByCliente.bind(PedidoController)
);

router.get(
  '/minha-loja',
  authMiddleware,
  PedidoController.listByVendedor.bind(PedidoController)
);

router.patch(
  '/:id/status',
  authMiddleware,
  PedidoController.updateStatus.bind(PedidoController)
);

router.patch(
  '/:id/cancelar',
  authMiddleware,
  PedidoController.cancelar.bind(PedidoController)
);

router.get(
  '/:id',
  authMiddleware,
  PedidoController.getById.bind(PedidoController)
);

export default router;
