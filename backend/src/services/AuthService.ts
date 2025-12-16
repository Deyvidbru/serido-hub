import prisma from '../prisma';
import { UserType } from '@prisma/client';
import { comparePassword, generateToken, hashPassword } from '../utils/helpers';

class AuthService {
  async checkEmail(email: string) {
    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      status: user.status,
      tipo: user.tipo,
    };
  }

  async register(data: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    tipo?: UserType;
  }) {
    const existing = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error('E-mail já cadastrado');
    }

    const hashed = await hashPassword(data.senha);

    const user = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: hashed,
        telefone: data.telefone ?? null,
        tipo: data.tipo ?? UserType.CLIENTE,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      tipo: user.tipo,
    });

    const { senha, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async login(email: string, senha: string) {
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    if (!user.status) {
      throw new Error('Usuário desativado');
    }

    const ok = await comparePassword(senha, user.senha);
    if (!ok) {
      throw new Error('Credenciais inválidas');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      tipo: user.tipo,
    });

    const { senha: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  async adminLogin(email: string, senha: string) {
    if (email !== 'admin' || senha !== 'admin') {
      throw new Error('Credenciais inválidas');
    }

    let adminUser = await prisma.usuario.findUnique({
      where: { email: 'admin' },
    });

    if (!adminUser) {
      const hashed = await hashPassword('admin');

      adminUser = await prisma.usuario.create({
        data: {
          nome: 'Administrador',
          email: 'admin',
          senha: hashed,
          telefone: null,
          tipo: UserType.ADMIN,
          status: true,
        },
      });
    } else {
      if (adminUser.tipo !== UserType.ADMIN || adminUser.status !== true) {
        adminUser = await prisma.usuario.update({
          where: { email: 'admin' },
          data: {
            tipo: UserType.ADMIN,
            status: true,
          },
        });
      }

      const ok = await comparePassword('admin', adminUser.senha);
      if (!ok) {
        throw new Error('Credenciais inválidas');
      }
    }

    const token = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      tipo: adminUser.tipo,
    });

    const { senha: _, ...safeUser } = adminUser;
    return { token, user: safeUser };
  }

  async getProfile(userId: number) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const { senha, ...safeUser } = user;
    return safeUser;
  }
}

export default new AuthService();
