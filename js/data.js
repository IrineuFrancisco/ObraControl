/**
 * Estado Inicial Limpo (Sem dados fictícios)
 * Os dados reais da obra ficam armazenados no Supabase PostgreSQL e são carregados após Login autorizado.
 */

window.OBRA_INITIAL_DATA = {
  projectInfo: {
    name: "ObraControl Pro — Gestão Financeira de Obras",
    client: "Faça login para carregar os dados",
    engineer: "Engenharia & Gestão",
    location: "Presidente Prudente - SP",
    startDate: "2026-11-04",
    referenceDate: "2026-11-14"
  },

  budgets: [],
  purchases: [],
  equipments: [],
  labor: [],
  quotations: []
};
