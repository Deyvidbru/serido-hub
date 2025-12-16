import { Request, Response } from 'express';
import { PedidoService } from '../services/PedidoService';

const STATUS_PERMITIDOS = new Set([
  'PENDENTE',
  'PREPARO',
  'A_CAMINHO',
  'ENTREGUE',
  'CANCELADO',
]);

function getUsuario(req: Request) {
  return (req as any).usuario || (req as any).user;
}

function normalizeStatus(status: any) {
  if (!status) return null;
  return String(status).trim().toUpperCase();
}

class PedidoController {
  async listByCliente(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);

      if (!usuario?.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const pedidos = await PedidoService.listarPedidosPorCliente(Number(usuario.id));

      if (!pedidos || pedidos.length === 0) {
        return res.status(204).send();
      }

      return res.json(pedidos);
    } catch (error: any) {
      console.error('Erro ao listar pedidos do cliente:', error);
      return res.status(500).json({
        message: 'Erro ao listar pedidos do cliente.',
        error: error.message || String(error),
      });
    }
  }

  async listByVendedor(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);

      if (!usuario?.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const pedidos = await PedidoService.listarPedidosPorVendedor(Number(usuario.id));

      if (!pedidos || pedidos.length === 0) {
        return res.status(204).send();
      }

      return res.json(pedidos);
    } catch (error: any) {
      console.error('Erro ao listar pedidos do vendedor:', error);
      return res.status(500).json({
        message: 'Erro ao listar pedidos do vendedor.',
        error: error.message || String(error),
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);
      const pedidoId = Number(req.params.id);

      if (!usuario?.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      if (Number.isNaN(pedidoId)) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
      }

      const pedido = await PedidoService.buscarPorIdParaUsuario({
        pedidoId,
        usuarioId: Number(usuario.id),
        userType: usuario.tipo,
      });

      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado.' });
      }

      return res.json(pedido);
    } catch (error: any) {
      console.error('Erro ao buscar pedido:', error);

      if (error?.code === 'FORBIDDEN') {
        return res.status(403).json({ message: 'Você não tem permissão para ver este pedido.' });
      }

      return res.status(500).json({
        message: 'Erro ao buscar pedido.',
        error: error.message || String(error),
      });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);
      const pedidoId = Number(req.params.id);
      const status = normalizeStatus(req.body?.status);

      if (!usuario?.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      if (Number.isNaN(pedidoId)) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
      }

      if (!status) {
        return res.status(400).json({ message: 'Status é obrigatório.' });
      }

      if (!STATUS_PERMITIDOS.has(status)) {
        return res.status(400).json({
          message: 'Status inválido.',
          allowed: Array.from(STATUS_PERMITIDOS),
        });
      }

      const pedidoAtualizado = await PedidoService.atualizarStatus({
        pedidoId,
        vendedorId: Number(usuario.id),
        status,
      });

      return res.json(pedidoAtualizado);
    } catch (error: any) {
      console.error('Erro ao atualizar status do pedido:', error);

      if (error?.code === 'FORBIDDEN') {
        return res.status(403).json({ message: 'Você não pode alterar este pedido.' });
      }

      if (error?.code === 'NOT_FOUND') {
        return res.status(404).json({ message: 'Pedido não encontrado.' });
      }

      return res.status(500).json({
        message: 'Erro ao atualizar status do pedido.',
        error: error.message || String(error),
      });
    }
  }

  async cancelar(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);
      const pedidoId = Number(req.params.id);

      if (!usuario?.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      if (Number.isNaN(pedidoId)) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
      }

      const pedidoCancelado = await PedidoService.cancelarPedido({
        pedidoId,
        usuarioId: Number(usuario.id),
        userType: usuario.tipo,
      });

      return res.json(pedidoCancelado);
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error);

      if (error?.code === 'FORBIDDEN') {
        return res.status(403).json({ message: error.message || 'Sem permissão.' });
      }

      if (error?.code === 'NOT_FOUND') {
        return res.status(404).json({ message: 'Pedido não encontrado.' });
      }

      if (error?.code === 'NOT_ALLOWED') {
        return res.status(409).json({ message: error.message });
      }

      return res.status(500).json({
        message: 'Erro ao cancelar pedido.',
        error: error.message || String(error),
      });
    }
  }
}

export default new PedidoController();
