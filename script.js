// =====================
// CONFIGURAÇÃO E DADOS
// =====================
const DB_KEY_FILAMENTOS = 'nexus_filamentos';
const DB_KEY_MAQUINAS = 'nexus_maquinas';
const DB_KEY_ORCAMENTOS = 'nexus_orcamentos';
const DB_KEY_EMPRESA = 'nexus_empresa';

const EMPRESA_PADRAO = {
    nome: 'LB impressões 3D',
    whatsapp: '',
    instagram: '',
    email: '',
    validadeDias: 7,
    condicoes: 'Pagamento: 50% na aprovação e 50% na entrega.\nPix, dinheiro ou cartão.'
};

function carregarEmpresa() {
    try {
        return { ...EMPRESA_PADRAO, ...(JSON.parse(localStorage.getItem(DB_KEY_EMPRESA)) || {}) };
    } catch {
        return { ...EMPRESA_PADRAO };
    }
}

// Escapa texto digitado pelo usuário antes de inserir em HTML
function esc(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Formata valores em reais: 1234.5 -> "R$ 1.234,50"
function brl(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aviso rápido no canto da tela (substitui o alert)
function avisar(mensagem, tipo = 'ok') {
    let area = document.querySelector('.toast-area');
    if (!area) {
        area = document.createElement('div');
        area.className = 'toast-area';
        area.setAttribute('role', 'status');
        document.body.appendChild(area);
    }
    const toast = document.createElement('div');
    toast.className = tipo === 'erro' ? 'toast erro' : 'toast';
    toast.innerHTML = `<i class="fas ${tipo === 'erro' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span></span>`;
    toast.querySelector('span').textContent = mensagem;
    area.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('saindo');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Aviso para mostrar na próxima página (quando a ação termina em redirecionamento)
function avisarDepois(mensagem) {
    sessionStorage.setItem('nexus_aviso', mensagem);
}

function mostrarAvisoPendente() {
    const mensagem = sessionStorage.getItem('nexus_aviso');
    if (!mensagem) return;
    sessionStorage.removeItem('nexus_aviso');
    avisar(mensagem);
}

// Cor aproximada do rolo a partir do nome digitado (para a amostra na tabela)
const CORES_FILAMENTO = {
    'preto': '#1d1d1f', 'branco': '#f4f4f4', 'cinza': '#8e8e93', 'prata': '#c0c4cc',
    'vermelho': '#e0352b', 'vinho': '#7b1e2b', 'azul marinho': '#1f3a6d', 'azul claro': '#6fb6ff',
    'azul': '#2f6fe4', 'ciano': '#25c4d8', 'verde limao': '#a6e22e', 'verde': '#2fa84f',
    'amarelo': '#f7d038', 'laranja': '#ff7a1a', 'rosa': '#f48fb1', 'roxo': '#7e57c2',
    'lilas': '#b39ddb', 'marrom': '#7b4a2d', 'bege': '#e3cfa8', 'dourado': '#d4a537',
    'ouro': '#d4a537', 'bronze': '#b0723b', 'cobre': '#b87333', 'natural': '#efe6d2',
    'transparente': 'rgba(255,255,255,.12)'
};

function semAcento(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function corDoFilamento(nome) {
    const n = semAcento(nome);
    const chave = Object.keys(CORES_FILAMENTO)
        .sort((a, b) => b.length - a.length)
        .find(c => n.includes(c));
    return chave ? CORES_FILAMENTO[chave] : '#5b6275';
}

// Porcentagem restante do rolo e o nível (para cores da barra de estoque)
function nivelEstoque(f) {
    const total = Number(f.pesoTotal || 1000);
    const atual = Math.max(0, Number(f.estoqueAtual || 0));
    const pct = Math.min(100, (atual / total) * 100);
    return { atual, total, pct, classe: pct <= 10 ? 'critico' : pct <= 25 ? 'baixo' : '' };
}

function linhaVazia(colunas, icone, texto) {
    return `<tr class="empty-row"><td colspan="${colunas}"><i class="fas ${icone}"></i>${texto}</td></tr>`;
}

const CLASSES_STATUS = { Pendente: 'status-pendente', Aprovado: 'status-aprovado', Cancelado: 'status-cancelado', Pessoal: 'status-pessoal' };

let filamentos = [];
let maquinas = [];
let orcamentos = [];

let orcamentoAtualCalculado = null;

// Grava no cache local e, se o login na nuvem estiver ativo, no Firestore (ver nuvem.js)
function salvarDados(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
    return window.nuvem ? window.nuvem.salvar(chave, valor) : Promise.resolve();
}

function reloadFromStorage() {
    filamentos = JSON.parse(localStorage.getItem(DB_KEY_FILAMENTOS)) || [];
    maquinas = JSON.parse(localStorage.getItem(DB_KEY_MAQUINAS)) || [];
    orcamentos = JSON.parse(localStorage.getItem(DB_KEY_ORCAMENTOS)) || [];
}

// =====================
// MENU MOBILE
// =====================
function toggleMenu(forceClose = false) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    if (!sidebar || !overlay) return;

    if (forceClose) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        return;
    }

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// =====================
// NAV ACTIVE AUTOMÁTICO
// =====================
function setActiveNavLink() {
    const links = document.querySelectorAll('.sidebar nav a.nav-link');
    if (!links.length) return;

    const current = (location.pathname || '').toLowerCase();

    links.forEach(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        const isActive = href && current.endsWith(href.split('/').pop());
        a.classList.toggle('active', isActive);
    });
}

// =====================
// WRAPPERS (compatível com seus HTMLs)
// =====================
function carregarMaquinas() { renderizarMaquinas(); }
function carregarFilamentos() { renderizarFilamentos(); }
function carregarHistorico() { renderizarHistorico(); }

// =====================
// MÁQUINAS
// =====================
function salvarMaquina() {
    reloadFromStorage();

    const nomeEl = document.getElementById('maq-nome');
    const valorEl = document.getElementById('maq-valor');
    const potEl = document.getElementById('maq-potencia');
    const kwhEl = document.getElementById('maq-kwh');
    const vidaEl = document.getElementById('maq-vida');

    if (!nomeEl || !valorEl) return;

    const nome = (nomeEl.value || '').trim();
    const valor = parseFloat(valorEl.value);
    const potencia = potEl ? parseFloat(potEl.value) : 0;
    const kwh = kwhEl ? parseFloat(kwhEl.value) : 0;
    const vidaUtil = vidaEl ? (parseFloat(vidaEl.value) || 3000) : 3000;

    if (!nome || Number.isNaN(valor)) return avisar("Preencha o nome e o valor da impressora.", "erro");

    const maquina = { id: Date.now(), nome, valor, potencia: potencia || 0, kwh: kwh || 0, vidaUtil };
    maquinas.push(maquina);
    salvarDados(DB_KEY_MAQUINAS, maquinas);

    nomeEl.value = '';
    valorEl.value = '';
    if (potEl) potEl.value = '';
    if (kwhEl) kwhEl.value = '';
    if (vidaEl) vidaEl.value = '3000';

    renderizarMaquinas();
    avisar("Impressora cadastrada!");

    if (document.getElementById('orc-maquina')) carregarOpcoesOrcamento();
}

function renderizarMaquinas() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-maquinas tbody');
    if (!tbody) return;

    if (!maquinas.length) {
        tbody.innerHTML = linhaVazia(6, 'fa-print', 'Nenhuma impressora cadastrada ainda.');
        return;
    }

    tbody.innerHTML = maquinas.map((m, index) => {
        const vida = Number(m.vidaUtil || 3000);
        // Desgaste + energia por hora de impressão (mesma conta da calculadora)
        const custoHora = Number(m.valor || 0) / vida + (Number(m.potencia || 0) / 1000) * Number(m.kwh || 0);
        return `
      <tr>
        <td><div class="fil-nome"><span class="card-icon" style="margin: 0; width: 34px; height: 34px;"><i class="fas fa-print"></i></span><strong>${esc(m.nome)}</strong></div></td>
        <td class="num">${brl(m.valor)}</td>
        <td class="num">${Number(m.potencia || 0)} W</td>
        <td class="num">${vida.toLocaleString('pt-BR')} h</td>
        <td class="num">${brl(custoHora)}<small>/h</small></td>
        <td class="acoes">
          <button class="action-btn btn-delete" type="button" title="Excluir" onclick="deletarMaquina(${index})"><i class="fas fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('');
}

function deletarMaquina(index) {
    reloadFromStorage();

    if (confirm("Excluir esta impressora?")) {
        maquinas.splice(index, 1);
        salvarDados(DB_KEY_MAQUINAS, maquinas);
        renderizarMaquinas();
        if (document.getElementById('orc-maquina')) carregarOpcoesOrcamento();
    }
}

// =====================
// FILAMENTOS
// =====================
function salvarFilamento() {
    reloadFromStorage();

    const marcaEl = document.getElementById('fil-marca');
    const corEl = document.getElementById('fil-cor');
    const tipoEl = document.getElementById('fil-tipo');
    const precoEl = document.getElementById('fil-preco');
    const pesoEl = document.getElementById('fil-peso');

    if (!marcaEl || !precoEl) return;

    const marca = (marcaEl.value || '').trim();
    const cor = corEl ? (corEl.value || '').trim() : '';
    const tipo = tipoEl ? (tipoEl.value || '').trim() : '';
    const preco = parseFloat(precoEl.value);
    const peso = pesoEl ? parseFloat(pesoEl.value) : 1000;

    if (!marca || Number.isNaN(preco)) return avisar("Preencha a marca e o preço do rolo.", "erro");

    const pesoFinal = peso || 1000;
    const custoPorGrama = preco / pesoFinal;

    const filamento = {
        id: Date.now(),
        marca, cor, tipo, preco,
        pesoTotal: pesoFinal,
        estoqueAtual: pesoFinal,
        custoPorGrama
    };

    filamentos.push(filamento);
    salvarDados(DB_KEY_FILAMENTOS, filamentos);

    marcaEl.value = '';
    if (corEl) corEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (precoEl) precoEl.value = '';
    if (pesoEl) pesoEl.value = '1000';

    renderizarFilamentos();
    avisar("Filamento cadastrado!");
}

function renderizarFilamentos() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-filamentos tbody');
    if (!tbody) return;

    if (!filamentos.length) {
        tbody.innerHTML = linhaVazia(5, 'fa-compact-disc', 'Nenhum filamento cadastrado ainda.');
        return;
    }

    tbody.innerHTML = filamentos.map((f, index) => {
        const nivel = nivelEstoque(f);
        const custoGrama = Number(f.custoPorGrama || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 3 });
        return `
      <tr>
        <td>
          <div class="fil-nome">
            <span class="swatch" style="background: ${corDoFilamento(f.cor)};"></span>
            <div>
              <strong>${esc(f.cor || 'Sem cor')}</strong>${f.tipo ? `<span class="fil-tipo">${esc(f.tipo)}</span>` : ''}<br>
              <small>${esc(f.marca)}</small>
            </div>
          </div>
        </td>
        <td class="num">${brl(f.preco)}</td>
        <td class="stock ${nivel.classe}">
          <span class="num">${nivel.atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g</span> <small>de ${nivel.total.toLocaleString('pt-BR')} g</small>
          <div class="stock-bar"><span style="width: ${nivel.pct}%;"></span></div>
        </td>
        <td class="num">${custoGrama}<small>/g</small></td>
        <td class="acoes">
          <button class="action-btn btn-delete" type="button" title="Excluir" onclick="deletarFilamento(${index})"><i class="fas fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('');
}

function deletarFilamento(index) {
    reloadFromStorage();

    if (confirm("Excluir este filamento?")) {
        filamentos.splice(index, 1);
        salvarDados(DB_KEY_FILAMENTOS, filamentos);
        renderizarFilamentos();

        const container = document.getElementById('filamentos-container');
        if (container) {
            container.innerHTML = '';
            adicionarLinhaFilamento(true);
            calcularEmTempoReal();
        }
    }
}

// =====================
// ORÇAMENTO
// =====================
function carregarOpcoesOrcamento() {
    reloadFromStorage();

    const selectMaq = document.getElementById('orc-maquina');
    if (!selectMaq) return;

    const valorAtual = selectMaq.value;
    selectMaq.innerHTML = `<option value="">${maquinas.length ? 'Selecione a impressora' : 'Cadastre uma impressora primeiro'}</option>`;

    maquinas.forEach(m => {
        selectMaq.innerHTML += `<option value="${m.id}">${esc(m.nome)}</option>`;
    });

    if (valorAtual) selectMaq.value = valorAtual;
}

function adicionarLinhaFilamento(reset = false) {
    reloadFromStorage();

    const container = document.getElementById('filamentos-container');
    if (!container) return;

    if (reset) container.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'filament-row';

    let options = '<option value="">Escolha o filamento</option>';
    filamentos.forEach(f => {
        options += `<option value="${f.id}">${esc([f.tipo, f.cor, f.marca].filter(Boolean).join(' · '))} (${nivelEstoque(f).atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g)</option>`;
    });

    div.innerHTML = `
    <select class="orc-filamento-select" onchange="calcularEmTempoReal()">${options}</select>
    <input type="number" class="orc-filamento-peso" placeholder="Peso (g)" min="0" oninput="calcularEmTempoReal()">
    <button class="btn-delete" type="button" title="Remover" onclick="this.parentElement.remove(); calcularEmTempoReal()"><i class="fas fa-trash-can"></i></button>
  `;
    container.appendChild(div);
}

function limparPrecoManual() {
    const el = document.getElementById('orc-preco-manual');
    if (el) el.value = '';
}

function calcularEmTempoReal() {
    if (!document.getElementById('orc-maquina')) return;

    reloadFromStorage();

    const maquinaId = document.getElementById('orc-maquina').value;
    const tempoHoras = parseFloat(document.getElementById('orc-tempo')?.value) || 0;
    const extras = parseFloat(document.getElementById('orc-extras')?.value) || 0;
    const margemErro = parseFloat(document.getElementById('orc-erro')?.value) || 0;
    const margemLucro = parseFloat(document.getElementById('orc-margem-lucro')?.value) || 0;
    const precoManual = parseFloat(document.getElementById('orc-preco-manual')?.value);

    let custoFilamentoTotal = 0;
    let filamentosUsados = [];

    const selects = document.querySelectorAll('.orc-filamento-select');
    const pesos = document.querySelectorAll('.orc-filamento-peso');

    for (let i = 0; i < selects.length; i++) {
        const idFil = selects[i].value;
        const peso = parseFloat(pesos[i].value) || 0;

        if (idFil && peso > 0) {
            const fil = filamentos.find(f => String(f.id) === String(idFil));
            if (fil) {
                custoFilamentoTotal += (Number(fil.custoPorGrama || 0) * peso);
                filamentosUsados.push({ id: fil.id, peso: peso, nome: `${fil.marca} ${fil.cor}` });
            }
        }
    }

    let custoEnergia = 0;
    let custoDesgaste = 0;

    if (maquinaId) {
        const maquina = maquinas.find(m => String(m.id) === String(maquinaId));
        if (maquina) {
            custoEnergia = (Number(maquina.potencia || 0) / 1000) * tempoHoras * Number(maquina.kwh || 0);
            const vidaUtilHoras = Number(maquina.vidaUtil || 3000) || 3000;
            custoDesgaste = (Number(maquina.valor || 0) / vidaUtilHoras) * tempoHoras;
        }
    }

    let subtotal = custoFilamentoTotal + custoEnergia + custoDesgaste + extras;
    const valorErro = subtotal * (margemErro / 100);
    const custoFinal = subtotal + valorErro;

    let precoVenda = 0;
    let valorLucro = 0;

    if (!Number.isNaN(precoManual) && precoManual > 0) {
        precoVenda = precoManual;
        valorLucro = precoVenda - custoFinal;
    } else {
        valorLucro = custoFinal * (margemLucro / 100);
        precoVenda = custoFinal + valorLucro;
    }

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setTxt('res-filamento', brl(custoFilamentoTotal));
    setTxt('res-energia', brl(custoEnergia));
    setTxt('res-desgaste', brl(custoDesgaste));
    setTxt('res-extras', brl(extras));
    setTxt('res-erro', brl(valorErro));
    setTxt('res-total-custo', brl(custoFinal));
    setTxt('res-preco-final', brl(precoVenda));
    setTxt('res-lucro-final', `Lucro: ${brl(valorLucro)}`);

    orcamentoAtualCalculado = {
        custoTotal: custoFinal,
        valorVenda: precoVenda,
        lucro: valorLucro,
        filamentosUsados
    };
}

async function salvarOrcamento() {
    calcularEmTempoReal();

    const cliente = document.getElementById('orc-cliente')?.value?.trim();
    const produto = document.getElementById('orc-produto')?.value?.trim();
    const categoria = document.getElementById('orc-categoria')?.value || '';
    const maquinaId = document.getElementById('orc-maquina')?.value;

    if (!cliente || !produto) return avisar("Preencha o cliente e o produto.", "erro");
    if (!maquinaId) return avisar("Selecione a impressora.", "erro");
    if (!orcamentoAtualCalculado) return avisar("Erro no cálculo.", "erro");

    reloadFromStorage();

    const novoOrcamento = {
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        cliente,
        telefone: document.getElementById('orc-telefone')?.value?.trim() || '',
        produto,
        categoria,
        custoTotal: orcamentoAtualCalculado.custoTotal,
        valorVenda: orcamentoAtualCalculado.valorVenda,
        lucro: orcamentoAtualCalculado.lucro,
        filamentosUsados: orcamentoAtualCalculado.filamentosUsados,
        prazo: document.getElementById('orc-prazo')?.value?.trim() || '',
        observacoes: document.getElementById('orc-obs')?.value?.trim() || '',
        status: 'Pendente'
    };

    orcamentos.unshift(novoOrcamento);
    await salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
    avisarDepois("Orçamento salvo!");

    if (document.getElementById('orc-cliente')) document.getElementById('orc-cliente').value = '';
    if (document.getElementById('orc-produto')) document.getElementById('orc-produto').value = '';
    if (document.getElementById('orc-telefone')) document.getElementById('orc-telefone').value = '';

    window.location.href = "historico.html";
}

// =====================
// HISTÓRICO
// =====================
function renderizarHistorico() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-historico tbody');
    if (!tbody) return;

    if (!orcamentos.length) {
        tbody.innerHTML = linhaVazia(5, 'fa-receipt', 'Nenhum orçamento ainda. Crie o primeiro em "Novo orçamento".');
        return;
    }

    tbody.innerHTML = orcamentos.map((orc, index) => {
        let botoes = `
        <a class="action-btn btn-quote" href="orcamento-cliente.html?id=${orc.id}" title="Orçamento para o cliente"><i class="fas fa-file-invoice"></i></a>`;
        if (orc.status === 'Pendente') {
            botoes += `
        <button class="action-btn btn-approve" type="button" title="Aprovar venda (dá baixa no estoque)" onclick="mudarStatus(${index}, 'Aprovado')"><i class="fas fa-check"></i></button>
        <button class="action-btn btn-personal" type="button" title="Uso pessoal (dá baixa no estoque)" onclick="mudarStatus(${index}, 'Pessoal')"><i class="fas fa-user"></i></button>
        <button class="action-btn btn-cancel" type="button" title="Cancelar" onclick="mudarStatus(${index}, 'Cancelado')"><i class="fas fa-xmark"></i></button>`;
        }

        return `
      <tr>
        <td class="num">${esc(orc.data)}</td>
        <td>
          <strong>${esc(orc.produto)}</strong><br>
          <small>${esc(orc.cliente)}</small>
        </td>
        <td class="num">
          <strong>${brl(orc.valorVenda)}</strong><br>
          <small>Custo ${brl(orc.custoTotal)}</small>
        </td>
        <td><span class="status-badge ${CLASSES_STATUS[orc.status] || ''}">${esc(orc.status)}</span></td>
        <td class="acoes">${botoes}</td>
      </tr>`;
    }).join('');
}

function mudarStatus(index, novoStatus) {
    reloadFromStorage();

    const orc = orcamentos[index];
    if (!orc) return;

    if (novoStatus === 'Aprovado' || novoStatus === 'Pessoal') {
        let estoqueOk = true;

        (orc.filamentosUsados || []).forEach(item => {
            const fil = filamentos.find(f => String(f.id) === String(item.id));
            if (!fil || Number(fil.estoqueAtual || 0) < Number(item.peso || 0)) {
                estoqueOk = false;
                avisar(`Estoque insuficiente: ${item.nome}`, "erro");
            }
        });

        if (!estoqueOk) return;

        (orc.filamentosUsados || []).forEach(item => {
            const filIndex = filamentos.findIndex(f => String(f.id) === String(item.id));
            if (filIndex > -1) {
                filamentos[filIndex].estoqueAtual = Number(filamentos[filIndex].estoqueAtual || 0) - Number(item.peso || 0);
            }
        });

        salvarDados(DB_KEY_FILAMENTOS, filamentos);
    }

    orc.status = novoStatus;
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);

    const MENSAGENS = { Aprovado: 'Venda aprovada! Estoque atualizado.', Pessoal: 'Marcado como uso pessoal. Estoque atualizado.', Cancelado: 'Orçamento cancelado.' };
    avisar(MENSAGENS[novoStatus] || 'Status atualizado.');

    renderizarHistorico();
    atualizarDashboard();
}

// =====================
// DASHBOARD
// =====================
function atualizarDashboard() {
    const filtroEl = document.getElementById('dash-filtro-mes');
    if (!filtroEl) return;

    reloadFromStorage();

    const filtroMes = filtroEl.value;
    let faturamento = 0, lucro = 0, custo = 0, qtdVendas = 0;

    orcamentos.forEach(o => {
        let dataValida = true;

        if (filtroMes) {
            const partes = String(o.data || '').split('/');
            if (partes.length === 3) {
                const anoMesOrcamento = `${partes[2]}-${partes[1]}`;
                if (anoMesOrcamento !== filtroMes) dataValida = false;
            }
        }

        if (dataValida && o.status === 'Aprovado') {
            faturamento += Number(o.valorVenda || 0);
            lucro += Number(o.lucro || 0);
            custo += Number(o.custoTotal || 0);
            qtdVendas++;
        }
    });

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setTxt('dash-faturamento', brl(faturamento));
    setTxt('dash-lucro', brl(lucro));
    setTxt('dash-custo', brl(custo));
    setTxt('dash-vendas', String(qtdVendas));

    const lista = document.getElementById('dash-history-list');
    if (lista) {
        lista.innerHTML = orcamentos.length
            ? orcamentos.slice(0, 6).map(o => `
          <li>
            <div class="act-main">
              <strong>${esc(o.produto)}</strong>
              <small>${esc(o.cliente)} · ${esc(o.data)}</small>
            </div>
            <div class="act-side">
              <div>${brl(o.valorVenda)}</div>
              <span class="status-badge ${CLASSES_STATUS[o.status] || ''}">${esc(o.status)}</span>
            </div>
          </li>`).join('')
            : '<li class="empty-msg">Nenhum orçamento ainda.</li>';
    }

    // Rolos com menos estoque primeiro
    const estoque = document.getElementById('dash-estoque');
    if (estoque) {
        const rolos = filamentos
            .map(f => ({ f, nivel: nivelEstoque(f) }))
            .sort((a, b) => a.nivel.pct - b.nivel.pct)
            .slice(0, 6);

        estoque.innerHTML = rolos.length
            ? rolos.map(({ f, nivel }) => `
          <li>
            <div class="act-main fil-nome">
              <span class="swatch" style="background: ${corDoFilamento(f.cor)};"></span>
              <div style="min-width: 0;">
                <strong>${esc([f.tipo, f.cor].filter(Boolean).join(' ') || f.marca)}</strong>
                <small>${esc(f.marca)}</small>
              </div>
            </div>
            <div class="act-side stock ${nivel.classe}" style="min-width: 110px;">
              <div>${nivel.atual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g</div>
              <div class="stock-bar"><span style="width: ${nivel.pct}%;"></span></div>
            </div>
          </li>`).join('')
            : '<li class="empty-msg">Nenhum filamento cadastrado.</li>';
    }
}

// =====================
// BACKUP (UTF-8 seguro)
// =====================
function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
}

function decodeBase64Utf8(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function gerarBackup() {
    reloadFromStorage();

    const out = document.getElementById('backup-output');
    if (!out) return;

    const dados = { filamentos, maquinas, orcamentos, empresa: carregarEmpresa() };
    out.value = encodeBase64Utf8(JSON.stringify(dados));
}

async function copiarBackup() {
    const textarea = document.getElementById('backup-output');
    if (!textarea) return;

    const text = textarea.value || '';
    if (!text) return avisar("Gere o código antes de copiar.", "erro");

    try {
        await navigator.clipboard.writeText(text);
        avisar("Código copiado!");
    } catch {
        // fallback antigo
        textarea.select();
        document.execCommand('copy');
        avisar("Código copiado!");
    }
}

async function restaurarBackup() {
    const input = document.getElementById('backup-input');
    if (!input) return;

    const codigo = (input.value || '').trim();
    if (!codigo) return avisar("Cole o código do backup.", "erro");

    if (confirm("Isso vai substituir todos os dados atuais. Continuar?")) {
        try {
            const dados = JSON.parse(decodeBase64Utf8(codigo));

            await Promise.all([
                salvarDados(DB_KEY_FILAMENTOS, dados.filamentos || []),
                salvarDados(DB_KEY_MAQUINAS, dados.maquinas || []),
                salvarDados(DB_KEY_ORCAMENTOS, dados.orcamentos || []),
                dados.empresa ? salvarDados(DB_KEY_EMPRESA, dados.empresa) : null
            ]);

            avisarDepois("Backup restaurado!");
            location.reload();
        } catch (e) {
            avisar("Código inválido.", "erro");
        }
    }
}

// =====================
// DADOS DA EMPRESA
// =====================
const CAMPOS_EMPRESA = ['nome', 'whatsapp', 'instagram', 'email', 'validadeDias', 'condicoes'];

function preencherFormEmpresa() {
    const empresa = carregarEmpresa();
    CAMPOS_EMPRESA.forEach(campo => {
        const el = document.getElementById(`emp-${campo}`);
        if (el) el.value = empresa[campo] ?? '';
    });
}

function salvarEmpresa() {
    const empresa = carregarEmpresa();
    CAMPOS_EMPRESA.forEach(campo => {
        const el = document.getElementById(`emp-${campo}`);
        if (el) empresa[campo] = el.value.trim();
    });
    empresa.validadeDias = parseInt(empresa.validadeDias, 10) || EMPRESA_PADRAO.validadeDias;
    salvarDados(DB_KEY_EMPRESA, empresa);
    avisar("Dados da empresa salvos!");
}

// =====================
// INIT UNIVERSAL (multi-página)
// =====================
// Chamado uma vez quando os dados estão prontos (nuvem.js, ou no load se a nuvem não estiver ativa)
function iniciarPagina() {
    reloadFromStorage();
    setActiveNavLink();
    mostrarAvisoPendente();

    // Fecha menu no mobile ao clicar em qualquer link
    document.querySelectorAll('.sidebar nav a.nav-link').forEach(a => {
        a.addEventListener('click', () => {
            if (window.innerWidth <= 768) toggleMenu(true);
        });
    });

    // Dashboard
    const filtro = document.getElementById('dash-filtro-mes');
    if (filtro) {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        filtro.value = `${ano}-${mes}`;
    }

    // Orçamento
    if (document.getElementById('orc-maquina')) {
        const container = document.getElementById('filamentos-container');
        if (container && container.children.length === 0) adicionarLinhaFilamento(true);
    }

    // Dados da empresa
    if (document.getElementById('emp-nome')) preencherFormEmpresa();

    atualizarTela();
}

// Redesenha o que depende dos dados; chamado de novo quando chegam alterações de outro aparelho
function atualizarTela() {
    reloadFromStorage();

    if (document.getElementById('dash-filtro-mes')) atualizarDashboard();

    if (document.getElementById('orc-maquina')) {
        carregarOpcoesOrcamento();
        calcularEmTempoReal();
    }

    if (document.querySelector('#tabela-maquinas tbody')) renderizarMaquinas();
    if (document.querySelector('#tabela-filamentos tbody')) renderizarFilamentos();
    if (document.querySelector('#tabela-historico tbody')) renderizarHistorico();
}

window.addEventListener('load', () => {
    if (!window.NUVEM_ATIVA) iniciarPagina();
});
