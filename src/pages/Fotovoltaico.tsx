import { useNavigate } from "react-router";
import Layout from "@/components/Layout";
import { ExternalLink } from "lucide-react";

// Enlace de redireccion configurable — cambiar aqui cuando la pagina este lista
const LINK_REDIRECCION: string = "#";

export default function Fotovoltaico() {
  const navigate = useNavigate();

  const handleClick = () => {
    if (LINK_REDIRECCION === "#") return;
    if (LINK_REDIRECCION.startsWith("http")) {
      window.location.href = LINK_REDIRECCION;
    } else {
      navigate(LINK_REDIRECCION);
    }
  };

  return (
    <Layout title="Sistema Fotovoltaico" subtitle="Monitorizacion solar">
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 140px)" }}>
        <button
          onClick={handleClick}
          disabled={LINK_REDIRECCION === "#"}
          className="group flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-[var(--bd2)] bg-[var(--su)] px-20 py-16 shadow-[var(--shadow)] transition-all duration-300 hover:border-[var(--gr2)]/50 hover:bg-[var(--gr-lt)] hover:shadow-[var(--shadow-md)] disabled:cursor-default disabled:opacity-60"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--bd2)] bg-[var(--s2)] transition-all group-hover:border-[var(--gr2)]/40 group-hover:bg-[var(--gr-lt)]">
            <ExternalLink className="h-8 w-8 text-[var(--mu)] transition-colors group-hover:text-[var(--gr2)]" />
          </div>
          <span className="text-xl font-bold uppercase tracking-[0.2em] text-[var(--tx)] transition-colors group-hover:text-[var(--gr2)]">
            Redirigir
          </span>
          {LINK_REDIRECCION !== "#" && (
            <span className="max-w-xs truncate text-[10px] text-[var(--mu)]">{LINK_REDIRECCION}</span>
          )}
        </button>
      </div>
    </Layout>
  );
}
