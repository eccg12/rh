import { company } from "@/config/company";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col justify-center gap-3 px-4">
      <h1 className="text-page font-semibold">{company.productName}</h1>
      <p className="text-ink-soft">Fundação pronta. Os módulos chegam nos próximos checkpoints.</p>
    </main>
  );
}
