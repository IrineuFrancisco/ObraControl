/**
 * Dados Iniciais de Demonstração (Exibidos apenas no Modo Visitante / Não Logado)
 * Os dados reais da obra ficam protegidos no Supabase PostgreSQL e só são carregados após Login autorizado.
 */

window.OBRA_INITIAL_DATA = {
  projectInfo: {
    name: "Obra Modelo Demonstrativa (Faça Login para carregar seus dados)",
    client: "Modo Visitante (Demonstração)",
    engineer: "Engenharia & Gestão",
    location: "Canteiro de Obras",
    startDate: "2026-10-15",
    referenceDate: "2026-11-10"
  },

  budgets: [
    {
      id: "demo-fundacao",
      stage: "Fundação e Alicerce",
      category: "Materiais",
      plannedAmount: 15000.00,
      description: "Concreto estrutural, ferragens, caixaria, brita, areia e impermeabilização de vigas baldrame.",
      color: "#0284c7"
    },
    {
      id: "demo-alvenaria",
      stage: "Estrutura e Alvenaria",
      category: "Materiais",
      plannedAmount: 12000.00,
      description: "Blocos cerâmicos, cimento CP-II, areia lavada, cal hidratada e grauteamento.",
      color: "#2563eb"
    },
    {
      id: "demo-cobertura",
      stage: "Cobertura Metálica e Telhado",
      category: "Materiais",
      plannedAmount: 14000.00,
      description: "Telhas termoacústicas galvalume e perfis metálicos estruturais.",
      color: "#f59e0b"
    },
    {
      id: "demo-mao-de-obra",
      stage: "Execução Geral (Mão de Obra)",
      category: "Mão de Obra",
      plannedAmount: 18000.00,
      description: "Medições de empreitada de alvenaria, diárias de serventes e montagem de cobertura.",
      color: "#10b981"
    },
    {
      id: "demo-equipamentos",
      stage: "Locação de Maquinário e Apoio",
      category: "Equipamentos",
      plannedAmount: 4000.00,
      description: "Aluguel de betoneira 400L, andaimes tubulares e compactador de solo.",
      color: "#8b5cf6"
    },
    {
      id: "demo-taxas",
      stage: "Projetos, ART e Taxas",
      category: "Taxas",
      plannedAmount: 2500.00,
      description: "Taxas de aprovação, alvará de construção e ART de execução.",
      color: "#ec4899"
    }
  ],

  purchases: [
    {
      id: "demo-comp-01",
      date: "2026-11-08",
      item: "Cimento CP-II 50kg (Lote Inicial)",
      quantity: 40,
      unit: "sc",
      unitPrice: 38.00,
      discount: 0,
      totalPrice: 1520.00,
      supplier: "Depósito Central (Exemplo)",
      stage: "Estrutura e Alvenaria",
      category: "Materiais",
      paymentMethod: "PIX",
      status: "Pago",
      invoiceNumber: "NF #001",
      receiptUrl: "",
      notes: "Exemplo demonstrativo — Faça login em 'Banco na Nuvem' para carregar seus lançamentos reais."
    },
    {
      id: "demo-comp-02",
      date: "2026-11-09",
      item: "Tijolos Cerâmicos 8 Furos",
      quantity: 2000,
      unit: "un",
      unitPrice: 0.95,
      discount: 0,
      totalPrice: 1900.00,
      supplier: "Cerâmica Modelo (Exemplo)",
      stage: "Estrutura e Alvenaria",
      category: "Materiais",
      paymentMethod: "PIX",
      status: "Pago",
      invoiceNumber: "NF #002",
      receiptUrl: "",
      notes: "Entrega realizada no canteiro."
    },
    {
      id: "demo-comp-03",
      date: "2026-11-12",
      item: "Ferragens Estruturais 10mm e 8mm",
      quantity: 1,
      unit: "pct",
      unitPrice: 2100.00,
      discount: 100.00,
      totalPrice: 2000.00,
      supplier: "Distribuidora Aço (Exemplo)",
      stage: "Fundação e Alicerce",
      category: "Materiais",
      paymentMethod: "Boleto",
      status: "Pendente",
      invoiceNumber: "Ped #104",
      receiptUrl: "",
      notes: "Parcela programada."
    }
  ],

  equipments: [
    {
      id: "demo-eq-01",
      name: "Betoneira 400 Litros",
      supplier: "Locadora Modelo (Exemplo)",
      stage: "Estrutura e Alvenaria",
      startDate: "2026-10-28",
      expectedReturnDate: "2026-11-12",
      actualReturnDate: "",
      billingType: "Pacote Quinzenal",
      unitRate: 450.00,
      quantity: 1,
      totalPrice: 450.00,
      paymentStatus: "Pago",
      rentalStatus: "Em Uso",
      notes: "Exemplo de alerta de devolução próxima."
    },
    {
      id: "demo-eq-02",
      name: "Compactador de Solo (Sapo)",
      supplier: "Locadora Modelo (Exemplo)",
      stage: "Fundação e Alicerce",
      startDate: "2026-11-02",
      expectedReturnDate: "2026-11-08",
      actualReturnDate: "",
      billingType: "Diária",
      unitRate: 120.00,
      quantity: 5,
      totalPrice: 600.00,
      paymentStatus: "Pendente",
      rentalStatus: "Em Uso",
      notes: "Exemplo de alerta de equipamento em atraso."
    }
  ],

  labor: [
    {
      id: "demo-mo-01",
      date: "2026-11-05",
      workerName: "Equipe Alvenaria (Exemplo)",
      role: "Pedreiro",
      contractType: "Empreitada",
      quantity: 1,
      unitRate: 4000.00,
      totalPrice: 4000.00,
      stage: "Fundação e Alicerce",
      status: "Pago",
      paymentMethod: "PIX",
      notes: "1ª Medição demonstrativa."
    },
    {
      id: "demo-mo-02",
      date: "2026-11-08",
      workerName: "Ajudante Geral (Exemplo)",
      role: "Servente",
      contractType: "Diária",
      quantity: 10,
      unitRate: 130.00,
      totalPrice: 1300.00,
      stage: "Estrutura e Alvenaria",
      status: "Pago",
      paymentMethod: "PIX",
      notes: "10 diárias de apoio."
    }
  ],

  quotations: [
    {
      id: "demo-cot-01",
      qty: "2000 un",
      material: "Tijolos 8 Furos (Exemplo)",
      prices: {
        CONSTRUSE: 2100.00,
        ACUIA: 1900.00,
        PRUDENBLOC: 2050.00,
        PRUDENMAT: null,
        PRUDENTAO: null,
        JOMANE: null,
        FENAZ: null
      },
      winner: "ACUIA",
      status: "Exemplo Demonstrativo"
    }
  ]
};
