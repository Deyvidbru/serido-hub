import { Request, Response } from 'express';
import EnderecoService from '../services/EnderecoService';

class EnderecoController {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const enderecos = await EnderecoService.listByUser(userId);
      return res.json(enderecos);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar endereços' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const {
        apelido,
        destinatario,
        telefone,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        principal,
      } = req.body;

      if (!apelido || typeof apelido !== 'string' || apelido.trim().length < 2) {
        return res.status(400).json({ message: 'Apelido do endereço é obrigatório' });
      }
      if (!destinatario || typeof destinatario !== 'string' || destinatario.trim().length < 3) {
        return res.status(400).json({ message: 'Destinatário é obrigatório' });
      }
      if (!logradouro || typeof logradouro !== 'string' || logradouro.trim().length < 3) {
        return res.status(400).json({ message: 'Logradouro é obrigatório' });
      }

      const ufNorm =
        typeof uf === 'string' && uf.trim().length > 0 ? uf.trim().toUpperCase() : null;

      if (ufNorm && ufNorm.length !== 2) {
        return res.status(400).json({ message: 'UF inválida (use 2 letras, ex: RN)' });
      }

      const novo = await EnderecoService.create(userId, {
        apelido: apelido.trim(),
        destinatario: destinatario.trim(),
        telefone: typeof telefone === 'string' ? telefone.trim() : null,
        cep: typeof cep === 'string' ? cep.trim() : null,
        logradouro: logradouro.trim(),
        numero: typeof numero === 'string' ? numero.trim() : null,
        bairro: typeof bairro === 'string' ? bairro.trim() : null,
        cidade: typeof cidade === 'string' ? cidade.trim() : null,
        uf: ufNorm,
        complemento: typeof complemento === 'string' ? complemento.trim() : null,
        principal: typeof principal === 'boolean' ? principal : false,
      });

      return res.status(201).json(novo);
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ message: error.message || 'Erro ao criar endereço' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

      const {
        apelido,
        destinatario,
        telefone,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        complemento,
        principal,
      } = req.body;

      if (!apelido || typeof apelido !== 'string' || apelido.trim().length < 2) {
        return res.status(400).json({ message: 'Apelido do endereço é obrigatório' });
      }
      if (!destinatario || typeof destinatario !== 'string' || destinatario.trim().length < 3) {
        return res.status(400).json({ message: 'Destinatário é obrigatório' });
      }
      if (!logradouro || typeof logradouro !== 'string' || logradouro.trim().length < 3) {
        return res.status(400).json({ message: 'Logradouro é obrigatório' });
      }

      const ufNorm =
        typeof uf === 'string' && uf.trim().length > 0 ? uf.trim().toUpperCase() : null;

      if (ufNorm && ufNorm.length !== 2) {
        return res.status(400).json({ message: 'UF inválida (use 2 letras, ex: RN)' });
      }

      const atualizado = await EnderecoService.update(userId, id, {
        apelido: apelido.trim(),
        destinatario: destinatario.trim(),
        telefone: typeof telefone === 'string' ? telefone.trim() : null,
        cep: typeof cep === 'string' ? cep.trim() : null,
        logradouro: logradouro.trim(),
        numero: typeof numero === 'string' ? numero.trim() : null,
        bairro: typeof bairro === 'string' ? bairro.trim() : null,
        cidade: typeof cidade === 'string' ? cidade.trim() : null,
        uf: ufNorm,
        complemento: typeof complemento === 'string' ? complemento.trim() : null,
        ...(typeof principal === 'boolean' ? { principal } : {}),
      });

      return res.json(atualizado);
    } catch (error: any) {
      console.error(error);

      if (error.message === 'Endereço não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(400).json({ message: error.message || 'Erro ao atualizar endereço' });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

      await EnderecoService.remove(userId, id);
      return res.status(204).send();
    } catch (error: any) {
      console.error(error);

      if (error.message === 'Endereço não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(400).json({ message: error.message || 'Erro ao remover endereço' });
    }
  }

  async setPrincipal(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

      const atualizado = await EnderecoService.setPrincipal(userId, id);
      return res.json(atualizado);
    } catch (error: any) {
      console.error(error);

      if (error.message === 'Endereço não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      return res.status(400).json({ message: error.message || 'Erro ao definir endereço principal' });
    }
  }
}

export default new EnderecoController();
