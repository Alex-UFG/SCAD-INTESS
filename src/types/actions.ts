/**Estado que devuelven las server actions consumidas con useActionState */
export type ActionState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};
