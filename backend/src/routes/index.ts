import { Router } from 'express';

import authRoutes from './authRoutes';
import lojaRoutes from './lojaRoutes';
import produtoRoutes from './produtoRoutes';
import pedidoRoutes from './pedidoRoutes';
import enderecoRoutes from './enderecoRoutes';
import checkoutRoutes from './checkoutRoutes';
import usuarioRoutes from './usuarioRoutes';

import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/lojas', lojaRoutes);
router.use('/produtos', produtoRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/enderecos', enderecoRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/admin', adminRoutes);

export default router;
