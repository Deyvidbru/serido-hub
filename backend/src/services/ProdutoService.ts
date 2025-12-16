import prisma from '../prisma';
import { Prisma } from '@prisma/client';

interface CriarProdutoDTO {
  usuarioId: number;
  nome: string;
  preco: number;
  descricao?: string | null;
  imagemUrl?: string | null;
  estoque?: number;
  idCategoria?: number | null;
  ativo?: boolean;
}

interface AtualizarProdutoDTO {
  usuarioId: number;
  produtoId: number;
  nome: string;
  preco: number;
  descricao?: string | null;
  imagemUrl?: string | null;
  estoque?: number;
  idCategoria?: number | null;
  ativo?: boolean;
}

class ProdutoService {
  async getById(id: number) {
    const produto = await prisma.produto.findFirst({
      where: { id, ativo: true },
      include: {
        loja: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    return produto;
  }

  async listarPorLoja(lojaId: number) {
    return prisma.produto.findMany({
      where: { lojaId, ativo: true },
      orderBy: { id: 'desc' },
    });
  }

  async listarTodos(search?: string) {
    const where: Prisma.ProdutoWhereInput = {
      ativo: true,
    };

    if (search && search.trim().length > 0) {
      where.nome = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const args: Prisma.ProdutoFindManyArgs = {
      where,
      include: {
        loja: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    };

    if (!search) {
      args.take = 20;
    }

    return prisma.produto.findMany(args);
  }

  async criarParaVendedor(data: CriarProdutoDTO) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: data.usuarioId },
    });

    if (!usuario) throw new Error('Usuário não encontrado');

    if (usuario.tipo !== 'VENDEDOR') {
      throw new Error('Apenas usuários do tipo VENDEDOR podem cadastrar produtos');
    }

    const loja = await prisma.loja.findUnique({
      where: { usuarioId: data.usuarioId },
    });

    if (!loja) {
      throw new Error('Este vendedor ainda não possui uma loja cadastrada');
    }

    const estoqueNormalizado =
      typeof data.estoque === 'number' && data.estoque >= 0 ? data.estoque : 0;

    const produto = await prisma.produto.create({
      data: {
        nome: data.nome,
        preco: data.preco,
        lojaId: loja.id,
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
        estoque: estoqueNormalizado,
        ...(data.idCategoria !== undefined && { idCategoria: data.idCategoria }),
        ...(typeof data.ativo === 'boolean' && { ativo: data.ativo }),
      },
    });

    return produto;
  }

  async removerDoVendedor(usuarioId: number, produtoId: number) {
    const loja = await prisma.loja.findUnique({
      where: { usuarioId },
    });

    if (!loja) {
      throw new Error('Este vendedor não possui loja cadastrada');
    }

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
    });

    if (!produto || produto.lojaId !== loja.id) {
      throw new Error('Produto não encontrado na sua loja');
    }

    await prisma.produto.delete({
      where: { id: produtoId },
    });

    return true;
  }

  async listarDoVendedor(usuarioId: number) {
    const loja = await prisma.loja.findUnique({
      where: { usuarioId },
    });

    if (!loja) {
      throw new Error('Este vendedor ainda não possui uma loja cadastrada');
    }

    const produtos = await prisma.produto.findMany({
      where: { lojaId: loja.id },
      orderBy: { id: 'desc' },
    });

    return { loja, produtos };
  }

  async atualizarParaVendedor(data: AtualizarProdutoDTO) {
    const { usuarioId, produtoId, nome, preco, descricao, imagemUrl, estoque, idCategoria, ativo } =
      data;

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) throw new Error('Usuário não encontrado');

    if (usuario.tipo !== 'VENDEDOR') {
      throw new Error('Apenas usuários do tipo VENDEDOR podem editar produtos');
    }

    const loja = await prisma.loja.findUnique({
      where: { usuarioId },
    });

    if (!loja) {
      throw new Error('Este vendedor ainda não possui uma loja cadastrada');
    }

    const produto = await prisma.produto.findFirst({
      where: {
        id: produtoId,
        lojaId: loja.id,
      },
    });

    if (!produto) {
      throw new Error('Produto não encontrado para este vendedor');
    }

    return prisma.produto.update({
      where: { id: produtoId },
      data: {
        nome,
        preco,
        ...(descricao !== undefined && { descricao }),
        ...(imagemUrl !== undefined && { imagemUrl }),
        ...(estoque !== undefined && { estoque }),
        ...(idCategoria !== undefined && { idCategoria }),
        ...(ativo !== undefined && { ativo }),
      },
    });
  }
}

export default new ProdutoService();
