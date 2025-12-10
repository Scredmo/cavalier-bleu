// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard"); // ou "/planning" / "/presence" si tu veux une autre page d'accueil
  return null;
}