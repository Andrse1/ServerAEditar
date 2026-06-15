import { useState } from "react";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import ThermometerGauge from "@/components/ThermometerGauge";
import GaugeIndicator from "@/components/GaugeIndicator";
import HistoricTable from "@/components/HistoricTable";
import CsvExport from "@/components/CsvExport";
import { useChartColors } from "@/hooks/useChartColors";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { MapPin } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const COLORS = {
  t1: "#f59e0b", h1: "#10b981", c1: "#ef4444",
  t2: "#f97316", h2: "#06b6d4", c2: "#dc2626",
};

function ZoneCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--bd)] bg-[var(--su)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4" style={{ color }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MiniValue({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--bd2)] bg-[var(--s2)] p-3 text-center">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--mu)]">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value.toFixed(1)}<span className="ml-1 text-sm font-normal text-[var(--mu)]">{unit}</span>
      </p>
    </div>
  );
}

export default function Co2() {
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const { baseOptions } = useChartColors();

  // ── ZONA 1 queries ──
  const z1 = {
    temp: trpc.co2.zona1TemperaturaUltimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    hum:  trpc.co2.zona1HumedadUltimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    co2:  trpc.co2.zona1Co2Ultimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    tempHist: trpc.co2.zona1TemperaturaHistorico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    humHist:  trpc.co2.zona1HumedadHistorico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    co2Hist:  trpc.co2.zona1Co2Historico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    tempTabla: trpc.co2.zona1TemperaturaTabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
    humTabla:  trpc.co2.zona1HumedadTabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
    co2Tabla:  trpc.co2.zona1Co2Tabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
  };

  // ── ZONA 2 queries ──
  const z2 = {
    temp: trpc.co2.zona2TemperaturaUltimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    hum:  trpc.co2.zona2HumedadUltimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    co2:  trpc.co2.zona2Co2Ultimo.useQuery(undefined, { refetchInterval: pollingEnabled ? 5000 : false }),
    tempHist: trpc.co2.zona2TemperaturaHistorico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    humHist:  trpc.co2.zona2HumedadHistorico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    co2Hist:  trpc.co2.zona2Co2Historico.useQuery({ limit: 30 }, { refetchInterval: pollingEnabled ? 5000 : false }),
    tempTabla: trpc.co2.zona2TemperaturaTabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
    humTabla:  trpc.co2.zona2HumedadTabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
    co2Tabla:  trpc.co2.zona2Co2Tabla.useQuery(undefined, { refetchInterval: pollingEnabled ? 10000 : false }),
  };

  // ── Mutations ──
  const m = {
    z1t: trpc.co2.zona1TemperaturaRango.useMutation(),
    z1h: trpc.co2.zona1HumedadRango.useMutation(),
    z1c: trpc.co2.zona1Co2Rango.useMutation(),
    z2t: trpc.co2.zona2TemperaturaRango.useMutation(),
    z2h: trpc.co2.zona2HumedadRango.useMutation(),
    z2c: trpc.co2.zona2Co2Rango.useMutation(),
  };

  // ── Chart builders ──
  const toLine = (data: Array<Record<string, unknown>> | undefined, key: string, color: string, label: string, unit: string) => {
    const rev = [...(data || [])].reverse();
    return {
      labels: rev.map((d) => {
        const dt = d.fechaLectura instanceof Date ? d.fechaLectura : new Date(d.fechaLectura as string);
        return format(dt, "HH:mm", { locale: es });
      }),
      datasets: [{
        label: `${label} (${unit})`, data: rev.map((d) => Number(d[key] || 0)),
        borderColor: color, backgroundColor: color + "18", borderWidth: 2,
        pointRadius: 3, pointHoverRadius: 5, fill: true, tension: 0.3,
      }],
    };
  };

  const co2Thresholds = [
    { label: "Bueno", max: 800, color: "#22c55e", bgClass: "bg-green-500" },
    { label: "Moderado", max: 1200, color: "#f59e0b", bgClass: "bg-amber-500" },
    { label: "Alto", max: 2000, color: "#ef4444", bgClass: "bg-red-500" },
  ];

  const df = (v: unknown) => v instanceof Date ? format(v, "dd/MM/yyyy HH:mm:ss", { locale: es }) : String(v);

  const handleExport = async (variable: string, desde: string, hasta: string) => {
    const d0 = desde ? new Date(desde + "T00:00:00").toISOString() : undefined;
    const d1 = hasta ? new Date(hasta + "T23:59:59").toISOString() : undefined;
    if (variable.startsWith("z1_")) {
      const v = variable.replace("z1_", "");
      if (v === "temperatura") return m.z1t.mutateAsync({ desde: d0, hasta: d1 });
      if (v === "humedad") return m.z1h.mutateAsync({ desde: d0, hasta: d1 });
      return m.z1c.mutateAsync({ desde: d0, hasta: d1 });
    } else {
      const v = variable.replace("z2_", "");
      if (v === "temperatura") return m.z2t.mutateAsync({ desde: d0, hasta: d1 });
      if (v === "humedad") return m.z2h.mutateAsync({ desde: d0, hasta: d1 });
      return m.z2c.mutateAsync({ desde: d0, hasta: d1 });
    }
  };

  const v1 = {
    temp: Number(z1.temp.data?.[0]?.temperatura ?? 0),
    hum:  Number(z1.hum.data?.[0]?.humedad ?? 0),
    co2:  Number(z1.co2.data?.[0]?.co2Ppm ?? 0),
  };
  const v2 = {
    temp: Number(z2.temp.data?.[0]?.temperatura ?? 0),
    hum:  Number(z2.hum.data?.[0]?.humedad ?? 0),
    co2:  Number(z2.co2.data?.[0]?.co2Ppm ?? 0),
  };

  return (
    <Layout title="CO2" subtitle="Sensor de Gases — 2 Zonas">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${pollingEnabled ? "animate-pulse bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-xs uppercase tracking-wider text-[var(--mu)]">{pollingEnabled ? "Actualizacion automatica" : "Pausado"}</span>
        </div>
        <button onClick={() => setPollingEnabled(!pollingEnabled)}
          className="rounded-md border border-[var(--bd2)] bg-[var(--s2)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--mu)] transition-all hover:bg-[var(--s3)]">
          {pollingEnabled ? "Pausar" : "Reanudar"}
        </button>
      </div>

      {/* ── ZONA 1 ── */}
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--mu)]">
        <span className="h-3 w-3 rounded-full" style={{ background: COLORS.c1 }} />Zona 1
      </h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <ZoneCard title="Zona 1 — Temperatura" color={COLORS.t1}>
          <div className="flex items-center justify-center py-2">
            <ThermometerGauge value={v1.temp} min={0} max={50} unit="°C" label="Temperatura" color={COLORS.t1} />
          </div>
          <div className="h-48 mt-2">
            <Line data={toLine(z1.tempHist.data, "temperatura", COLORS.t1, "Temp", "°C")} options={baseOptions} />
          </div>
        </ZoneCard>
        <ZoneCard title="Zona 1 — Humedad" color={COLORS.h1}>
          <MiniValue label="Humedad" value={v1.hum} unit="%" color={COLORS.h1} />
          <div className="h-48 mt-2">
            <Line data={toLine(z1.humHist.data, "humedad", COLORS.h1, "Hum", "%")} options={baseOptions} />
          </div>
        </ZoneCard>
        <ZoneCard title="Zona 1 — CO2" color={COLORS.c1}>
          <div className="flex items-center justify-center py-2">
            <GaugeIndicator value={v1.co2} unit="ppm" label="CO2" min={0} max={2000} thresholds={co2Thresholds}
              scaleLabels={["0", "500", "1000", "1500", "2000+"]} />
          </div>
          <div className="h-48 mt-2">
            <Line data={toLine(z1.co2Hist.data, "co2Ppm", COLORS.c1, "CO2", "ppm")} options={baseOptions} />
          </div>
        </ZoneCard>
      </div>

      {/* ── ZONA 2 ── */}
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--mu)]">
        <span className="h-3 w-3 rounded-full" style={{ background: COLORS.c2 }} />Zona 2
      </h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <ZoneCard title="Zona 2 — Temperatura" color={COLORS.t2}>
          <div className="flex items-center justify-center py-2">
            <ThermometerGauge value={v2.temp} min={0} max={50} unit="°C" label="Temperatura" color={COLORS.t2} />
          </div>
          <div className="h-48 mt-2">
            <Line data={toLine(z2.tempHist.data, "temperatura", COLORS.t2, "Temp", "°C")} options={baseOptions} />
          </div>
        </ZoneCard>
        <ZoneCard title="Zona 2 — Humedad" color={COLORS.h2}>
          <MiniValue label="Humedad" value={v2.hum} unit="%" color={COLORS.h2} />
          <div className="h-48 mt-2">
            <Line data={toLine(z2.humHist.data, "humedad", COLORS.h2, "Hum", "%")} options={baseOptions} />
          </div>
        </ZoneCard>
        <ZoneCard title="Zona 2 — CO2" color={COLORS.c2}>
          <div className="flex items-center justify-center py-2">
            <GaugeIndicator value={v2.co2} unit="ppm" label="CO2" min={0} max={2000} thresholds={co2Thresholds}
              scaleLabels={["0", "500", "1000", "1500", "2000+"]} />
          </div>
          <div className="h-48 mt-2">
            <Line data={toLine(z2.co2Hist.data, "co2Ppm", COLORS.c2, "CO2", "ppm")} options={baseOptions} />
          </div>
        </ZoneCard>
      </div>

      {/* ── Tablas Historicas ── */}
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--mu)]">Tablas Historicas</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <HistoricTable title="Z1 Temperatura" data={(z1.tempTabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "temperatura", label: "Temp (°C)", format: (v) => Number(v).toFixed(1) }]} />
        <HistoricTable title="Z1 Humedad" data={(z1.humTabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "humedad", label: "Hum (%)", format: (v) => Number(v).toFixed(1) }]} />
        <HistoricTable title="Z1 CO2" data={(z1.co2Tabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "co2Ppm", label: "CO2 (ppm)", format: (v) => Math.round(Number(v)).toString() }]} />
        <HistoricTable title="Z2 Temperatura" data={(z2.tempTabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "temperatura", label: "Temp (°C)", format: (v) => Number(v).toFixed(1) }]} />
        <HistoricTable title="Z2 Humedad" data={(z2.humTabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "humedad", label: "Hum (%)", format: (v) => Number(v).toFixed(1) }]} />
        <HistoricTable title="Z2 CO2" data={(z2.co2Tabla.data || []) as Record<string, unknown>[]}
          columns={[{ key: "fechaLectura", label: "Fecha/Hora", format: df }, { key: "co2Ppm", label: "CO2 (ppm)", format: (v) => Math.round(Number(v)).toString() }]} />
      </div>

      <CsvExport variables={[
        { key: "z1_temperatura", label: "Z1 Temperatura" }, { key: "z1_humedad", label: "Z1 Humedad" }, { key: "z1_co2", label: "Z1 CO2" },
        { key: "z2_temperatura", label: "Z2 Temperatura" }, { key: "z2_humedad", label: "Z2 Humedad" }, { key: "z2_co2", label: "Z2 CO2" },
      ]} onExport={handleExport} />
    </Layout>
  );
}
