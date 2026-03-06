import { useState } from "react";
import React from "react";
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle, Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmado", color: "#059669", bg: "#ECFDF5", icon: CheckCircle },
  pending: { label: "Pendente", color: "#D97706", bg: "#FFFBEB", icon: AlertCircle },
  completed: { label: "Concluído", color: "#6366F1", bg: "#EEF2FF", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "#DC2626", bg: "#FEF2F2", icon: XCircle },
};

export default function ClientBookings() {
  const { user } = useAuth();
  const { company, appointments: allAppointments, therapists, therapies } = usePageData();
  const primaryColor = company?.color || "#7C3AED";
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");

  const myAppointments = allAppointments.filter((a) => a.clientId === user?.clientId);
  const upcoming = myAppointments.filter((a) => a.status !== "completed" && a.status !== "cancelled");
  const history = myAppointments.filter((a) => a.status === "completed" || a.status === "cancelled");

  const renderAppointments = (apts: typeof myAppointments) => (
    <div className="space-y-3">
      {apts.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum agendamento encontrado</p>
        </div>
      )}
      {apts.map((apt) => {
        const therapist = therapists.find((t) => t.id === apt.therapistId);
        const therapy = therapies.find((t) => t.id === apt.therapyId);
        const st = statusConfig[apt.status];
        return (
          <div key={apt.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <img
                src={therapist?.avatar}
                alt={therapist?.name}
                className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{therapy?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">com {therapist?.name}</p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{apt.time} ({apt.duration}min)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                    R$ {apt.price.toFixed(2)}
                  </p>
                  {apt.status === "completed" && (
                    <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600" style={{ fontWeight: 600 }}>
                      <Star className="w-3 h-3" /> Avaliar
                    </button>
                  )}
                  {apt.status === "confirmed" && (
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-gray-900">Minhas Reservas</h1>
        <p className="text-gray-500 text-sm mt-0.5">{myAppointments.length} sessões no total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Realizadas", value: history.filter((a) => a.status === "completed").length, color: "#6366F1" },
          { label: "Próximas", value: upcoming.length, color: primaryColor },
          { label: "Total gasto", value: `R$ ${myAppointments.reduce((acc, a) => acc + a.price, 0).toFixed(0)}`, color: "#059669" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-xl text-gray-900" style={{ fontWeight: 700, color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(["upcoming", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
            style={tab === t ? { fontWeight: 600 } : {}}
          >
            {t === "upcoming" ? `Próximas (${upcoming.length})` : `Histórico (${history.length})`}
          </button>
        ))}
      </div>

      {tab === "upcoming" ? renderAppointments(upcoming) : renderAppointments(history)}
    </div>
  );
}