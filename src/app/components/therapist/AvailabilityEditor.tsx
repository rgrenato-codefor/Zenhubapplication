/**
 * AvailabilityEditor
 *
 * Dois modos de edição da disponibilidade semanal:
 *  • Individual — grade clicável (comportamento original)
 *  • Em bloco   — seletor de dias + faixa de horário → aplica em massa
 *
 * A estrutura salva é idêntica em ambos os modos:
 *   Record<dayKey, string[]>   e.g. { monday: ["08:00","09:00",...], ... }
 */

import { useState, useMemo } from "react";
import { Clock, CheckCircle, Trash2, Zap, ArrowRight } from "../shared/icons";

// ── Constants ─────────────────────────────────────────────────────────────────

const HOURS: string[] = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6; // 06:00 → 23:00
  return `${String(h).padStart(2, "0")}:00`;
});

const ALL_WEEK_DAYS = [
  { dayKey: "monday",    label: "Seg", full: "Segunda" },
  { dayKey: "tuesday",   label: "Ter", full: "Terça"   },
  { dayKey: "wednesday", label: "Qua", full: "Quarta"  },
  { dayKey: "thursday",  label: "Qui", full: "Quinta"  },
  { dayKey: "friday",    label: "Sex", full: "Sexta"   },
  { dayKey: "saturday",  label: "Sáb", full: "Sábado"  },
  { dayKey: "sunday",    label: "Dom", full: "Domingo" },
];

const WEEKDAYS  = ALL_WEEK_DAYS.slice(0, 5).map((d) => d.dayKey);
const WEEKEND   = ALL_WEEK_DAYS.slice(5).map((d) => d.dayKey);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  availability: Record<string, string[]>;
  onSave: (next: Record<string, string[]>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursInRange(from: string, to: string): string[] {
  const fi = HOURS.indexOf(from);
  const ti = HOURS.indexOf(to);
  if (fi < 0 || ti < 0 || ti < fi) return [];
  return HOURS.slice(fi, ti + 1);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AvailabilityEditor({ availability, onSave }: Props) {
  const [mode, setMode] = useState<"individual" | "range">("individual");

  // Range state
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(WEEKDAYS));
  const [rangeFrom, setRangeFrom] = useState("08:00");
  const [rangeTo,   setRangeTo]   = useState("18:00");
  const [applyFeedback, setApplyFeedback] = useState<"add" | "remove" | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const rangeSlots = useMemo(() => hoursInRange(rangeFrom, rangeTo), [rangeFrom, rangeTo]);
  const totalAffected = rangeSlots.length * selectedDays.size;

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Toggle a single slot (individual mode) */
  const toggleSlot = (dayKey: string, slot: string) => {
    const current = availability[dayKey] ?? [];
    const updated  = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot].sort();
    onSave({ ...availability, [dayKey]: updated });
  };

  /** Toggle a day column header — select all or clear */
  const toggleDayAll = (dayKey: string) => {
    const current = availability[dayKey] ?? [];
    onSave({
      ...availability,
      [dayKey]: current.length === HOURS.length ? [] : [...HOURS],
    });
  };

  /** Clear one entire day */
  const clearDay = (dayKey: string) => {
    onSave({ ...availability, [dayKey]: [] });
  };

  /** Apply a range (add or remove) to selectedDays */
  const applyRange = (action: "add" | "remove") => {
    if (selectedDays.size === 0 || rangeSlots.length === 0) return;
    const next = { ...availability };
    for (const dk of selectedDays) {
      const current = new Set(next[dk] ?? []);
      if (action === "add")    rangeSlots.forEach((s) => current.add(s));
      if (action === "remove") rangeSlots.forEach((s) => current.delete(s));
      next[dk] = [...current].sort();
    }
    onSave(next);
    setApplyFeedback(action);
    setTimeout(() => setApplyFeedback(null), 2000);
  };

  const toggleRangeDay = (dk: string) => {
    const next = new Set(selectedDays);
    next.has(dk) ? next.delete(dk) : next.add(dk);
    setSelectedDays(next);
  };

  const selectPreset = (preset: "weekdays" | "weekend" | "all" | "none") => {
    if (preset === "weekdays") setSelectedDays(new Set(WEEKDAYS));
    if (preset === "weekend")  setSelectedDays(new Set(WEEKEND));
    if (preset === "all")      setSelectedDays(new Set(ALL_WEEK_DAYS.map((d) => d.dayKey)));
    if (preset === "none")     setSelectedDays(new Set());
  };

  // total slots active
  const totalActive = Object.values(availability).reduce((acc, s) => acc + s.length, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">

        {/* Title + mode toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-500" />
            <h3 className="text-gray-900">Horários disponíveis</h3>
            {totalActive > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600" style={{ fontWeight: 600 }}>
                {totalActive} ativos
              </span>
            )}
          </div>

          {/* Mode switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { id: "individual", label: "Individual" },
              { id: "range",      label: "Em bloco"   },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
                  mode === m.id
                    ? "bg-white shadow-sm text-violet-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontWeight: mode === m.id ? 700 : 400 }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Range panel (only in "range" mode) ────────────────────────────── */}
        {mode === "range" && (
          <div className="mb-6 p-4 rounded-xl border-2 border-violet-200 bg-violet-50 space-y-4">

            {/* Days */}
            <div>
              <p className="text-xs text-violet-700 mb-2" style={{ fontWeight: 700 }}>
                Dias da semana
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ALL_WEEK_DAYS.map((d) => {
                  const active = selectedDays.has(d.dayKey);
                  return (
                    <button
                      key={d.dayKey}
                      onClick={() => toggleRangeDay(d.dayKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                        active
                          ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                          : "bg-white border-violet-200 text-gray-500 hover:border-violet-400"
                      }`}
                      style={{ fontWeight: active ? 700 : 400 }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "weekdays", label: "Dias úteis" },
                  { id: "weekend",  label: "Fim de semana" },
                  { id: "all",      label: "Todos" },
                  { id: "none",     label: "Nenhum" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPreset(p.id as any)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100 transition-all"
                    style={{ fontWeight: 500 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time range */}
            <div>
              <p className="text-xs text-violet-700 mb-2" style={{ fontWeight: 700 }}>
                Faixa de horário
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">De</label>
                  <select
                    value={rangeFrom}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRangeFrom(v);
                      // ensure "to" is never before "from"
                      if (HOURS.indexOf(v) > HOURS.indexOf(rangeTo)) setRangeTo(v);
                    }}
                    className="text-sm border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <ArrowRight className="w-4 h-4 text-violet-400 shrink-0" />

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Até</label>
                  <select
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="text-sm border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {HOURS.filter((h) => h >= rangeFrom).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Summary pill */}
                {rangeSlots.length > 0 && selectedDays.size > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700" style={{ fontWeight: 600 }}>
                    {rangeSlots.length} horário{rangeSlots.length !== 1 ? "s" : ""} × {selectedDays.size} dia{selectedDays.size !== 1 ? "s" : ""} = {totalAffected} slot{totalAffected !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                onClick={() => applyRange("add")}
                disabled={selectedDays.size === 0 || rangeSlots.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ fontWeight: 600 }}
              >
                <Zap className="w-4 h-4" />
                Adicionar horários
              </button>
              <button
                onClick={() => applyRange("remove")}
                disabled={selectedDays.size === 0 || rangeSlots.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontWeight: 600 }}
              >
                <Trash2 className="w-4 h-4" />
                Remover horários
              </button>

              {/* Inline feedback */}
              {applyFeedback && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  <span style={{ fontWeight: 600 }}>
                    {applyFeedback === "add" ? "Horários adicionados!" : "Horários removidos!"}
                  </span>
                </div>
              )}
            </div>

            {/* Helper hint */}
            <p className="text-xs text-violet-500">
              💡 Depois de aplicar, você ainda pode ajustar horários individuais na grade abaixo.
            </p>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────────────────── */}
        {mode === "individual" && (
          <p className="text-gray-400 text-xs mb-4">
            Clique em um horário para marcar ou desmarcar. Clique no nome do dia para selecionar/desmarcar toda a coluna.
          </p>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {ALL_WEEK_DAYS.map((day) => {
            const slots  = availability[day.dayKey] ?? [];
            const allOn  = slots.length === HOURS.length;
            // In range mode: highlight preview slots for selected days
            const isRangeTarget = mode === "range" && selectedDays.has(day.dayKey);

            return (
              <div key={day.dayKey}>
                {/* Column header */}
                <div className={`flex flex-col items-center mb-2 gap-1 ${isRangeTarget ? "opacity-100" : ""}`}>
                  <button
                    onClick={() => toggleDayAll(day.dayKey)}
                    title={allOn ? "Desmarcar tudo" : "Marcar tudo"}
                    className={`w-full text-xs py-1 rounded-lg transition-all ${
                      allOn
                        ? "bg-violet-600 text-white"
                        : isRangeTarget
                        ? "bg-violet-100 text-violet-700 border-2 border-dashed border-violet-400"
                        : "text-gray-500 hover:bg-violet-50 border border-transparent hover:border-violet-200"
                    }`}
                    style={{ fontWeight: 700 }}
                  >
                    {day.label}
                  </button>
                  {slots.length > 0 && (
                    <button
                      onClick={() => clearDay(day.dayKey)}
                      title="Limpar dia"
                      className="text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                    >
                      limpar
                    </button>
                  )}
                </div>

                {/* Slots */}
                <div className="space-y-0.5">
                  {HOURS.map((slot) => {
                    const active    = slots.includes(slot);
                    const willAdd   = mode === "range" && isRangeTarget && rangeSlots.includes(slot) && !active;
                    const willRemove= mode === "range" && isRangeTarget && rangeSlots.includes(slot) && active;

                    return (
                      <button
                        key={slot}
                        onClick={() => toggleSlot(day.dayKey, slot)}
                        title={slot}
                        className={`w-full py-1 px-0.5 rounded-md text-[11px] transition-all leading-none ${
                          active && !willRemove
                            ? "bg-violet-600 text-white shadow-sm"
                            : willAdd
                            ? "bg-violet-200 text-violet-700 border border-dashed border-violet-400"
                            : willRemove
                            ? "bg-red-100 text-red-400 line-through border border-dashed border-red-300"
                            : "bg-gray-50 text-gray-300 hover:bg-violet-50 hover:text-violet-500"
                        }`}
                        style={{ fontWeight: active || willAdd ? 600 : 400 }}
                      >
                        {slot.slice(0, 5)}
                      </button>
                    );
                  })}
                </div>

                {/* Per-day count */}
                <p className="text-center text-violet-500 text-[11px] mt-2" style={{ fontWeight: 600 }}>
                  {slots.length > 0 ? `${slots.length}h` : <span className="text-gray-200">—</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Weekly summary ──────────────────────────────────────────────────── */}
      {totalActive > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
          <h3 className="text-gray-900 mb-3">Resumo semanal</h3>
          <div className="space-y-2">
            {ALL_WEEK_DAYS.map((day) => {
              const slots = availability[day.dayKey] ?? [];
              if (slots.length === 0) return null;
              return (
                <div key={day.dayKey} className="flex items-center gap-3">
                  <p className="text-sm text-gray-600 w-20 shrink-0" style={{ fontWeight: 600 }}>
                    {day.full}
                  </p>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {slots.slice(0, 8).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg">
                        {s}
                      </span>
                    ))}
                    {slots.length > 8 && (
                      <span className="text-xs text-gray-400">+{slots.length - 8}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{slots.length} horários</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
