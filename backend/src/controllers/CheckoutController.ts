import { Request, Response } from 'express';
import { CheckoutService } from '../services/CheckoutService';

function getUsuario(req: Request) {
  return (req as any).usuario || (req as any).user;
}

class CheckoutController {
  async finalizarPix(req: Request, res: Response) {
    try {
      const usuario = getUsuario(req);

      if (!usuario || !usuario.id) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const clienteId = Number(usuario.id);
      const enderecoId = Number(req.body?.enderecoId);
      const itens = req.body?.itens;

      const pedidos = await CheckoutService.finalizarPix({
        clienteId,
        enderecoId,
        itens,
      });

      return res.status(201).json({
        message: 'Pagamento PIX confirmado (simulado) e pedidos gerados com sucesso.',
        pedidos,
      });
    } catch (error: any) {
      console.error('Erro no checkout PIX:', error);

      const code = error?.code;

      if (code === 'BAD_REQUEST') {
        return res.status(400).json({ message: error.message });
      }

      if (code === 'FORBIDDEN') {
        return res.status(403).json({ message: error.message });
      }

      if (code === 'OUT_OF_STOCK') {
        return res.status(409).json({ message: error.message });
      }

      return res.status(500).json({
        message: 'Erro ao finalizar pagamento PIX.',
        error: error.message || String(error),
      });
    }
  }
}

export default new CheckoutController();
