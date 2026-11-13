import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-rojo px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-blanco p-6 shadow-xl sm:p-8">
        <Image src="/brand/logo-principal.png" alt="Albertito Calzados" width={651} height={308} priority className="mx-auto h-auto w-[140px]" />
        <h1 className="mt-6 text-center text-xl font-bold uppercase">Panel del local</h1>
        <p className="mt-1 text-center text-sm text-gris-tinta">Ingresá con tu mail y contraseña.</p>
        <LoginForm />
      </div>
    </main>
  );
}
