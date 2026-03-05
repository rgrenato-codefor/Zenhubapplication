import { Save, Globe, Bell, Shield, CreditCard, Mail } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white">Configurações</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configurações gerais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* General */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-white">Informações Gerais</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Nome da Plataforma", value: "ZEN HUB" },
                { label: "Domínio", value: "zenhub.com.br" },
                { label: "E-mail de Suporte", value: "suporte@zenhub.com.br" },
                { label: "Fuso Horário", value: "America/Sao_Paulo" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                  <input
                    defaultValue={field.value}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-white">Notificações</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: "Novas empresas cadastradas", desc: "Receber alerta quando uma nova empresa se cadastrar" },
                { label: "Relatório semanal", desc: "Receber resumo semanal de toda a plataforma" },
                { label: "Alertas de pagamento", desc: "Notificações sobre cobranças e inadimplências" },
                { label: "Novos usuários", desc: "Alerta de novos cadastros na plataforma" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <button className={`w-11 h-6 rounded-full transition-colors relative ${i < 2 ? "bg-violet-600" : "bg-gray-600"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${i < 2 ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Plans */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-white">Planos</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: "Starter", price: "R$ 199/mês", therapists: "até 3", color: "bg-gray-700" },
                { name: "Business", price: "R$ 399/mês", therapists: "até 10", color: "bg-blue-900/30" },
                { name: "Premium", price: "R$ 699/mês", therapists: "ilimitado", color: "bg-violet-900/30" },
              ].map((plan) => (
                <div key={plan.name} className={`${plan.color} rounded-lg p-3 border border-gray-700`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white" style={{ fontWeight: 600 }}>{plan.name}</p>
                    <p className="text-xs text-amber-400" style={{ fontWeight: 600 }}>{plan.price}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{plan.therapists} terapeutas</p>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm transition-colors" style={{ fontWeight: 600 }}>
            <Save className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}