import prisma from '../prisma';

interface CriarEnderecoDTO {
  apelido: string;
  destinatario: string;
  telefone?: string | null;
  cep?: string | null;
  logradouro: string;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  complemento?: string | null;
  principal?: boolean;
}

type AtualizarEnderecoDTO = Omit<CriarEnderecoDTO, 'principal'> & {
  principal?: boolean;
};

class EnderecoService {
  async listByUser(usuarioId: number) {
    return prisma.endereco.findMany({
      where: { usuarioId },
      orderBy: [{ principal: 'desc' }, { id: 'desc' }],
    });
  }

  async create(usuarioId: number, data: CriarEnderecoDTO) {
    if (data.principal) {
      await prisma.endereco.updateMany({
        where: { usuarioId },
        data: { principal: false },
      });
    }

    const endereco = await prisma.endereco.create({
      data: {
        usuarioId,
        apelido: data.apelido,
        destinatario: data.destinatario,
        telefone: data.telefone ?? null,
        cep: data.cep ?? null,
        logradouro: data.logradouro,
        numero: data.numero ?? null,
        bairro: data.bairro ?? null,
        cidade: data.cidade ?? null,
        uf: data.uf ?? null,
        complemento: data.complemento ?? null,
        principal: data.principal ?? false,
      },
    });

    const total = await prisma.endereco.count({ where: { usuarioId } });
    if (total === 1 && !endereco.principal) {
      return prisma.endereco.update({
        where: { id: endereco.id },
        data: { principal: true },
      });
    }

    return endereco;
  }

  async update(usuarioId: number, enderecoId: number, data: AtualizarEnderecoDTO) {
    const endereco = await prisma.endereco.findUnique({
      where: { id: enderecoId },
    });

    if (!endereco || endereco.usuarioId !== usuarioId) {
      throw new Error('Endereço não encontrado');
    }

    if (data.principal === true) {
      await prisma.endereco.updateMany({
        where: { usuarioId },
        data: { principal: false },
      });
    }

    const atualizado = await prisma.endereco.update({
      where: { id: enderecoId },
      data: {
        apelido: data.apelido,
        destinatario: data.destinatario,
        telefone: data.telefone ?? null,
        cep: data.cep ?? null,
        logradouro: data.logradouro,
        numero: data.numero ?? null,
        bairro: data.bairro ?? null,
        cidade: data.cidade ?? null,
        uf: data.uf ?? null,
        complemento: data.complemento ?? null,
        ...(data.principal === true ? { principal: true } : {}),
        ...(data.principal === false ? { principal: false } : {}),
      },
    });

    await this.ensureHasPrincipal(usuarioId);

    return atualizado;
  }

  async remove(usuarioId: number, enderecoId: number) {
    const endereco = await prisma.endereco.findUnique({
      where: { id: enderecoId },
    });

    if (!endereco || endereco.usuarioId !== usuarioId) {
      throw new Error('Endereço não encontrado');
    }

    const eraPrincipal = endereco.principal;

    await prisma.endereco.delete({
      where: { id: enderecoId },
    });

    if (eraPrincipal) {
      await this.ensureHasPrincipal(usuarioId);
    }

    return true;
  }

  async setPrincipal(usuarioId: number, enderecoId: number) {
    const endereco = await prisma.endereco.findUnique({
      where: { id: enderecoId },
    });

    if (!endereco || endereco.usuarioId !== usuarioId) {
      throw new Error('Endereço não encontrado');
    }

    await prisma.endereco.updateMany({
      where: { usuarioId },
      data: { principal: false },
    });

    const atualizado = await prisma.endereco.update({
      where: { id: enderecoId },
      data: { principal: true },
    });

    return atualizado;
  }

  private async ensureHasPrincipal(usuarioId: number) {
    const total = await prisma.endereco.count({ where: { usuarioId } });
    if (total === 0) return;

    const principal = await prisma.endereco.findFirst({
      where: { usuarioId, principal: true },
    });

    if (principal) return;

    const maisRecente = await prisma.endereco.findFirst({
      where: { usuarioId },
      orderBy: { id: 'desc' },
    });

    if (maisRecente) {
      await prisma.endereco.update({
        where: { id: maisRecente.id },
        data: { principal: true },
      });
    }
  }
}

export default new EnderecoService();
