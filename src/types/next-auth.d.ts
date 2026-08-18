import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol?: number;
  }

  interface Session {
    user: {
      id: string;
      rol: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: number;
  }
}
