import { Request, Response } from 'express';
import AdminService from '../services/AdminService';

class AdminController {
  async listUsuarios(req: Request, res: Response) {
    try {
      const result = await AdminService.listUsuarios();
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em listUsuarios:', error);
      return res.status(500).json({ message: 'Erro ao listar usuários' });
    }
  }

  async getUsuarioById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.getUsuarioById(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em getUsuarioById:', error);
      if (error?.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
  }

  async updateUsuario(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.updateUsuario(id, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em updateUsuario:', error);

      if (error?.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      if (error?.message === 'E-mail já cadastrado') {
        return res.status(409).json({ message: error.message });
      }
      if (error?.message === 'Não é permitido alterar o admin padrão') {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
  }

  async updateUsuarioStatus(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (typeof status !== 'boolean') {
        return res
          .status(400)
          .json({ message: 'status deve ser boolean (true/false)' });
      }

      const result = await AdminService.updateUsuarioStatus(id, status);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em updateUsuarioStatus:', error);

      if (error?.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      if (error?.message === 'Não é permitido alterar o admin padrão') {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
    }
  }

  async deleteUsuario(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.deleteUsuario(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em deleteUsuario:', error);

      if (error?.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      if (error?.message === 'Não é permitido excluir o admin padrão') {
        return res.status(403).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao excluir usuário' });
    }
  }

  async listLojas(req: Request, res: Response) {
    try {
      const result = await AdminService.listLojas();
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em listLojas:', error);
      return res.status(500).json({ message: 'Erro ao listar lojas' });
    }
  }

  async getLojaById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.getLojaById(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em getLojaById:', error);
      if (error?.message === 'Loja não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Erro ao buscar loja' });
    }
  }

  async updateLoja(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.updateLoja(id, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em updateLoja:', error);

      if (error?.message === 'Loja não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      if (error?.message === 'Nome de loja já existe') {
        return res.status(409).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao atualizar loja' });
    }
  }

  async deleteLoja(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.deleteLoja(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em deleteLoja:', error);

      if (error?.message === 'Loja não encontrada') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao excluir loja' });
    }
  }

  async listProdutos(req: Request, res: Response) {
    try {
      const result = await AdminService.listProdutos();
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em listProdutos:', error);
      return res.status(500).json({ message: 'Erro ao listar produtos' });
    }
  }

  async getProdutoById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.getProdutoById(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em getProdutoById:', error);
      if (error?.message === 'Produto não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Erro ao buscar produto' });
    }
  }

  async updateProduto(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.updateProduto(id, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em updateProduto:', error);

      if (error?.message === 'Produto não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao atualizar produto' });
    }
  }

  async deleteProduto(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await AdminService.deleteProduto(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em deleteProduto:', error);

      if (error?.message === 'Produto não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro ao excluir produto' });
    }
  }
}

export default new AdminController();
