"use client";

import { CalendarDays, FastForward, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatWeekdayDate } from "@/lib/dates";
import { api } from "@/trpc/react";

export function DemoAdminView() {
  const [state] = api.demo.state.useSuspenseQuery();
  const refresh = useRefreshAll();
  const [confirming, setConfirming] = useState(false);
  const advance = api.demo.advanceDay.useMutation({
    onSuccess: async () => {
      toast.success("Dia avançado", { description: "Lembretes e avisos do novo dia já saíram." });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const reset = api.demo.reset.useMutation({
    onSuccess: async () => {
      setConfirming(false);
      toast.success("Dados iniciais restaurados");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex max-w-[720px] flex-col gap-10">
      <section aria-labelledby="data-virtual" className="flex flex-col gap-3">
        <SectionHeader id="data-virtual" title="Data virtual" />
        <p className="flex items-center gap-2 text-read font-medium">
          <CalendarDays aria-hidden className="size-5" strokeWidth={1.75} />
          {formatWeekdayDate(state.today)}
        </p>
        <p className="text-ink-soft">
          {state.offsetDays === 0
            ? "Igual à data de hoje."
            : `${state.offsetDays} ${state.offsetDays === 1 ? "dia" : "dias"} à frente da data de hoje.`}{" "}
          Avançar um dia roda a virada do dia: véspera do início, lembretes de pendência e liberações por data.
        </p>
        <Button variant="outline" className="w-fit" disabled={advance.isPending} onClick={() => advance.mutate()}>
          <FastForward aria-hidden strokeWidth={1.75} />
          {advance.isPending ? "Avançando…" : "Avançar 1 dia"}
        </Button>
      </section>
      <section aria-labelledby="restaurar" className="flex flex-col gap-3">
        <SectionHeader id="restaurar" title="Restaurar dados iniciais" />
        <p className="text-ink-soft">
          Volta tudo ao início da demo: casos, e-mails, aceites, conteúdo e configurações do Admin, e a data virtual volta para
          hoje. As conversas guardadas no navegador continuam até a página ser fechada.
        </p>
        <Button variant="outline" className="w-fit" onClick={() => setConfirming(true)}>
          <RotateCcw aria-hidden strokeWidth={1.75} />
          Restaurar dados iniciais
        </Button>
      </section>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar os dados iniciais?</DialogTitle>
            <DialogDescription>Tudo o que foi feito nesta sessão da demo será apagado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button disabled={reset.isPending} onClick={() => reset.mutate()}>
              {reset.isPending ? "Restaurando…" : "Restaurar dados iniciais"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
