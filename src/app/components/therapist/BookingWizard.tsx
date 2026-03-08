/**
 * BookingWizard — modal de cadastro de atendimento em 3 steps.
 *
 * Step 1 │ Quando e com quem?   → data · horário · cliente
 * Step 2 │ Qual serviço?        → terapia / catálogo · duração · valor
 * Step 3 │ Ganhos e observações → resumo · quanto recebe · notas
 */

import { useState, useEffect, useMemo } from "react";
import {
  X, ChevronRight, ChevronLeft, CalendarDays, Clock,
  User, Sparkles, Building2, CheckCircle, Zap,
  ClipboardList, Banknote, FileText,
} from "../shared/icons";
import type { CatalogItem } from "../../context/DataContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingForm = {
  date: string;
  time: string;
  clientName: string;
  clientId: string;
  catalogItemId: string;
  therapyId: string;
  duration: string;
  price: string;
  notes: string;
};

interface Props {
  // Context
  isAutonomous: boolean;
  companyName?: string;
  commissionPct: number;
  myCatalog: CatalogItem[];
  therapies: any[];         // company therapies (filtered by catalog)
  clients: any[];
  bookingDates: { date: string; label: string }[];
  hours: string[];

  // Controlled form
  form: BookingForm;
  loading: boolean;
  error: string;

  // Callbacks
  onChange: (field: keyof BookingForm, value: string) => void;
  onCatalogSelect: (item: CatalogItem) => void;
  onTherapySelect: (therapyId: string) => void;
  onClientSelect: (clientId: string) => void;
  onSave: () => void;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_META = [
  { label: "Quando",  icon: CalendarDays, sub: "Data, horário e cliente" },
  { label: "Serviço", icon: ClipboardList, sub: "Terapia, duração e valor" },
  { label: "Ganhos",  icon: Banknote,     sub: "Comissão e observações"  },
] as const;

const DAY_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MON_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${DAY_PT[d.getDay()]}, ${d.getDate()} ${MON_PT[d.getMonth()]}`;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0 px-6 py-4 border-b border-gray-100">
      {STEP_META.map((s, i) => {
        const idx   = i + 1 as 1 | 2 | 3;
        const done  = current > idx;
        const active = current === idx;
        return (
          <div key={s.label} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  done   ? "bg-emerald-500"
                  : active ? "bg-gradient-to-br from-violet-600 to-indigo-600"
                  : "bg-gray-100"
                }`}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <s.icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-400"}`} />
                )}
              </div>
              <p className={`text-xs mt-1 leading-tight text-center ${active ? "text-violet-600" : done ? "text-emerald-600" : "text-gray-400"}`}
                 style={{ fontWeight: active ? 700 : 500 }}>
                {s.label}
              </p>
            </div>
            {/* Connector */}
            {i < 2 && (
              <div className={`h-0.5 w-full mx-1 rounded-full transition-all ${done ? "bg-emerald-400" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white ${props.className ?? ""}`}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BookingWizard({
  isAutonomous, companyName, commissionPct,
  myCatalog, therapies, clients,
  bookingDates, hours,
  form, loading, error,
  onChange, onCatalogSelect, onTherapySelect, onClientSelect,
  onSave, onClose,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Desabilita o botão imediatamente no primeiro clique, sem esperar
  // re-render do componente pai (loading vem do state React, não é síncrono)
  const [localBusy, setLocalBusy] = useState(false);

  // Quando o pai terminar (loading volta a false), libera o botão
  // (ex: em caso de erro, o usuário pode tentar de novo)
  useEffect(() => {
    if (!loading) setLocalBusy(false);
  }, [loading]);

  const handleConfirm = () => {
    setLocalBusy(true);
    onSave();
  };

  // ── Computed values ─────────────────────────────────────────────────────────
  const price    = Number(form.price) || 0;
  const duration = Number(form.duration) || 0;
  const earned   = isAutonomous ? price : price * commissionPct / 100;
  const companyNet = price - earned;

  const selectedCatalog  = myCatalog.find((c) => c.id === form.catalogItemId);
  const selectedTherapy  = therapies.find((t) => t.id === form.therapyId);
  const selectedClient   = clients.find((c) => c.id === form.clientId);
  const serviceName      = selectedCatalog?.name ?? selectedTherapy?.name ?? (form.price ? "Atendimento avulso" : "");

  // Available therapy hours for a given day from availability (passed via slots in hours prop)
  const timeSlots = useMemo(() => hours, [hours]);

  // ── Step validation ─────────────────────────────────────────────────────────
  const step1Valid = form.date && form.time && (isAutonomous ? form.clientName.trim() : form.clientId);
  const step2Valid = form.price && form.duration && (
    isAutonomous
      ? (form.catalogItemId || (form.price && form.duration))
      : form.therapyId
  );

  const goNext = () => setStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3);
  const goBack = () => setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Novo Atendimento</p>
              <p className="text-gray-400 text-xs flex items-center gap-1">
                {isAutonomous
                  ? <><Zap className="w-3 h-3 text-violet-400" /> Autônomo — 100% seu</>
                  : <><Building2 className="w-3 h-3" /> {companyName}</>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────────────────────── */}
        <StepIndicator current={step} />

        {/* ── Step content ─────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ══ STEP 1 — Quando e com quem? ══════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Date */}
              <div>
                <Label>Data *</Label>
                <Select value={form.date} onChange={(e) => onChange("date", e.target.value)}>
                  {bookingDates.map((d) => (
                    <option key={d.date} value={d.date}>{d.label}</option>
                  ))}
                </Select>
                {form.date && (
                  <p className="text-xs text-violet-500 mt-1 flex items-center gap-1" style={{ fontWeight: 600 }}>
                    <CalendarDays className="w-3 h-3" /> {fmtDate(form.date)}
                  </p>
                )}
              </div>

              {/* Time — chip grid */}
              <div>
                <Label>Horário *</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {timeSlots.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange("time", h)}
                      className={`py-2 rounded-xl text-xs transition-all ${
                        form.time === h
                          ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-600 border border-gray-100"
                      }`}
                      style={{ fontWeight: form.time === h ? 700 : 400 }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client */}
              <div>
                <Label>Cliente *</Label>
                {isAutonomous ? (
                  <Input
                    placeholder="Nome completo do cliente"
                    value={form.clientName}
                    onChange={(e) => onChange("clientName", e.target.value)}
                  />
                ) : (
                  <>
                    <Select
                      value={form.clientId}
                      onChange={(e) => onClientSelect(e.target.value)}
                    >
                      <option value="">Selecione o cliente…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                    {selectedClient && (
                      <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
                        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                          {selectedClient.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-violet-700 truncate" style={{ fontWeight: 600 }}>{selectedClient.name}</p>
                          {selectedClient.phone && <p className="text-xs text-violet-500">{selectedClient.phone}</p>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ══ STEP 2 — Qual serviço? ════════════════════════════════════════ */}
          {step === 2 && (
            <>
              {/* Catalog / Therapy picker */}
              <div>
                <Label>{isAutonomous ? "Serviço do catálogo" : "Terapia *"}</Label>

                {isAutonomous ? (
                  myCatalog.filter((c) => c.active !== false).length > 0 ? (
                    <div className="space-y-1.5">
                      {myCatalog.filter((c) => c.active !== false).map((item) => {
                        const sel = form.catalogItemId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onCatalogSelect(item)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                            style={sel
                              ? { borderColor: item.color, background: `${item.color}12` }
                              : { borderColor: "#E5E7EB", background: "#FAFAFA" }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}20` }}>
                              <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate" style={{ fontWeight: sel ? 700 : 500 }}>{item.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.duration} min
                              </p>
                            </div>
                            <p className="text-sm text-emerald-600 shrink-0" style={{ fontWeight: 700 }}>
                              R$ {item.myPrice}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-amber-700 text-xs" style={{ fontWeight: 600 }}>
                        Catálogo vazio — preencha duração e valor abaixo.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    {therapies.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-amber-700 text-xs" style={{ fontWeight: 600 }}>
                          Nenhuma terapia disponível. Selecione terapias em "Minhas Terapias" primeiro.
                        </p>
                      </div>
                    ) : (
                      therapies.map((t) => {
                        const sel = form.therapyId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onTherapySelect(t.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                            style={sel
                              ? { borderColor: t.color, background: `${t.color}12` }
                              : { borderColor: "#E5E7EB", background: "#FAFAFA" }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${t.color}20` }}>
                              <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate" style={{ fontWeight: sel ? 700 : 500 }}>{t.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {t.duration} min
                                {t.category && <> · <span>{t.category}</span></>}
                              </p>
                            </div>
                            <p className="text-sm shrink-0" style={{ fontWeight: 700, color: t.color }}>
                              R$ {t.price}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>AJUSTAR VALORES</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Duration + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duração (min) *</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    min={1}
                    value={form.duration}
                    onChange={(e) => onChange("duration", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Valor cobrado (R$) *</Label>
                  <Input
                    type="number"
                    placeholder="150"
                    min={0}
                    step="0.50"
                    value={form.price}
                    onChange={(e) => onChange("price", e.target.value)}
                  />
                </div>
              </div>

              {/* Earnings preview */}
              {price > 0 && (
                <div className={`rounded-xl p-3 border ${isAutonomous ? "bg-violet-50 border-violet-100" : "bg-emerald-50 border-emerald-100"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {isAutonomous ? "Você recebe (100%)" : `Sua comissão (${commissionPct}%)`}
                    </span>
                    <span className={`text-sm ${isAutonomous ? "text-violet-700" : "text-emerald-700"}`} style={{ fontWeight: 700 }}>
                      R$ {earned.toFixed(2)}
                    </span>
                  </div>
                  {!isAutonomous && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">Empresa retém ({100 - commissionPct}%)</span>
                      <span className="text-xs text-gray-500">R$ {companyNet.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ STEP 3 — Ganhos e observações ════════════════════════════════ */}
          {step === 3 && (
            <>
              {/* Summary card */}
              <div className="rounded-xl border border-violet-100 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-white/80" />
                  <p className="text-white text-sm" style={{ fontWeight: 700 }}>Resumo do atendimento</p>
                </div>
                <div className="divide-y divide-violet-50">
                  {[
                    { label: "Data & horário", value: `${fmtDate(form.date)} às ${form.time}`, icon: CalendarDays },
                    { label: "Cliente",
                      value: isAutonomous ? form.clientName : (selectedClient?.name ?? "—"),
                      icon: User },
                    { label: "Serviço",
                      value: serviceName || "—",
                      icon: Sparkles },
                    { label: "Duração",
                      value: duration > 0 ? `${duration} min` : "—",
                      icon: Clock },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                      <row.icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <p className="text-xs text-gray-400 w-28 shrink-0">{row.label}</p>
                      <p className="text-xs text-gray-800 flex-1 text-right truncate" style={{ fontWeight: 600 }}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings breakdown */}
              <div className="rounded-xl bg-white border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Quanto você recebe</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Valor cobrado</span>
                    <span className="text-xs text-gray-800" style={{ fontWeight: 600 }}>R$ {price.toFixed(2)}</span>
                  </div>
                  {!isAutonomous && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Repasse empresa ({100 - commissionPct}%)</span>
                      <span className="text-xs text-red-400">− R$ {companyNet.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2 border-t ${isAutonomous ? "border-violet-100" : "border-emerald-100"}`}>
                    <span className="text-sm" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                      {isAutonomous ? "Você recebe (100%)" : `Sua comissão (${commissionPct}%)`}
                    </span>
                    <span className="text-sm" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                      R$ {earned.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Observações internas
                  </span>
                </Label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  placeholder="Preferências do cliente, histórico, materiais necessários…"
                  value={form.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-red-500 text-sm">⚠</span>
                  <p className="text-xs text-red-600 flex-1">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer nav ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          {step > 1 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors shrink-0"
              style={{ fontWeight: 600 }}
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors shrink-0"
            >
              Cancelar
            </button>
          )}

          <div className="flex-1" />

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`rounded-full transition-all ${
                  s === step ? "w-4 h-2 bg-violet-600" : s < step ? "w-2 h-2 bg-emerald-400" : "w-2 h-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="flex-1" />

          {step < 3 ? (
            <button
              onClick={goNext}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm disabled:opacity-40 hover:shadow-md transition-all shrink-0"
              style={{ fontWeight: 600 }}
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={localBusy || loading || !step2Valid}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all shrink-0"
              style={{ fontWeight: 600 }}
            >
              {localBusy || loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Salvando…
                </span>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirmar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}