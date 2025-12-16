import prisma from "../prisma";
import bcrypt from "bcryptjs";
import { UserType } from "@prisma/client";

type UpdateMeDTO = {
  email?: string;
  telefone?: string | null;
};

class UsuarioService {
  async getMe(usuarioId: number) {
    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
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

    if (!user) throw new Error("Usuário não encontrado");
    return user;
  }

  async updateMe(usuarioId: number, data: UpdateMeDTO) {
    const payload: any = {};

    if (data.email !== undefined) payload.email = String(data.email).trim();
    if (data.telefone !== undefined)
      payload.telefone = data.telefone ? String(data.telefone).trim() : null;

    if (payload.email !== undefined) {
      if (!payload.email || !payload.email.includes("@")) {
        throw new Error("E-mail inválido");
      }
    }

    const updated = await prisma.usuario.update({
      where: { id: usuarioId },
      data: payload,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        status: true,
      },
    });

    return updated;
  }

  async updatePassword(usuarioId: number, senhaAtual: string, senhaNova: string) {
    if (!senhaAtual || !senhaNova)
      throw new Error("Informe senhaAtual e senhaNova");
    if (String(senhaNova).length < 6)
      throw new Error("A nova senha deve ter pelo menos 6 caracteres");

    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, senha: true },
    });

    if (!user) throw new Error("Usuário não encontrado");

    const ok = await bcrypt.compare(String(senhaAtual), user.senha);
    if (!ok) throw new Error("Senha atual incorreta");

    const hashed = await bcrypt.hash(String(senhaNova), 10);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senha: hashed },
    });

    return true;
  }

  async deleteMe(usuarioId: number) {
    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        tipo: true,
        loja: { select: { id: true } },
      },
    });

    if (!user) throw new Error("Usuário não encontrado");

    await prisma.$transaction(async (tx) => {
      await tx.endereco.deleteMany({ where: { usuarioId } });

      if (user.tipo === UserType.CLIENTE) {
        const pedidosCliente = await tx.pedido.findMany({
          where: { clienteId: usuarioId },
          select: { id: true },
        });
        const pedidoIds = pedidosCliente.map((p) => p.id);

        if (pedidoIds.length) {
          await tx.itemPedido.deleteMany({
            where: { pedidoId: { in: pedidoIds } },
          });
          await tx.pagamento.deleteMany({
            where: { pedidoId: { in: pedidoIds } },
          });
          await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
        }
      }

      if (user.tipo === UserType.VENDEDOR && user.loja?.id) {
        const lojaId = user.loja.id;

        const pedidosLoja = await tx.pedido.findMany({
          where: { lojaId },
          select: { id: true },
        });
        const pedidoIdsLoja = pedidosLoja.map((p) => p.id);

        if (pedidoIdsLoja.length) {
          await tx.itemPedido.deleteMany({
            where: { pedidoId: { in: pedidoIdsLoja } },
          });
          await tx.pagamento.deleteMany({
            where: { pedidoId: { in: pedidoIdsLoja } },
          });
          await tx.pedido.deleteMany({ where: { id: { in: pedidoIdsLoja } } });
        }

        await tx.produto.deleteMany({ where: { lojaId } });

        await tx.loja.delete({ where: { id: lojaId } });
      }

      await tx.usuario.delete({ where: { id: usuarioId } });
    });

    return true;
  }
}

export default new UsuarioService();
