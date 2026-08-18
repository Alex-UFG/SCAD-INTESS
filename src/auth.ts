import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  password_hash: string;
  id_rol: number;
  estado: "Activo" | "Inactivo" | "Bloqueado";
  nombre: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? "scad-intess-dev-secret-change-me",
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const [rows] = await db.query<UsuarioRow[]>(
          `SELECT u.id_usuario, u.email, u.password_hash, u.id_rol, u.estado,
                  p.valor AS nombre
             FROM usuario u
             LEFT JOIN usuario_preferencia p
               ON p.id_usuario = u.id_usuario AND p.clave = 'nombre'
            WHERE u.email = ?
            LIMIT 1`,
          [email]
        );
        const user = rows[0];
        if (!user || user.estado !== "Activo") return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        await db.query(
          "UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?",
          [user.id_usuario]
        );

        return {
          id: String(user.id_usuario),
          email: user.email,
          name: user.nombre,
          rol: user.id_rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as number;
      }
      return session;
    },
  },
});
