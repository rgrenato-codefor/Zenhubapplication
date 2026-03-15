import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronDown, X } from "../shared/icons";

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "custom";

export interface DateRange {
  preset: DatePreset;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  primaryColor?: string;
}

const TODAY = (() => {
  const d = new Date();
  return d.toISOString().split("T")[0];
})();

function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function buildRange(preset: DatePreset, customStart = "", customEnd = ""): DateRange {
  const today = TODAY;
  switch (preset) {
    case "today":
      return { preset, start: today, end: today, label: "Hoje" };
    case "yesterday": {
      const y = addDays(today, -1);
      return { preset, start: y, end: y, label: "Ontem" };
    }
    case "7d": {
      const s = addDays(today, -6);
      return { preset, start: s, end: today, label: "Últimos 7 dias" };
    }
    case "30d": {
      const s = addDays(today, -29);
      return { preset, start: s, end: today, label: "Últimos 30 dias" };
    }
    case "custom": {
      const label =
        customStart && customEnd
          ? `${fmtDisplay(customStart)} – ${fmtDisplay(customEnd)}`
          : "Personalizado";
      return { preset, start: customStart, end: customEnd, label };
    }
  }
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today",     label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7d",        label: "7 Dias" },
  { id: "30d",       label: "30 Dias" },
  { id: "custom",    label: "Personalizado" },
];

export default function DateRangePicker({ value, onChange, primaryColor = "#0D9488" }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [tmpStart, setTmpStart] = useState(value.preset === "custom" ? value.start : "");
  const [tmpEnd,   setTmpEnd]   = useState(value.preset === "custom" ? value.end   : "");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePreset = (id: DatePreset) => {
    if (id === "custom") {
      setShowCustom((v) => !v);
      return;
    }
    setShowCustom(false);
    onChange(buildRange(id));
  };

  const applyCustom = () => {
    if (!tmpStart || !tmpEnd) return;
    const start = tmpStart <= tmpEnd ? tmpStart : tmpEnd;
    const end   = tmpStart <= tmpEnd ? tmpEnd   : tmpStart;
    setShowCustom(false);
    onChange(buildRange("custom", start, end));
  };

  return (
    <div className="relative flex items-center gap-1.5 flex-wrap" ref={popoverRef}>
      {/* Preset pills */}
      {PRESETS.map((p) => {
        const active = value.preset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all"
            style={
              active
                ? { background: primaryColor, borderColor: primaryColor, color: "#fff", fontWeight: 600 }
                : { background: "#fff", borderColor: "#E5E7EB", color: "#6B7280" }
            }
          >
            {p.id === "custom" && <CalendarDays className="w-3.5 h-3.5" />}
            {p.label}
            {p.id === "custom" && active && (
              <span className="ml-0.5 text-xs opacity-80 max-w-[120px] truncate">
                {value.label !== "Personalizado" ? value.label : ""}
              </span>
            )}
            {p.id === "custom" && <ChevronDown className="w-3 h-3 opacity-60" />}
          </button>
        );
      })}

      {/* Custom range popover */}
      {showCustom && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Período personalizado</p>
            <button onClick={() => setShowCustom(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data inicial</label>
              <input
                type="date"
                value={tmpStart}
                max={tmpEnd || TODAY}
                onChange={(e) => setTmpStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data final</label>
              <input
                type="date"
                value={tmpEnd}
                min={tmpStart}
                max={TODAY}
                onChange={(e) => setTmpEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": primaryColor } as any}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowCustom(false)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={applyCustom}
              disabled={!tmpStart || !tmpEnd}
              className="flex-1 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-40"
              style={{ background: primaryColor }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
