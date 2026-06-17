import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Layout from "@/components/Layout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useChartColors } from "@/hooks/useChartColors";
import {
  RotateCcw, ChevronRight, Trash2, Pencil, Download, X, Eye, EyeOff,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ── Constants from html.h ──
const WL = [415, 445, 480, 515, 555, 590, 630, 680];
const CN = ["415nm", "445nm", "480nm", "515nm", "555nm", "590nm", "630nm", "680nm"];
const CC = ["#8B00FF", "#4B0082", "#0000FF", "#00BFFF", "#00AA00", "#FFD700", "#FF8C00", "#FF2200"];
const CNOM = ["Violeta", "Índigo", "Azul", "Cian", "Verde", "Amarillo", "Naranja", "Rojo"];
// Channel short names: Vi, Índ, Az, Cy, Ve, Am, Na, Ro

// ── Alert messages ──
const ALERTAS = ["Sin alertas", "", "Clear=0: obstrucción en sensor", "Clear saturado: luz excesiva"];

// ── Toast notification ──
function useToast() {
  const [toast, setToast] = useState<{ msg: string; color?: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const show = useCallback((msg: string, color?: string) => setToast({ msg, color }), []);
  return { toast, show };
}

// ── Plant data type ──
interface PlantConfig {
  nombre: string;
  dli_ch: number[];
}
interface Planta {
  nombre: string;
  configs: PlantConfig[];
}

// ── Default plants from html.h ──
const defaultPlantas: Planta[] = [
  { nombre: "Lechuga", configs: [
    { nombre: "Vegetativo", dli_ch: [0.60, 1.80, 1.80, 1.20, 0.96, 1.20, 2.64, 1.80] },
    { nombre: "Maduracion", dli_ch: [0.30, 1.00, 1.20, 0.80, 0.70, 1.00, 2.80, 2.20] },
  ]},
  { nombre: "Tomate", configs: [
    { nombre: "Plantula", dli_ch: [0.60, 2.10, 2.10, 1.35, 1.05, 1.35, 3.60, 2.85] },
    { nombre: "Vegetativo", dli_ch: [0.66, 2.64, 2.86, 1.76, 1.54, 2.20, 5.72, 4.62] },
    { nombre: "Floracion", dli_ch: [0.84, 2.80, 3.08, 1.96, 1.68, 2.80, 8.40, 6.44] },
  ]},
  { nombre: "Albahaca", configs: [
    { nombre: "Crecimiento", dli_ch: [0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34] },
    { nombre: "Produccion", dli_ch: [0.33, 1.21, 1.32, 0.88, 0.77, 1.10, 2.97, 2.42] },
  ]},
];

// ── Format ms to HH:MM:SS ──
function fmtMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Parse decimal with comma support ──
function parseDec(s: string) {
  return parseFloat(String(s).trim().replace(",", ".")) || 0;
}

// ── Duracion de un ciclo: 24 h (igual que CICLO_MS del firmware) ──
const CICLO_MS = 86400000;

// ── Un ciclo se representa como una ventana de tiempo. Sus lecturas son las
//    filas de la base de datos dentro de [inicio, fin]. ──
interface Ciclo {
  n: string;        // nombre del ciclo
  i: boolean;       // interrumpido
  inicio: string;   // ISO (inicio del ciclo)
  fin: string;      // ISO (cierre del ciclo)
  planta: string;   // planta activa durante el ciclo
  config: string;   // configuracion activa durante el ciclo
}

// Genera el nombre del ciclo en el formato del dispositivo:
// Phyto_Ciclo_DD_MM_YYYY_HHMM
function nombreCiclo(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `Phyto_Ciclo_${p(d.getDate())}_${p(d.getMonth() + 1)}_${d.getFullYear()}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// Ciclos iniciales de ejemplo. Sus ventanas caen dentro de las ultimas horas
// para que el historial muestre lecturas reales de la base de datos.
function ciclosIniciales(): Ciclo[] {
  const ahora = Date.now();
  const iniA = new Date(ahora - 150 * 60000); // hace 2 h 30 m
  const finA = new Date(ahora - 80 * 60000);  // hace 1 h 20 m
  const iniB = new Date(ahora - 75 * 60000);  // hace 1 h 15 m
  const finB = new Date(ahora - 10 * 60000);  // hace 10 m
  return [
    { n: nombreCiclo(iniB), i: true,  inicio: iniB.toISOString(), fin: finB.toISOString(), planta: "Lechuga", config: "Vegetativo" },
    { n: nombreCiclo(iniA), i: false, inicio: iniA.toISOString(), fin: finA.toISOString(), planta: "Tomate",  config: "Floracion" },
  ];
}

// Descarga un arreglo de objetos como archivo CSV (mismo formato que el
// exportador general: BOM UTF-8 y comillas escapadas).
function descargarCSV(nombre: string, filas: Record<string, unknown>[]) {
  if (!filas || filas.length === 0) {
    alert("No hay lecturas para descargar en este ciclo.");
    return;
  }
  const headers = Object.keys(filas[0]);
  const csvRows = [
    headers.join(","),
    ...filas.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(","),
    ),
  ];
  const csv = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Formato de fecha para tablas
const fmtFecha = (v: unknown) =>
  v instanceof Date ? format(v, "dd/MM/yyyy HH:mm:ss", { locale: es }) : format(new Date(String(v)), "dd/MM/yyyy HH:mm:ss", { locale: es });

// ═══════════════════════════════════════════════════════════════
// ILUMINACION PAGE - PhytoSense-style with all 4 sub-tabs
// ═══════════════════════════════════════════════════════════════
export default function Iluminacion() {

  const [activeTab, setActiveTab] = useState<"monitor" | "espectro" | "plantas" | "historial">("monitor");
  const { toast, show } = useToast();

  // ── Real-time data polling ──
  const [polling] = useState(true);
  const dliUltimo = trpc.iluminacion.dliUltimo.useQuery(undefined, { refetchInterval: polling ? 5000 : false });
  const ppfdUltimo = trpc.iluminacion.ppfdUltimo.useQuery(undefined, { refetchInterval: polling ? 5000 : false });
  const espectroUltimo = trpc.iluminacion.espectroUltimo.useQuery(undefined, { refetchInterval: polling ? 5000 : false });
  const dliCanalesUltimo = trpc.iluminacion.dliCanalesUltimo.useQuery(undefined, { refetchInterval: polling ? 5000 : false });
  const espectroHistorico = trpc.iluminacion.espectroHistorico.useQuery({ limit: 30 }, { refetchInterval: polling ? 5000 : false });

  // ── Shared state: plantas (synced between Monitor and Plantas tabs) ──
  const [plantas, setPlantas] = useState<Planta[]>(() => {
    const saved = localStorage.getItem("phyto_plantas");
    return saved ? JSON.parse(saved) : defaultPlantas;
  });

  // ── Estado del Monitor, elevado al padre para que NO se reinicie al cambiar
  //    de pestania y para que el contador y la configuracion persistan. ──
  const monInit = useMemo(() => {
    try {
      const s = localStorage.getItem("phyto_monitor");
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return null;
  }, []);
  const [selPlant, setSelPlant] = useState<number>(monInit?.selPlant ?? 0);            // seleccion (desplegable)
  const [selConfig, setSelConfig] = useState<number>(monInit?.selConfig ?? 0);          // seleccion (desplegable)
  const [appliedPlant, setAppliedPlant] = useState<number>(monInit?.appliedPlant ?? 0); // configuracion aplicada
  const [appliedConfig, setAppliedConfig] = useState<number>(monInit?.appliedConfig ?? 0);
  const [cicloInicio, setCicloInicio] = useState<number>(monInit?.cicloInicio ?? Date.now()); // epoch ms

  // Reloj que avanza cada segundo. Vive en el padre (siempre montado), por lo
  // que el contador sigue corriendo aunque se cambie de pestania.
  const [ahora, setAhora] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Tiempo restante del ciclo (anclado a cicloInicio + 24 h).
  const remainingMs = Math.max(0, cicloInicio + CICLO_MS - ahora);

  // ── Shared state: ciclos (historial) — ventanas de tiempo ──
  const [ciclos, setCiclos] = useState<Ciclo[]>(() => {
    const saved = localStorage.getItem("phyto_ciclos_v2");
    return saved ? JSON.parse(saved) : ciclosIniciales();
  });

  // Persistencia
  useEffect(() => { localStorage.setItem("phyto_plantas", JSON.stringify(plantas)); }, [plantas]);
  useEffect(() => { localStorage.setItem("phyto_ciclos_v2", JSON.stringify(ciclos)); }, [ciclos]);
  useEffect(() => {
    localStorage.setItem("phyto_monitor", JSON.stringify({ selPlant, selConfig, appliedPlant, appliedConfig, cicloInicio }));
  }, [selPlant, selConfig, appliedPlant, appliedConfig, cicloInicio]);

  // ── Current data snapshot (usa la configuracion APLICADA) ──
  const D = useMemo(() => {
    const esp = espectroUltimo.data?.[0];
    const dl = dliUltimo.data?.[0];
    const pp = ppfdUltimo.data?.[0];
    const dlc = dliCanalesUltimo.data?.[0];
    if (!esp && !dl && !pp) return null;

    const cfg = plantas[appliedPlant]?.configs[appliedConfig];
    const ocArr = cfg?.dli_ch ?? Array(8).fill(0);
    const dliObj = ocArr.reduce((a: number, b: number) => a + b, 0);

    const r = esp ? [esp.ch0, esp.ch1, esp.ch2, esp.ch3, esp.ch4, esp.ch5, esp.ch6, esp.ch7] : Array(8).fill(0);
    const dom = domCh(r);
    const dliTotalVal = dl ? dl.dliTotal : 0;
    const dliPct = dliObj > 0 ? Math.min((dliTotalVal / dliObj) * 100, 100) : 0;
    const dliEx = dl && dl.dliBrutoTotal > dl.dliTotal ? dl.dliBrutoTotal - dl.dliTotal : 0;

    return {
      s: true, // sensing
      pl: plantas[appliedPlant]?.nombre ?? "—", // plant name (aplicada)
      cf: cfg?.nombre ?? "—", // config name (aplicada)
      fo: pp ? pp.focoEstado === 1 : false, // foco on
      dp: dliPct, // DLI percentage
      dt: dliTotalVal, // DLI accumulated
      do: dliObj, // DLI objective (de la config aplicada)
      ex: dliEx, // excess (bruto - total)
      db: dl ? dl.dliBrutoTotal : 0, // DLI bruto total
      pp: pp ? pp.ppfd : 0, // PPFD
      r, // raw counts
      pc: r.map((v: number) => v * 0.8), // simulated PPFD per channel
      dc: dlc ? [dlc.ch0, dlc.ch1, dlc.ch2, dlc.ch3, dlc.ch4, dlc.ch5, dlc.ch6, dlc.ch7] : Array(8).fill(0), // DLI per channel
      oc: ocArr, // objectives per channel (de la config aplicada)
      al: 0, // alert
      domN: dom.n, // dominant channel name
      domC: dom.c, // dominant channel color
    };
  }, [dliUltimo.data, ppfdUltimo.data, espectroUltimo.data, dliCanalesUltimo.data, plantas, appliedPlant, appliedConfig]);

  // ── Status ──
  const sensing = !!D?.s;

  // ── Tabs ──
  const tabs = [
    { id: "monitor" as const, label: "Monitor" },
    { id: "espectro" as const, label: "Espectro" },
    { id: "plantas" as const, label: "Plantas" },
    { id: "historial" as const, label: "Historial" },
  ];

  // ── Cierra el ciclo en curso y lo guarda en el historial ──
  const cerrarCicloActual = useCallback((interrumpido: boolean) => {
    const planta = plantas[appliedPlant]?.nombre ?? "—";
    const config = plantas[appliedPlant]?.configs[appliedConfig]?.nombre ?? "—";
    const inicio = new Date(cicloInicio);
    const nuevo: Ciclo = {
      n: nombreCiclo(inicio),
      i: interrumpido,
      inicio: inicio.toISOString(),
      fin: new Date().toISOString(),
      planta,
      config,
    };
    setCiclos((prev) => [nuevo, ...prev]);
    return { planta, config };
  }, [plantas, appliedPlant, appliedConfig, cicloInicio]);

  // Cierre automatico al completar las 24 h (igual que cerrarCiclo(false) del firmware)
  const cierreRef = useRef(false);
  useEffect(() => {
    if (remainingMs > 0) { cierreRef.current = false; return; }
    if (cierreRef.current) return;
    cierreRef.current = true;
    const { planta, config } = cerrarCicloActual(false);
    setCicloInicio(Date.now());
    show(`Ciclo completado — "${planta} / ${config}" guardado en historial`);
  }, [remainingMs, cerrarCicloActual, show]);

  // ── Handlers del Monitor ──
  // Aplicar: confirma la planta/config seleccionada como la activa. El objetivo
  // DLI, el progreso y el estado del foco pasan a reflejar esta configuracion.
  const handleAplicar = useCallback(() => {
    setAppliedPlant(selPlant);
    setAppliedConfig(selConfig);
    const planta = plantas[selPlant]?.nombre ?? "—";
    const config = plantas[selPlant]?.configs[selConfig]?.nombre ?? "—";
    show(`Configuracion aplicada: ${planta} / ${config}`);
  }, [selPlant, selConfig, plantas, show]);

  // Reiniciar ciclo: cierra el ciclo en curso (marcado como interrumpido), lo
  // archiva en el historial y arranca uno nuevo con el contador en 24 h.
  const handleReiniciar = useCallback(() => {
    const { planta, config } = cerrarCicloActual(true);
    setCicloInicio(Date.now());
    show(`Ciclo interrumpido — "${planta} / ${config}" guardado en historial`);
  }, [cerrarCicloActual, show]);

  // ── Green accent ──
  const G = "var(--gr)";

  return (
    <Layout title="Iluminacion" subtitle="PhytoSense — Zona 1">
      {/* ── Status bar ── */}
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${sensing ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" : "bg-red-500/10 text-red-500 border border-red-500/30"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sensing ? "animate-pulse bg-emerald-500" : "bg-red-500"}`} />
          {sensing ? "SENSANDO" : "SIN SEÑAL"}
        </span>
      </div>

      {/* ── Navigation Tabs ── */}
      <nav className="mb-5 rounded-xl border border-[var(--bd)] bg-[var(--su)]">
        <div className="mx-auto flex max-w-6xl gap-0 px-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-5 py-3 text-xs font-bold uppercase tracking-[1.5px] transition-all border-b-[2.5px] -mb-[1px] hover:text-[var(--tx)]"
              style={{
                borderColor: activeTab === t.id ? G : "transparent",
                color: activeTab === t.id ? G : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="mx-auto max-w-6xl px-5 py-5">
        {/* Alert strip */}
        <AlertStrip data={D} />

        {activeTab === "monitor" && (
          <MonitorTab
            data={D}
            plantas={plantas}
            selPlant={selPlant}
            setSelPlant={setSelPlant}
            selConfig={selConfig}
            setSelConfig={setSelConfig}
            appliedPlant={appliedPlant}
            appliedConfig={appliedConfig}
            remainingMs={remainingMs}
            onAplicar={handleAplicar}
            onReiniciar={handleReiniciar}
          />
        )}
        {activeTab === "espectro" && <EspectroTab data={D} espectroData={espectroHistorico.data} />}
        {activeTab === "plantas" && <PlantasTab plantas={plantas} setPlantas={setPlantas} toast={show} />}
        {activeTab === "historial" && <HistorialTab ciclos={ciclos} setCiclos={setCiclos} toast={show} />}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-[var(--bd2)] bg-[var(--su)] px-4 py-2 text-xs font-medium shadow-lg"
          style={{ color: toast.color || "var(--gr)" }}>
          {toast.msg}
        </div>
      )}
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERT STRIP
// ═══════════════════════════════════════════════════════════════
function AlertStrip({ data }: { data: any }) {
  const [visible, setVisible] = useState(false);
  const alertIdx = data?.al ?? 0;
  const hasAlert = alertIdx > 0;

  useEffect(() => {
    setVisible(hasAlert);
  }, [hasAlert]);

  if (!visible || alertIdx === 0) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-500">
      <span>⚠</span>
      <span className="flex-1">{ALERTAS[alertIdx]}</span>
      <button onClick={() => setVisible(false)} className="text-amber-500/50 hover:text-amber-500">✕</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MONITOR TAB
// ═══════════════════════════════════════════════════════════════
function MonitorTab({
  data,
  plantas,
  selPlant,
  setSelPlant,
  selConfig,
  setSelConfig,
  appliedPlant,
  appliedConfig,
  remainingMs,
  onAplicar,
  onReiniciar,
}: {
  data: any;
  plantas: Planta[];
  selPlant: number;
  setSelPlant: (n: number) => void;
  selConfig: number;
  setSelConfig: (n: number) => void;
  appliedPlant: number;
  appliedConfig: number;
  remainingMs: number;
  onAplicar?: () => void;
  onReiniciar?: () => void;
}) {
  const d = data;
  const focoOn = d?.fo ?? false;
  const dpct = d ? Math.min(d.dp, 100) : 0;
  const dt = d ? d.dt : 0;
  const doVal = d ? d.do : 0;
  const ex = d ? d.ex : 0;
  const db = d ? d.db : 0;
  const pp = d ? d.pp : 0;
  const r = d?.r ?? Array(8).fill(0);
  const dom = domCh(r);
  const al = d?.al ?? 0;

  // Planta seleccionada en el desplegable (configuracion pendiente de aplicar)
  const plantaSel = plantas[selPlant];
  // Planta/config APLICADA (la que rige el objetivo, el progreso y el foco)
  const currentPlant = plantas[appliedPlant];
  const currentCfg = currentPlant?.configs[appliedConfig];
  // Hay cambios sin aplicar?
  const sinAplicar = selPlant !== appliedPlant || selConfig !== appliedConfig;

  // Objetivo DLI de la configuracion seleccionada (para previsualizar antes de aplicar)
  const objetivoSel = plantaSel?.configs[selConfig]?.dli_ch.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <>
      {/* Row 1: Plant config | DLI Progress | DLI Target + PPFD */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {/* Plant Config Card */}
        <div className="rounded-xl border border-[var(--gr2)]/20 bg-gradient-to-br from-[var(--su)] to-[var(--gr-lt)] p-4">
          <div className="text-xl font-black tracking-tight text-[var(--gr)]">
            {currentPlant?.nombre ?? "—"}
          </div>
          <div className="mb-2 text-sm text-[var(--mu)]">
            {currentCfg?.nombre ?? "—"}
          </div>

          {/* Foco status */}
          <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black uppercase tracking-[2px] ${
            focoOn
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-[var(--bd)] bg-[var(--s2)] text-[var(--mu)]"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${focoOn ? "animate-pulse bg-emerald-500" : "bg-[var(--mu)]"}`} />
            {focoOn ? "ON" : "OFF"}
          </span>

          {/* Plant/Config selectors */}
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-[var(--mu)]">Planta</span>
              <select
                value={selPlant}
                onChange={(e) => { setSelPlant(Number(e.target.value)); setSelConfig(0); }}
                className="flex-1 rounded-md border border-[var(--gr2)]/20 bg-[var(--s2)] px-2 py-1.5 text-sm text-[var(--tx)] outline-none"
              >
                {plantas.map((p, i) => <option key={i} value={i}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-[var(--mu)]">Config</span>
              <select
                value={selConfig}
                onChange={(e) => setSelConfig(Number(e.target.value))}
                className="flex-1 rounded-md border border-[var(--gr2)]/20 bg-[var(--s2)] px-2 py-1.5 text-sm text-[var(--tx)] outline-none"
              >
                {plantaSel?.configs.map((c, i) => (
                  <option key={i} value={i}>{c.nombre} ({c.dli_ch.reduce((a, b) => a + b, 0).toFixed(2)})</option>
                ))}
              </select>
            </div>
            {/* Aplicar: centrado y largo */}
            <button
              onClick={() => onAplicar?.()}
              className="mx-auto mt-2 w-3/4 rounded-lg border border-[var(--gr2)]/30 bg-[var(--gr-lt)] py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--gr)] transition-all hover:bg-[var(--gr2)]/20 active:scale-[0.98]"
            >
              Aplicar
            </button>
            {sinAplicar && (
              <p className="text-center text-[11px] font-medium text-amber-500">
                Cambios sin aplicar (objetivo {objetivoSel.toFixed(2)})
              </p>
            )}
          </div>

          {/* Remaining time */}
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--mu)]">Tiempo restante</span>
            <span className="text-xl font-black tracking-tight text-[var(--gr)]">{fmtMs(remainingMs)}</span>
          </div>

          {/* Reiniciar ciclo */}
          <button
            onClick={() => onReiniciar?.()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--gr2)]/20 bg-[var(--s2)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--gr)] transition-all hover:bg-[var(--gr-lt)]"
          >
            <RotateCcw className="h-3 w-3" /> Reiniciar ciclo
          </button>
        </div>

        {/* DLI Progress */}
        <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
          <div className="mb-1 text-xs uppercase tracking-[2px] text-[var(--mu)]">Progreso DLI</div>
          <div className="font-bold tracking-tight text-5xl font-black leading-none text-emerald-500">{dpct.toFixed(2)}%</div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--trk)]">
            <div className={`h-full rounded-full transition-all duration-700 ${dpct >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-emerald-500 to-emerald-600"}`}
              style={{ width: `${Math.min(dpct, 100)}%` }} />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-[var(--mu)]">DLI acumulado: <span className="font-bold text-[var(--tx)]">{dt.toFixed(10)}</span> mol·m⁻²·día⁻¹</p>
            {ex > 1e-12 && <p className="font-bold text-red-500">↑ Excedente: {ex.toFixed(10)} mol·m⁻²·día⁻¹</p>}
          </div>
          <hr className="my-2.5 border-[var(--bd)]" />
          <div className="text-xs uppercase tracking-wider text-[var(--mu)]">DLI total</div>
          <div className="font-bold tracking-tight text-2xl font-black text-emerald-400">{db.toFixed(10)}</div>
          <div className="text-xs text-[var(--mu)]">mol·m⁻²·día⁻¹</div>
        </div>

        {/* DLI Objective + PPFD */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
            <div className="mb-1 text-xs uppercase tracking-[2px] text-[var(--mu)]">DLI objetivo</div>
            <div className="font-bold tracking-tight text-3xl font-black text-[var(--gr)]">{doVal === 0 ? "—" : doVal.toFixed(10).replace(/\.?0+$/, "")}</div>
            <div className="text-xs text-[var(--mu)]">mol·m⁻²·día⁻¹</div>
          </div>
          <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
            <div className="mb-1 text-xs uppercase tracking-[2px] text-[var(--mu)]">PPFD</div>
            <div className="font-bold tracking-tight text-3xl font-black text-emerald-500">{pp.toFixed(4)}</div>
            <div className="text-sm text-[var(--mu)]">µmol·m⁻²·s⁻¹</div>
          </div>
        </div>
      </div>

      {/* Row 2: Alerts | Spectrum mini bars */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Alerts */}
        <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
          <div className="mb-2 text-xs uppercase tracking-[2px] text-[var(--mu)]">Alertas</div>
          <div className={`text-xs ${al > 0 ? "font-bold text-amber-500" : "text-[var(--mu)]"}`}>
            {ALERTAS[al] || "Sin alertas"}
          </div>
        </div>

        {/* Mini Spectrum Bars */}
        <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
          <div className="mb-2 text-xs uppercase tracking-[2px] text-[var(--mu)]">Espectro por cuentas</div>
          <MiniSpectrumBars values={r} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--mu)]">Canal dominante</span>
            <span className="text-sm font-black" style={{ color: dom.c }}>{dom.n}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Mini Spectrum Bars ──
function MiniSpectrumBars({ values }: { values: number[] }) {
  const mx = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 pt-4" style={{ height: 60 }}>
      {values.map((v, i) => {
        const h = Math.max((v / mx) * 44, 2);
        const label = v > 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end relative" style={{ height: "100%" }}>
            <span className="absolute -top-3 text-[10px] font-bold text-[var(--mu)]">{v > 0 ? label : ""}</span>
            <div className="w-full rounded-t-sm transition-all duration-400" style={{ height: h, background: CC[i], opacity: v === 0 ? 0.2 : 1, minHeight: 2 }} />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ESPECTRO TAB
// ═══════════════════════════════════════════════════════════════
function EspectroTab({ data }: { data: any; espectroData?: any }) {
  const { baseOptions } = useChartColors();
  const r = data?.r ?? Array(8).fill(0);
  const pc = data?.pc ?? Array(8).fill(0);
  const dc = data?.dc ?? Array(8).fill(0);
  const oc = data?.oc ?? Array(8).fill(0);

  const barsChart = useMemo(() => ({
    labels: CN,
    datasets: [{
      label: "Cuentas",
      data: r,
      backgroundColor: CC.map(c => c + "88"),
      borderColor: CC,
      borderWidth: 1,
      borderRadius: 3,
    }],
  }), [r]);

  const curveChart = useMemo(() => {
    const labels: string[] = [];
    const dataPoints: number[] = [];
    for (let i = 0; i < WL.length; i++) {
      labels.push(CN[i]);
      dataPoints.push(pc[i] || 0);
    }
    return {
      labels,
      datasets: [{
        label: "µmol·m⁻²·s⁻¹",
        data: dataPoints,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.08)",
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: CC,
        pointBorderColor: "#444",
        pointBorderWidth: 1,
        fill: true,
        tension: 0.4,
      }],
    };
  }, [pc]);

  const barOpts = {
    ...baseOptions,
    plugins: { ...baseOptions.plugins, legend: { display: false }, title: { display: true, text: "Intensidad por canal" } },
  };

  const curveOpts = {
    ...baseOptions,
    plugins: { ...baseOptions.plugins, title: { display: true, text: "Curva fotosintética" } },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
          <div className="h-72">
            <Bar data={barsChart} options={barOpts} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
          <div className="h-72">
            <Line data={curveChart} options={curveOpts} />
          </div>
        </div>
      </div>

      {/* Right column: channel detail table */}
      <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4 lg:self-start">
        <div className="mb-3 text-xs uppercase tracking-[2px] text-[var(--mu)]">Detalle por canal</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--bd)]">
              <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-[var(--mu)]">Canal</th>
              <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-[var(--mu)]">Cuentas</th>
              <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-[var(--mu)]">PPFD</th>
              <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-[var(--mu)]">DLI</th>
              <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-[var(--mu)]">Objetivo</th>
            </tr>
          </thead>
          <tbody>
            {WL.map((_wl, i) => (
              <tr key={i} className="border-b border-[var(--bd)]/50 hover:bg-[var(--s2)]">
                <td className="px-2 py-2 font-mono">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: CC[i] }} />
                  {CN[i]}
                </td>
                <td className="px-2 py-2 font-mono">{(r[i] || 0).toFixed(1)}</td>
                <td className="px-2 py-2 font-mono">{(pc[i] || 0).toFixed(5)}</td>
                <td className="px-2 py-2 font-mono">{(dc[i] || 0).toFixed(8)}</td>
                <td className="px-2 py-2 font-mono" style={{ color: "var(--mu)" }}>{(oc[i] || 0) > 0 ? (oc[i]).toFixed(6) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PLANTAS TAB
// ═══════════════════════════════════════════════════════════════
function PlantasTab({
  plantas,
  setPlantas,
  toast,
}: {
  plantas: Planta[];
  setPlantas: React.Dispatch<React.SetStateAction<Planta[]>>;
  toast: (msg: string, color?: string) => void;
}) {
  // Plantas vienen por props del padre, que ya maneja localStorage
  const [modalOpen, setModalOpen] = useState(false);
  const [editPi, setEditPi] = useState(-1);
  const [editCi, setEditCi] = useState(-1);
  const [nomInput, setNomInput] = useState("");
  const [cfgInput, setCfgInput] = useState("");
  const [chInputs, setChInputs] = useState<string[]>(Array(8).fill("0"));

  const totalDLI = useMemo(() => chInputs.reduce((s, v) => s + parseDec(v), 0), [chInputs]);

  const openModal = (pi: number, ci: number) => {
    setEditPi(pi);
    setEditCi(ci);
    if (pi === -1) {
      setNomInput("");
      setCfgInput("");
      setChInputs(Array(8).fill("0"));
    } else if (ci === -1) {
      setNomInput(plantas[pi].nombre);
      setCfgInput("");
      setChInputs(Array(8).fill("0"));
    } else {
      setNomInput(plantas[pi].nombre);
      setCfgInput(plantas[pi].configs[ci].nombre);
      setChInputs(plantas[pi].configs[ci].dli_ch.map(String));
    }
    setModalOpen(true);
  };

  const savePlant = () => {
    const nom = nomInput.trim();
    const cfn = cfgInput.trim();
    const dch = chInputs.map(parseDec);
    if (!nom || !cfn) { toast("⚠ Completa campos", "var(--re)"); return; }

    setPlantas(prev => {
      const next = [...prev];
      if (editPi === -1) {
        next.push({ nombre: nom, configs: [{ nombre: cfn, dli_ch: dch }] });
      } else {
        next[editPi] = { ...next[editPi], nombre: nom };
        if (editCi === -1) {
          next[editPi].configs.push({ nombre: cfn, dli_ch: dch });
        } else {
          next[editPi].configs[editCi] = { nombre: cfn, dli_ch: dch };
        }
      }
      return next;
    });
    setModalOpen(false);
    toast("✓ Guardado");
  };

  const deletePlant = (pi: number) => {
    if (!confirm(`¿Eliminar "${plantas[pi].nombre}"?`)) return;
    setPlantas(prev => prev.filter((_, i) => i !== pi));
    toast("Eliminada", "var(--re)");
  };

  const deleteConfig = (pi: number, ci: number) => {
    if (!confirm(`¿Eliminar "${plantas[pi].configs[ci].nombre}"?`)) return;
    setPlantas(prev => {
      const next = [...prev];
      next[pi] = { ...next[pi], configs: next[pi].configs.filter((_, i) => i !== ci) };
      return next;
    });
    toast("Config eliminada");
  };

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {plantas.map((p, pi) => (
          <div key={pi} className="w-[260px] shrink-0 rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
            <div className="font-bold tracking-tight text-xl font-black text-emerald-500">{p.nombre}</div>
            <div className="mb-2 text-xs uppercase tracking-wider text-[var(--mu)]">Configuraciones</div>
            <div className="flex flex-col gap-1">
              {p.configs.map((c, ci) => (
                <div key={ci} className="flex items-center justify-between rounded-md bg-[var(--s3)] border border-[var(--bd)] px-3 py-2 text-sm uppercase text-emerald-600">
                  <span className="font-bold">{c.nombre}</span>
                  <span className="mr-2 text-xs text-[var(--mu)]">{c.dli_ch.reduce((a, b) => a + b, 0).toFixed(2)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(pi, ci)} className="rounded border border-[var(--bd2)] bg-[var(--su)] px-2 py-0.5 text-xs text-[var(--mu)] hover:text-[var(--tx)]">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteConfig(pi, ci)} className="rounded border border-[var(--bd2)] bg-[var(--su)] px-2 py-0.5 text-xs text-[var(--mu)] hover:border-red-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => openModal(pi, -1)} className="flex-1 rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500 hover:bg-[var(--s3)]">
                + Config
              </button>
              <button onClick={() => deletePlant(pi)} className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/20">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Add new plant button */}
        <button onClick={() => openModal(-1, -1)}
          className="flex h-[160px] w-[260px] items-center justify-center rounded-xl border-2 border-dashed border-[var(--bd2)] bg-transparent text-sm font-bold uppercase tracking-wider text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5">
          + Nueva planta
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--bd2)] bg-[var(--su)] p-6">
            <button onClick={() => setModalOpen(false)} className="absolute right-3 top-3 rounded border border-[var(--bd)] bg-[var(--s2)] px-2 py-1 text-xs text-[var(--mu)]">
              <X className="h-3 w-3" />
            </button>
            <div className="mb-4 font-bold tracking-tight text-xl font-black text-emerald-500">
              {editPi === -1 ? "Nueva planta" : editCi === -1 ? "Nueva config" : "Editar config"}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mu)]">Nombre planta</label>
                <input value={nomInput} onChange={e => setNomInput(e.target.value)}
                  disabled={editPi >= 0 && editCi >= 0}
                  className="w-full rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--tx)] outline-none disabled:opacity-50"
                  placeholder="Ej: Cannabis" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mu)]">Nombre config</label>
                <input value={cfgInput} onChange={e => setCfgInput(e.target.value)}
                  className="w-full rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-2 text-sm text-[var(--tx)] outline-none"
                  placeholder="Ej: Floración" />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mu)]">DLI por canal (mol·m⁻²·día⁻¹)</label>
                <p className="mb-2 text-xs text-[var(--mu)]">Acepta punto <b>o</b> coma · Canal en 0 = sin objetivo (su luz irá a excedente)</p>
                <div className="grid grid-cols-4 gap-2">
                  {CN.map((nm, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <label className="text-xs font-medium" style={{ color: CC[i] }}>{nm}</label>
                      <input value={chInputs[i]} onChange={e => {
                        const next = [...chInputs]; next[i] = e.target.value; setChInputs(next);
                      }}
                        className="rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-2 py-1 text-xs text-[var(--tx)] outline-none"
                        inputMode="decimal" autoComplete="off" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-md bg-[var(--s3)] px-3 py-2 text-xs text-[var(--mu)]">
                  Total = <strong className="text-emerald-500">{totalDLI.toFixed(10).replace(/\.?0+$/, "")}</strong> mol·m⁻²·día⁻¹
                </div>
              </div>

              <button onClick={savePlant}
                className="mt-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white hover:bg-emerald-600">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HISTORIAL TAB
// ═══════════════════════════════════════════════════════════════
function HistorialTab({
  ciclos,
  setCiclos,
  toast,
}: {
  ciclos: Ciclo[];
  setCiclos: React.Dispatch<React.SetStateAction<Ciclo[]>>;
  toast: (msg: string, color?: string) => void;
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [aplDesde, setAplDesde] = useState("");
  const [aplHasta, setAplHasta] = useState("");
  const [soloInter, setSoloInter] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const keyOf = (c: Ciclo) => `${c.n}|${c.inicio}`;
  const toggleExpand = (k: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const desdeMs = aplDesde ? new Date(aplDesde + "T00:00:00").getTime() : null;
  const hastaMs = aplHasta ? new Date(aplHasta + "T23:59:59").getTime() : null;
  const filtered = ciclos.filter(c => {
    if (soloInter && !c.i) return false;
    const ini = new Date(c.inicio).getTime();
    const fin = new Date(c.fin).getTime();
    if (desdeMs != null && fin < desdeMs) return false;
    if (hastaMs != null && ini > hastaMs) return false;
    return true;
  });

  const borrarCiclo = (c: Ciclo) => {
    if (!confirm(`¿Borrar ${c.n}?`)) return;
    setCiclos(prev => prev.filter(x => keyOf(x) !== keyOf(c)));
    toast("🗑 Ciclo borrado", "var(--re)");
  };

  const fmtCorta = (iso: string) => format(new Date(iso), "dd/MM HH:mm", { locale: es });

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-[var(--mu)]">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="w-36 rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-2 text-xs text-[var(--tx)] outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-[var(--mu)]">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="w-36 rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-2 text-xs text-[var(--tx)] outline-none" />
        </div>
        <button onClick={() => { setAplDesde(desde); setAplHasta(hasta); }}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white hover:bg-emerald-600">
          Filtrar
        </button>
        <button onClick={() => { setDesde(""); setHasta(""); setAplDesde(""); setAplHasta(""); }}
          className="rounded-lg border border-[var(--bd2)] bg-[var(--s2)] px-3 py-2 text-sm font-bold uppercase tracking-wider text-[var(--mu)] hover:bg-[var(--s3)]">
          Limpiar
        </button>
        <button onClick={() => setRefreshKey(k => k + 1)}
          className="ml-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white hover:bg-emerald-600">
          ↻ Actualizar
        </button>
        <button onClick={() => setSoloInter(!soloInter)}
          className={`rounded-lg border px-3 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
            soloInter ? "border-red-400/30 bg-red-500/10 text-red-500" : "border-[var(--bd2)] bg-[var(--s2)] text-[var(--mu)]"
          }`}>
          Solo interrumpidos
        </button>
        <span className="ml-auto text-xs uppercase tracking-wider text-[var(--mu)]">{filtered.length} ciclo{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cycle list */}
      <div className="flex flex-col gap-2.5">
        {filtered.map((ciclo) => {
          const k = keyOf(ciclo);
          const abierto = expanded.has(k);
          return (
            <div key={k} className="overflow-hidden rounded-xl border border-[var(--bd)] bg-[var(--su)]">
              <div className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[var(--s2)]" onClick={() => toggleExpand(k)}>
                <div className="flex-1">
                  <div className="text-xs font-bold">{ciclo.n}</div>
                  <div className="text-[11px] text-[var(--mu)]">{ciclo.planta} / {ciclo.config} · {fmtCorta(ciclo.inicio)} → {fmtCorta(ciclo.fin)}</div>
                </div>
                {ciclo.i
                  ? <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500 border border-red-500/20">interrumpido</span>
                  : <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-500 border border-emerald-500/20">completado</span>}
                <button onClick={(e) => { e.stopPropagation(); borrarCiclo(ciclo); }}
                  className="rounded border border-red-400/20 bg-red-500/5 px-2 py-0.5 text-xs text-red-500 hover:bg-red-500/10">
                  <Trash2 className="h-3 w-3" />
                </button>
                <ChevronRight className={`h-4 w-4 text-[var(--mu)] transition-transform duration-200 ${abierto ? "rotate-90" : ""}`} />
              </div>
              {abierto && <CicloDetalle key={`${k}-${refreshKey}`} ciclo={ciclo} />}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-8 text-center text-sm text-[var(--mu)]">Sin ciclos en ese rango</div>}
      </div>
    </>
  );
}

// ── Tabla compacta y desplazable para previsualizar lecturas ──
function TablaLecturas({ filas }: { filas: Record<string, unknown>[] }) {
  const headers = Object.keys(filas[0]);
  return (
    <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-[var(--bd)]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--s2)]">
          <tr>
            {headers.map(h => (
              <th key={h} className="whitespace-nowrap px-2 py-1.5 text-left font-bold uppercase tracking-wider text-[var(--mu)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-[var(--bd)]/50 hover:bg-[var(--s2)]">
              {headers.map(h => (
                <td key={h} className="whitespace-nowrap px-2 py-1 font-mono">{String(f[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Un conjunto de lecturas de un ciclo (ver tabla / descargar CSV) ──
function Dataset({ icon, titulo, filas, loading, nombreArchivo }: {
  icon: string;
  titulo: string;
  filas: Record<string, unknown>[];
  loading: boolean;
  nombreArchivo: string;
}) {
  const [ver, setVer] = useState(false);
  const vacio = !loading && filas.length === 0;
  return (
    <div className="border-b border-[var(--bd)]/50 py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-xs font-medium">{titulo}</span>
        <span className="mr-1 text-xs text-[var(--mu)]">{loading ? "…" : `${filas.length} lecturas`}</span>
        <button onClick={() => setVer(v => !v)} disabled={loading || vacio}
          className="inline-flex items-center gap-1 rounded border border-[var(--bd2)] bg-[var(--s2)] px-2 py-0.5 text-xs text-[var(--mu)] transition-all hover:text-[var(--tx)] disabled:cursor-not-allowed disabled:opacity-40">
          {ver ? <><EyeOff className="h-3 w-3" /> Ocultar</> : <><Eye className="h-3 w-3" /> Ver</>}
        </button>
        <button onClick={() => descargarCSV(nombreArchivo, filas)} disabled={loading || vacio}
          className="inline-flex items-center gap-1 rounded border border-[var(--bd2)] bg-emerald-500/5 px-2 py-0.5 text-xs text-emerald-600 transition-all hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40">
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      {ver && filas.length > 0 && <TablaLecturas filas={filas} />}
    </div>
  );
}

// ── Detalle de un ciclo: lee las lecturas de la BD dentro de su ventana ──
function CicloDetalle({ ciclo }: { ciclo: Ciclo }) {
  const transf = trpc.iluminacion.lecturasTransf.useQuery({ desde: ciclo.inicio, hasta: ciclo.fin });
  const raw = trpc.iluminacion.lecturasRaw.useQuery({ desde: ciclo.inicio, hasta: ciclo.fin });

  const transfFilas = useMemo(() => (transf.data ?? []).map((d: any) => ({
    "Fecha/Hora": fmtFecha(d.fechaLectura),
    "PPFD (umol/m2/s)": Number(d.ppfd).toFixed(4),
    "Foco": d.focoEstado === 1 ? "ON" : "OFF",
    "DLI total (mol/m2/dia)": d.dliTotal != null ? Number(d.dliTotal).toFixed(10) : "",
    "DLI bruto (mol/m2/dia)": d.dliBrutoTotal != null ? Number(d.dliBrutoTotal).toFixed(10) : "",
  })), [transf.data]);

  const rawFilas = useMemo(() => (raw.data ?? []).map((d: any) => ({
    "Fecha/Hora": fmtFecha(d.fechaLectura),
    [CN[0]]: d.ch0, [CN[1]]: d.ch1, [CN[2]]: d.ch2, [CN[3]]: d.ch3,
    [CN[4]]: d.ch4, [CN[5]]: d.ch5, [CN[6]]: d.ch6, [CN[7]]: d.ch7,
  })), [raw.data]);

  const inicio = new Date(ciclo.inicio);
  const fin = new Date(ciclo.fin);
  const durMs = Math.max(0, fin.getTime() - inicio.getTime());

  const cargando = transf.isLoading || raw.isLoading;
  const sinLecturas = !cargando && transfFilas.length === 0 && rawFilas.length === 0;

  return (
    <div className="border-t border-[var(--bd)] px-4 pb-3 pt-2">
      {/* Resumen del ciclo */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mu)]">
        <span>Planta: <b className="text-[var(--tx)]">{ciclo.planta}</b></span>
        <span>Config: <b className="text-[var(--tx)]">{ciclo.config}</b></span>
        <span>{fmtFecha(inicio)} → {fmtFecha(fin)}</span>
        <span>Duracion: <b className="text-[var(--tx)]">{fmtMs(durMs)}</b></span>
      </div>

      {cargando ? (
        <div className="py-3 text-xs text-[var(--mu)]">Cargando lecturas…</div>
      ) : sinLecturas ? (
        <div className="py-3 text-xs text-[var(--mu)]">Sin lecturas registradas en este ciclo.</div>
      ) : (
        <>
          <Dataset icon="📊" titulo="Lecturas transformadas (PPFD / foco / DLI)" filas={transfFilas} loading={transf.isLoading} nombreArchivo={`${ciclo.n}_transf.csv`} />
          <Dataset icon="🎚" titulo="Lecturas crudas (cuentas del espectro por canal)" filas={rawFilas} loading={raw.isLoading} nombreArchivo={`${ciclo.n}_raw.csv`} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function domCh(v: number[]) {
  if (!v || !v.length) return { n: "—", c: "var(--gr)" };
  const mx = Math.max(...v);
  if (mx === 0) return { n: "—", c: "var(--gr)" };
  const i = v.indexOf(mx);
  return { n: CNOM[i], c: CC[i] };
}
