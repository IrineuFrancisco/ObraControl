/**
 * Controlador Principal de UI/UX - ObraControl Pro
 */

window.ObraApp = {
  currentTab: "dashboard",
  budgetSubTab: "etapas", // 'etapas' | 'cotacoes'
  categoryChartType: "doughnut", // 'doughnut' | 'bar'
  charts: {
    categoryChart: null,
    stageChart: null
  },

  // Estado de Filtros e Paginação das Tabelas
  filters: {
    purchases: { search: "", stage: "ALL", status: "ALL", category: "ALL", page: 1, perPage: 6 },
    equipments: { search: "", status: "ALL", page: 1, perPage: 6 },
    labor: { search: "", contractType: "ALL", status: "ALL", page: 1, perPage: 6 }
  },

  init() {
    window.ObraStore.init();
    this.bindGlobalEvents();
    this.renderAll();
    if (window.ObraDB) {
      window.ObraDB.init();
    }
  },

  bindGlobalEvents() {
    // Atalhos de teclado (ESC fecha modal/drawer)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeDrawer();
        this.closeReceiptModal();
      }
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    // Atualiza navegação lateral (Desktop) e inferior (Mobile)
    document.querySelectorAll("[data-nav-tab]").forEach(btn => {
      const isTarget = btn.getAttribute("data-nav-tab") === tabName;
      if (btn.classList.contains("desktop-nav-btn")) {
        btn.className = isTarget
          ? "desktop-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-slate-950 shadow-sm transition-all"
          : "desktop-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all";
      } else if (btn.classList.contains("mobile-nav-btn")) {
        btn.className = isTarget
          ? "mobile-nav-btn flex flex-col items-center justify-center py-2 px-1 text-amber-600 font-semibold border-t-2 border-amber-500 transition-all"
          : "mobile-nav-btn flex flex-col items-center justify-center py-2 px-1 text-slate-500 hover:text-slate-800 border-t-2 border-transparent transition-all";
      }
    });

    // Exibe a view correspondente
    document.querySelectorAll("[data-view-section]").forEach(sec => {
      if (sec.getAttribute("data-view-section") === tabName) {
        sec.classList.remove("hidden");
      } else {
        sec.classList.add("hidden");
      }
    });

    this.renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  renderAll() {
    const summary = window.ObraStore.getFinancialSummary();
    this.renderHeaderStats(summary);
    this.renderDashboard(summary);
    this.renderBudgetsModule(summary);
    this.renderPurchasesModule();
    this.renderEquipmentsModule(summary);
    this.renderLaborModule();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  renderHeaderStats(summary) {
    const projectTitleEl = document.getElementById("header-project-name");
    if (projectTitleEl && window.ObraStore.state.projectInfo) {
      projectTitleEl.textContent = window.ObraStore.state.projectInfo.name;
    }

    // Badge de alertas de equipamentos no menu
    const alertCount = summary.equipmentAlerts.length;
    document.querySelectorAll(".equip-alert-badge").forEach(badge => {
      if (alertCount > 0) {
        badge.textContent = alertCount;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    });
  },

  // =========================================================================
  // 1. DASHBOARD (VISÃO GERAL)
  // =========================================================================
  renderDashboard(summary) {
    const fmt = window.ObraStore.formatCurrency;

    // 4 Cards Principais
    document.getElementById("kpi-planned").textContent = fmt(summary.totalPlanned);
    document.getElementById("kpi-spent").textContent = fmt(summary.totalSpent);
    document.getElementById("kpi-paid-sub").textContent = `Pago: ${fmt(summary.totalPaid)}`;
    document.getElementById("kpi-pending-sub").textContent = `Pendente: ${fmt(summary.totalPending)}`;

    const balanceEl = document.getElementById("kpi-balance");
    balanceEl.textContent = fmt(summary.remainingBalance);
    if (summary.remainingBalance < 0) {
      balanceEl.className = "text-2xl sm:text-3xl font-extrabold text-red-600 font-mono-num tracking-tight";
    } else {
      balanceEl.className = "text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono-num tracking-tight";
    }

    const pct = Math.min(999, Math.max(0, summary.progressPercent));
    document.getElementById("kpi-progress-pct").textContent = `${pct.toFixed(1)}%`;

    const progressBar = document.getElementById("kpi-progress-bar");
    progressBar.style.width = `${Math.min(100, pct)}%`;
    if (pct > 100) {
      progressBar.className = "h-2.5 rounded-full bg-red-600 transition-all duration-500";
    } else if (pct > 85) {
      progressBar.className = "h-2.5 rounded-full bg-amber-500 transition-all duration-500";
    } else {
      progressBar.className = "h-2.5 rounded-full bg-blue-600 transition-all duration-500";
    }

    const statusText = document.getElementById("kpi-progress-status");
    if (pct > 100) {
      statusText.innerHTML = `<span class="text-red-600 font-semibold">Orçamento excedido em ${(pct - 100).toFixed(1)}%</span>`;
    } else if (pct > 85) {
      statusText.innerHTML = `<span class="text-amber-600 font-semibold">Atenção: limite próximo (${(100 - pct).toFixed(1)}% livre)</span>`;
    } else {
      statusText.innerHTML = `<span class="text-emerald-600 font-medium">Dentro do planejado (${(100 - pct).toFixed(1)}% disponível)</span>`;
    }

    // Legenda rápida das 4 categorias abaixo do gráfico
    const catContainer = document.getElementById("dashboard-category-pills");
    if (catContainer) {
      const catMeta = [
        { key: "Materiais", color: "bg-blue-600", light: "bg-blue-50 text-blue-800 border-blue-200" },
        { key: "Mão de Obra", color: "bg-emerald-600", light: "bg-emerald-50 text-emerald-800 border-emerald-200" },
        { key: "Equipamentos", color: "bg-violet-600", light: "bg-violet-50 text-violet-800 border-violet-200" },
        { key: "Taxas", color: "bg-pink-600", light: "bg-pink-50 text-pink-800 border-pink-200" }
      ];

      catContainer.innerHTML = catMeta.map(c => {
        const val = summary.byCategory[c.key] || 0;
        const share = summary.totalSpent > 0 ? ((val / summary.totalSpent) * 100).toFixed(1) : "0.0";
        return `
          <div class="p-3 rounded-xl border ${c.light} flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${c.color} shrink-0"></span>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider opacity-80">${c.key}</p>
                <p class="text-sm font-bold font-mono-num">${fmt(val)}</p>
              </div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80">${share}%</span>
          </div>
        `;
      }).join("");
    }

    // Painel de Alertas de Canteiro no Dashboard
    this.renderDashboardAlerts(summary);

    // Últimas compras com comprovante no Dashboard
    this.renderDashboardRecentPurchases();

    // Renderizar Gráficos se a aba dashboard estiver visível
    if (this.currentTab === "dashboard") {
      this.renderCharts(summary);
    }
  },

  renderDashboardAlerts(summary) {
    const container = document.getElementById("dashboard-alerts-list");
    if (!container) return;

    const alertsHtml = [];
    const fmt = window.ObraStore.formatCurrency;

    // 1. Alertas de Equipamentos (Atrasados ou Vencendo em breve)
    summary.equipmentAlerts.forEach(({ equipment, alert }) => {
      const isOverdue = alert.code === "OVERDUE";
      alertsHtml.push(`
        <div class="p-3.5 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} shrink-0 mt-0.5">
              <i data-lucide="${alert.icon}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold uppercase px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}">${alert.label}</span>
                <h4 class="text-sm font-bold text-slate-900">${equipment.name}</h4>
              </div>
              <p class="text-xs text-slate-600 mt-1">${alert.description} • Fornecedor: <strong>${equipment.supplier}</strong> (Previsto: ${window.ObraStore.formatDateBR(equipment.expectedReturnDate)})</p>
            </div>
          </div>
          <button onclick="window.ObraApp.switchTab('equipamentos')" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shrink-0 shadow-2xs">
            Resolver
          </button>
        </div>
      `);
    });

    // 2. Pagamentos Pendentes (Compras + Mão de Obra)
    if (summary.totalPending > 0) {
      alertsHtml.push(`
        <div class="p-3.5 rounded-xl border bg-blue-50/70 border-blue-200 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
              <i data-lucide="calendar-clock" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">Pagamentos Comprometidos Pendentes: <span class="font-mono-num text-blue-700">${fmt(summary.totalPending)}</span></h4>
              <p class="text-xs text-slate-600 mt-0.5">Inclui faturas programadas de materiais (cimento restante), medições de mão de obra e locações a vencer.</p>
            </div>
          </div>
          <button onclick="window.ObraApp.switchTab('compras')" class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shrink-0 shadow-2xs">
            Ver Contas
          </button>
        </div>
      `);
    }

    if (alertsHtml.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500">
          <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
          <p class="text-sm font-medium text-slate-700">Tudo em dia no canteiro de obras!</p>
          <p class="text-xs text-slate-500">Nenhum equipamento atrasado ou pendência crítica.</p>
        </div>
      `;
    } else {
      container.innerHTML = alertsHtml.join("");
    }
  },

  renderDashboardRecentPurchases() {
    const tbody = document.getElementById("dashboard-recent-purchases");
    if (!tbody) return;
    const fmt = window.ObraStore.formatCurrency;
    const fmtDate = window.ObraStore.formatDateBR;

    const recent = (window.ObraStore.state.purchases || []).slice(0, 5);
    tbody.innerHTML = recent.map(p => {
      const isPaid = p.status === "Pago";
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
          <td class="py-3 px-3 text-xs font-mono-num text-slate-600 whitespace-nowrap">${fmtDate(p.date)}</td>
          <td class="py-3 px-3">
            <p class="text-xs font-semibold text-slate-900 line-clamp-1">${p.item}</p>
            <p class="text-[11px] text-slate-500">${p.supplier} • ${p.stage}</p>
          </td>
          <td class="py-3 px-3 text-right text-xs font-bold font-mono-num text-slate-900 whitespace-nowrap">${fmt(p.totalPrice)}</td>
          <td class="py-3 px-3 text-center whitespace-nowrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              <span class="w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : 'bg-amber-600'}"></span>
              ${p.status}
            </span>
          </td>
          <td class="py-3 px-3 text-right whitespace-nowrap">
            ${p.receiptUrl ? `
              <button onclick="window.ObraApp.openReceiptModal('${p.receiptUrl}', '${p.item.replace(/'/g, "\\'")}', '${p.supplier.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors" title="Ver Nota / Orçamento">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Nota
              </button>
            ` : `<span class="text-xs text-slate-400">—</span>`}
          </td>
        </tr>
      `;
    }).join("");
  },

  setCategoryChartType(type) {
    this.categoryChartType = type;
    const btnDoughnut = document.getElementById("btn-chart-doughnut");
    const btnBar = document.getElementById("btn-chart-bar");
    if (btnDoughnut && btnBar) {
      if (type === "doughnut") {
        btnDoughnut.className = "px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white shadow-2xs";
        btnBar.className = "px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900";
      } else {
        btnBar.className = "px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white shadow-2xs";
        btnDoughnut.className = "px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900";
      }
    }
    const summary = window.ObraStore.getFinancialSummary();
    this.renderCharts(summary);
  },

  renderCharts(summary) {
    if (typeof Chart === "undefined") return;

    // 1. Gráfico de Gastos por Categoria
    const ctxCat = document.getElementById("chart-categories");
    if (ctxCat) {
      if (this.charts.categoryChart) {
        this.charts.categoryChart.destroy();
      }

      const labels = Object.keys(summary.byCategory);
      const dataValues = Object.values(summary.byCategory);
      const colors = ["#2563eb", "#10b981", "#8b5cf6", "#ec4899"];

      this.charts.categoryChart = new Chart(ctxCat, {
        type: this.categoryChartType,
        data: {
          labels,
          datasets: [
            {
              label: "Gasto Realizado (R$)",
              data: dataValues,
              backgroundColor: colors,
              borderColor: this.categoryChartType === "doughnut" ? "#ffffff" : colors,
              borderWidth: this.categoryChartType === "doughnut" ? 3 : 1,
              borderRadius: this.categoryChartType === "bar" ? 8 : 0,
              hoverOffset: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: this.categoryChartType === "doughnut" ? "64%" : undefined,
          plugins: {
            legend: {
              display: this.categoryChartType === "doughnut",
              position: "bottom",
              labels: {
                usePointStyle: true,
                padding: 16,
                font: { family: "'Inter', sans-serif", size: 12, weight: "600" }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw || 0;
                  const pct = summary.totalSpent > 0 ? ((val / summary.totalSpent) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${window.ObraStore.formatCurrency(val)} (${pct}%)`;
                }
              }
            }
          },
          scales: this.categoryChartType === "bar" ? {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (v) => "R$ " + Number(v).toLocaleString("pt-BR")
              }
            }
          } : {}
        }
      });
    }

    // 2. Gráfico Orçado vs Realizado por Etapa
    const ctxStage = document.getElementById("chart-stages");
    if (ctxStage) {
      if (this.charts.stageChart) {
        this.charts.stageChart.destroy();
      }

      const stageLabels = summary.stageDetails.map(s =>
        s.stage.length > 22 ? s.stage.substring(0, 22) + "…" : s.stage
      );
      const plannedData = summary.stageDetails.map(s => s.plannedAmount);
      const actualData = summary.stageDetails.map(s => s.actualAmount);

      this.charts.stageChart = new Chart(ctxStage, {
        type: "bar",
        data: {
          labels: stageLabels,
          datasets: [
            {
              label: "Orçamento Previsto",
              data: plannedData,
              backgroundColor: "#cbd5e1",
              borderRadius: 6,
              barPercentage: 0.75
            },
            {
              label: "Valor Gasto (Realizado)",
              data: actualData,
              backgroundColor: summary.stageDetails.map(s =>
                s.percent > 100 ? "#ef4444" : s.percent > 85 ? "#f59e0b" : "#2563eb"
              ),
              borderRadius: 6,
              barPercentage: 0.75
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                padding: 16,
                font: { family: "'Inter', sans-serif", size: 12, weight: "600" }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${window.ObraStore.formatCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (v) => "R$ " + Number(v).toLocaleString("pt-BR")
              }
            }
          }
        }
      });
    }
  },

  // =========================================================================
  // 2. GESTÃO DE ORÇAMENTOS E MAPA DE COTAÇÕES (PLANEJAMENTO)
  // =========================================================================
  switchBudgetSubTab(subTab) {
    this.budgetSubTab = subTab;
    const btnEtapas = document.getElementById("subtab-btn-etapas");
    const btnCotacoes = document.getElementById("subtab-btn-cotacoes");
    const panelEtapas = document.getElementById("subtab-panel-etapas");
    const panelCotacoes = document.getElementById("subtab-panel-cotacoes");

    if (subTab === "etapas") {
      btnEtapas.className = "px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white shadow-2xs transition-all";
      btnCotacoes.className = "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all";
      panelEtapas.classList.remove("hidden");
      panelCotacoes.classList.add("hidden");
    } else {
      btnCotacoes.className = "px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white shadow-2xs transition-all";
      btnEtapas.className = "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all";
      panelCotacoes.classList.remove("hidden");
      panelEtapas.classList.add("hidden");
    }
  },

  renderBudgetsModule(summary) {
    const fmt = window.ObraStore.formatCurrency;
    const cardsContainer = document.getElementById("budgets-stage-cards");
    if (cardsContainer) {
      cardsContainer.innerHTML = summary.stageDetails.map(item => {
        const pct = Math.min(999, Math.max(0, item.percent));
        const isOver = pct > 100;
        const isWarn = pct > 85 && pct <= 100;

        const barColor = isOver ? "bg-red-600" : isWarn ? "bg-amber-500" : "bg-blue-600";
        const badgeClass = isOver
          ? "bg-red-100 text-red-800 border-red-200"
          : isWarn
            ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
        const statusLabel = isOver ? "Orçamento Estourado" : isWarn ? "Alerta (>85%)" : "Dentro da Meta";

        return `
          <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span class="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 mb-1.5">${item.category}</span>
                  <h3 class="text-base font-bold text-slate-900">${item.stage}</h3>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="window.ObraApp.openBudgetDrawer('${item.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Editar Etapa">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.ObraApp.confirmDeleteBudget('${item.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir Etapa">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500 mb-4 line-clamp-2">${item.description || "Sem descrição adicional."}</p>
            </div>

            <div>
              <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 mb-3 text-center">
                <div>
                  <span class="block text-[10px] font-semibold uppercase text-slate-400">Previsto</span>
                  <span class="text-xs sm:text-sm font-bold font-mono-num text-slate-800">${fmt(item.plannedAmount)}</span>
                </div>
                <div class="border-x border-slate-100">
                  <span class="block text-[10px] font-semibold uppercase text-slate-400">Realizado</span>
                  <span class="text-xs sm:text-sm font-bold font-mono-num text-blue-600">${fmt(item.actualAmount)}</span>
                </div>
                <div>
                  <span class="block text-[10px] font-semibold uppercase text-slate-400">Saldo</span>
                  <span class="text-xs sm:text-sm font-bold font-mono-num ${item.balance < 0 ? 'text-red-600' : 'text-emerald-600'}">${fmt(item.balance)}</span>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badgeClass}">${statusLabel}</span>
                <span class="font-bold font-mono-num text-slate-700">${pct.toFixed(1)}% consumido</span>
              </div>
              <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full ${barColor} rounded-full transition-all duration-500" style="width: ${Math.min(100, pct)}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    // Renderizar Tabela Comparativa de Cotações (Planilha Excel do Usuário)
    const cotBody = document.getElementById("quotations-table-body");
    if (cotBody) {
      const suppliers = ["CONSTRUSE", "ACUIA", "PRUDENBLOC", "PRUDENMAT", "PRUDENTAO", "JOMANE", "FENAZ"];
      const quotations = window.ObraStore.state.quotations || [];

      cotBody.innerHTML = quotations.map(row => {
        const validPrices = suppliers
          .map(s => row.prices[s])
          .filter(v => v !== null && v !== undefined && v > 0);
        const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

        const cells = suppliers.map(sup => {
          const val = row.prices[sup];
          if (val === null || val === undefined) {
            return `<td class="py-2.5 px-3 text-center text-xs text-slate-300">—</td>`;
          }
          const isWinner = minPrice !== null && Math.abs(val - minPrice) < 0.01;
          return `
            <td class="py-2.5 px-3 text-right text-xs font-mono-num whitespace-nowrap ${isWinner ? 'bg-emerald-100/90 text-emerald-900 font-bold border-x border-emerald-300' : 'text-slate-600'}">
              ${fmt(val)}
              ${isWinner ? '<span class="ml-1 inline-block text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">Menor</span>' : ''}
            </td>
          `;
        }).join("");

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-2.5 px-3 text-xs font-bold font-mono-num text-slate-700 whitespace-nowrap bg-slate-50/60">${row.qty}</td>
            <td class="py-2.5 px-3 text-xs font-semibold text-slate-900">${row.material}</td>
            ${cells}
            <td class="py-2.5 px-3 text-xs font-semibold text-emerald-700 whitespace-nowrap">${row.status}</td>
          </tr>
        `;
      }).join("");
    }
  },

  // =========================================================================
  // 3. CONTROLE DE COMPRAS (MATERIAIS E TAXAS)
  // =========================================================================
  updatePurchaseFilter(field, value) {
    this.filters.purchases[field] = value;
    if (field !== "page") {
      this.filters.purchases.page = 1;
    }
    this.renderPurchasesModule();
    if (window.lucide) window.lucide.createIcons();
  },

  renderPurchasesModule() {
    const fmt = window.ObraStore.formatCurrency;
    const fmtDate = window.ObraStore.formatDateBR;
    const allPurchases = window.ObraStore.state.purchases || [];
    const f = this.filters.purchases;

    // Popula select de etapas no filtro
    const stageSelect = document.getElementById("filter-purchase-stage");
    if (stageSelect) {
      const stages = [...new Set((window.ObraStore.state.budgets || []).map(b => b.stage))];
      const currentVal = f.stage;
      stageSelect.innerHTML = `<option value="ALL">Todas as Etapas</option>` +
        stages.map(s => `<option value="${s}" ${currentVal === s ? "selected" : ""}>${s}</option>`).join("");
    }

    // Filtragem
    const filtered = allPurchases.filter(p => {
      const q = f.search.trim().toLowerCase();
      const matchSearch = !q ||
        p.item.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));
      const matchStage = f.stage === "ALL" || p.stage === f.stage;
      const matchStatus = f.status === "ALL" || p.status === f.status;
      const matchCat = f.category === "ALL" || p.category === f.category;
      return matchSearch && matchStage && matchStatus && matchCat;
    });

    // Subtotais da filtragem
    const filteredTotal = filtered.reduce((a, b) => a + Number(b.totalPrice || 0), 0);
    const filteredPaid = filtered.filter(p => p.status === "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);
    const filteredPending = filtered.filter(p => p.status !== "Pago").reduce((a, b) => a + Number(b.totalPrice || 0), 0);

    const summaryBar = document.getElementById("purchases-filter-summary");
    if (summaryBar) {
      summaryBar.innerHTML = `
        <span>Exibindo <strong>${filtered.length}</strong> lançamentos</span>
        <span class="hidden sm:inline text-slate-300">|</span>
        <span>Total Filtrado: <strong class="font-mono-num text-slate-900">${fmt(filteredTotal)}</strong></span>
        <span class="hidden sm:inline text-slate-300">|</span>
        <span class="text-emerald-700">Pago: <strong class="font-mono-num">${fmt(filteredPaid)}</strong></span>
        <span class="text-amber-700">Pendente: <strong class="font-mono-num">${fmt(filteredPending)}</strong></span>
      `;
    }

    // Paginação
    const totalPages = Math.max(1, Math.ceil(filtered.length / f.perPage));
    if (f.page > totalPages) f.page = totalPages;
    const startIdx = (f.page - 1) * f.perPage;
    const pageItems = filtered.slice(startIdx, startIdx + f.perPage);

    const tbody = document.getElementById("purchases-table-body");
    if (tbody) {
      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="py-10 text-center text-slate-500">
              <p class="text-sm font-medium">Nenhuma compra encontrada para os filtros selecionados.</p>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = pageItems.map(p => {
          const isPaid = p.status === "Pago";
          return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/90 transition-colors">
              <td class="py-3.5 px-4 text-xs font-mono-num text-slate-600 whitespace-nowrap">
                <div class="font-semibold text-slate-800">${fmtDate(p.date)}</div>
                <div class="text-[11px] text-slate-400">${p.invoiceNumber || "S/N"}</div>
              </td>
              <td class="py-3.5 px-4">
                <div class="text-sm font-bold text-slate-900">${p.item}</div>
                <div class="text-xs text-slate-500 mt-0.5">${p.notes || ""}</div>
              </td>
              <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="text-xs font-semibold text-slate-800">${p.supplier}</div>
                <span class="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">${p.stage}</span>
              </td>
              <td class="py-3.5 px-4 text-right text-xs font-mono-num text-slate-700 whitespace-nowrap">
                ${Number(p.quantity).toLocaleString("pt-BR")} ${p.unit || "un"}
                <div class="text-[11px] text-slate-400">Unit: ${fmt(p.unitPrice)}</div>
              </td>
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="text-sm font-extrabold font-mono-num text-slate-900">${fmt(p.totalPrice)}</div>
                ${Number(p.discount) > 0 ? `<div class="text-[11px] text-emerald-600 font-medium">Desc: -${fmt(p.discount)}</div>` : `<div class="text-[11px] text-slate-400">${p.paymentMethod || "PIX"}</div>`}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <button onclick="window.ObraApp.togglePurchasePaid('${p.id}')" title="Clique para alternar entre Pago e Pendente" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${isPaid ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}">
                  <span class="w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : 'bg-amber-600'}"></span>
                  ${p.status}
                </button>
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                ${p.receiptUrl ? `
                  <button onclick="window.ObraApp.openReceiptModal('${p.receiptUrl}', '${p.item.replace(/'/g, "\\'")}', '${p.supplier.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i> Ver Nota
                  </button>
                ` : `<span class="text-xs text-slate-400">—</span>`}
              </td>
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                  <button onclick="window.ObraApp.openPurchaseDrawer('${p.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Editar">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.ObraApp.confirmDeletePurchase('${p.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    // Controles de paginação
    const pagContainer = document.getElementById("purchases-pagination");
    if (pagContainer) {
      pagContainer.innerHTML = this.buildPaginationHtml(f.page, totalPages, "updatePurchaseFilter");
    }
  },

  togglePurchasePaid(id) {
    window.ObraStore.togglePurchaseStatus(id);
    this.renderAll();
  },

  // =========================================================================
  // 4. ALUGUEL DE EQUIPAMENTOS (COM ALERTAS DE DEVOLUÇÃO)
  // =========================================================================
  updateEquipmentFilter(field, value) {
    this.filters.equipments[field] = value;
    if (field !== "page") this.filters.equipments.page = 1;
    this.renderEquipmentsModule(window.ObraStore.getFinancialSummary());
    if (window.lucide) window.lucide.createIcons();
  },

  renderEquipmentsModule(summary) {
    const fmt = window.ObraStore.formatCurrency;
    const fmtDate = window.ObraStore.formatDateBR;
    const allEquip = window.ObraStore.state.equipments || [];
    const f = this.filters.equipments;

    // Contadores de alerta no topo do módulo
    let overdueCount = 0;
    let dueSoonCount = 0;
    let activeCount = 0;
    allEquip.forEach(eq => {
      const info = window.ObraStore.getEquipmentAlertInfo(eq);
      if (info.code === "OVERDUE") overdueCount++;
      if (info.code === "DUE_SOON") dueSoonCount++;
      if (eq.rentalStatus === "Em Uso") activeCount++;
    });

    const bannerEl = document.getElementById("equipment-alert-banner");
    if (bannerEl) {
      if (overdueCount > 0 || dueSoonCount > 0) {
        bannerEl.innerHTML = `
          <div class="p-4 rounded-2xl border ${overdueCount > 0 ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'} flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div class="flex items-start sm:items-center gap-3">
              <div class="p-2.5 rounded-xl ${overdueCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'} shrink-0">
                <i data-lucide="bell-ring" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  Alerta de Controle de Locação:
                  ${overdueCount > 0 ? `<span class="text-red-700">${overdueCount} equipamento(s) com devolução ATRASADA</span>` : ""}
                  ${overdueCount > 0 && dueSoonCount > 0 ? " e " : ""}
                  ${dueSoonCount > 0 ? `<span class="text-amber-800">${dueSoonCount} vencendo nos próximos 3 dias</span>` : ""}
                </h3>
                <p class="text-xs text-slate-600 mt-0.5">Evite cobrança de diárias adicionais solicitando a retirada ou renovando o pacote junto ao fornecedor.</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button onclick="window.ObraApp.updateEquipmentFilter('status', 'ALERT')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 shadow-2xs">
                Filtrar Alertas (${overdueCount + dueSoonCount})
              </button>
              <button onclick="window.ObraApp.updateEquipmentFilter('status', 'ALL')" class="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900">
                Ver Todos
              </button>
            </div>
          </div>
        `;
      } else {
        bannerEl.innerHTML = "";
      }
    }

    const filtered = allEquip.filter(eq => {
      const q = f.search.trim().toLowerCase();
      const matchSearch = !q ||
        eq.name.toLowerCase().includes(q) ||
        eq.supplier.toLowerCase().includes(q) ||
        (eq.stage && eq.stage.toLowerCase().includes(q));

      const alertInfo = window.ObraStore.getEquipmentAlertInfo(eq);
      let matchStatus = true;
      if (f.status === "ALERT") {
        matchStatus = alertInfo.code === "OVERDUE" || alertInfo.code === "DUE_SOON";
      } else if (f.status === "EM_USO") {
        matchStatus = eq.rentalStatus === "Em Uso";
      } else if (f.status === "DEVOLVIDO") {
        matchStatus = eq.rentalStatus === "Devolvido";
      }
      return matchSearch && matchStatus;
    });

    const tbody = document.getElementById("equipments-table-body");
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-10 text-center text-slate-500 text-sm">Nenhum equipamento encontrado.</td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(eq => {
          const alert = window.ObraStore.getEquipmentAlertInfo(eq);
          const isPaid = eq.paymentStatus === "Pago";
          return `
            <tr class="border-b border-slate-100 transition-colors ${alert.rowClass || 'hover:bg-slate-50'}">
              <td class="py-3.5 px-4">
                <div class="text-sm font-bold text-slate-900">${eq.name}</div>
                <div class="text-xs text-slate-500">${eq.supplier} • <span class="text-slate-600 font-medium">${eq.stage}</span></div>
                ${eq.notes ? `<div class="text-[11px] text-slate-500 mt-0.5 italic">${eq.notes}</div>` : ""}
              </td>
              <td class="py-3.5 px-4 text-xs font-mono-num text-slate-700 whitespace-nowrap">
                <div>Início: <strong>${fmtDate(eq.startDate)}</strong></div>
                <div>Previsto: <strong>${fmtDate(eq.expectedReturnDate)}</strong></div>
                ${eq.actualReturnDate ? `<div class="text-emerald-700">Realizado: <strong>${fmtDate(eq.actualReturnDate)}</strong></div>` : ""}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${alert.badgeClass}">
                  <i data-lucide="${alert.icon}" class="w-3.5 h-3.5"></i>
                  ${alert.label}
                </span>
                <div class="text-[11px] text-slate-500 mt-1">${alert.description}</div>
              </td>
              <td class="py-3.5 px-4 text-right text-xs font-mono-num text-slate-700 whitespace-nowrap">
                <div class="font-semibold">${eq.billingType}</div>
                <div>${eq.quantity}x ${fmt(eq.unitRate)}</div>
              </td>
              <td class="py-3.5 px-4 text-right text-sm font-extrabold font-mono-num text-slate-900 whitespace-nowrap">
                ${fmt(eq.totalPrice)}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${eq.paymentStatus}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                  ${eq.rentalStatus === "Em Uso" ? `
                    <button onclick="window.ObraApp.markReturned('${eq.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors" title="Confirmar Devolução do Equipamento">
                      Devolver
                    </button>
                  ` : ""}
                  <button onclick="window.ObraApp.openEquipmentDrawer('${eq.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60" title="Editar">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.ObraApp.confirmDeleteEquipment('${eq.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }
  },

  markReturned(id) {
    window.ObraStore.markEquipmentReturned(id);
    this.renderAll();
  },

  // =========================================================================
  // 5. MÃO DE OBRA (DIÁRIA, EMPREITADA, MENSAL)
  // =========================================================================
  updateLaborFilter(field, value) {
    this.filters.labor[field] = value;
    if (field !== "page") this.filters.labor.page = 1;
    this.renderLaborModule();
    if (window.lucide) window.lucide.createIcons();
  },

  renderLaborModule() {
    const fmt = window.ObraStore.formatCurrency;
    const fmtDate = window.ObraStore.formatDateBR;
    const allLabor = window.ObraStore.state.labor || [];
    const f = this.filters.labor;

    // Cards de resumo por tipo de contratação (Diária, Empreitada, Mensal)
    const sumByContract = { Diária: 0, Empreitada: 0, Mensal: 0 };
    allLabor.forEach(l => {
      sumByContract[l.contractType] = (sumByContract[l.contractType] || 0) + Number(l.totalPrice || 0);
    });

    const elDiaria = document.getElementById("labor-sum-diaria");
    const elEmpreitada = document.getElementById("labor-sum-empreitada");
    const elMensal = document.getElementById("labor-sum-mensal");
    if (elDiaria) elDiaria.textContent = fmt(sumByContract["Diária"]);
    if (elEmpreitada) elEmpreitada.textContent = fmt(sumByContract["Empreitada"]);
    if (elMensal) elMensal.textContent = fmt(sumByContract["Mensal"]);

    const filtered = allLabor.filter(l => {
      const q = f.search.trim().toLowerCase();
      const matchSearch = !q ||
        l.workerName.toLowerCase().includes(q) ||
        l.role.toLowerCase().includes(q) ||
        (l.stage && l.stage.toLowerCase().includes(q));
      const matchType = f.contractType === "ALL" || l.contractType === f.contractType;
      const matchStatus = f.status === "ALL" || l.status === f.status;
      return matchSearch && matchType && matchStatus;
    });

    const tbody = document.getElementById("labor-table-body");
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-10 text-center text-slate-500 text-sm">Nenhum registro de mão de obra encontrado.</td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(l => {
          const isPaid = l.status === "Pago";
          const badgeColor = l.contractType === "Empreitada"
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : l.contractType === "Diária"
              ? "bg-sky-50 text-sky-700 border-sky-200"
              : "bg-purple-50 text-purple-700 border-purple-200";

          return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="py-3.5 px-4 text-xs font-mono-num text-slate-600 whitespace-nowrap">${fmtDate(l.date)}</td>
              <td class="py-3.5 px-4">
                <div class="text-sm font-bold text-slate-900">${l.workerName}</div>
                <div class="text-xs text-slate-500">${l.role} • <span class="font-medium text-slate-700">${l.stage}</span></div>
                ${l.notes ? `<div class="text-[11px] text-slate-500 mt-0.5">${l.notes}</div>` : ""}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span class="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badgeColor}">
                  ${l.contractType}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right text-xs font-mono-num text-slate-700 whitespace-nowrap">
                ${l.quantity}x ${fmt(l.unitRate)}
              </td>
              <td class="py-3.5 px-4 text-right text-sm font-extrabold font-mono-num text-slate-900 whitespace-nowrap">
                ${fmt(l.totalPrice)}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <button onclick="window.ObraApp.toggleLaborPaid('${l.id}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${isPaid ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}">
                  <span class="w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : 'bg-amber-600'}"></span>
                  ${l.status}
                </button>
              </td>
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1">
                  <button onclick="window.ObraApp.openLaborDrawer('${l.id}')" class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Editar">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                  </button>
                  <button onclick="window.ObraApp.confirmDeleteLabor('${l.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }
  },

  toggleLaborPaid(id) {
    window.ObraStore.toggleLaborStatus(id);
    this.renderAll();
  },

  // =========================================================================
  // PAGINAÇÃO HELPER
  // =========================================================================
  buildPaginationHtml(currentPage, totalPages, handlerName) {
    if (totalPages <= 1) return "";
    let btns = "";
    for (let i = 1; i <= totalPages; i++) {
      const active = i === currentPage;
      btns += `
        <button onclick="window.ObraApp.${handlerName}('page', ${i})" class="w-8 h-8 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}">
          ${i}
        </button>
      `;
    }
    return `
      <div class="flex items-center justify-between pt-3 border-t border-slate-200/80">
        <span class="text-xs text-slate-500">Página <strong>${currentPage}</strong> de <strong>${totalPages}</strong></span>
        <div class="flex items-center gap-1.5">${btns}</div>
      </div>
    `;
  },

  // =========================================================================
  // DRAWERS / MODAIS LATERAIS DE CADASTRO E EDIÇÃO
  // =========================================================================
  openDrawer(title, subtitle, bodyHtml) {
    document.getElementById("drawer-title").textContent = title;
    document.getElementById("drawer-subtitle").textContent = subtitle;
    document.getElementById("drawer-body").innerHTML = bodyHtml;

    const container = document.getElementById("global-drawer");
    container.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  },

  closeDrawer() {
    const container = document.getElementById("global-drawer");
    if (container) container.classList.add("hidden");
  },

  getStageOptionsHtml(selectedStage) {
    const stages = (window.ObraStore.state.budgets || []).map(b => b.stage);
    if (!stages.includes("Fundação e Alicerce")) stages.push("Fundação e Alicerce");
    if (!stages.includes("Estrutura e Alvenaria")) stages.push("Estrutura e Alvenaria");
    if (!stages.includes("Cobertura Metálica e Telhado")) stages.push("Cobertura Metálica e Telhado");
    const unique = [...new Set(stages)];
    return unique.map(s => `<option value="${s}" ${s === selectedStage ? "selected" : ""}>${s}</option>`).join("");
  },

  // --- 1. Form Orçamento (Etapa) ---
  openBudgetDrawer(id = null) {
    const existing = id ? window.ObraStore.state.budgets.find(b => b.id === id) : null;
    const item = existing || {
      id: "",
      stage: "",
      category: "Materiais",
      plannedAmount: "",
      description: ""
    };

    const html = `
      <form onsubmit="window.ObraApp.submitBudgetForm(event)" class="space-y-4">
        <input type="hidden" name="id" value="${item.id}">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Nome da Etapa da Obra *</label>
          <input type="text" name="stage" required value="${item.stage}" placeholder="Ex: Acabamento e Revestimentos" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Categoria Principal *</label>
            <select name="category" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              ${["Materiais", "Mão de Obra", "Equipamentos", "Taxas"].map(c => `<option value="${c}" ${item.category === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Orçamento Previsto (R$) *</label>
            <input type="number" step="0.01" min="0" name="plannedAmount" required value="${item.plannedAmount}" placeholder="0,00" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:ring-2 focus:ring-amber-500 outline-none">
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Escopo / Itens Previstos na Etapa</label>
          <textarea name="description" rows="3" placeholder="Descreva os principais serviços ou insumos previstos..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none">${item.description || ""}</textarea>
        </div>
        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onclick="window.ObraApp.closeDrawer()" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm">Salvar Etapa</button>
        </div>
      </form>
    `;

    this.openDrawer(
      existing ? "Editar Etapa do Orçamento" : "Nova Etapa do Orçamento",
      "Defina o teto de gastos previsto para acompanhar desvios em tempo real.",
      html
    );
  },

  submitBudgetForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    window.ObraStore.saveBudget({
      id: fd.get("id") || "",
      stage: fd.get("stage").trim(),
      category: fd.get("category"),
      plannedAmount: parseFloat(fd.get("plannedAmount")) || 0,
      description: fd.get("description").trim()
    });
    this.closeDrawer();
    this.renderAll();
  },

  confirmDeleteBudget(id) {
    if (confirm("Deseja remover esta etapa de orçamento?")) {
      window.ObraStore.deleteBudget(id);
      this.renderAll();
    }
  },

  // --- 2. Form Compra de Material / Taxa ---
  openPurchaseDrawer(id = null) {
    const existing = id ? window.ObraStore.state.purchases.find(p => p.id === id) : null;
    const item = existing || {
      id: "",
      date: "2026-11-10",
      item: "",
      quantity: 1,
      unit: "un",
      unitPrice: "",
      discount: 0,
      totalPrice: 0,
      supplier: "",
      stage: "Fundação e Alicerce",
      category: "Materiais",
      paymentMethod: "PIX",
      status: "Pago",
      invoiceNumber: "",
      receiptUrl: "",
      notes: ""
    };

    const html = `
      <form onsubmit="window.ObraApp.submitPurchaseForm(event)" class="space-y-4">
        <input type="hidden" name="id" value="${item.id}">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Data da Compra *</label>
            <input type="date" name="date" required value="${item.date}" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Categoria *</label>
            <select name="category" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
              <option value="Materiais" ${item.category === "Materiais" ? "selected" : ""}>Materiais de Construção</option>
              <option value="Taxas" ${item.category === "Taxas" ? "selected" : ""}>Taxas / Projetos / Licenças</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Item / Produto *</label>
          <input type="text" name="item" required value="${item.item}" placeholder="Ex: Cimento CP-II 50kg, Tijolo 8 furos..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
        </div>

        <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd *</label>
            <input type="number" step="0.01" min="0.01" id="form-purch-qty" name="quantity" required value="${item.quantity}" oninput="window.ObraApp.recalcPurchaseTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Unidade</label>
            <select name="unit" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm">
              ${["un", "sc", "kg", "m", "m²", "m³", "pc", "pct", "kit", "vb"].map(u => `<option value="${u}" ${item.unit === u ? "selected" : ""}>${u}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Valor Unit. (R$) *</label>
            <input type="number" step="0.0001" min="0" id="form-purch-unit" name="unitPrice" required value="${item.unitPrice}" oninput="window.ObraApp.recalcPurchaseTotal()" placeholder="0,00" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Desconto (R$)</label>
            <input type="number" step="0.01" min="0" id="form-purch-disc" name="discount" value="${item.discount || 0}" oninput="window.ObraApp.recalcPurchaseTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div class="col-span-2">
            <label class="block text-[11px] font-bold uppercase text-slate-900 mb-1">Valor Total Final (R$) *</label>
            <input type="number" step="0.01" min="0" id="form-purch-total" name="totalPrice" required value="${item.totalPrice}" class="w-full px-3 py-2 rounded-lg border-2 border-amber-500 bg-amber-50/50 text-sm font-extrabold font-mono-num text-slate-900">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Fornecedor *</label>
            <input type="text" name="supplier" required value="${item.supplier}" placeholder="Ex: Calheiros Prudente, Prudenmat..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Etapa da Obra *</label>
            <select name="stage" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
              ${this.getStageOptionsHtml(item.stage)}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Status Pagamento *</label>
            <select name="status" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500">
              <option value="Pago" ${item.status === "Pago" ? "selected" : ""}>Pago</option>
              <option value="Pendente" ${item.status === "Pendente" ? "selected" : ""}>Pendente</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Forma Pagto</label>
            <select name="paymentMethod" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
              ${["PIX", "Boleto", "Cartão de Crédito", "Transferência", "Dinheiro"].map(m => `<option value="${m}" ${item.paymentMethod === m ? "selected" : ""}>${m}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Nº Pedido / Nota</label>
            <input type="text" name="invoiceNumber" value="${item.invoiceNumber || ""}" placeholder="Ex: Orç #468838" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Observações</label>
          <input type="text" name="notes" value="${item.notes || ""}" placeholder="Ex: Entregue no canteiro, vendedor, condições..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
        </div>

        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <label class="block text-xs font-bold uppercase text-slate-700">Foto da Nota Fiscal / Orçamento (Câmera ou Arquivo)</label>
          <input type="file" id="form-purch-file" accept="image/*" capture="environment" class="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
          ${item.receiptUrl ? `<p class="text-[11px] text-emerald-700 font-medium">✓ Este lançamento já possui comprovante anexado (enviar outra foto irá substituí-lo).</p>` : `<p class="text-[11px] text-slate-500">Tire foto direto pelo celular no canteiro ou selecione da galeria.</p>`}
          <input type="hidden" name="receiptUrl" value="${item.receiptUrl || ""}">
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onclick="window.ObraApp.closeDrawer()" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" id="btn-save-purchase" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm">Salvar Compra</button>
        </div>
      </form>
    `;

    this.openDrawer(
      existing ? "Editar Registro de Compra" : "Registrar Nova Compra",
      "Cadastre materiais ou taxas. O saldo da obra e o banco na nuvem serão atualizados automaticamente.",
      html
    );
  },

  recalcPurchaseTotal() {
    const qty = parseFloat(document.getElementById("form-purch-qty")?.value) || 0;
    const unit = parseFloat(document.getElementById("form-purch-unit")?.value) || 0;
    const disc = parseFloat(document.getElementById("form-purch-disc")?.value) || 0;
    const totalEl = document.getElementById("form-purch-total");
    if (totalEl) {
      const total = Math.max(0, qty * unit - disc);
      totalEl.value = total.toFixed(2);
    }
  },

  async submitPurchaseForm(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const btn = document.getElementById("btn-save-purchase");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Salvando...";
    }

    let receiptUrl = fd.get("receiptUrl") || "";
    const fileInput = document.getElementById("form-purch-file");
    if (fileInput && fileInput.files && fileInput.files[0] && window.ObraDB) {
      receiptUrl = await window.ObraDB.processAndUploadReceipt(fileInput.files[0]);
    }

    window.ObraStore.savePurchase({
      id: fd.get("id") || "",
      date: fd.get("date"),
      item: fd.get("item").trim(),
      quantity: parseFloat(fd.get("quantity")) || 1,
      unit: fd.get("unit"),
      unitPrice: parseFloat(fd.get("unitPrice")) || 0,
      discount: parseFloat(fd.get("discount")) || 0,
      totalPrice: parseFloat(fd.get("totalPrice")) || 0,
      supplier: fd.get("supplier").trim(),
      stage: fd.get("stage"),
      category: fd.get("category"),
      paymentMethod: fd.get("paymentMethod"),
      status: fd.get("status"),
      invoiceNumber: fd.get("invoiceNumber").trim(),
      receiptUrl,
      notes: fd.get("notes").trim()
    });
    this.closeDrawer();
    this.renderAll();
  },

  confirmDeletePurchase(id) {
    if (confirm("Deseja realmente excluir este lançamento de compra?")) {
      window.ObraStore.deletePurchase(id);
      this.renderAll();
    }
  },

  // --- 3. Form Aluguel de Equipamentos ---
  openEquipmentDrawer(id = null) {
    const existing = id ? window.ObraStore.state.equipments.find(e => e.id === id) : null;
    const item = existing || {
      id: "",
      name: "",
      supplier: "",
      stage: "Fundação e Alicerce",
      startDate: "2026-11-10",
      expectedReturnDate: "2026-11-17",
      actualReturnDate: "",
      billingType: "Diária",
      unitRate: "",
      quantity: 7,
      totalPrice: 0,
      paymentStatus: "Pendente",
      rentalStatus: "Em Uso",
      notes: ""
    };

    const html = `
      <form onsubmit="window.ObraApp.submitEquipmentForm(event)" class="space-y-4">
        <input type="hidden" name="id" value="${item.id}">
        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Nome do Equipamento *</label>
          <input type="text" name="name" required value="${item.name}" placeholder="Ex: Betoneira 400L, Andaimes, Martelete..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Fornecedor / Locadora *</label>
            <input type="text" name="supplier" required value="${item.supplier}" placeholder="Ex: PrudenLoc Equipamentos" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Etapa da Obra *</label>
            <select name="stage" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
              ${this.getStageOptionsHtml(item.stage)}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Data de Início *</label>
            <input type="date" name="startDate" required value="${item.startDate}" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Devolução Prevista *</label>
            <input type="date" name="expectedReturnDate" required value="${item.expectedReturnDate}" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Devolução Realizada</label>
            <input type="date" name="actualReturnDate" value="${item.actualReturnDate || ""}" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono-num">
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Modalidade</label>
            <select name="billingType" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold">
              ${["Diária", "Pacote Semanal", "Pacote Quinzenal", "Pacote Mensal"].map(b => `<option value="${b}" ${item.billingType === b ? "selected" : ""}>${b}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd (Dias/Pct) *</label>
            <input type="number" step="1" min="1" id="form-eq-qty" name="quantity" required value="${item.quantity}" oninput="window.ObraApp.recalcEquipmentTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Valor Unit. (R$) *</label>
            <input type="number" step="0.01" min="0" id="form-eq-rate" name="unitRate" required value="${item.unitRate}" oninput="window.ObraApp.recalcEquipmentTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div class="col-span-3">
            <label class="block text-[11px] font-bold uppercase text-slate-900 mb-1">Valor Total da Locação (R$) *</label>
            <input type="number" step="0.01" min="0" id="form-eq-total" name="totalPrice" required value="${item.totalPrice}" class="w-full px-3 py-2 rounded-lg border-2 border-amber-500 bg-amber-50/50 text-sm font-extrabold font-mono-num">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Status da Locação *</label>
            <select name="rentalStatus" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold">
              <option value="Em Uso" ${item.rentalStatus === "Em Uso" ? "selected" : ""}>Em Uso no Canteiro</option>
              <option value="Devolvido" ${item.rentalStatus === "Devolvido" ? "selected" : ""}>Devolvido ao Fornecedor</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Status do Pagamento *</label>
            <select name="paymentStatus" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold">
              <option value="Pago" ${item.paymentStatus === "Pago" ? "selected" : ""}>Pago</option>
              <option value="Pendente" ${item.paymentStatus === "Pendente" ? "selected" : ""}>Pendente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Observações</label>
          <input type="text" name="notes" value="${item.notes || ""}" placeholder="Condições do equipamento, contrato, telefone..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onclick="window.ObraApp.closeDrawer()" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm">Salvar Locação</button>
        </div>
      </form>
    `;

    this.openDrawer(
      existing ? "Editar Aluguel de Equipamento" : "Novo Aluguel de Equipamento",
      "Gerencie prazos de devolução e receba alertas automáticos de vencimento.",
      html
    );
  },

  recalcEquipmentTotal() {
    const qty = parseFloat(document.getElementById("form-eq-qty")?.value) || 0;
    const rate = parseFloat(document.getElementById("form-eq-rate")?.value) || 0;
    const totalEl = document.getElementById("form-eq-total");
    if (totalEl) {
      totalEl.value = (qty * rate).toFixed(2);
    }
  },

  submitEquipmentForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const actualReturn = fd.get("actualReturnDate");
    let rentalStatus = fd.get("rentalStatus");
    if (actualReturn) rentalStatus = "Devolvido";

    window.ObraStore.saveEquipment({
      id: fd.get("id") || "",
      name: fd.get("name").trim(),
      supplier: fd.get("supplier").trim(),
      stage: fd.get("stage"),
      startDate: fd.get("startDate"),
      expectedReturnDate: fd.get("expectedReturnDate"),
      actualReturnDate: actualReturn,
      billingType: fd.get("billingType"),
      quantity: parseFloat(fd.get("quantity")) || 1,
      unitRate: parseFloat(fd.get("unitRate")) || 0,
      totalPrice: parseFloat(fd.get("totalPrice")) || 0,
      rentalStatus,
      paymentStatus: fd.get("paymentStatus"),
      notes: fd.get("notes").trim()
    });
    this.closeDrawer();
    this.renderAll();
  },

  confirmDeleteEquipment(id) {
    if (confirm("Deseja remover este registro de equipamento?")) {
      window.ObraStore.deleteEquipment(id);
      this.renderAll();
    }
  },

  // --- 4. Form Mão de Obra ---
  openLaborDrawer(id = null) {
    const existing = id ? window.ObraStore.state.labor.find(l => l.id === id) : null;
    const item = existing || {
      id: "",
      date: "2026-11-10",
      workerName: "",
      role: "Pedreiro",
      contractType: "Diária",
      quantity: 1,
      unitRate: "",
      totalPrice: 0,
      stage: "Estrutura e Alvenaria",
      status: "Pago",
      paymentMethod: "PIX",
      notes: ""
    };

    const html = `
      <form onsubmit="window.ObraApp.submitLaborForm(event)" class="space-y-4">
        <input type="hidden" name="id" value="${item.id}">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Data do Pagamento / Medição *</label>
            <input type="date" name="date" required value="${item.date}" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Tipo de Contratação *</label>
            <select name="contractType" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold">
              <option value="Diária" ${item.contractType === "Diária" ? "selected" : ""}>Diária</option>
              <option value="Empreitada" ${item.contractType === "Empreitada" ? "selected" : ""}>Empreitada</option>
              <option value="Mensal" ${item.contractType === "Mensal" ? "selected" : ""}>Mensal</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Profissional / Empreiteiro *</label>
            <input type="text" name="workerName" required value="${item.workerName}" placeholder="Nome do pedreiro, ajudante ou empresa" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Função *</label>
            <input type="text" name="role" required value="${item.role}" placeholder="Ex: Pedreiro, Servente, Serralheiro..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Qtd (Dias/Medições) *</label>
            <input type="number" step="0.5" min="0.5" id="form-mo-qty" name="quantity" required value="${item.quantity}" oninput="window.ObraApp.recalcLaborTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Valor Unitário (R$) *</label>
            <input type="number" step="0.01" min="0" id="form-mo-rate" name="unitRate" required value="${item.unitRate}" oninput="window.ObraApp.recalcLaborTotal()" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono-num">
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-900 mb-1">Valor Total (R$) *</label>
            <input type="number" step="0.01" min="0" id="form-mo-total" name="totalPrice" required value="${item.totalPrice}" class="w-full px-3 py-2 rounded-lg border-2 border-amber-500 bg-amber-50/50 text-sm font-extrabold font-mono-num">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Etapa Vinculada *</label>
            <select name="stage" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
              ${this.getStageOptionsHtml(item.stage)}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Status do Pagamento *</label>
            <select name="status" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold">
              <option value="Pago" ${item.status === "Pago" ? "selected" : ""}>Pago</option>
              <option value="Pendente" ${item.status === "Pendente" ? "selected" : ""}>Pendente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Observações do Serviço</label>
          <input type="text" name="notes" value="${item.notes || ""}" placeholder="Ex: 1ª quinzena, medição 50% alvenaria..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
        </div>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onclick="window.ObraApp.closeDrawer()" class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm">Salvar Pagamento</button>
        </div>
      </form>
    `;

    this.openDrawer(
      existing ? "Editar Registro de Mão de Obra" : "Registrar Pagamento de Mão de Obra",
      "Controle diárias de ajudantes, empreitadas de pedreiros e mensalistas.",
      html
    );
  },

  recalcLaborTotal() {
    const qty = parseFloat(document.getElementById("form-mo-qty")?.value) || 0;
    const rate = parseFloat(document.getElementById("form-mo-rate")?.value) || 0;
    const totalEl = document.getElementById("form-mo-total");
    if (totalEl) {
      totalEl.value = (qty * rate).toFixed(2);
    }
  },

  submitLaborForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    window.ObraStore.saveLabor({
      id: fd.get("id") || "",
      date: fd.get("date"),
      workerName: fd.get("workerName").trim(),
      role: fd.get("role").trim(),
      contractType: fd.get("contractType"),
      quantity: parseFloat(fd.get("quantity")) || 1,
      unitRate: parseFloat(fd.get("unitRate")) || 0,
      totalPrice: parseFloat(fd.get("totalPrice")) || 0,
      stage: fd.get("stage"),
      status: fd.get("status"),
      paymentMethod: "PIX",
      notes: fd.get("notes").trim()
    });
    this.closeDrawer();
    this.renderAll();
  },

  confirmDeleteLabor(id) {
    if (confirm("Deseja remover este pagamento de mão de obra?")) {
      window.ObraStore.deleteLabor(id);
      this.renderAll();
    }
  },

  // =========================================================================
  // MODAL DE VISUALIZAÇÃO DE COMPROVANTES / NOTAS FISCAIS REAIS
  // =========================================================================
  openReceiptModal(imageUrl, itemTitle, supplierName) {
    const modal = document.getElementById("receipt-lightbox-modal");
    const img = document.getElementById("receipt-lightbox-img");
    const title = document.getElementById("receipt-lightbox-title");
    const sub = document.getElementById("receipt-lightbox-sub");

    if (modal && img) {
      img.src = imageUrl;
      if (title) title.textContent = itemTitle || "Comprovante / Orçamento";
      if (sub) sub.textContent = supplierName || "";
      modal.classList.remove("hidden");
    }
  },

  closeReceiptModal() {
    const modal = document.getElementById("receipt-lightbox-modal");
    if (modal) modal.classList.add("hidden");
  },

  // =========================================================================
  // EXPORTAÇÃO CSV E RESTAURAÇÃO DE DADOS ORIGINAIS
  // =========================================================================
  resetDemoData() {
    if (confirm("Deseja restaurar todos os dados originais da obra (incluindo os lançamentos das notas e planilhas de Presidente Prudente)?")) {
      window.ObraStore.resetToDefault(true);
      this.renderAll();
    }
  },

  exportToCSV() {
    const state = window.ObraStore.state;
    const rows = [
      ["Tipo", "Data", "Descrição / Item", "Fornecedor / Profissional", "Etapa", "Categoria", "Valor Total (R$)", "Status"]
    ];

    (state.purchases || []).forEach(p => {
      rows.push(["Compra", p.date, p.item, p.supplier, p.stage, p.category, p.totalPrice, p.status]);
    });
    (state.equipments || []).forEach(e => {
      rows.push(["Equipamento", e.startDate, e.name, e.supplier, e.stage, "Equipamentos", e.totalPrice, e.paymentStatus]);
    });
    (state.labor || []).forEach(l => {
      rows.push(["Mão de Obra (" + l.contractType + ")", l.date, l.role, l.workerName, l.stage, "Mão de Obra", l.totalPrice, l.status]);
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(field => `"${String(field ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-financeiro-obra.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // =========================================================================
  // PAINEL DE BANCO DE DADOS EM NUVEM (SUPABASE + AUTH LOGIN BLINDADO)
  // =========================================================================
  openDatabaseDrawer() {
    const cfg = (window.ObraDB && window.ObraDB.config) || { url: "", anonKey: "" };
    const status = (window.ObraDB && window.ObraDB.status) || "LOCAL";
    const user = (window.ObraDB && window.ObraDB.user) || null;
    const lastErr = (window.ObraDB && window.ObraDB.lastError) || "";
    const isConnected = status === "CONNECTED";
    const isConfigured = window.ObraDB && window.ObraDB.isConfigured();

    let statusBanner = "";
    if (isConnected && user) {
      statusBanner = `
        <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
            <div>
              <p class="text-xs font-bold text-emerald-900">Nuvem Blindada Ativa (${user.email})</p>
              <p class="text-[11px] text-emerald-700">Sessão autenticada via JWT + RLS. Sincronização em tempo real ativa.</p>
            </div>
          </div>
          <button type="button" onclick="window.ObraApp.handleSignOut()" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-red-50 hover:text-red-700 hover:border-red-200 shrink-0">
            Sair
          </button>
        </div>`;
    } else if (status === "AUTH_REQUIRED") {
      statusBanner = `
        <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-300">
          <p class="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i>
            Projeto Conectado — Aguardando Login de Segurança
          </p>
          <p class="text-[11px] text-amber-800 mt-0.5">O banco de dados está protegido por RLS. Faça login com seu e-mail e senha abaixo para liberar a leitura e gravação na nuvem.</p>
        </div>`;
    } else if (status === "ERROR") {
      statusBanner = `
        <div class="p-3.5 rounded-xl bg-red-50 border border-red-200">
          <p class="text-xs font-bold text-red-900">Falha na conexão com o Banco de Dados</p>
          <p class="text-[11px] text-red-700 mt-0.5">${lastErr}</p>
        </div>`;
    } else {
      statusBanner = `
        <div class="p-3.5 rounded-xl bg-slate-100 border border-slate-300">
          <p class="text-xs font-bold text-slate-900">Modo Local Ativo (Offline-First)</p>
          <p class="text-[11px] text-slate-600 mt-0.5">Configure seu projeto gratuito do Supabase e faça login abaixo para sincronizar entre celular e computador com segurança total.</p>
        </div>`;
    }

    const authSectionHtml = isConfigured
      ? `
        <!-- ETAPA 2: AUTENTICAÇÃO SEGURA (SUPABASE AUTH) -->
        <div class="bg-slate-900 text-white p-4 rounded-2xl space-y-3.5 shadow-sm">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <i data-lucide="lock" class="w-4 h-4"></i>
              ${user ? "Usuário Autenticado" : "Login de Acesso à Obra (Supabase Auth)"}
            </h4>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-semibold border border-slate-700">RLS Blindado</span>
          </div>

          ${user ? `
            <div class="flex items-center justify-between bg-slate-800/90 p-3 rounded-xl border border-slate-700">
              <div>
                <p class="text-xs font-bold text-white">${user.email}</p>
                <p class="text-[11px] text-slate-400">Acesso liberado às tabelas PostgreSQL</p>
              </div>
              <button type="button" onclick="window.ObraApp.handleSignOut()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white">
                Encerrar Sessão
              </button>
            </div>
          ` : `
            <form onsubmit="window.ObraApp.handleAuthSubmit(event, 'login')" class="space-y-3">
              <div>
                <label class="block text-[11px] font-bold uppercase text-slate-300 mb-1">E-mail Autorizado *</label>
                <input type="email" id="auth-input-email" required placeholder="seu-email@exemplo.com" class="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:ring-2 focus:ring-amber-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold uppercase text-slate-300 mb-1">Senha *</label>
                <input type="password" id="auth-input-password" required minlength="6" placeholder="Mínimo 6 caracteres" class="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:ring-2 focus:ring-amber-500">
              </div>

              <div id="auth-feedback" class="hidden text-xs p-2.5 rounded-lg"></div>

              <div class="pt-1">
                <button type="submit" id="btn-auth-login" class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-colors">
                  Entrar e Sincronizar (Acesso Exclusivo do Proprietário)
                </button>
              </div>
            </form>
          `}
        </div>
      `
      : "";

    const html = `
      <div class="space-y-5">
        ${statusBanner}

        ${authSectionHtml}

        <!-- ETAPA 1: CREDENCIAIS PÚBLICAS DO PROJETO -->
        <form onsubmit="window.ObraApp.saveAndTestDatabase(event)" class="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <i data-lucide="database" class="w-4 h-4 text-blue-600"></i>
              Conexão do Projeto Supabase
            </h4>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" class="text-[11px] font-bold text-blue-600 hover:underline">
              Painel Supabase ↗
            </a>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Project URL *</label>
            <input type="url" id="db-input-url" required value="${cfg.url || ""}" placeholder="https://seu-projeto.supabase.co" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono-num outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">API Key (anon / public) *</label>
            <input type="password" id="db-input-key" required value="${cfg.anonKey || ""}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono-num outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-[11px] text-slate-500 mt-1">Chave pública de cliente (segura graças ao bloqueio RLS por login).</p>
          </div>

          <div id="db-connect-feedback" class="hidden text-xs p-2.5 rounded-lg"></div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" id="btn-db-connect" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
              ${isConfigured ? "Atualizar Conexão do Projeto" : "Salvar Projeto e Abrir Login"}
            </button>
            ${cfg.url ? `
              <button type="button" onclick="window.ObraApp.disconnectDatabase()" class="py-2.5 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700">
                Remover
              </button>
            ` : ""}
          </div>
        </form>

        <!-- Ações manuais de Nuvem -->
        <div class="p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-800">Sincronização Manual Nuvem ↔ Dispositivo</h4>
          <div class="grid grid-cols-2 gap-2.5">
            <button type="button" onclick="window.ObraApp.manualPullCloud()" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors">
              <i data-lucide="cloud-download" class="w-4 h-4 text-blue-600"></i> Baixar da Nuvem
            </button>
            <button type="button" onclick="window.ObraApp.manualPushCloud()" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors">
              <i data-lucide="cloud-upload" class="w-4 h-4 text-emerald-600"></i> Enviar p/ Nuvem
            </button>
          </div>
        </div>

        <!-- Passo a Passo + Botão de Copiar SQL Blindado -->
        <div class="p-4 rounded-2xl bg-slate-800 text-slate-100 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-400">Script SQL com RLS Blindado (TO authenticated)</span>
            <button type="button" onclick="window.ObraApp.copySqlSchema()" id="btn-copy-sql" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400">
              Copiar SQL Blindado
            </button>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed">
            No painel do Supabase, abra <strong>SQL Editor → New Query</strong>, cole o script do arquivo <code class="text-amber-300">supabase_schema.sql</code> (ou clique no botão acima) e clique em <strong>Run</strong>. Ele bloqueia qualquer acesso sem login.
          </p>
        </div>

        <!-- Backup em Arquivo JSON (Exportar / Importar) -->
        <div class="p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-800">Backup Direto em Arquivo (.JSON)</h4>
          <div class="grid grid-cols-2 gap-2.5">
            <button type="button" onclick="window.ObraApp.exportJSONBackup()" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Baixar .JSON
            </button>
            <label class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 cursor-pointer">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i> Importar .JSON
              <input type="file" accept=".json,application/json" onchange="window.ObraApp.importJSONBackup(event)" class="hidden">
            </label>
          </div>
        </div>
      </div>
    `;

    this.openDrawer(
      "Segurança & Banco na Nuvem (Supabase)",
      "Protegido com autenticação JWT (E-mail/Senha) e Row Level Security (RLS).",
      html
    );
  },

  async saveAndTestDatabase(e) {
    e.preventDefault();
    const url = document.getElementById("db-input-url")?.value || "";
    const key = document.getElementById("db-input-key")?.value || "";
    const btn = document.getElementById("btn-db-connect");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Verificando projeto...";
    }

    window.ObraDB.saveConfig(url, key, true);
    await window.ObraDB.initClientAndCheckAuth();

    this.openDatabaseDrawer();
    this.renderAll();
  },

  async handleAuthSubmit(e, mode = "login") {
    if (e) e.preventDefault();
    const email = document.getElementById("auth-input-email")?.value || "";
    const password = document.getElementById("auth-input-password")?.value || "";
    const fb = document.getElementById("auth-feedback");
    const btnLogin = document.getElementById("btn-auth-login");
    const btnSignup = document.getElementById("btn-auth-signup");

    if (!email || !password) {
      if (fb) {
        fb.classList.remove("hidden");
        fb.className = "text-xs p-2.5 rounded-lg bg-red-900/60 text-red-200 border border-red-700";
        fb.textContent = "Preencha seu e-mail e senha (mínimo 6 caracteres).";
      }
      return;
    }

    if (btnLogin) btnLogin.disabled = true;
    if (btnSignup) btnSignup.disabled = true;

    const res = mode === "signup"
      ? await window.ObraDB.signUp(email, password)
      : await window.ObraDB.signIn(email, password);

    if (btnLogin) btnLogin.disabled = false;
    if (btnSignup) btnSignup.disabled = false;

    if (res.ok && !res.needsConfirmation) {
      this.openDatabaseDrawer();
      this.renderAll();
    } else if (fb) {
      fb.classList.remove("hidden");
      if (res.needsConfirmation) {
        fb.className = "text-xs p-2.5 rounded-lg bg-emerald-900/60 text-emerald-200 border border-emerald-700";
        fb.textContent = res.message;
      } else {
        fb.className = "text-xs p-2.5 rounded-lg bg-red-900/60 text-red-200 border border-red-700";
        fb.textContent = "✕ " + (res.error || "Erro na autenticação.");
      }
    }
  },

  async handleSignOut() {
    await window.ObraDB.signOut();
    this.openDatabaseDrawer();
    this.renderAll();
  },

  async manualPullCloud() {
    if (!window.ObraDB.isAuthenticated()) {
      alert("Faça login com seu e-mail e senha primeiro.");
      return;
    }
    const res = await window.ObraDB.pullFromCloud();
    if (res.ok) {
      this.renderAll();
      alert("Dados atualizados a partir do banco na nuvem!");
    } else {
      alert("Erro ao baixar dados: " + res.error);
    }
  },

  async manualPushCloud() {
    if (!window.ObraDB.isAuthenticated()) {
      alert("Faça login com seu e-mail e senha primeiro.");
      return;
    }
    const res = await window.ObraDB.pushAllToCloud();
    if (res.ok) {
      alert("Todos os dados locais foram enviados para o Supabase com sucesso!");
    } else {
      alert("Erro ao enviar dados: " + res.error);
    }
  },

  async disconnectDatabase() {
    await window.ObraDB.disconnect();
    this.openDatabaseDrawer();
  },

  async copySqlSchema() {
    const sql = `DROP TRIGGER IF EXISTS trg_auto_confirm_users ON auth.users; DROP FUNCTION IF EXISTS public.auto_confirm_new_users();
UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()), updated_at = NOW() WHERE lower(email) = 'irineufrancisco@gmail.com';
CREATE TABLE IF NOT EXISTS public.obra_budgets (id TEXT PRIMARY KEY, stage TEXT NOT NULL, category TEXT NOT NULL, planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0, description TEXT, color TEXT DEFAULT '#2563eb', updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.obra_purchases (id TEXT PRIMARY KEY, date TEXT NOT NULL, item TEXT NOT NULL, quantity NUMERIC(12,3) NOT NULL DEFAULT 1, unit TEXT DEFAULT 'un', unit_price NUMERIC(12,4) NOT NULL DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0, total_price NUMERIC(12,2) NOT NULL DEFAULT 0, supplier TEXT NOT NULL, stage TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Materiais', payment_method TEXT DEFAULT 'PIX', status TEXT NOT NULL DEFAULT 'Pago', invoice_number TEXT, receipt_url TEXT, notes TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.obra_equipments (id TEXT PRIMARY KEY, name TEXT NOT NULL, supplier TEXT NOT NULL, stage TEXT NOT NULL, start_date TEXT NOT NULL, expected_return_date TEXT NOT NULL, actual_return_date TEXT, billing_type TEXT DEFAULT 'Diária', unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0, quantity NUMERIC(10,2) NOT NULL DEFAULT 1, total_price NUMERIC(12,2) NOT NULL DEFAULT 0, payment_status TEXT NOT NULL DEFAULT 'Pendente', rental_status TEXT NOT NULL DEFAULT 'Em Uso', notes TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.obra_labor (id TEXT PRIMARY KEY, date TEXT NOT NULL, worker_name TEXT NOT NULL, role TEXT NOT NULL, contract_type TEXT NOT NULL DEFAULT 'Diária', quantity NUMERIC(10,2) NOT NULL DEFAULT 1, unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0, total_price NUMERIC(12,2) NOT NULL DEFAULT 0, stage TEXT NOT NULL, status TEXT DEFAULT 'Pago', payment_method TEXT DEFAULT 'PIX', notes TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.obra_quotations (id TEXT PRIMARY KEY, qty TEXT NOT NULL, material TEXT NOT NULL, prices JSONB NOT NULL DEFAULT '{}'::jsonb, winner TEXT, status TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.obra_budgets ENABLE ROW LEVEL SECURITY; ALTER TABLE public.obra_purchases ENABLE ROW LEVEL SECURITY; ALTER TABLE public.obra_equipments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.obra_labor ENABLE ROW LEVEL SECURITY; ALTER TABLE public.obra_quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "p1" ON public.obra_budgets; DROP POLICY IF EXISTS "Auth obra_budgets" ON public.obra_budgets; CREATE POLICY "Auth obra_budgets" ON public.obra_budgets FOR ALL TO authenticated USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com') WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');
DROP POLICY IF EXISTS "p2" ON public.obra_purchases; DROP POLICY IF EXISTS "Auth obra_purchases" ON public.obra_purchases; CREATE POLICY "Auth obra_purchases" ON public.obra_purchases FOR ALL TO authenticated USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com') WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');
DROP POLICY IF EXISTS "p3" ON public.obra_equipments; DROP POLICY IF EXISTS "Auth obra_equipments" ON public.obra_equipments; CREATE POLICY "Auth obra_equipments" ON public.obra_equipments FOR ALL TO authenticated USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com') WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');
DROP POLICY IF EXISTS "p4" ON public.obra_labor; DROP POLICY IF EXISTS "Auth obra_labor" ON public.obra_labor; CREATE POLICY "Auth obra_labor" ON public.obra_labor FOR ALL TO authenticated USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com') WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');
DROP POLICY IF EXISTS "p5" ON public.obra_quotations; DROP POLICY IF EXISTS "Auth obra_quotations" ON public.obra_quotations; CREATE POLICY "Auth obra_quotations" ON public.obra_quotations FOR ALL TO authenticated USING (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com') WITH CHECK (lower(auth.jwt() ->> 'email') = 'irineufrancisco@gmail.com');`;

    try {
      await navigator.clipboard.writeText(sql);
      const btn = document.getElementById("btn-copy-sql");
      if (btn) {
        btn.textContent = "✓ Copiado!";
        setTimeout(() => { btn.textContent = "Copiar SQL Blindado"; }, 2500);
      }
    } catch (e) {
      alert("Abra o arquivo supabase_schema.sql na pasta do projeto para copiar o script.");
    }
  },

  exportJSONBackup() {
    const dataStr = JSON.stringify(window.ObraStore.state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-obra-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importJSONBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.budgets || !parsed.purchases) {
          alert("Arquivo JSON inválido.");
          return;
        }
        window.ObraStore.state = parsed;
        window.ObraStore.saveLocalOnly();
        if (window.ObraDB && window.ObraDB.isConfigured()) {
          await window.ObraDB.pushAllToCloud();
        }
        this.renderAll();
        this.closeDrawer();
        alert("Backup JSON importado com sucesso!");
      } catch (err) {
        alert("Erro ao ler o arquivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.ObraApp.init();
});

