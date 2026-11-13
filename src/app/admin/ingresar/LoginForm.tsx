"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputCls, SubmitButton } from "@/components/admin/ui";
import { loginAction, type ActionState } from "../actions";

export function LoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, null);
  // Controlado para que el mail no se borre si la contraseña está mal
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">
          Mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco disabled:opacity-60">Ingresar</SubmitButton>
    </form>
  );
}
