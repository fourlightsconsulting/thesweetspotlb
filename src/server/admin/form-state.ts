import "server-only";
import type { FormState } from "@/components/admin/form";

// What admin server actions return to their forms.

export const saved = (): FormState => ({ status: "saved", at: Date.now() });

export const failed = (message = "That didn’t save. Try again."): FormState => ({
  status: "error",
  message,
});
