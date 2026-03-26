// =====================
// CONFIGURAÇÃO E DADOS
// =====================
const DB_KEY_FILAMENTOS = 'nexus_filamentos';
const DB_KEY_MAQUINAS = 'nexus_maquinas';
const DB_KEY_ORCAMENTOS = 'nexus_orcamentos';

let filamentos = [];
let maquinas = [];
let orcamentos = [];

let orcamentoAtualCalculado = null;

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

    if (!nome || Number.isNaN(valor)) return alert("Preencha os dados corretamente.");

    const maquina = { id: Date.now(), nome, valor, potencia: potencia || 0, kwh: kwh || 0, vidaUtil };
    maquinas.push(maquina);
    localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(maquinas));

    nomeEl.value = '';
    valorEl.value = '';
    if (potEl) potEl.value = '';
    if (kwhEl) kwhEl.value = '';
    if (vidaEl) vidaEl.value = '3000';

    renderizarMaquinas();
    alert("Máquina cadastrada!");

    if (document.getElementById('orc-maquina')) carregarOpcoesOrcamento();
}

function renderizarMaquinas() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-maquinas tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    maquinas.forEach((m, index) => {
        const vida = m.vidaUtil || 3000;
        tbody.innerHTML += `
      <tr>
        <td>${m.nome}</td>
        <td>R$ ${Number(m.valor || 0).toFixed(2)}</td>
        <td>${Number(m.potencia || 0)}W</td>
        <td>${vida}h</td>
        <td>
          <button class="action-btn btn-delete" type="button" onclick="deletarMaquina(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    });
}

function deletarMaquina(index) {
    reloadFromStorage();

    if (confirm("Excluir máquina?")) {
        maquinas.splice(index, 1);
        localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(maquinas));
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

    if (!marca || Number.isNaN(preco)) return alert("Preencha os dados corretamente.");

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
    localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));

    marcaEl.value = '';
    if (corEl) corEl.value = '';
    if (tipoEl) tipoEl.value = '';
    if (precoEl) precoEl.value = '';
    if (pesoEl) pesoEl.value = '1000';

    renderizarFilamentos();
    alert("Filamento cadastrado!");
}

function renderizarFilamentos() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-filamentos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    filamentos.forEach((f, index) => {
        tbody.innerHTML += `
      <tr>
        <td>${f.marca} - ${f.cor}</td>
        <td>R$ ${Number(f.preco || 0).toFixed(2)}</td>
        <td>${Number(f.estoqueAtual || 0).toFixed(1)}g</td>
        <td>R$ ${Number(f.custoPorGrama || 0).toFixed(4)}</td>
        <td>
          <button class="action-btn btn-delete" type="button" onclick="deletarFilamento(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    });
}

function deletarFilamento(index) {
    reloadFromStorage();

    if (confirm("Excluir filamento?")) {
        filamentos.splice(index, 1);
        localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));
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
    selectMaq.innerHTML = '<option value="">Selecione...</option>';

    maquinas.forEach(m => {
        selectMaq.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
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

    let options = '<option value="">Escolha o Filamento</option>';
    filamentos.forEach(f => {
        options += `<option value="${f.id}">${f.marca} ${f.cor} (R$${Number(f.custoPorGrama || 0).toFixed(3)}/g)</option>`;
    });

    div.innerHTML = `
    <select class="orc-filamento-select" onchange="calcularEmTempoReal()">${options}</select>
    <input type="number" class="orc-filamento-peso" placeholder="Peso (g)" oninput="calcularEmTempoReal()">
    <button class="btn-delete" type="button" onclick="this.parentElement.remove(); calcularEmTempoReal()">X</button>
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

    setTxt('res-filamento', `R$ ${custoFilamentoTotal.toFixed(2)}`);
    setTxt('res-energia', `R$ ${custoEnergia.toFixed(2)}`);
    setTxt('res-desgaste', `R$ ${custoDesgaste.toFixed(2)}`);
    setTxt('res-extras', `R$ ${extras.toFixed(2)}`);
    setTxt('res-erro', `R$ ${valorErro.toFixed(2)}`);
    setTxt('res-total-custo', `R$ ${custoFinal.toFixed(2)}`);
    setTxt('res-preco-final', `R$ ${precoVenda.toFixed(2)}`);
    setTxt('res-lucro-final', `Lucro: R$ ${valorLucro.toFixed(2)}`);

    orcamentoAtualCalculado = {
        custoTotal: custoFinal,
        valorVenda: precoVenda,
        lucro: valorLucro,
        filamentosUsados
    };
}

function salvarOrcamento() {
    calcularEmTempoReal();

    const cliente = document.getElementById('orc-cliente')?.value?.trim();
    const produto = document.getElementById('orc-produto')?.value?.trim();
    const categoria = document.getElementById('orc-categoria')?.value || '';
    const maquinaId = document.getElementById('orc-maquina')?.value;

    if (!cliente || !produto) return alert("Preencha Cliente e Produto.");
    if (!maquinaId) return alert("Selecione uma máquina.");
    if (!orcamentoAtualCalculado) return alert("Erro no cálculo.");

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
        status: 'Pendente'
    };

    orcamentos.unshift(novoOrcamento);
    localStorage.setItem(DB_KEY_ORCAMENTOS, JSON.stringify(orcamentos));
    alert("Salvo no Histórico!");

    if (document.getElementById('orc-cliente')) document.getElementById('orc-cliente').value = '';
    if (document.getElementById('orc-produto')) document.getElementById('orc-produto').value = '';
    if (document.getElementById('orc-telefone')) document.getElementById('orc-telefone').value = '';

    window.location.href = "/ProjetoDeGestao/Telas/historico.html";
}

// =====================
// HISTÓRICO
// =====================
function renderizarHistorico() {
    reloadFromStorage();

    const tbody = document.querySelector('#tabela-historico tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    orcamentos.forEach((orc, index) => {
        let badgeClass = '';
        if (orc.status === 'Pendente') badgeClass = 'status-pendente';
        if (orc.status === 'Aprovado') badgeClass = 'status-aprovado';
        if (orc.status === 'Cancelado') badgeClass = 'status-cancelado';
        if (orc.status === 'Pessoal') badgeClass = 'status-pessoal';

        let botoes = '';
        if (orc.status === 'Pendente') {
            botoes = `
        <button class="action-btn btn-approve" type="button" onclick="mudarStatus(${index}, 'Aprovado')"><i class="fas fa-check"></i></button>
        <button class="action-btn btn-personal" type="button" onclick="mudarStatus(${index}, 'Pessoal')"><i class="fas fa-user"></i></button>
        <button class="action-btn btn-cancel" type="button" onclick="mudarStatus(${index}, 'Cancelado')"><i class="fas fa-times"></i></button>
      `;
        }

        tbody.innerHTML += `
      <tr>
        <td>${orc.data}</td>
        <td>
          <strong>${orc.produto}</strong><br>
          <small>${orc.cliente}</small>
        </td>
        <td>
          <small>Custo: R$${Number(orc.custoTotal || 0).toFixed(2)}</small><br>
          <strong>Venda: R$${Number(orc.valorVenda || 0).toFixed(2)}</strong>
        </td>
        <td><span class="status-badge ${badgeClass}">${orc.status}</span></td>
        <td>${botoes}</td>
      </tr>
    `;
    });
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
                alert(`Estoque insuficiente: ${item.nome}`);
            }
        });

        if (!estoqueOk) return;

        (orc.filamentosUsados || []).forEach(item => {
            const filIndex = filamentos.findIndex(f => String(f.id) === String(item.id));
            if (filIndex > -1) {
                filamentos[filIndex].estoqueAtual = Number(filamentos[filIndex].estoqueAtual || 0) - Number(item.peso || 0);
            }
        });

        localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));
    }

    orc.status = novoStatus;
    localStorage.setItem(DB_KEY_ORCAMENTOS, JSON.stringify(orcamentos));

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

    setTxt('dash-faturamento', `R$ ${faturamento.toFixed(2)}`);
    setTxt('dash-lucro', `R$ ${lucro.toFixed(2)}`);
    setTxt('dash-custo', `R$ ${custo.toFixed(2)}`);
    setTxt('dash-vendas', String(qtdVendas));

    const lista = document.getElementById('dash-history-list');
    if (!lista) return;

    lista.innerHTML = '';
    orcamentos.slice(0, 5).forEach(o => {
        lista.innerHTML += `
      <li style="padding: 10px; border-bottom: 1px solid rgba(47,125,255,.18); display: flex; justify-content: space-between;">
        <span>${o.produto}</span>
        <span class="${o.status === 'Aprovado' ? 'highlight' : ''}">${o.status}</span>
      </li>
    `;
    });
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

    const dados = { filamentos, maquinas, orcamentos };
    out.value = encodeBase64Utf8(JSON.stringify(dados));
}

async function copiarBackup() {
    const textarea = document.getElementById('backup-output');
    if (!textarea) return;

    const text = textarea.value || '';
    if (!text) return alert("Nada para copiar.");

    try {
        await navigator.clipboard.writeText(text);
        alert("Copiado!");
    } catch {
        // fallback antigo
        textarea.select();
        document.execCommand('copy');
        alert("Copiado!");
    }
}

function restaurarBackup() {
    const input = document.getElementById('backup-input');
    if (!input) return;

    const codigo = (input.value || '').trim();
    if (!codigo) return alert("Cole o código.");

    if (confirm("Substituir dados atuais?")) {
        try {
            const dados = JSON.parse(decodeBase64Utf8(codigo));

            localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(dados.filamentos || []));
            localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(dados.maquinas || []));
            localStorage.setItem(DB_KEY_ORCAMENTOS, JSON.stringify(dados.orcamentos || []));

            alert("Restaurado!");
            location.reload();
        } catch (e) {
            alert("Código inválido.");
        }
    }
}

// =====================
// INIT UNIVERSAL (multi-página)
// =====================
window.addEventListener('load', () => {
    reloadFromStorage();
    setActiveNavLink();

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
        atualizarDashboard();
    }

    // Orçamento
    if (document.getElementById('orc-maquina')) {
        carregarOpcoesOrcamento();
        const container = document.getElementById('filamentos-container');
        if (container && container.children.length === 0) adicionarLinhaFilamento(true);
        calcularEmTempoReal();
    }

    // Tabelas
    if (document.querySelector('#tabela-maquinas tbody')) renderizarMaquinas();
    if (document.querySelector('#tabela-filamentos tbody')) renderizarFilamentos();
    if (document.querySelector('#tabela-historico tbody')) renderizarHistorico();
});