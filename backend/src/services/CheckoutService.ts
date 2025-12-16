import prisma from '../prisma';
import { Prisma, FormaPagamento, StatusPagamento, StatusPedido } from '@prisma/client';

type CheckoutItemInput = {
  produtoId: number;
  quantidade: number;
};

type CheckoutPixInput = {
  clienteId: number;
  enderecoId: number;
  itens: CheckoutItemInput[];
};

export class CheckoutService {
  static async finalizarPix(input: CheckoutPixInput) {
    const { clienteId, enderecoId, itens } = input;

    if (!clienteId || Number.isNaN(Number(clienteId))) {
      const err: any = new Error('Cliente inválido.');
      err.code = 'BAD_REQUEST';
      throw err;
    }

    if (!enderecoId || Number.isNaN(Number(enderecoId))) {
      const err: any = new Error('Endereço inválido.');
      err.code = 'BAD_REQUEST';
      throw err;
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      const err: any = new Error('Itens do pedido são obrigatórios.');
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const itensNorm = itens.map((i) => ({
      produtoId: Number(i.produtoId),
      quantidade: Number(i.quantidade),
    }));

    for (const i of itensNorm) {
      if (Number.isNaN(i.produtoId) || i.produtoId <= 0) {
        const err: any = new Error('produtoId inválido.');
        err.code = 'BAD_REQUEST';
        throw err;
      }
      if (Number.isNaN(i.quantidade) || i.quantidade <= 0) {
        const err: any = new Error('quantidade inválida.');
        err.code = 'BAD_REQUEST';
        throw err;
      }
    }

    const endereco = await prisma.endereco.findFirst({
      where: { id: enderecoId, usuarioId: clienteId },
    });

    if (!endereco) {
      const err: any = new Error('Endereço não encontrado para este cliente.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const enderecoEntrega = CheckoutService.formatEnderecoEntrega(endereco);

    const produtoIds = Array.from(new Set(itensNorm.map((i) => i.produtoId)));

    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtoIds }, ativo: true },
      select: {
        id: true,
        nome: true,
        preco: true,
        estoque: true,
        lojaId: true,
      },
    });

    const mapProduto = new Map(produtos.map((p) => [p.id, p]));
    for (const i of itensNorm) {
      if (!mapProduto.has(i.produtoId)) {
        const err: any = new Error(`Produto ${i.produtoId} não encontrado ou inativo.`);
        err.code = 'BAD_REQUEST';
        throw err;
      }
    }

    const itensPorLoja = new Map<number, { produtoId: number; quantidade: number }[]>();
    for (const item of itensNorm) {
      const p = mapProduto.get(item.produtoId)!;
      const lojaId = p.lojaId;

      if (!itensPorLoja.has(lojaId)) itensPorLoja.set(lojaId, []);
      itensPorLoja.get(lojaId)!.push({ produtoId: item.produtoId, quantidade: item.quantidade });
    }

    const pedidosCriados = await prisma.$transaction(async (tx) => {
      const qtdPorProduto = new Map<number, number>();
      for (const item of itensNorm) {
        qtdPorProduto.set(item.produtoId, (qtdPorProduto.get(item.produtoId) || 0) + item.quantidade);
      }

      for (const [produtoId, qtdTotal] of qtdPorProduto.entries()) {
        const p = mapProduto.get(produtoId)!;
        if (p.estoque < qtdTotal) {
          const err: any = new Error(
            `Estoque insuficiente para o produto ${produtoId}. Disponível: ${p.estoque}, solicitado: ${qtdTotal}`
          );
          err.code = 'OUT_OF_STOCK';
          throw err;
        }
      }

      const pedidos: any[] = [];

      for (const [lojaId, itensDaLoja] of itensPorLoja.entries()) {
        let valorTotal = new Prisma.Decimal(0);

        const itensCreate = itensDaLoja.map((i) => {
          const p = mapProduto.get(i.produtoId)!;
          const precoUnitario = new Prisma.Decimal(p.preco);
          const subtotal = precoUnitario.mul(new Prisma.Decimal(i.quantidade));
          valorTotal = valorTotal.add(subtotal);

          return {
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoUnitario,
            subtotal,
          };
        });

        const pedido = await tx.pedido.create({
          data: {
            clienteId,
            lojaId,
            status: StatusPedido.PENDENTE,
            formaPagamento: FormaPagamento.PIX,
            enderecoEntrega,
            valorTotal,
            itens: {
              create: itensCreate,
            },
            pagamento: {
              create: {
                metodo: FormaPagamento.PIX,
                status: StatusPagamento.PAGO,
                valor: valorTotal,
                dataPago: new Date(),
              },
            },
          },
          include: {
            loja: true,
            pagamento: true,
            itens: { include: { produto: true } },
          },
        });

        pedidos.push(pedido);
      }

      for (const [produtoId, qtdTotal] of qtdPorProduto.entries()) {
        await tx.produto.update({
          where: { id: produtoId },
          data: {
            estoque: { decrement: qtdTotal },
          },
        });
      }

      return pedidos;
    });

    return pedidosCriados;
  }

  private static formatEnderecoEntrega(e: any) {
    const parts: string[] = [];

    const linha1 = [
      e.logradouro,
      e.numero ? `, ${e.numero}` : '',
      e.bairro ? ` - ${e.bairro}` : '',
    ].join('');

    parts.push(linha1.trim());

    const linha2 = [
      e.cidade ? e.cidade : '',
      e.uf ? `/${e.uf}` : '',
      e.cep ? ` - CEP: ${e.cep}` : '',
    ].join('');

    if (linha2.trim()) parts.push(linha2.trim());
    if (e.complemento) parts.push(String(e.complemento).trim());

    const extra: string[] = [];
    if (e.destinatario) extra.push(`Destinatário: ${e.destinatario}`);
    if (e.telefone) extra.push(`Tel: ${e.telefone}`);
    if (extra.length) parts.push(extra.join(' | '));

    return parts.join(' — ');
  }
}
