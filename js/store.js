/**
 * Gerenciador de Estado e Cálculos Financeiros em Tempo Real (ObraControl Pro)
 * Integrado com Banco de Dados em Nuvem (Supabase PostgreSQL) + Cache Offline (localStorage)
 */

const STORAGE_KEY = "obracontrol_pro_state_v1";

window.ObraStore = {
  state: null,

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.state = JSON.parse(saved);
        // Se uma conexão anterior com banco vazio zerou os arrays locais, restaura os dados iniciais da obra
        const isEmpty = (!this.state.budgets || this.state.budgets.length === 0) &&
          (!this.state.purchases || this.state.purchases.length === 0);
        if (isEmpty) {
          this.resetToDefault(false);
          this.saveLocalOnly();
        } else if (!this.state.quotations || this.state.quotations.length === 0) {
          this.state.quotations = JSON.parse(JSON.stringify(window.OBRA_INITIAL_DATA.quotations));
        }
      } else {
        this.resetToDefault(false);
      }
    } catch (e) {
      console.error("Erro ao carregar localStorage, usando dados iniciais:", e);
      this.resetToDefault(false);
    }
    return this.state;
  },

  saveLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  },

  save() {
    this.saveLocalOnly();
  },

  resetToDefault(shouldSave = true) {
    this.state = JSON.parse(JSON.stringify(window.OBRA_INITIAL_DATA));
    if (shouldSave) {
      this.saveLocalOnly();
      if (window.ObraDB && window.ObraDB.isConfigured()) {
        window.ObraDB.pushAllToCloud();
      }
    }
    return this.state;
  },

  // Utilitário de data: calcula diferença em dias entre data alvo e data de referência (2026-11-10)
  getEquipmentAlertInfo(equipment) {
    if (equipment.rentalStatus === "Devolvido" || equipment.actualReturnDate) {
      return {
        code: "RETURNED",
        label: "Devolvido",
        daysDiff: 0,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        rowClass: "",
        icon: "check-circle-2",
        description: equipment.actualReturnDate
          ? `Devolvido em ${this.formatDateBR(equipment.actualReturnDate)}`
          : "Equipamento já devolvido"
      };
    }

    const refDateStr = (this.state && this.state.projectInfo && this.state.projectInfo.referenceDate) || "2026-11-10";
    const today = new Date(refDateStr + "T00:00:00");
    const due = new Date(equipment.expectedReturnDate + "T00:00:00");
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        code: "OVERDUE",
        label: `Atrasado (${overdueDays}d)`,
        daysDiff: diffDays,
        badgeClass: "bg-red-100 text-red-800 border-red-300 font-semibold alert-overdue-pulse",
        rowClass: "bg-red-50/60 hover:bg-red-50",
        icon: "alert-octagon",
        description: `Devolução venceu há ${overdueDays} ${overdueDays === 1 ? "dia" : "dias"}!`
      };
    } else if (diffDays <= 3) {
      return {
        code: "DUE_SOON",
        label: diffDays === 0 ? "Vence Hoje!" : `Vence em ${diffDays}d`,
        daysDiff: diffDays,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
        rowClass: "bg-amber-50/40 hover:bg-amber-50/80",
        icon: "alert-triangle",
        description: diffDays === 0 ? "Devolução prevista para hoje" : `Devolução próxima (${diffDays} dias)`
      };
    } else {
      return {
        code: "ON_TIME",
        label: `No prazo (${diffDays}d)`,
        daysDiff: diffDays,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        rowClass: "",
        icon: "clock",
        description: `${diffDays} dias restantes de locação`
      };
    }
  },

  // Consolida todos os indicadores financeiros em tempo real
  getFinancialSummary() {
    const budgets = this.state.budgets || [];
    const purchases = this.state.purchases || [];
    const equipments = this.state.equipments || [];
    const labor = this.state.labor || [];

    const stagesPlanned = budgets.reduce((acc, b) => acc + Number(b.plannedAmount || 0), 0);
    const customBudget = Number(this.state.projectInfo?.customTotalBudget || 0);
    const totalPlanned = customBudget > 0 ? customBudget : stagesPlanned;

    const materialsSpent = purchases
      .filter(p => p.category !== "Taxas")
      .reduce((acc, p) => acc + Number(p.totalPrice || 0), 0);

    const taxesSpent = purchases
      .filter(p => p.category === "Taxas")
      .reduce((acc, p) => acc + Number(p.totalPrice || 0), 0);

    const equipmentSpent = equipments.reduce((acc, e) => acc + Number(e.totalPrice || 0), 0);
    const laborSpent = labor.reduce((acc, l) => acc + Number(l.totalPrice || 0), 0);

    const totalSpent = materialsSpent + taxesSpent + equipmentSpent + laborSpent;

    const paidPurchases = purchases.filter(p => p.status === "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);
    const pendingPurchases = purchases.filter(p => p.status !== "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);

    const paidEquip = equipments.filter(e => e.paymentStatus === "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);
    const pendingEquip = equipments.filter(e => e.paymentStatus !== "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);

    const paidLabor = labor.filter(l => l.status === "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);
    const pendingLabor = labor.filter(l => l.status !== "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);

    const totalPaid = paidPurchases + paidEquip + paidLabor;
    const totalPending = pendingPurchases + pendingEquip + pendingLabor;

    const remainingBalance = totalPlanned - totalSpent;
    const progressPercent = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

    const byCategory = {
      Materiais: materialsSpent,
      "Mão de Obra": laborSpent,
      Equipamentos: equipmentSpent,
      Taxas: taxesSpent
    };

    const stageDetails = budgets.map(b => {
      const stageName = b.stage;
      const stagePurchases = purchases
        .filter(p => p.stage === stageName)
        .reduce((a, p) => a + Number(p.totalPrice || 0), 0);

      let stageEquip = 0;
      if (b.category === "Equipamentos") {
        stageEquip = equipmentSpent;
      } else {
        stageEquip = equipments
          .filter(e => e.stage === stageName && !budgets.some(bg => bg.category === "Equipamentos"))
          .reduce((a, e) => a + Number(e.totalPrice || 0), 0);
      }

      let stageLabor = 0;
      if (b.category === "Mão de Obra") {
        stageLabor = laborSpent;
      } else {
        stageLabor = labor
          .filter(l => l.stage === stageName && !budgets.some(bg => bg.category === "Mão de Obra"))
          .reduce((a, l) => a + Number(l.totalPrice || 0), 0);
      }

      const actual = stagePurchases + stageEquip + stageLabor;
      const diff = b.plannedAmount - actual;
      const pct = b.plannedAmount > 0 ? (actual / b.plannedAmount) * 100 : 0;

      return {
        ...b,
        actualAmount: actual,
        balance: diff,
        percent: pct
      };
    });

    const equipmentAlerts = equipments
      .map(eq => ({ equipment: eq, alert: this.getEquipmentAlertInfo(eq) }))
      .filter(item => item.alert.code === "OVERDUE" || item.alert.code === "DUE_SOON");

    return {
      totalPlanned,
      stagesPlanned,
      totalSpent,
      totalPaid,
      totalPending,
      remainingBalance,
      progressPercent,
      byCategory,
      stageDetails,
      equipmentAlerts
    };
  },

  formatCurrency(value) {
    const num = Number(value) || 0;
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatDateBR(dateStr) {
    if (!dateStr) return "—";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  // =========================================================================
  // CRUD COM SINCRONIZAÇÃO AUTOMÁTICA NO BANCO DE DADOS (SUPABASE)
  // =========================================================================

  // 0. Dados Gerais da Obra (Nome da Obra, Cliente, Orçamento Global)
  saveProjectInfo(infoData) {
    this.state.projectInfo = {
      ...(this.state.projectInfo || {}),
      ...infoData
    };
    this.saveLocalOnly();
    if (window.ObraDB) {
      window.ObraDB.syncRecordUpsert("obra_quotations", {
        id: "__project_info__",
        qty: "META",
        material: "PROJECT_INFO",
        prices: this.state.projectInfo,
        winner: "",
        status: "ACTIVE",
        updated_at: new Date().toISOString()
      });
    }
  },

  // 1. Orçamentos
  saveBudget(budgetData) {
    let savedItem = null;
    if (budgetData.id) {
      const idx = this.state.budgets.findIndex(b => b.id === budgetData.id);
      if (idx !== -1) {
        this.state.budgets[idx] = { ...this.state.budgets[idx], ...budgetData };
        savedItem = this.state.budgets[idx];
      }
    } else {
      budgetData.id = "etapa-" + Date.now();
      this.state.budgets.push(budgetData);
      savedItem = budgetData;
    }
    this.saveLocalOnly();
    if (savedItem && window.ObraDB) {
      window.ObraDB.syncRecordUpsert("obra_budgets", window.ObraDB.mapBudgetToRow(savedItem));
    }
  },

  deleteBudget(id) {
    this.state.budgets = this.state.budgets.filter(b => b.id !== id);
    this.saveLocalOnly();
    if (window.ObraDB) {
      window.ObraDB.syncRecordDelete("obra_budgets", id);
    }
  },

  // 2. Compras
  savePurchase(purchaseData) {
    let savedItem = null;
    if (purchaseData.id) {
      const idx = this.state.purchases.findIndex(p => p.id === purchaseData.id);
      if (idx !== -1) {
        this.state.purchases[idx] = { ...this.state.purchases[idx], ...purchaseData };
        savedItem = this.state.purchases[idx];
      }
    } else {
      purchaseData.id = "comp-" + Date.now();
      this.state.purchases.unshift(purchaseData);
      savedItem = purchaseData;
    }
    this.saveLocalOnly();
    if (savedItem && window.ObraDB) {
      window.ObraDB.syncRecordUpsert("obra_purchases", window.ObraDB.mapPurchaseToRow(savedItem));
    }
  },

  togglePurchaseStatus(id) {
    const item = this.state.purchases.find(p => p.id === id);
    if (item) {
      item.status = item.status === "Pago" ? "Pendente" : "Pago";
      this.saveLocalOnly();
      if (window.ObraDB) {
        window.ObraDB.syncRecordUpsert("obra_purchases", window.ObraDB.mapPurchaseToRow(item));
      }
    }
  },

  deletePurchase(id) {
    this.state.purchases = this.state.purchases.filter(p => p.id !== id);
    this.saveLocalOnly();
    if (window.ObraDB) {
      window.ObraDB.syncRecordDelete("obra_purchases", id);
    }
  },

  // 3. Equipamentos
  saveEquipment(equipData) {
    let savedItem = null;
    if (equipData.id) {
      const idx = this.state.equipments.findIndex(e => e.id === equipData.id);
      if (idx !== -1) {
        this.state.equipments[idx] = { ...this.state.equipments[idx], ...equipData };
        savedItem = this.state.equipments[idx];
      }
    } else {
      equipData.id = "eq-" + Date.now();
      this.state.equipments.unshift(equipData);
      savedItem = equipData;
    }
    this.saveLocalOnly();
    if (savedItem && window.ObraDB) {
      window.ObraDB.syncRecordUpsert("obra_equipments", window.ObraDB.mapEquipmentToRow(savedItem));
    }
  },

  markEquipmentReturned(id) {
    const item = this.state.equipments.find(e => e.id === id);
    if (item) {
      const refDate = (this.state.projectInfo && this.state.projectInfo.referenceDate) || "2026-11-10";
      item.rentalStatus = "Devolvido";
      item.actualReturnDate = refDate;
      this.saveLocalOnly();
      if (window.ObraDB) {
        window.ObraDB.syncRecordUpsert("obra_equipments", window.ObraDB.mapEquipmentToRow(item));
      }
    }
  },

  deleteEquipment(id) {
    this.state.equipments = this.state.equipments.filter(e => e.id !== id);
    this.saveLocalOnly();
    if (window.ObraDB) {
      window.ObraDB.syncRecordDelete("obra_equipments", id);
    }
  },

  // 4. Mão de Obra
  saveLabor(laborData) {
    let savedItem = null;
    if (laborData.id) {
      const idx = this.state.labor.findIndex(l => l.id === laborData.id);
      if (idx !== -1) {
        this.state.labor[idx] = { ...this.state.labor[idx], ...laborData };
        savedItem = this.state.labor[idx];
      }
    } else {
      laborData.id = "mo-" + Date.now();
      this.state.labor.unshift(laborData);
      savedItem = laborData;
    }
    this.saveLocalOnly();
    if (savedItem && window.ObraDB) {
      window.ObraDB.syncRecordUpsert("obra_labor", window.ObraDB.mapLaborToRow(savedItem));
    }
  },

  toggleLaborStatus(id) {
    const item = this.state.labor.find(l => l.id === id);
    if (item) {
      item.status = item.status === "Pago" ? "Pendente" : "Pago";
      this.saveLocalOnly();
      if (window.ObraDB) {
        window.ObraDB.syncRecordUpsert("obra_labor", window.ObraDB.mapLaborToRow(item));
      }
    }
  },

  deleteLabor(id) {
    this.state.labor = this.state.labor.filter(l => l.id !== id);
    this.saveLocalOnly();
    if (window.ObraDB) {
      window.ObraDB.syncRecordDelete("obra_labor", id);
    }
  }
};
