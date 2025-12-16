import prisma from '../prisma';
import { Prisma } from '@prisma/client';

class LojaService {
  async listarLojas(search?: string) {
    const where: Prisma.LojaWhereInput = {};

    if (search && search.trim().length > 0) {
      const termo = search.trim();

      where.OR = [
        {
          nome: {
            contains: termo,
            mode: 'insensitive',
          },
        },
        {
          descricao: {
            contains: termo,
            mode: 'insensitive',
          },
        },
      ];
    }

    return prisma.loja.findMany({
      where,
      include: {
        dono: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async listarLojasDoVendedor(usuarioId: number) {
    return prisma.loja.findMany({
      where: { usuarioId },
      include: {
        dono: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        produtos: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async getById(id: number) {
    const loja = await prisma.loja.findUnique({
      where: { id },
      include: {
        dono: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        produtos: true,
      },
    });

    if (!loja) {
      throw new Error('Loja não encontrada');
    }

    return loja;
  }

  async listarProdutosDaLoja(lojaId: number) {
    return prisma.produto.findMany({
      where: { lojaId },
    });
  }

  async criarLoja(data: {
    usuarioId: number;
    nome: string;
    descricao?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    imagemLogo?: string | null;
    horarioAbertura?: string | null;
    horarioFechamento?: string | null;
  }) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: data.usuarioId },
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    if (usuario.tipo !== 'VENDEDOR') {
      throw new Error('Apenas usuários do tipo VENDEDOR podem cadastrar loja');
    }

    const existing = await prisma.loja.findFirst({
      where: { usuarioId: data.usuarioId },
    });

    if (existing) {
      throw new Error('Este usuário já possui uma loja cadastrada');
    }

    const horaAbertura = parseHoraString(data.horarioAbertura);
    const horaFechamento = parseHoraString(data.horarioFechamento);

    const createData: Prisma.LojaCreateInput = {
      nome: data.nome.trim(),
      dono: {
        connect: { id: data.usuarioId },
      },
    };

    if (data.descricao !== undefined) {
      createData.descricao = data.descricao;
    }
    if (data.endereco !== undefined) {
      createData.endereco = data.endereco;
    }
    if (data.telefone !== undefined) {
      createData.telefone = data.telefone;
    }
    if (data.imagemLogo !== undefined) {
      createData.imagemLogo = data.imagemLogo;
    }
    if (data.horarioAbertura !== undefined) {
      createData.horarioAbertura = horaAbertura;
    }
    if (data.horarioFechamento !== undefined) {
      createData.horarioFechamento = horaFechamento;
    }

    const loja = await prisma.loja.create({
      data: createData,
    });

    return loja;
  }

  async buscarPorUsuario(usuarioId: number) {
    const loja = await prisma.loja.findFirst({
      where: { usuarioId },
      include: {
        dono: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        produtos: true,
      },
    });

    return loja;
  }

  async atualizarLoja(params: {
    id: number;
    usuarioId: number;
    nome?: string;
    descricao?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    imagemLogo?: string | null;
    horarioAbertura?: string | null;
    horarioFechamento?: string | null;
    status?: 'PENDENTE' | 'APROVADA' | 'INATIVA';
  }) {
    const {
      id,
      usuarioId,
      nome,
      descricao,
      endereco,
      telefone,
      imagemLogo,
      horarioAbertura,
      horarioFechamento,
      status,
    } = params;

    const loja = await prisma.loja.findUnique({
      where: { id },
    });

    if (!loja) {
      throw new Error('Loja não encontrada');
    }

    if (loja.usuarioId !== usuarioId) {
      throw new Error('Você não tem permissão para editar esta loja');
    }

    const data: Prisma.LojaUpdateInput = {};

    if (typeof nome === 'string' && nome.trim().length > 0) {
      data.nome = nome.trim();
    }

    if (descricao !== undefined) {
      data.descricao = descricao;
    }

    if (endereco !== undefined) {
      data.endereco = endereco;
    }

    if (telefone !== undefined) {
      data.telefone = telefone;
    }

    if (imagemLogo !== undefined) {
      data.imagemLogo = imagemLogo;
    }

    if (horarioAbertura !== undefined) {
      data.horarioAbertura = parseHoraString(horarioAbertura);
    }

    if (horarioFechamento !== undefined) {
      data.horarioFechamento = parseHoraString(horarioFechamento);
    }

    if (status !== undefined) {
      data.status = status as any;
    }

    const lojaAtualizada = await prisma.loja.update({
      where: { id },
      data,
    });

    return lojaAtualizada;
  }
}

function parseHoraString(hora?: string | null): Date | null {
  if (!hora) return null;

  const [hStr, mStr] = hora.split(':');
  const h = Number(hStr);
  const m = Number(mStr);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }

  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default new LojaService();
