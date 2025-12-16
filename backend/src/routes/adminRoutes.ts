import { Router } from 'express';
import AdminController from '../controllers/AdminController';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/usuarios', AdminController.listUsuarios.bind(AdminController));
router.get('/usuarios/:id', AdminController.getUsuarioById.bind(AdminController));
router.put('/usuarios/:id', AdminController.updateUsuario.bind(AdminController));
router.patch(
  '/usuarios/:id/status',
  AdminController.updateUsuarioStatus.bind(AdminController)
);
router.delete('/usuarios/:id', AdminController.deleteUsuario.bind(AdminController));

router.get('/lojas', AdminController.listLojas.bind(AdminController));
router.get('/lojas/:id', AdminController.getLojaById.bind(AdminController));
router.put('/lojas/:id', AdminController.updateLoja.bind(AdminController));
router.delete('/lojas/:id', AdminController.deleteLoja.bind(AdminController));

router.get('/produtos', AdminController.listProdutos.bind(AdminController));
router.get('/produtos/:id', AdminController.getProdutoById.bind(AdminController));
router.put('/produtos/:id', AdminController.updateProduto.bind(AdminController));
router.delete('/produtos/:id', AdminController.deleteProduto.bind(AdminController));

export default router;
