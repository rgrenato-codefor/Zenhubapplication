import { useState, useMemo } from "react";
import {
  Search, Plus, Edit2 as Edit3, Trash2, X, Users,
  Check, AlertCircle, ChevronRight, Copy, CheckCheck,
  Clock, Sparkles, MessageCircle,
  User, Phone, Mail, Calendar, MapPin, DollarSign, Star, Heart, FileText, ArrowLeft,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

/* ─── Types ──────────────────────────────────────────── */
interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  totalSessions: number;
  totalSpent: number;
  lastSession: string;
  status: "active" | "inactive";
  preferredTherapist: string;
  birthdate?: string;
  address?: string;
  notes?: string;
  healthNotes?: string;
  registeredAt?: string;
  registeredBy?: "self" | "company";
}

/* ─── Helpers ─────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/* ─── Avatar ─────────────────────────────────────────── */
function Avatar({ client, size = "md", color }: { client: Client; size?: "xs" | "sm" | "md" | "lg"; color: string }) {
  const sz = { xs: "w-8 h-8 text-xs", sm: "w-10 h-10 text-sm", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-base" };
  if (client.avatar)
    return <img src={client.avatar} alt={client.name} className={`${sz[size]} rounded-full object-cover border-2 border-white shadow-sm`} />;
  return (
    <div className={`${sz[size]} rounded-full flex items-center justify-center text-white shrink-0 shadow-sm`}
      style={{ background: `linear-gradient(135deg, ${color}bb, ${color})` }}>
      <span style={{ fontWeight: 700 }}>{initials(client.name)}</span>
    </div>
  );
}

/* ─── New Client Modal ────────────────────────────────── */
function NewClientModal({ companyId, primaryColor, therapistList, onClose, onSave }: {
  companyId: string; primaryColor: string;
  therapistList: typeof therapists; onClose: () => void; onSave: (c: Client) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [preferredTherapist, setPreferredTherapist] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = "Nome é obrigatório";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = (skipExtras = false) => {
    if (!validate()) return;
    onSave({
      id: `cl_${Date.now()}`, companyId, name: name.trim(), phone, email: email.trim(),
      avatar: null, totalSessions: 0, totalSpent: 0, lastSession: "", status: "active",
      preferredTherapist,
      birthdate: skipExtras ? undefined : birthdate || undefined,
      address: skipExtras ? undefined : address.trim() || undefined,
      notes: skipExtras ? undefined : notes.trim() || undefined,
      healthNotes: skipExtras ? undefined : healthNotes.trim() || undefined,
      registeredAt: new Date().toISOString().slice(0, 10),
      registeredBy: "company",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-700">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-gray-900">{step === 1 ? "Novo Contato" : "Dados Complementares"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {step === 1 ? "Nome e telefone são obrigatórios" : "Opcional — pode preencher depois"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all`}
                  style={s <= step ? { background: primaryColor, color: "#fff", fontWeight: 700 } : { background: "#f3f4f6", color: "#9ca3af" }}>
                  {s < step ? <Check className="w-3 h-3" /> : s}
                </div>
                <span className="text-xs text-gray-400" style={s === step ? { fontWeight: 600, color: "#374151" } : {}}>
                  {s === 1 ? "Básico" : "Detalhes"}
                </span>
                {s < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  Nome completo <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input autoFocus value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                    placeholder="Ex: Maria Clara Santos"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${errors.name ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-gray-200"}`} />
                </div>
                {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  Telefone / WhatsApp <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={phone}
                    onChange={(e) => { setPhone(formatPhone(e.target.value)); setErrors((p) => ({ ...p, phone: undefined })); }}
                    placeholder="(11) 99999-9999"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${errors.phone ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-gray-200"}`} />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Adicione e-mail, endereço e observações de saúde no próximo passo.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "E-mail", icon: Mail, key: "email", type: "email", ph: "cliente@email.com", val: email, set: setEmail },
                { label: "Data de nascimento", icon: Calendar, key: "birthdate", type: "date", ph: "", val: birthdate, set: setBirthdate },
                { label: "Endereço", icon: MapPin, key: "address", type: "text", ph: "Rua, número, bairro", val: address, set: setAddress },
              ].map(({ label, icon: Icon, key, type, ph, val, set }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>Terapeuta preferido</label>
                <select value={preferredTherapist} onChange={(e) => setPreferredTherapist(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none bg-white">
                  <option value="">Sem preferência</option>
                  {therapistList.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.specialty}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" /> Obs. de saúde</span>
                </label>
                <textarea rows={2} value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)}
                  placeholder="Alergias, condições, contraindicações..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> Observações gerais</span>
                </label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferências, horários favoritos..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          {step === 1 ? (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm">Cancelar</button>
              <button onClick={() => validate() && setStep(2)} className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-2"
                style={{ background: primaryColor, fontWeight: 600 }}>
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => handleSave(false)} className="w-full py-2.5 text-white rounded-xl text-sm"
                style={{ background: primaryColor, fontWeight: 600 }}>Salvar Contato</button>
              <button onClick={() => handleSave(true)} className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm">
                Salvar só com nome e telefone
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel ────────────────────────────────────── */
function DetailPanel({ client, primaryColor, therapistList, clientAppointments, onClose, onUpdate }: {
  client: Client; primaryColor: string; therapistList: typeof therapists;
  clientAppointments: typeof appointments; onClose: () => void; onUpdate: (c: Client) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...client });
  const preferred = therapistList.find((t) => t.id === client.preferredTherapist);

  const handleSave = () => { onUpdate(form); setEditing(false); };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Cover + avatar ───────────────────────────────── */}
      <div className="relative shrink-0">
        {/* Cover bar */}
        <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${primaryColor}90, ${primaryColor}40)` }} />
        {/* Avatar overlap */}
        <div className="absolute left-5 -bottom-6">
          <div className="p-0.5 rounded-full bg-white shadow-md">
            <Avatar client={client} size="lg" color={primaryColor} />
          </div>
        </div>
        {/* Actions top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Name + status ─────────────────────────────────── */}
      <div className="pt-9 px-5 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-gray-900" style={{ fontWeight: 700 }}>{client.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${client.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                style={{ fontWeight: 600 }}>
                <span className={`w-1.5 h-1.5 rounded-full ${client.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                {client.status === "active" ? "Ativo" : "Inativo"}
              </span>
              {client.registeredBy === "company" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200" style={{ fontWeight: 600 }}>
                  Cadastrado aqui
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
            style={editing ? { background: primaryColor, color: "#fff", fontWeight: 600 } : { background: "#f3f4f6", color: "#374151" }}>
            {editing ? <><Check className="w-3 h-3" /> Salvar</> : <><Edit3 className="w-3 h-3" /> Editar</>}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { icon: Calendar, label: "Sessões", value: String(client.totalSessions), color: "text-blue-500" },
            { icon: DollarSign, label: "Gasto", value: client.totalSpent > 0 ? `R$${(client.totalSpent / 1000).toFixed(1)}k` : "—", color: "text-emerald-500" },
            { icon: Star, label: "Favorito", value: preferred?.name.split(" ")[0] || "—", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
              <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
              <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick contact buttons */}
        {!editing && (
          <div className="flex gap-2 mt-3">
            {client.phone && (
              <a href={`tel:${client.phone.replace(/\D/g, "")}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors" style={{ fontWeight: 600 }}>
                <Phone className="w-3.5 h-3.5" /> Ligar
              </a>
            )}
            {client.phone && (
              <a href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs" style={{ background: "#25D366", fontWeight: 600 }}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors" style={{ fontWeight: 600 }}>
                <Mail className="w-3.5 h-3.5" /> E-mail
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact & Personal */}
        <section className="px-5 py-4 border-b border-gray-50">
          <p className="text-xs text-gray-400 mb-3 uppercase" style={{ fontWeight: 700 }}>Contato & Dados pessoais</p>
          <div className="space-y-3">
            {[
              { icon: Phone, label: "Telefone", field: "phone" as keyof Client, type: "text", ph: "(11) 99999-9999" },
              { icon: Mail, label: "E-mail", field: "email" as keyof Client, type: "email", ph: "cliente@email.com" },
              { icon: Calendar, label: "Nascimento", field: "birthdate" as keyof Client, type: "date", ph: "" },
              { icon: MapPin, label: "Endereço", field: "address" as keyof Client, type: "text", ph: "Rua, número, bairro" },
            ].map(({ icon: Icon, label, field, type, ph }) => (
              <div key={field} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>{label}</p>
                  {editing ? (
                    <input type={type} value={(form[field] as string) || ""} placeholder={ph}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      className={inputCls + " mt-0.5"} />
                  ) : (
                    <p className="text-sm text-gray-700 mt-0.5">
                      {(client[field] as string) || <span className="text-gray-300 italic">Não informado</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="px-5 py-4 border-b border-gray-50">
          <p className="text-xs text-gray-400 mb-3 uppercase" style={{ fontWeight: 700 }}>Preferências</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Terapeuta preferido</p>
                {editing ? (
                  <select value={form.preferredTherapist}
                    onChange={(e) => setForm((p) => ({ ...p, preferredTherapist: e.target.value }))}
                    className={inputCls + " mt-0.5 bg-white"}>
                    <option value="">Sem preferência</option>
                    {therapistList.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.specialty}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">{preferred?.name || <span className="text-gray-300 italic">Não informado</span>}</p>
                )}
              </div>
            </div>
            {[
              { icon: FileText, label: "Observações gerais", field: "notes" as keyof Client, ph: "Preferências, horários..." },
              { icon: Heart, label: "Obs. de saúde", field: "healthNotes" as keyof Client, ph: "Alergias, contraindicações..." },
            ].map(({ icon: Icon, label, field, ph }) => (
              <div key={field} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>{label}</p>
                  {editing ? (
                    <textarea rows={2} value={(form[field] as string) || ""} placeholder={ph}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                      className={inputCls + " mt-0.5 resize-none"} />
                  ) : (
                    <p className="text-sm text-gray-700 mt-0.5">
                      {(client[field] as string) || <span className="text-gray-300 italic">Não informado</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent sessions */}
        <section className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-3 uppercase" style={{ fontWeight: 700 }}>
            Últimas sessões {clientAppointments.length > 0 && `(${clientAppointments.length})`}
          </p>
          {clientAppointments.length > 0 ? (
            <div className="space-y-2">
              {clientAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                    style={{ background: primaryColor, fontWeight: 700 }}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
                      {new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })} · {apt.time}
                    </p>
                    <p className="text-xs text-gray-400">{apt.duration}min · R$ {apt.price}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    apt.status === "confirmed" ? "bg-emerald-50 text-emerald-600" :
                    apt.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  }`} style={{ fontWeight: 600 }}>
                    {apt.status === "confirmed" ? "Confirmado" : apt.status === "pending" ? "Pendente" : "Concluído"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma sessão ainda</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-gray-100 shrink-0">
        <button className="w-full py-2.5 text-white rounded-xl text-sm transition-opacity hover:opacity-90"
          style={{ background: primaryColor, fontWeight: 600 }}>
          Agendar Sessão
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────── */
export default function CompanyClients() {
  const { user } = useAuth();
  const { company, clients: mockClients, therapists, appointments, mutateAddClient, mutateUpdateClient } = usePageData();
  const primaryColor = company?.color || "#0D9488";

  const [clients, setClients] = useState(() => mockClients as any[]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(company?.inviteCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* filter + sort */
  const filtered = useMemo(() => {
    let list = clients;
    if (filterStatus !== "all") list = list.filter((c) => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [clients, search, filterStatus]);

  /* group by first letter */
  const grouped = useMemo(() => {
    const map: Record<string, Client[]> = {};
    filtered.forEach((c) => {
      const letter = c.name[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleSave = (c: Client) => {
    setClients((prev) => [...prev, c]);
    setSelectedClient(c);
    setShowNewModal(false);
    mutateAddClient(c);
  };
  const handleUpdate = (c: Client) => {
    setClients((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    setSelectedClient(c);
    mutateUpdateClient(c);
  };
  const clientApts = selectedClient
    ? appointments.filter((a) => a.clientId === selectedClient.id)
    : [];

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-gray-900">Clientes</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {clients.length} contatos cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Invite code pill */}
            <button onClick={copyCode}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
              {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span style={{ fontWeight: 600 }}>Código:</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700" style={{ fontWeight: 700 }}>
                {company?.inviteCode}
              </span>
            </button>
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm shadow-sm"
              style={{ background: primaryColor, fontWeight: 600 }}>
              <Plus className="w-4 h-4" /> Novo Contato
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-pane layout ────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── LEFT: Contact list ─────────────────────────── */}
        <div className={`flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${selectedClient ? "w-80 shrink-0" : "flex-1"}`}>
          {/* Search + filters */}
          <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filterStatus === f ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  style={filterStatus === f ? { background: primaryColor, fontWeight: 600 } : {}}>
                  {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
                  <span className="ml-1 opacity-70">
                    ({f === "all" ? clients.length : clients.filter((c) => c.status === f).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alphabetical list */}
          <div className="flex-1 overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500" style={{ fontWeight: 600 }}>Nenhum contato encontrado</p>
                <p className="text-xs text-gray-400 mt-1">Tente outros termos ou cadastre um novo cliente</p>
              </div>
            ) : (
              grouped.map(([letter, clients]) => (
                <div key={letter}>
                  {/* Letter separator */}
                  <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100 sticky top-0 z-10">
                    <span className="text-xs text-gray-400" style={{ fontWeight: 700 }}>{letter}</span>
                  </div>
                  {clients.map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    const preferred = therapists.find((t) => t.id === client.preferredTherapist);
                    return (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(isSelected ? null : client)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors ${isSelected ? "bg-gray-50" : ""}`}
                        style={isSelected ? { borderLeft: `3px solid ${primaryColor}` } : { borderLeft: "3px solid transparent" }}
                      >
                        <Avatar client={client} size="sm" color={primaryColor} />
                        {/* Name + phone */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{client.name}</p>
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${client.status === "active" ? "bg-emerald-400" : "bg-gray-300"}`} />
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{client.phone || client.email || "Sem contato"}</p>
                        </div>
                        {/* Sessions + preferred — aligned right */}
                        {!selectedClient && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {client.totalSessions}
                            </span>
                            {preferred && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" /> {preferred.name.split(" ")[0]}
                              </span>
                            )}
                          </div>
                        )}
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-gray-400" : "text-gray-200"}`} />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail panel ────────────────────────── */}
        {selectedClient && (
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <DetailPanel
              key={selectedClient.id}
              client={selectedClient}
              primaryColor={primaryColor}
              therapistList={therapists}
              clientAppointments={clientApts}
              onClose={() => setSelectedClient(null)}
              onUpdate={handleUpdate}
            />
          </div>
        )}

        {/* ── Empty state (no selection) ─────────────────── */}
        {!selectedClient && (
          <div className="hidden xl:flex flex-1 bg-white rounded-2xl border border-dashed border-gray-200 items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400" style={{ fontWeight: 600 }}>Selecione um contato</p>
              <p className="text-xs text-gray-300 mt-1">As informações aparecerão aqui</p>
            </div>
          </div>
        )}
      </div>

      {/* ── New Client Modal ──────────────────────────────── */}
      {showNewModal && (
        <NewClientModal
          companyId={user?.companyId ?? ""}
          primaryColor={primaryColor}
          therapistList={therapists}
          onClose={() => setShowNewModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}