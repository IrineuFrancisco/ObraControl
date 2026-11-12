/**
 * Camada de Integração com Banco de Dados em Nuvem (Supabase PostgreSQL + Auth + Storage + Realtime)
 * Segurança de Produção: Exige Autenticação (E-mail e Senha) via Supabase Auth + Row Level Security (RLS),
 * garantindo segurança total mesmo quando hospedado publicamente no GitHub Pages.
 */

const DB_CONFIG_KEY = "obracontrol_supabase_config_v1";

// A Project URL e a Anon Key são chaves públicas de cliente.
// A segurança real é garantida pelo Login (Supabase Auth) + Políticas RLS (TO authenticated).
window.OBRA_DEFAULT_SUPABASE_CONFIG = {
  url: "",      // Ex: "https://xyzcompany.supabase.co"
  anonKey: "",  // Ex: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  autoSync: true
};

window.ObraDB = {
  client: null,
  config: null,
  user: null,
  status: "LOCAL", // 'LOCAL' | 'AUTH_REQUIRED' | 'CONNECTING' | 'CONNECTED' | 'SYNCING' | 'ERROR'
  lastSyncAt: null,
  lastError: null,
  realtimeChannel: null,

  async init() {
    this.loadConfig();
    this.updateStatusUI();

    if (this.isConfigured()) {
      await this.initClientAndCheckAuth();
    }
  },

  loadConfig() {
    try {
      const saved = localStorage.getItem(DB_CONFIG_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
      } else {
        this.config = { ...window.OBRA_DEFAULT_SUPABASE_CONFIG };
      }
    } catch (e) {
      this.config = { ...window.OBRA_DEFAULT_SUPABASE_CONFIG };
    }
  },

  saveConfig(url, anonKey, autoSync = true) {
    this.config = {
      url: (url || "").trim().replace(/\/$/, ""),
      anonKey: (anonKey || "").trim(),
      autoSync: Boolean(autoSync)
    };
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(this.config));
  },

  async disconnect() {
    if (this.realtimeChannel && this.client) {
      this.client.removeChannel(this.realtimeChannel);
    }
    if (this.client && this.user) {
      await this.client.auth.signOut().catch(() => { });
    }
    this.client = null;
    this.user = null;
    this.realtimeChannel = null;
    this.saveConfig("", "", true);
    this.setStatus("LOCAL", "Modo Local (Offline)");
  },

  MASTER_EMAILS: ["irineufrancisco@gmail.com", "irineufrancisco@gail.com"],

  isConfigured() {
    return Boolean(this.config && this.config.url && this.config.anonKey);
  },

  isAuthenticated() {
    return Boolean(this.client && this.user);
  },

  isMasterAdmin(emailOverride = null) {
    const email = String(emailOverride || (this.user && this.user.email) || "").trim().toLowerCase();
    return this.MASTER_EMAILS.includes(email);
  },

  setStatus(status, message = "") {
    this.status = status;
    if (status === "ERROR") {
      this.lastError = message;
    } else {
      this.lastError = null;
    }
    this.updateStatusUI(message);
  },

  updateStatusUI() {
    const isMaster = this.isMasterAdmin();

    // Exibe ou oculta elementos exclusivos do Administrador Master (irineufrancisco@gmail.com)
    document.querySelectorAll(".master-admin-only").forEach(el => {
      if (isMaster) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });

    // Se o usuário atual não for Master e estiver na aba 'admin', redireciona para 'dashboard'
    if (!isMaster && window.ObraApp && window.ObraApp.currentTab === "admin") {
      window.ObraApp.switchTab("dashboard");
    }

    const badges = document.querySelectorAll(".db-status-indicator");
    badges.forEach(el => {
      if (this.status === "CONNECTED" && this.user) {
        const userLabel = this.user.email.split("@")[0];
        const roleTag = isMaster ? "Master" : "Online";
        el.className = "db-status-indicator inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors";
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span><span class="hidden sm:inline">${userLabel} (${roleTag})</span><span class="sm:hidden">Conta</span>`;
      } else if (this.status === "AUTH_REQUIRED") {
        el.className = "db-status-indicator inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer hover:bg-amber-200 transition-colors";
        el.innerHTML = `<i data-lucide="log-in" class="w-3.5 h-3.5 text-amber-700"></i><span>Entrar / Login</span>`;
      } else if (this.status === "SYNCING" || this.status === "CONNECTING") {
        el.className = "db-status-indicator inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer transition-colors";
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span><span>Autenticando...</span>`;
      } else if (this.status === "ERROR") {
        el.className = "db-status-indicator inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 cursor-pointer hover:bg-red-200 transition-colors";
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-600"></span><span>Login / Status</span>`;
      } else {
        el.className = "db-status-indicator inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors";
        el.innerHTML = `<i data-lucide="user-lock" class="w-3.5 h-3.5 text-slate-600"></i><span>Entrar / Login</span>`;
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Inicializa o SDK do Supabase e verifica se já existe sessão autenticada
  async initClientAndCheckAuth() {
    if (!this.isConfigured()) {
      this.setStatus("LOCAL");
      return { ok: false, error: "URL ou Chave não configuradas." };
    }

    if (!window.supabase || !window.supabase.createClient) {
      this.setStatus("ERROR", "Biblioteca Supabase não carregada.");
      return { ok: false, error: "SDK do Supabase não encontrado." };
    }

    try {
      this.setStatus("CONNECTING");
      this.client = window.supabase.createClient(this.config.url, this.config.anonKey);

      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;

      if (data && data.session && data.session.user) {
        this.user = data.session.user;
        return await this.connectAndSync();
      } else {
        this.user = null;
        this.setStatus("AUTH_REQUIRED");
        return { ok: true, authRequired: true };
      }
    } catch (err) {
      console.error("Erro ao inicializar cliente Supabase:", err);
      this.setStatus("ERROR", err.message || "Falha de conexão");
      return { ok: false, error: err.message || "Falha ao conectar com o Supabase." };
    }
  },

  translateAuthError(msg = "") {
    const m = String(msg);
    if (m.includes("Email not confirmed")) {
      return "Seu usuário já foi criado, mas o Supabase está aguardando confirmação do e-mail! Para liberar na hora sem precisar abrir o e-mail, execute o script atualizado do arquivo supabase_schema.sql no SQL Editor do Supabase e depois clique em 'Entrar e Sincronizar'.";
    }
    if (m.includes("only request this after")) {
      return "A conta já foi solicitada! O Supabase bloqueia cliques repetidos em 'Criar 1º Acesso' por 60 segundos. Execute o script atualizado do supabase_schema.sql no SQL Editor (que confirma seu usuário automaticamente) e clique apenas no botão amarelo 'Entrar e Sincronizar'.";
    }
    if (m.includes("Invalid login credentials")) {
      return "E-mail ou senha incorretos (ou usuário ainda não cadastrado). Se for seu primeiro acesso, clique em 'Criar 1º Acesso'.";
    }
    if (m.includes("User already registered")) {
      return "Este e-mail já está cadastrado! Clique no botão amarelo 'Entrar e Sincronizar'.";
    }
    return m;
  },

  // Login com E-mail e Senha (Supabase Auth)
  async signIn(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();

    // Caso o banco ainda não esteja configurado neste navegador:
    // Se for o usuário Master (irineufrancisco@gmail.com), libera o acesso à Área de Administrador
    // para que ele possa inserir as credenciais do banco lá dentro!
    if (!this.isConfigured()) {
      if (this.isMasterAdmin(cleanEmail)) {
        this.user = { email: cleanEmail, isLocalMaster: true };
        this.pendingMasterEmail = cleanEmail;
        this.pendingMasterPass = password;
        this.updateStatusUI();
        return { ok: true, masterSetupMode: true };
      }
      return {
        ok: false,
        error: "O banco de dados ainda não foi configurado neste navegador pelo Administrador Master."
      };
    }

    if (!this.client) {
      const initRes = await this.initClientAndCheckAuth();
      if (!initRes.ok && !initRes.authRequired) return initRes;
    }

    try {
      this.setStatus("CONNECTING");
      const { data, error } = await this.client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        this.setStatus("AUTH_REQUIRED");
        return { ok: false, error: this.translateAuthError(error.message) };
      }

      this.user = data.user;
      this.pendingMasterEmail = null;
      this.pendingMasterPass = null;
      return await this.connectAndSync();
    } catch (err) {
      this.setStatus("AUTH_REQUIRED");
      return { ok: false, error: this.translateAuthError(err.message) };
    }
  },

  // Criar nova conta de usuário no Supabase Auth
  async signUp(email, password) {
    if (!this.client) {
      const initRes = await this.initClientAndCheckAuth();
      if (!initRes.ok && !initRes.authRequired) return initRes;
    }

    try {
      this.setStatus("CONNECTING");
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password
      });

      if (error) {
        // Se já estiver registrado, tenta fazer login direto!
        if (String(error.message).includes("User already registered")) {
          return await this.signIn(email, password);
        }
        this.setStatus("AUTH_REQUIRED");
        return { ok: false, error: this.translateAuthError(error.message) };
      }

      if (data && data.session && data.user) {
        this.user = data.user;
        return await this.connectAndSync();
      } else {
        // Tenta fazer login imediatamente (caso o trigger SQL de auto-confirmação esteja ativo no banco!)
        const loginTry = await this.client.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (!loginTry.error && loginTry.data?.user) {
          this.user = loginTry.data.user;
          return await this.connectAndSync();
        }

        this.setStatus("AUTH_REQUIRED");
        return {
          ok: true,
          needsConfirmation: true,
          message: "Conta criada! Para liberar o login imediato sem depender de confirmação por e-mail, execute o script supabase_schema.sql no SQL Editor do Supabase e clique em 'Entrar e Sincronizar'."
        };
      }
    } catch (err) {
      this.setStatus("AUTH_REQUIRED");
      return { ok: false, error: this.translateAuthError(err.message) };
    }
  },

  async signOut() {
    if (this.realtimeChannel && this.client) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    if (this.client) {
      await this.client.auth.signOut().catch(() => { });
    }
    this.user = null;
    this.setStatus("AUTH_REQUIRED");
  },

  async connectAndSync() {
    if (!this.client) {
      return await this.initClientAndCheckAuth();
    }
    if (!this.user) {
      this.setStatus("AUTH_REQUIRED");
      return { ok: false, authRequired: true, error: "Faça login com seu e-mail e senha para sincronizar com o banco." };
    }

    try {
      const pullResult = await this.pullFromCloud();
      if (!pullResult.ok) {
        return pullResult;
      }

      this.subscribeRealtime();
      this.lastSyncAt = new Date();
      this.setStatus("CONNECTED");
      return { ok: true };
    } catch (err) {
      console.error("Erro ao sincronizar com Supabase:", err);
      this.setStatus("ERROR", err.message || "Falha de sincronização");
      return { ok: false, error: err.message || "Falha ao sincronizar com o Supabase." };
    }
  },

  // =========================================================================
  // MAPEAMENTO ENTRE OBJETOS DO APP (camelCase) E TABELAS SQL (snake_case)
  // =========================================================================
  mapBudgetToRow(b) {
    return {
      id: b.id,
      stage: b.stage,
      category: b.category,
      planned_amount: Number(b.plannedAmount || 0),
      description: b.description || "",
      color: b.color || "#2563eb",
      updated_at: new Date().toISOString()
    };
  },
  mapRowToBudget(r) {
    return {
      id: r.id,
      stage: r.stage,
      category: r.category,
      plannedAmount: Number(r.planned_amount || 0),
      description: r.description || "",
      color: r.color || "#2563eb"
    };
  },

  mapPurchaseToRow(p) {
    return {
      id: p.id,
      date: p.date,
      item: p.item,
      quantity: Number(p.quantity || 1),
      unit: p.unit || "un",
      unit_price: Number(p.unitPrice || 0),
      discount: Number(p.discount || 0),
      total_price: Number(p.totalPrice || 0),
      supplier: p.supplier,
      stage: p.stage,
      category: p.category || "Materiais",
      payment_method: p.paymentMethod || "PIX",
      status: p.status || "Pago",
      invoice_number: p.invoiceNumber || "",
      receipt_url: p.receiptUrl || "",
      notes: p.notes || "",
      updated_at: new Date().toISOString()
    };
  },
  mapRowToPurchase(r) {
    return {
      id: r.id,
      date: r.date,
      item: r.item,
      quantity: Number(r.quantity || 1),
      unit: r.unit || "un",
      unitPrice: Number(r.unit_price || 0),
      discount: Number(r.discount || 0),
      totalPrice: Number(r.total_price || 0),
      supplier: r.supplier,
      stage: r.stage,
      category: r.category || "Materiais",
      paymentMethod: r.payment_method || "PIX",
      status: r.status || "Pago",
      invoiceNumber: r.invoice_number || "",
      receiptUrl: r.receipt_url || "",
      notes: r.notes || ""
    };
  },

  mapEquipmentToRow(e) {
    return {
      id: e.id,
      name: e.name,
      supplier: e.supplier,
      stage: e.stage,
      start_date: e.startDate,
      expected_return_date: e.expectedReturnDate,
      actual_return_date: e.actualReturnDate || "",
      billing_type: e.billingType || "Diária",
      unit_rate: Number(e.unitRate || 0),
      quantity: Number(e.quantity || 1),
      total_price: Number(e.totalPrice || 0),
      payment_status: e.paymentStatus || "Pendente",
      rental_status: e.rentalStatus || "Em Uso",
      notes: e.notes || "",
      updated_at: new Date().toISOString()
    };
  },
  mapRowToEquipment(r) {
    return {
      id: r.id,
      name: r.name,
      supplier: r.supplier,
      stage: r.stage,
      startDate: r.start_date,
      expectedReturnDate: r.expected_return_date,
      actualReturnDate: r.actual_return_date || "",
      billingType: r.billing_type || "Diária",
      unitRate: Number(r.unit_rate || 0),
      quantity: Number(r.quantity || 1),
      totalPrice: Number(r.total_price || 0),
      paymentStatus: r.payment_status || "Pendente",
      rentalStatus: r.rental_status || "Em Uso",
      notes: r.notes || ""
    };
  },

  mapLaborToRow(l) {
    return {
      id: l.id,
      date: l.date,
      worker_name: l.workerName,
      role: l.role,
      contract_type: l.contractType || "Diária",
      quantity: Number(l.quantity || 1),
      unit_rate: Number(l.unitRate || 0),
      total_price: Number(l.totalPrice || 0),
      stage: l.stage,
      status: l.status || "Pago",
      payment_method: l.paymentMethod || "PIX",
      notes: l.notes || "",
      updated_at: new Date().toISOString()
    };
  },
  mapRowToLabor(r) {
    return {
      id: r.id,
      date: r.date,
      workerName: r.worker_name,
      role: r.role,
      contractType: r.contract_type || "Diária",
      quantity: Number(r.quantity || 1),
      unitRate: Number(r.unit_rate || 0),
      totalPrice: Number(r.total_price || 0),
      stage: r.stage,
      status: r.status || "Pago",
      paymentMethod: r.payment_method || "PIX",
      notes: r.notes || ""
    };
  },

  mapQuotationToRow(q) {
    return {
      id: q.id,
      qty: q.qty,
      material: q.material,
      prices: q.prices || {},
      winner: q.winner || "",
      status: q.status || "",
      updated_at: new Date().toISOString()
    };
  },
  mapRowToQuotation(r) {
    return {
      id: r.id,
      qty: r.qty,
      material: r.material,
      prices: r.prices || {},
      winner: r.winner || "",
      status: r.status || ""
    };
  },

  // =========================================================================
  // SINCRONIZAÇÃO COMPLETA (PULL & PUSH) - REQUER SESSÃO AUTENTICADA
  // =========================================================================
  async pullFromCloud() {
    if (!this.client || !this.user) {
      return { ok: false, error: "Sessão não autenticada. Faça login primeiro." };
    }

    try {
      this.setStatus("SYNCING");

      const [resBudgets, resPurchases, resEquipments, resLabor, resQuotations] = await Promise.all([
        this.client.from("obra_budgets").select("*"),
        this.client.from("obra_purchases").select("*").order("date", { ascending: false }),
        this.client.from("obra_equipments").select("*").order("start_date", { ascending: false }),
        this.client.from("obra_labor").select("*").order("date", { ascending: false }),
        this.client.from("obra_quotations").select("*")
      ]);

      const firstErr = resBudgets.error || resPurchases.error || resEquipments.error || resLabor.error || resQuotations.error;
      if (firstErr) {
        const msg = firstErr.message || "Erro ao consultar tabelas no Supabase.";
        this.setStatus("ERROR", msg);
        return {
          ok: false,
          error: `Erro no banco: "${msg}". Verifique se executou o script supabase_schema.sql no SQL Editor.`
        };
      }

      const cloudEmpty =
        (!resBudgets.data || resBudgets.data.length === 0) &&
        (!resPurchases.data || resPurchases.data.length === 0) &&
        (!resEquipments.data || resEquipments.data.length === 0) &&
        (!resLabor.data || resLabor.data.length === 0);

      if (cloudEmpty) {
        if (!window.ObraStore.state.budgets || window.ObraStore.state.budgets.length === 0) {
          window.ObraStore.resetToDefault(false);
          window.ObraStore.saveLocalOnly();
        }
        await this.pushAllToCloud();
        if (window.ObraApp) window.ObraApp.renderAll();
      } else {
        if (resBudgets.data && resBudgets.data.length > 0) {
          window.ObraStore.state.budgets = resBudgets.data.map(r => this.mapRowToBudget(r));
        }
        if (resPurchases.data) {
          window.ObraStore.state.purchases = resPurchases.data.map(r => this.mapRowToPurchase(r));
        }
        if (resEquipments.data) {
          window.ObraStore.state.equipments = resEquipments.data.map(r => this.mapRowToEquipment(r));
        }
        if (resLabor.data) {
          window.ObraStore.state.labor = resLabor.data.map(r => this.mapRowToLabor(r));
        }
        if (resQuotations.data && resQuotations.data.length > 0) {
          const metaRow = resQuotations.data.find(r => r.id === "__project_info__");
          if (metaRow && metaRow.prices) {
            window.ObraStore.state.projectInfo = {
              ...(window.ObraStore.state.projectInfo || {}),
              ...metaRow.prices
            };
          }
          const normalRows = resQuotations.data.filter(r => r.id !== "__project_info__");
          if (normalRows.length > 0) {
            window.ObraStore.state.quotations = normalRows.map(r => this.mapRowToQuotation(r));
          }
        }
        window.ObraStore.saveLocalOnly();
        if (window.ObraApp) window.ObraApp.renderAll();
      }

      this.lastSyncAt = new Date();
      this.setStatus("CONNECTED");
      return { ok: true };
    } catch (e) {
      this.setStatus("ERROR", e.message);
      return { ok: false, error: e.message };
    }
  },

  async pushAllToCloud() {
    if (!this.client || !this.user) {
      return { ok: false, error: "Faça login com seu e-mail e senha antes de enviar dados." };
    }
    try {
      this.setStatus("SYNCING");
      const st = window.ObraStore.state;

      const ops = [];
      if (st.budgets && st.budgets.length > 0) {
        ops.push(this.client.from("obra_budgets").upsert(st.budgets.map(b => this.mapBudgetToRow(b))));
      }
      if (st.purchases && st.purchases.length > 0) {
        ops.push(this.client.from("obra_purchases").upsert(st.purchases.map(p => this.mapPurchaseToRow(p))));
      }
      if (st.equipments && st.equipments.length > 0) {
        ops.push(this.client.from("obra_equipments").upsert(st.equipments.map(e => this.mapEquipmentToRow(e))));
      }
      if (st.labor && st.labor.length > 0) {
        ops.push(this.client.from("obra_labor").upsert(st.labor.map(l => this.mapLaborToRow(l))));
      }
      const quotationRows = (st.quotations || []).map(q => this.mapQuotationToRow(q));
      if (st.projectInfo) {
        quotationRows.push({
          id: "__project_info__",
          qty: "META",
          material: "PROJECT_INFO",
          prices: st.projectInfo,
          winner: "",
          status: "ACTIVE",
          updated_at: new Date().toISOString()
        });
      }
      if (quotationRows.length > 0) {
        ops.push(this.client.from("obra_quotations").upsert(quotationRows));
      }

      const results = await Promise.all(ops);
      const err = results.find(r => r.error)?.error;
      if (err) {
        this.setStatus("ERROR", err.message);
        return { ok: false, error: err.message };
      }

      this.lastSyncAt = new Date();
      this.setStatus("CONNECTED");
      return { ok: true };
    } catch (e) {
      this.setStatus("ERROR", e.message);
      return { ok: false, error: e.message };
    }
  },

  // =========================================================================
  // OPERAÇÕES CRUD EM TEMPO REAL (EXECUTADAS SOMENTE SE LOGADO)
  // =========================================================================
  async syncRecordUpsert(table, rowData) {
    if (!this.client || !this.user || !this.isConfigured()) return;
    try {
      this.setStatus("SYNCING");
      const { error } = await this.client.from(table).upsert(rowData);
      if (error) throw error;
      this.lastSyncAt = new Date();
      this.setStatus("CONNECTED");
    } catch (e) {
      console.error(`Erro ao salvar em ${table}:`, e);
      this.setStatus("ERROR", e.message);
    }
  },

  async syncRecordDelete(table, id) {
    if (!this.client || !this.user || !this.isConfigured()) return;
    try {
      this.setStatus("SYNCING");
      const { error } = await this.client.from(table).delete().eq("id", id);
      if (error) throw error;
      this.lastSyncAt = new Date();
      this.setStatus("CONNECTED");
    } catch (e) {
      console.error(`Erro ao excluir de ${table}:`, e);
      this.setStatus("ERROR", e.message);
    }
  },

  subscribeRealtime() {
    if (!this.client || !this.user) return;
    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.client
      .channel("obra-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "obra_budgets" }, () => this.pullFromCloud())
      .on("postgres_changes", { event: "*", schema: "public", table: "obra_purchases" }, () => this.pullFromCloud())
      .on("postgres_changes", { event: "*", schema: "public", table: "obra_equipments" }, () => this.pullFromCloud())
      .on("postgres_changes", { event: "*", schema: "public", table: "obra_labor" }, () => this.pullFromCloud())
      .subscribe();
  },

  // =========================================================================
  // UPLOAD DE FOTOS DE COMPROVANTES (SUPABASE STORAGE AUTENTICADO + FALLBACK)
  // =========================================================================
  async processAndUploadReceipt(file) {
    if (!file) return "";

    const compressedBlob = await this.compressImageFile(file, 1100, 0.78);

    if (this.client && this.user && this.isConfigured()) {
      try {
        const ext = "jpg";
        const fileName = `nota-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const { error: uploadErr } = await this.client.storage
          .from("comprovantes")
          .upload(fileName, compressedBlob, { contentType: "image/jpeg", upsert: true });

        if (!uploadErr) {
          const { data: pubData } = this.client.storage.from("comprovantes").getPublicUrl(fileName);
          if (pubData && pubData.publicUrl) {
            return pubData.publicUrl;
          }
        }
      } catch (e) {
        console.warn("Bucket 'comprovantes' indisponível, salvando imagem otimizada direto no registro:", e);
      }
    }

    return await this.blobToDataURL(compressedBlob);
  },

  compressImageFile(file, maxDimension = 1100, quality = 0.78) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(blob || file),
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  },

  blobToDataURL(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
};
