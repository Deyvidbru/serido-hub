import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type JwtPayload = {
  id: number;
  email: string;
  tipo: string;
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    (req as any).user = decoded;
    (req as any).usuario = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = ((req as any).user || (req as any).usuario) as JwtPayload | undefined;

  if (!user || !user.id) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  if (user.tipo !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso restrito ao administrador' });
  }

  return next();
}
