import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import HistoricTable from "@/components/HistoricTable";
import CsvExport from "@/components/CsvExport";
import { useChartColors } from "@/hooks/useChartColors";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Droplets, Power, Settings2 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Colores de cada variable (humedad = cian, temperatura = ambar)
const COLOR_HUM = "rgba(6, 182, 212, 1)";
const COLOR_HUM_BG = "rgba(6, 182, 212, 0.1)";
const COLOR_TEMP = "rgba(245, 158, 11, 1)";
const COLOR_TEMP_BG = "rgba(245, 158, 11, 0.1)";

export default function Nebulizador() {
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const { baseOptions } = useChartColors();

  // ── Humedad ──
  const humHistorico = trpc.nebulizador.humedadHistorico.useQuery({ limit: 50 }, {
    refetchInterval: pollingEnabled ? 5000 : false,
  });
  const humTabla = trpc.nebulizador.humedadTabla.useQuery(undefined, {
    refetchInterval: pollingEnabled ? 10000 : false,
  });
  const humUltimo = trpc.nebulizador.humedadUltimo.useQuery(undefined, {
    refetchInterval: pollingEnabled ? 5000 : false,
  });

  // ── Temperatura ──
  const tempHistorico = trpc.nebulizador.temperaturaHistorico.useQuery({ limit: 50 }, {
    refetchInterval: pollingEnabled ? 5000 : false,
  });
  const tempTabla = trpc.nebulizador.temperaturaTabla.useQuery(undefined, {
    refetchInterval: pollingEnabled ? 10000 : false,
  });
  const tempUltimo = trpc.nebulizador.temperaturaUltimo.useQuery(undefined, {
    refetchInterval: pollingEnabled ? 5000 : false,
  });

  // ── Control manual de aspersores ──
  const control = trpc.nebulizador.controlEstado.useQuery(undefined, {
    refetchInterval: pollingEnabled ? 5000 : false,
  });
  const controlSet = trpc.nebulizador.controlSet.useMutation();

  // ── Rangos para exportar CSV ──
  const humRango = trpc.nebulizador.humedadRango.useMutation();
  const tempRango = trpc.nebulizador.temperaturaRango.useMutation();

  // ── Datos de las graficas ──
  const humChartData = useMemo(() => {
    const data = [...(humHistorico.data || [])].reverse();
    return {
      labels: data.map((d) => {
        const date = d.fechaLectura instanceof Date ? d.fechaLectura : new Date(d.fechaLectura);
        return format(date, "HH:mm", { locale: es });
      }),
      datasets: [{
        label: "Humedad (%)",
        data: data.map((d) => d.humedad),
        borderColor: COLOR_HUM,
        backgroundColor: COLOR_HUM_BG,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: COLOR_HUM,
        fill: true,
        tension: 0.4,
      }],
    };
  }, [humHistorico.data]);

  const tempChartData = useMemo(() => {
    const data = [...(tempHistorico.data || [])].reverse();
    return {
      labels: data.map((d) => {
        const date = d.fechaLectura instanceof Date ? d.fechaLectura : new Date(d.fechaLectura);
        return format(date, "HH:mm", { locale: es });
      }),
      datasets: [{
        label: "Temperatura (°C)",
        data: data.map((d) => d.temperatura),
        borderColor: COLOR_TEMP,
        backgroundColor: COLOR_TEMP_BG,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: COLOR_TEMP,
        fill: true,
        tension: 0.4,
      }],
    };
  }, [tempHistorico.data]);

  const humChartOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      title: { display: true, text: "Historico de Humedad - Sistema de Nebulizacion" },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, ticks: { ...baseOptions.scales.x.ticks, maxTicksLimit: 12 } },
      y: { ...baseOptions.scales.y, min: 0, max: 100 },
    },
  };

  const tempChartOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      title: { display: true, text: "Historico de Temperatura - Sistema de Nebulizacion" },
    },
    scales: {
      ...baseOptions.scales,
      x: { ...baseOptions.scales.x, ticks: { ...baseOptions.scales.x.ticks, maxTicksLimit: 12 } },
      y: { ...baseOptions.scales.y, min: 0, max: 50 },
    },
  };

  const humedadActual = humUltimo.data?.[0]?.humedad ?? 0;
  const temperaturaActual = tempUltimo.data?.[0]?.temperatura ?? 0;

  // ── Estado de control ──
  const modo = control.data?.modo ?? "auto";
  const aspersoresOn = (control.data?.aspersores ?? 0) === 1;
  const esManual = modo === "manual";
  const cambiando = controlSet.isPending;

  const aplicarControl = async (nuevoModo: "auto" | "manual", aspersores: 0 | 1) => {
    await controlSet.mutateAsync({ modo: nuevoModo, aspersores });
    control.refetch();
  };

  // ── Exportacion CSV ──
  const handleExport = async (variable: string, desde: string, hasta: string) => {
    const desdeISO = desde ? new Date(desde + "T00:00:00").toISOString() : undefined;
    const hastaISO = hasta ? new Date(hasta + "T23:59:59").toISOString() : undefined;
    if (variable === "temperatura") {
      return await tempRango.mutateAsync({ desde: desdeISO, hasta: hastaISO });
    }
    if (variable === "humedad") {
      return await humRango.mutateAsync({ desde: desdeISO, hasta: hastaISO });
    }
    // "todas": combina humedad y temperatura en una sola descarga
    const [hum, temp] = await Promise.all([
      humRango.mutateAsync({ desde: desdeISO, hasta: hastaISO }),
      tempRango.mutateAsync({ desde: desdeISO, hasta: hastaISO }),
    ]);
    const filas = [
      ...hum.map((d) => ({ variable: "humedad", valor: d.humedad, fechaLectura: d.fechaLectura })),
      ...temp.map((d) => ({ variable: "temperatura", valor: d.temperatura, fechaLectura: d.fechaLectura })),
    ];
    return filas as Record<string, unknown>[];
  };

  const dateFormat = (v: unknown) =>
    v instanceof Date ? format(v, "dd/MM/yyyy HH:mm:ss", { locale: es }) : String(v);

  return (
    <Layout title="Nebulizador" subtitle="Control de humedad">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            <span className="text-xs uppercase tracking-wider text-[var(--mu)]">Actualizacion automatica</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1">
            <span className="text-xs font-bold text-cyan-500">Humedad actual: {humedadActual.toFixed(1)}%</span>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1">
            <span className="text-xs font-bold text-amber-500">Temperatura actual: {temperaturaActual.toFixed(1)}°C</span>
          </div>
        </div>
        <button onClick={() => setPollingEnabled(!pollingEnabled)}
          className="rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--mu)] transition-all hover:bg-[var(--s3)]">
          {pollingEnabled ? "Pausar" : "Reanudar"}
        </button>
      </div>

      {/* ── Control manual de aspersores ── */}
      <div className="mb-6 rounded-xl border border-[var(--bd)] bg-[var(--su)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-cyan-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--tx)]">Control manual de aspersores</h3>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {/* Estado actual */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              esManual
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${esManual ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
              Modo {esManual ? "Manual" : "Automatico"}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              aspersoresOn
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-500"
                : "border-[var(--bd)] bg-[var(--s2)] text-[var(--mu)]"
            }`}>
              <Droplets className="h-3 w-3" />
              Aspersores {aspersoresOn ? "encendidos" : "apagados"}
            </span>
          </div>

          {/* Selector de modo */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--mu)]">Modo</span>
            <div className="flex overflow-hidden rounded-lg border border-[var(--bd2)]">
              <button
                onClick={() => aplicarControl("auto", 0)}
                disabled={cambiando}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                  !esManual ? "bg-emerald-500 text-white" : "bg-[var(--s2)] text-[var(--mu)] hover:bg-[var(--s3)]"
                }`}
              >
                Automatico
              </button>
              <button
                onClick={() => aplicarControl("manual", aspersoresOn ? 1 : 0)}
                disabled={cambiando}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                  esManual ? "bg-amber-500 text-white" : "bg-[var(--s2)] text-[var(--mu)] hover:bg-[var(--s3)]"
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Encender / Apagar (solo en modo manual) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => aplicarControl("manual", 1)}
              disabled={cambiando || (esManual && aspersoresOn)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-500 transition-all hover:bg-cyan-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Power className="h-3.5 w-3.5" /> Activar
            </button>
            <button
              onClick={() => aplicarControl("manual", 0)}
              disabled={cambiando || (esManual && !aspersoresOn)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Power className="h-3.5 w-3.5" /> Desactivar
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-[var(--mu)]">
          {esManual
            ? "En modo manual los aspersores respetan el estado seleccionado e ignoran la regulacion automatica por humedad."
            : "En modo automatico el nodo regula los aspersores segun la humedad medida. Cambia a manual para forzar el encendido o apagado."}
        </p>
      </div>

      {/* ── Grafica de Humedad ── */}
      <div className="mb-6 rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
        <div className="h-96">
          {humHistorico.data && humHistorico.data.length > 0 ? (
            <Line data={humChartData} options={humChartOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--mu)]">Sin datos de humedad</div>
          )}
        </div>
      </div>

      {/* ── Grafica de Temperatura ── */}
      <div className="mb-6 rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
        <div className="h-96">
          {tempHistorico.data && tempHistorico.data.length > 0 ? (
            <Line data={tempChartData} options={tempChartOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--mu)]">Sin datos de temperatura</div>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--mu)]">Tablas Historicas (ultimos 50 registros)</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <HistoricTable
          title="Humedad - Nebulizador"
          data={(humTabla.data || []) as Record<string, unknown>[]}
          loading={humTabla.isLoading}
          columns={[
            { key: "fechaLectura", label: "Fecha/Hora", format: dateFormat },
            { key: "humedad", label: "Humedad (%)", format: (v) => Number(v).toFixed(1) },
          ]}
        />
        <HistoricTable
          title="Temperatura - Nebulizador"
          data={(tempTabla.data || []) as Record<string, unknown>[]}
          loading={tempTabla.isLoading}
          columns={[
            { key: "fechaLectura", label: "Fecha/Hora", format: dateFormat },
            { key: "temperatura", label: "Temperatura (°C)", format: (v) => Number(v).toFixed(1) },
          ]}
        />
      </div>

      <CsvExport
        variables={[
          { key: "humedad", label: "Humedad" },
          { key: "temperatura", label: "Temperatura" },
        ]}
        onExport={handleExport}
      />
    </Layout>
  );
}
