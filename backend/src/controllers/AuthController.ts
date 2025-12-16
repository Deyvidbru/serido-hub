import { Request, Response } from 'express';
import { UserType } from '@prisma/client';
import AuthService from '../services/AuthService';

class AuthController {
  async checkEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'E-mail é obrigatório' });
      }

      const result = await AuthService.checkEmail(email);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em checkEmail:', error);
      return res.status(500).json({ message: 'Erro ao verificar e-mail' });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { nome, email, senha, telefone, tipo } = req.body;

      if (!nome || !email || !senha) {
        return res
          .status(400)
          .json({ message: 'Nome, e-mail e senha são obrigatórios' });
      }

      const payload: {
        nome: string;
        email: string;
        senha: string;
        telefone?: string;
        tipo?: UserType;
      } = {
        nome,
        email,
        senha,
        telefone,
      };

      if (tipo) {
        payload.tipo = tipo as UserType;
      }

      const result = await AuthService.register(payload);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro em register:', error);

      if (error?.message === 'E-mail já cadastrado') {
        return res.status(409).json({ message: error.message });
      }

      return res
        .status(500)
        .json({ message: 'Erro interno ao cadastrar usuário' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res
          .status(400)
          .json({ message: 'E-mail e senha são obrigatórios' });
      }

      const result = await AuthService.login(email, senha);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em login:', error);

      if (
        error?.message === 'Credenciais inválidas' ||
        error?.message === 'Usuário desativado'
      ) {
        return res.status(401).json({ message: error.message });
      }

      return res.status(500).json({ message: 'Erro interno ao fazer login' });
    }
  }

  async adminLogin(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res
          .status(400)
          .json({ message: 'E-mail e senha são obrigatórios' });
      }

      const result = await AuthService.adminLogin(email, senha);
      return res.json(result);
    } catch (error: any) {
      console.error('Erro em adminLogin:', error);

      if (error?.message === 'Credenciais inválidas') {
        return res.status(401).json({ message: error.message });
      }

      return res
        .status(500)
        .json({ message: 'Erro interno ao fazer login de admin' });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const userFromReq = (req as any).user;

      if (!userFromReq || !userFromReq.id) {
        return res.status(401).json({ message: 'Não autenticado' });
      }

      const user = await AuthService.getProfile(userFromReq.id as number);
      return res.json({ user });
    } catch (error: any) {
      console.error('Erro em me:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao carregar perfil do usuário' });
    }
  }
}

export default new AuthController();
