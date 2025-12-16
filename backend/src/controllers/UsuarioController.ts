import { Request, Response } from "express";
import UsuarioService from "../services/UsuarioService";

class UsuarioController {
  async me(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      if (!usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });

      const me = await UsuarioService.getMe(Number(usuario.id));
      return res.json(me);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: error.message || "Erro ao buscar perfil." });
    }
  }

  async updateMe(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      if (!usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });

      const { email, telefone } = req.body || {};

      const updated = await UsuarioService.updateMe(Number(usuario.id), {
        email,
        telefone,
      });

      return res.json(updated);
    } catch (error: any) {
      console.error(error);

      if (String(error?.message || "").toLowerCase().includes("unique")) {
        return res.status(400).json({ message: "Este e-mail já está em uso." });
      }

      return res.status(400).json({ message: error.message || "Erro ao atualizar dados." });
    }
  }

  async updatePassword(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      if (!usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });

      const { senhaAtual, senhaNova } = req.body || {};
      await UsuarioService.updatePassword(
        Number(usuario.id),
        String(senhaAtual || ""),
        String(senhaNova || "")
      );

      return res.json({ ok: true });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ message: error.message || "Erro ao atualizar senha." });
    }
  }

  async deleteMe(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      if (!usuario?.id) return res.status(401).json({ message: "Usuário não autenticado." });

      await UsuarioService.deleteMe(Number(usuario.id));
      return res.status(204).send();
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ message: error.message || "Erro ao excluir conta." });
    }
  }
}

export default new UsuarioController();
