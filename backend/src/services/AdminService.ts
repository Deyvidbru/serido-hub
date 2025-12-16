import prisma from "../prisma";
import { UserType, LojaStatus, Prisma } from "@prisma/client";

function toNumberId(id: any) {
  const n = Number(id);
  if (!Number.isFinite(n)) throw new Error("ID inválido");
  return n;
}

function toDecimal(value: any): Prisma.Decimal | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "number") return new Prisma.Decimal(value);
  if (typeof value === "string") return new Prisma.Decimal(value.replace(",", "."));

  return undefined;
}

class AdminService {
  async listUsuarios() {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        status: true,
        dataCriacao: true,
      },
    });

    return { usuarios };
  }

  async getUsuarioById(id: number) {
    const userId = toNumberId(id);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        status: true,
        dataCriacao: true,
      },
    });

    if (!usuario) throw new Error("Usuário não encontrado");
    return { usuario };
  }

  async updateUsuario(
    id: number,
    data: {
      nome?: string;
      email?: string;
      telefone?: string | null;
      tipo?: UserType | string;
      status?: boolean;
    }
  ) {
    const userId = toNumberId(id);

    const current = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!current) throw new Error("Usuário não encontrado");

    if (current.email === "admin") {
      if (data.email || data.tipo || typeof data.status === "boolean") {
        throw new Error("Não é permitido alterar o admin padrão");
      }
    }

    if (data.email && data.email !== current.email) {
      const exists = await prisma.usuario.findUnique({ where: { email: data.email } });
      if (exists) throw new Error("E-mail já cadastrado");
    }

    const payload: any = {};
    if (typeof data.nome === "string") payload.nome = data.nome;
    if (typeof data.email === "string") payload.email = data.email;
    if (typeof data.telefone === "string" || data.telefone === null)
      payload.telefone = data.telefone;

    if (typeof data.status === "boolean") payload.status = data.status;

    if (data.tipo) {
      const tipo = String(data.tipo).toUpperCase();
      if (!["CLIENTE", "VENDEDOR", "ADMIN"].includes(tipo)) {
        throw new Error("Tipo inválido");
      }
      payload.tipo = tipo as UserType;
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: payload,
    });

    const { senha: _, ...safeUser } = updated;
    return { user: safeUser };
  }

  async updateUsuarioStatus(id: number, status: boolean) {
    const userId = toNumberId(id);

    const current = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!current) throw new Error("Usuário não encontrado");

    if (current.email === "admin") {
      throw new Error("Não é permitido alterar o admin padrão");
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { status },
    });

    const { senha: _, ...safeUser } = updated;
    return { user: safeUser };
  }

  async deleteUsuario(id: number) {
    const userId = toNumberId(id);

    const current = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { loja: true },
    });

    if (!current) throw new Error("Usuário não encontrado");
    if (current.email === "admin") throw new Error("Não é permitido excluir o admin padrão");

    await prisma.$transaction(async (tx) => {
      await tx.endereco.deleteMany({ where: { usuarioId: userId } });

      const pedidosCliente = await tx.pedido.findMany({
        where: { clienteId: userId },
        select: { id: true },
      });

      for (const p of pedidosCliente) {
        await tx.pagamento.deleteMany({ where: { pedidoId: p.id } });
        await tx.itemPedido.deleteMany({ where: { pedidoId: p.id } });
        await tx.pedido.delete({ where: { id: p.id } });
      }

      if (current.loja) {
        const lojaId = current.loja.id;

        const pedidosLojaCount = await tx.pedido.count({ where: { lojaId } });

        if (pedidosLojaCount > 0) {
          await tx.loja.update({
            where: { id: lojaId },
            data: { status: LojaStatus.INATIVA },
          });
        } else {
          await tx.produto.deleteMany({ where: { lojaId } });
          await tx.loja.delete({ where: { id: lojaId } });
        }
      }

      await tx.usuario.delete({ where: { id: userId } });
    });

    return { ok: true };
  }

  async listLojas() {
    const lojas = await prisma.loja.findMany({
      orderBy: { id: "asc" },
      include: {
        dono: {
          select: { id: true, nome: true, email: true, tipo: true, status: true },
        },
      },
    });

    return { lojas };
  }

  async getLojaById(id: number) {
    const lojaId = toNumberId(id);

    const loja = await prisma.loja.findUnique({
      where: { id: lojaId },
      include: {
        dono: {
          select: { id: true, nome: true, email: true, tipo: true, status: true },
        },
        produtos: true,
      },
    });

    if (!loja) throw new Error("Loja não encontrada");
    return { loja };
  }

  async updateLoja(
    id: number,
    data: {
      nome?: string;
      descricao?: string | null;
      endereco?: string | null;
      telefone?: string | null;
      imagemLogo?: string | null;
      status?: LojaStatus | string;
      horarioAbertura?: string | Date | null;
      horarioFechamento?: string | Date | null;
    }
  ) {
    const lojaId = toNumberId(id);

    const current = await prisma.loja.findUnique({ where: { id: lojaId } });
    if (!current) throw new Error("Loja não encontrada");

    const payload: any = {};

    if (typeof data.nome === "string") payload.nome = data.nome;
    if (typeof data.descricao === "string" || data.descricao === null)
      payload.descricao = data.descricao;
    if (typeof data.endereco === "string" || data.endereco === null)
      payload.endereco = data.endereco;
    if (typeof data.telefone === "string" || data.telefone === null)
      payload.telefone = data.telefone;
    if (typeof data.imagemLogo === "string" || data.imagemLogo === null)
      payload.imagemLogo = data.imagemLogo;

    if (data.status) {
      const st = String(data.status).toUpperCase();
      if (!["PENDENTE", "APROVADA", "INATIVA"].includes(st)) throw new Error("Status inválido");
      payload.status = st as LojaStatus;
    }

    if (data.horarioAbertura === null) payload.horarioAbertura = null;
    if (data.horarioFechamento === null) payload.horarioFechamento = null;

    if (typeof data.horarioAbertura === "string") payload.horarioAbertura = new Date(data.horarioAbertura);
    if (typeof data.horarioFechamento === "string") payload.horarioFechamento = new Date(data.horarioFechamento);

    if (data.horarioAbertura instanceof Date) payload.horarioAbertura = data.horarioAbertura;
    if (data.horarioFechamento instanceof Date) payload.horarioFechamento = data.horarioFechamento;

    const updated = await prisma.loja.update({
      where: { id: lojaId },
      data: payload,
    });

    return { loja: updated };
  }

  async deleteLoja(id: number) {
    const lojaId = toNumberId(id);

    const current = await prisma.loja.findUnique({ where: { id: lojaId } });
    if (!current) throw new Error("Loja não encontrada");

    const pedidosCount = await prisma.pedido.count({ where: { lojaId } });
    if (pedidosCount > 0) {
      const updated = await prisma.loja.update({
        where: { id: lojaId },
        data: { status: LojaStatus.INATIVA },
      });
      return { ok: true, softDeleted: true, loja: updated };
    }

    await prisma.$transaction(async (tx) => {
      await tx.produto.deleteMany({ where: { lojaId } });
      await tx.loja.delete({ where: { id: lojaId } });
    });

    return { ok: true };
  }

  async listProdutos() {
    const produtos = await prisma.produto.findMany({
      orderBy: { id: "asc" },
      include: {
        loja: { select: { id: true, nome: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });

    return { produtos };
  }

  async getProdutoById(id: number) {
    const produtoId = toNumberId(id);

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
      include: {
        loja: { select: { id: true, nome: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });

    if (!produto) throw new Error("Produto não encontrado");
    return { produto };
  }

  async updateProduto(
    id: number,
    data: {
      nome?: string;
      preco?: number | string;
      descricao?: string | null;
      imagemUrl?: string | null;
      estoque?: number;
      ativo?: boolean;
      idCategoria?: number | null;
      lojaId?: number;
    }
  ) {
    const produtoId = toNumberId(id);

    const current = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!current) throw new Error("Produto não encontrado");

    const payload: any = {};
    if (typeof data.nome === "string") payload.nome = data.nome;

    const dec = toDecimal(data.preco);
    if (dec) payload.preco = dec;

    if (typeof data.descricao === "string" || data.descricao === null)
      payload.descricao = data.descricao;
    if (typeof data.imagemUrl === "string" || data.imagemUrl === null)
      payload.imagemUrl = data.imagemUrl;

    if (typeof data.estoque === "number") payload.estoque = data.estoque;
    if (typeof data.ativo === "boolean") payload.ativo = data.ativo;

    if (data.idCategoria === null) payload.idCategoria = null;
    if (typeof data.idCategoria === "number") payload.idCategoria = data.idCategoria;

    if (typeof data.lojaId === "number") payload.lojaId = data.lojaId;

    const updated = await prisma.produto.update({
      where: { id: produtoId },
      data: payload,
    });

    return { produto: updated };
  }

  async deleteProduto(id: number) {
    const produtoId = toNumberId(id);

    const current = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!current) throw new Error("Produto não encontrado");

    const itensCount = await prisma.itemPedido.count({ where: { produtoId } });
    if (itensCount > 0) {
      const updated = await prisma.produto.update({
        where: { id: produtoId },
        data: { ativo: false },
      });
      return { ok: true, softDeleted: true, produto: updated };
    }

    await prisma.produto.delete({ where: { id: produtoId } });
    return { ok: true };
  }
}

export default new AdminService();
