import prisma from '../prisma';
import { StatusPedido } from '@prisma/client';

function mapFrontStatusToEnum(status: string): StatusPedido {
  const s = String(status || '').trim().toUpperCase();

  switch (s) {
    case 'EM_PREPARO':
      return StatusPedido.PREPARO;
    case 'SAIU_PARA_ENTREGA':
      return StatusPedido.A_CAMINHO;
    case 'PENDENTE':
      return StatusPedido.PENDENTE;
    case 'PREPARO':
      return StatusPedido.PREPARO;
    case 'A_CAMINHO':
      return StatusPedido.A_CAMINHO;
    case 'ENTREGUE':
      return StatusPedido.ENTREGUE;
    case 'CANCELADO':
      return StatusPedido.CANCELADO;
    default:
      return s as StatusPedido;
  }
}

function userTypeToUpper(userType: any) {
  return String(userType || '').trim().toUpperCase();
}

const pedidoInclude = {
  loja: true,
  pagamento: true,
  cliente: {
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      tipo: true,
      status: true,
      dataCriacao: true,
    },
  },
  itens: {
    include: {
      produto: {
        include: {
          loja: true,
        },
      },
    },
  },
} as const;

export class PedidoService {
  static async listarPedidosPorCliente(clienteId: number) {
    return prisma.pedido.findMany({
      where: { clienteId },
      include: pedidoInclude,
      orderBy: { dataCriacao: 'desc' },
    });
  }

  static async listarPedidosPorVendedor(vendedorId: number) {
    return prisma.pedido.findMany({
      where: {
        loja: { usuarioId: vendedorId },
      },
      include: pedidoInclude,
      orderBy: { dataCriacao: 'desc' },
    });
  }

  static async buscarPorIdParaUsuario(params: {
    pedidoId: number;
    usuarioId: number;
    userType?: any;
  }) {
    const { pedidoId, usuarioId, userType } = params;
    const tipo = userTypeToUpper(userType);

    if (tipo === 'ADMIN') {
      return prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: pedidoInclude,
      });
    }

    if (tipo === 'VENDEDOR') {
      return prisma.pedido.findFirst({
        where: {
          id: pedidoId,
          loja: { usuarioId },
        },
        include: pedidoInclude,
      });
    }

    return prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        clienteId: usuarioId,
      },
      include: pedidoInclude,
    });
  }

  static async atualizarStatus(params: {
    pedidoId: number;
    vendedorId: number;
    status: string;
  }) {
    const { pedidoId, vendedorId, status } = params;
    const statusEnum = mapFrontStatusToEnum(status);

    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        loja: { usuarioId: vendedorId },
      },
      select: { id: true, status: true },
    });

    if (!pedido) {
      const err: any = new Error('Pedido não encontrado.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    return prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: statusEnum },
      include: pedidoInclude,
    });
  }

  static async cancelarPedido(params: {
    pedidoId: number;
    usuarioId: number;
    userType?: any;
  }) {
    const { pedidoId, usuarioId, userType } = params;
    const tipo = userTypeToUpper(userType);

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        status: true,
        clienteId: true,
        loja: { select: { usuarioId: true } },
      },
    });

    if (!pedido) {
      const err: any = new Error('Pedido não encontrado.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (pedido.status === StatusPedido.ENTREGUE) {
      const err: any = new Error('Pedidos entregues não podem ser cancelados.');
      err.code = 'NOT_ALLOWED';
      throw err;
    }

    if (tipo === 'CLIENTE' && pedido.clienteId !== usuarioId) {
      const err: any = new Error('Você não pode cancelar este pedido.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (tipo === 'VENDEDOR' && pedido.loja?.usuarioId !== usuarioId) {
      const err: any = new Error('Você não pode cancelar este pedido.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    return prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: StatusPedido.CANCELADO },
      include: pedidoInclude,
    });
  }
}
