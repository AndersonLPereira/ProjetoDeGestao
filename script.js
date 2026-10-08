// =====================
// CONFIGURAÇÃO E DADOS
// =====================
const DB_KEY_FILAMENTOS = 'nexus_filamentos';
const DB_KEY_MAQUINAS = 'nexus_maquinas';
const DB_KEY_ORCAMENTOS = 'nexus_orcamentos';
const DB_KEY_EMPRESA = 'nexus_empresa';
const DB_KEY_CLIENTES = 'nexus_clientes';
const DB_KEY_TAREFAS = 'nexus_tarefas';

const EMPRESA_PADRAO = {
    nome: 'LB impressões 3D',
    whatsapp: '',
    instagram: '',
    email: '',
    documento: '',
    cidade: '',
    pix: '',
    valorHora: 20,
    taxaVenda: 0,
    validadeDias: 7,
    condicoes: 'Pagamento: 50% na aprovação e 50% na entrega.\nPix, dinheiro ou cartão.',
    termos: 'Peças impressas em 3D podem apresentar leves linhas de camada e pequenas variações de cor, que são características do processo.\n' +
        'A produção começa após a aprovação do orçamento e o pagamento do sinal.\n' +
        'Alterações no modelo após a aprovação podem mudar o valor e o prazo.\n' +
        'O prazo de entrega é contado em dias úteis a partir da aprovação.'
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
    // Com uma janela (dialog) aberta, o aviso vai dentro dela para não ficar atrás do fundo escuro
    const host = document.querySelector('dialog[open]') || document.body;
    let area = host.querySelector(':scope > .toast-area');
    if (!area) {
        area = document.createElement('div');
        area.className = 'toast-area';
        area.setAttribute('role', 'status');
        host.appendChild(area);
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

// Etapas da produção de um pedido aprovado
const ETAPAS_PRODUCAO = [
    { id: 'fila', nome: 'A imprimir', icone: 'fa-hourglass-start' },
    { id: 'imprimindo', nome: 'Imprimindo', icone: 'fa-print' },
    { id: 'acabamento', nome: 'Acabamento', icone: 'fa-paintbrush' },
    { id: 'pronto', nome: 'Pronto', icone: 'fa-box' },
    { id: 'entregue', nome: 'Entregue', icone: 'fa-circle-check' }
];

function etapaDe(orc) {
    return ETAPAS_PRODUCAO.some(e => e.id === orc.producao) ? orc.producao : 'fila';
}

// Pagamentos registrados de um pedido
function totalPago(orc) {
    return (orc.pagamentos || []).reduce((soma, p) => soma + Number(p.valor || 0), 0);
}

function faltaPagar(orc) {
    return Math.max(0, Number(orc.valorVenda || 0) - totalPago(orc));
}

function seloPagamento(orc) {
    const pago = totalPago(orc);
    if (pago <= 0) return '<span class="pag-badge pag-nada">A receber</span>';
    if (faltaPagar(orc) < 0.01) return '<span class="pag-badge pag-ok"><i class="fas fa-check"></i> Pago</span>';
    return `<span class="pag-badge pag-parcial">Falta ${brl(faltaPagar(orc))}</span>`;
}

// Aceita só links http(s); "makerworld.com/..." vira "https://makerworld.com/..."
function linkSeguro(url) {
    const texto = String(url || '').trim();
    if (!texto) return '';
    const comProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
    try {
        const u = new URL(comProtocolo);
        return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : '';
    } catch {
        return '';
    }
}

// Nome curto do site do modelo para o botão
function siteDoLink(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        const NOMES = { 'makerworld.com': 'MakerWorld', 'printables.com': 'Printables', 'thingiverse.com': 'Thingiverse', 'cults3d.com': 'Cults3D', 'thangs.com': 'Thangs' };
        return NOMES[host] || host;
    } catch {
        return 'Modelo';
    }
}

function botaoModelo(url, comTexto = true) {
    const link = linkSeguro(url);
    if (!link) return '';
    return `<a class="action-btn btn-modelo${comTexto ? ' com-texto' : ''}" href="${esc(link)}" target="_blank" rel="noopener noreferrer" title="Abrir o arquivo do modelo (${esc(siteDoLink(link))})"><i class="fas fa-cube"></i>${comTexto ? ` ${esc(siteDoLink(link))}` : ''}</a>`;
}

function hojeBR() {
    return new Date().toLocaleDateString('pt-BR');
}

function linkWhats(telefone, mensagem) {
    let numero = String(telefone || '').replace(/\D/g, '');
    if (numero && numero.length <= 11) numero = `55${numero}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

const CLASSES_STATUS = { Pendente: 'status-pendente', Aprovado: 'status-aprovado', Cancelado: 'status-cancelado', Pessoal: 'status-pessoal' };

let filamentos = [];
let maquinas = [];
let orcamentos = [];
let clientes = [];
let tarefas = [];

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
    clientes = JSON.parse(localStorage.getItem(DB_KEY_CLIENTES)) || [];
    tarefas = JSON.parse(localStorage.getItem(DB_KEY_TAREFAS)) || [];
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
let maquinaEditandoId = null;

function salvarMaquina() {
    reloadFromStorage();

    const campo = id => document.getElementById(id);
    if (!campo('maq-nome') || !campo('maq-valor')) return;

    const nome = campo('maq-nome').value.trim();
    const valor = parseFloat(campo('maq-valor').value);
    const potencia = parseFloat(campo('maq-potencia').value) || 0;
    const kwh = parseFloat(campo('maq-kwh').value) || 0;
    const vidaUtil = parseFloat(campo('maq-vida').value) || 3000;

    if (!nome || Number.isNaN(valor)) return avisar("Preencha o nome e o valor da impressora.", "erro");

    const dados = { nome, valor, potencia, kwh, vidaUtil };

    if (maquinaEditandoId !== null) {
        const maq = maquinas.find(m => String(m.id) === String(maquinaEditandoId));
        if (!maq) {
            cancelarEdicaoMaquina();
            return avisar("Essa impressora não existe mais.", "erro");
        }
        Object.assign(maq, dados);
        salvarDados(DB_KEY_MAQUINAS, maquinas);
        cancelarEdicaoMaquina();
        return avisar("Impressora atualizada!");
    }

    maquinas.push({ id: Date.now(), ...dados });
    salvarDados(DB_KEY_MAQUINAS, maquinas);
    limparFormMaquina();
    renderizarMaquinas();
    avisar("Impressora cadastrada!");
}

function limparFormMaquina() {
    ['maq-nome', 'maq-valor', 'maq-potencia', 'maq-kwh'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const vida = document.getElementById('maq-vida');
    if (vida) vida.value = '3000';
}

function editarMaquina(index) {
    reloadFromStorage();
    const maq = maquinas[index];
    if (!maq) return;

    maquinaEditandoId = maq.id;
    const valores = { 'maq-nome': maq.nome, 'maq-valor': maq.valor, 'maq-potencia': maq.potencia, 'maq-kwh': maq.kwh, 'maq-vida': maq.vidaUtil || 3000 };
    Object.entries(valores).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.value = valor ?? '';
    });

    const form = document.getElementById('form-maquina');
    form.classList.add('editando');
    document.getElementById('maq-form-titulo').innerHTML = `<i class="fas fa-pen"></i> Editando: ${esc(maq.nome)}`;
    document.getElementById('maq-btn-salvar').innerHTML = '<i class="fas fa-check"></i> Salvar alterações';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderizarMaquinas();
}

function cancelarEdicaoMaquina() {
    maquinaEditandoId = null;
    limparFormMaquina();
    const form = document.getElementById('form-maquina');
    if (form) {
        form.classList.remove('editando');
        document.getElementById('maq-form-titulo').innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar impressora';
        document.getElementById('maq-btn-salvar').innerHTML = '<i class="fas fa-plus"></i> Cadastrar impressora';
    }
    renderizarMaquinas();
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
      <tr class="${String(m.id) === String(maquinaEditandoId) ? 'linha-editando' : ''}">
        <td><div class="fil-nome"><span class="card-icon" style="margin: 0; width: 34px; height: 34px;"><i class="fas fa-print"></i></span><strong>${esc(m.nome)}</strong></div></td>
        <td class="num">${brl(m.valor)}</td>
        <td class="num">${Number(m.potencia || 0)} W</td>
        <td class="num">${vida.toLocaleString('pt-BR')} h</td>
        <td class="num">${brl(custoHora)}<small>/h</small></td>
        <td class="acoes">
          <button class="action-btn btn-edit" type="button" title="Editar" onclick="editarMaquina(${index})"><i class="fas fa-pen"></i></button>
          <button class="action-btn btn-delete" type="button" title="Excluir" onclick="deletarMaquina(${index})"><i class="fas fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('');
}

function deletarMaquina(index) {
    reloadFromStorage();

    if (confirm("Excluir esta impressora?")) {
        if (String(maquinas[index]?.id) === String(maquinaEditandoId)) cancelarEdicaoMaquina();
        maquinas.splice(index, 1);
        salvarDados(DB_KEY_MAQUINAS, maquinas);
        renderizarMaquinas();
        if (document.getElementById('orc-maquina')) carregarOpcoesOrcamento();
    }
}

// =====================
// FILAMENTOS
// =====================
// id do filamento sendo editado (null = cadastrando um novo)
let filamentoEditandoId = null;

function salvarFilamento() {
    reloadFromStorage();

    const campo = id => document.getElementById(id);
    if (!campo('fil-marca') || !campo('fil-preco')) return;

    const marca = campo('fil-marca').value.trim();
    const cor = campo('fil-cor').value.trim();
    const tipo = campo('fil-tipo').value.trim();
    const preco = parseFloat(campo('fil-preco').value);
    const pesoTotal = parseFloat(campo('fil-peso').value) || 1000;

    if (!marca || Number.isNaN(preco)) return avisar("Preencha a marca e o preço do rolo.", "erro");

    const dados = { marca, cor, tipo, preco, pesoTotal, custoPorGrama: preco / pesoTotal };

    if (filamentoEditandoId !== null) {
        const fil = filamentos.find(f => String(f.id) === String(filamentoEditandoId));
        if (!fil) {
            cancelarEdicaoFilamento();
            return avisar("Esse filamento não existe mais.", "erro");
        }
        const estoque = parseFloat(campo('fil-estoque').value);
        // Mantém o id: orçamentos antigos apontam para ele
        Object.assign(fil, dados, { estoqueAtual: Number.isNaN(estoque) ? fil.estoqueAtual : Math.max(0, estoque) });
        salvarDados(DB_KEY_FILAMENTOS, filamentos);
        cancelarEdicaoFilamento();
        renderizarFilamentos();
        return avisar("Filamento atualizado!");
    }

    filamentos.push({ id: Date.now(), ...dados, estoqueAtual: pesoTotal });
    salvarDados(DB_KEY_FILAMENTOS, filamentos);
    limparFormFilamento();
    renderizarFilamentos();
    avisar("Filamento cadastrado!");
}

function limparFormFilamento() {
    ['fil-marca', 'fil-cor', 'fil-tipo', 'fil-preco', 'fil-estoque'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const peso = document.getElementById('fil-peso');
    if (peso) peso.value = '1000';
}

function editarFilamento(index) {
    reloadFromStorage();
    const fil = filamentos[index];
    if (!fil) return;

    filamentoEditandoId = fil.id;
    const valores = {
        'fil-marca': fil.marca, 'fil-cor': fil.cor, 'fil-tipo': fil.tipo, 'fil-preco': fil.preco,
        'fil-peso': fil.pesoTotal || 1000, 'fil-estoque': Math.round(Number(fil.estoqueAtual || 0))
    };
    Object.entries(valores).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.value = valor ?? '';
    });

    const form = document.getElementById('form-filamento');
    form.classList.add('editando');
    document.getElementById('fil-form-titulo').innerHTML = `<i class="fas fa-pen"></i> Editando: ${esc([fil.tipo, fil.cor].filter(Boolean).join(' ') || fil.marca)}`;
    document.getElementById('fil-btn-salvar').innerHTML = '<i class="fas fa-check"></i> Salvar alterações';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('fil-marca').focus({ preventScroll: true });
    renderizarFilamentos();
}

function cancelarEdicaoFilamento() {
    filamentoEditandoId = null;
    limparFormFilamento();
    const form = document.getElementById('form-filamento');
    if (!form) return;
    form.classList.remove('editando');
    document.getElementById('fil-form-titulo').innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar rolo';
    document.getElementById('fil-btn-salvar').innerHTML = '<i class="fas fa-plus"></i> Cadastrar filamento';
    renderizarFilamentos();
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
      <tr class="${String(f.id) === String(filamentoEditandoId) ? 'linha-editando' : ''}">
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
          <button class="action-btn btn-edit" type="button" title="Editar" onclick="editarFilamento(${index})"><i class="fas fa-pen"></i></button>
          <button class="action-btn btn-delete" type="button" title="Excluir" onclick="deletarFilamento(${index})"><i class="fas fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('');
}

function deletarFilamento(index) {
    reloadFromStorage();

    if (confirm("Excluir este filamento?")) {
        if (String(filamentos[index]?.id) === String(filamentoEditandoId)) cancelarEdicaoFilamento();
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

function carregarClientesOrcamento() {
    const lista = document.getElementById('lista-clientes');
    if (!lista) return;
    lista.innerHTML = clientes.map(c => `<option value="${esc(c.nome)}"></option>`).join('');
}

// Ao escolher um cliente cadastrado, preenche o WhatsApp
function preencherClienteOrcamento() {
    const nome = document.getElementById('orc-cliente')?.value;
    const cadastro = clientes.find(c => semAcento(c.nome) === semAcento(nome));
    const tel = document.getElementById('orc-telefone');
    if (cadastro && tel && !tel.value) tel.value = cadastro.telefone || '';
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
    const horasMao = parseFloat(document.getElementById('orc-mao')?.value) || 0;
    const taxaVenda = Math.min(90, Math.max(0, parseFloat(document.getElementById('orc-taxa')?.value) || 0));
    const valorHora = Number(carregarEmpresa().valorHora || 0);

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
    // Mão de obra (modelagem, pós-processamento) não entra na margem de falha
    const custoMao = horasMao * valorHora;
    const custoFinal = subtotal + valorErro + custoMao;

    let precoVenda = 0;
    let valorLucro = 0;
    let valorTaxa = 0;

    if (!Number.isNaN(precoManual) && precoManual > 0) {
        precoVenda = precoManual;
        valorTaxa = precoVenda * (taxaVenda / 100);
        valorLucro = precoVenda - custoFinal - valorTaxa;
    } else {
        // O preço já embute as taxas da venda (marketplace, maquininha, imposto)
        valorLucro = custoFinal * (margemLucro / 100);
        precoVenda = (custoFinal + valorLucro) / (1 - taxaVenda / 100);
        valorTaxa = precoVenda - custoFinal - valorLucro;
    }

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    // Os valores acima são por peça; o pedido multiplica pela quantidade
    const quantidade = Math.max(1, parseInt(document.getElementById('orc-quantidade')?.value, 10) || 1);

    setTxt('res-filamento', brl(custoFilamentoTotal * quantidade));
    setTxt('res-energia', brl(custoEnergia * quantidade));
    setTxt('res-desgaste', brl(custoDesgaste * quantidade));
    setTxt('res-extras', brl(extras * quantidade));
    setTxt('res-erro', brl(valorErro * quantidade));
    setTxt('res-mao', brl(custoMao * quantidade));
    setTxt('res-taxa', brl(valorTaxa * quantidade));
    setTxt('orc-valor-hora', brl(valorHora));
    setTxt('res-total-custo', brl(custoFinal * quantidade));
    setTxt('res-preco-final', brl(precoVenda * quantidade));
    setTxt('res-unitario', quantidade > 1 ? `${quantidade} peças de ${brl(precoVenda)}` : 'Preço por peça');
    setTxt('res-lucro-final', `Lucro: ${brl(valorLucro * quantidade)}`);

    orcamentoAtualCalculado = {
        quantidade,
        valorUnitario: precoVenda,
        tempoHoras,
        horasMao,
        taxaVenda,
        maoDeObra: custoMao * quantidade,
        taxas: valorTaxa * quantidade,
        custoTotal: custoFinal * quantidade,
        valorVenda: precoVenda * quantidade,
        lucro: valorLucro * quantidade,
        filamentosUsados: filamentosUsados.map(item => ({ ...item, peso: item.peso * quantidade }))
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
    const linkDigitado = document.getElementById('orc-link')?.value?.trim();
    if (linkDigitado && !linkSeguro(linkDigitado)) return avisar("O link do modelo não parece válido.", "erro");
    if (!orcamentoAtualCalculado) return avisar("Erro no cálculo.", "erro");

    reloadFromStorage();

    const telefone = document.getElementById('orc-telefone')?.value?.trim() || '';

    // Liga o orçamento ao cadastro do cliente (e cadastra se for novo)
    let cadastro = clientes.find(c => semAcento(c.nome) === semAcento(cliente));
    if (!cadastro) {
        cadastro = { id: Date.now(), nome: cliente, telefone, email: '', endereco: '', obs: '' };
        clientes.push(cadastro);
        salvarDados(DB_KEY_CLIENTES, clientes);
    } else if (telefone && !cadastro.telefone) {
        cadastro.telefone = telefone;
        salvarDados(DB_KEY_CLIENTES, clientes);
    }

    const novoOrcamento = {
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        cliente,
        clienteId: cadastro.id,
        telefone,
        produto,
        categoria,
        quantidade: orcamentoAtualCalculado.quantidade,
        valorUnitario: orcamentoAtualCalculado.valorUnitario,
        tempoHoras: orcamentoAtualCalculado.tempoHoras,
        horasMao: orcamentoAtualCalculado.horasMao,
        taxaVenda: orcamentoAtualCalculado.taxaVenda,
        maoDeObra: orcamentoAtualCalculado.maoDeObra,
        taxas: orcamentoAtualCalculado.taxas,
        custoTotal: orcamentoAtualCalculado.custoTotal,
        valorVenda: orcamentoAtualCalculado.valorVenda,
        lucro: orcamentoAtualCalculado.lucro,
        filamentosUsados: orcamentoAtualCalculado.filamentosUsados,
        link: linkSeguro(document.getElementById('orc-link')?.value),
        prazo: document.getElementById('orc-prazo')?.value?.trim() || '',
        observacoes: document.getElementById('orc-obs')?.value?.trim() || '',
        status: 'Pendente'
    };

    orcamentos.unshift(novoOrcamento);
    await salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
    const tarefaOrigem = tarefas.find(t => String(t.id) === new URLSearchParams(location.search).get('tarefa'));
    if (tarefaOrigem) {
        tarefaOrigem.concluida = true;
        tarefaOrigem.concluidaEm = Date.now();
        tarefaOrigem.orcamentoId = novoOrcamento.id;
        await salvarDados(DB_KEY_TAREFAS, tarefas);
    }
    avisarDepois(tarefaOrigem ? "Orçamento salvo! Tarefa concluída." : "Orçamento salvo!");

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
        let botoes = '';
        if (orc.status === 'Pendente' || orc.status === 'Cancelado') {
            botoes += `
        <button class="action-btn btn-approve com-texto" type="button" title="Aprovar venda (desconta o filamento do estoque)" onclick="mudarStatus(${index}, 'Aprovado')"><i class="fas fa-check"></i> Aprovar</button>`;
        }
        botoes += `
        ${botaoModelo(orc.link, false)}
        <a class="action-btn btn-quote" href="orcamento-cliente.html?id=${orc.id}" title="Orçamento para o cliente"><i class="fas fa-file-invoice"></i></a>`;
        if (orc.status === 'Pendente') {
            botoes += `
        <button class="action-btn btn-personal" type="button" title="Uso pessoal (desconta o filamento do estoque)" onclick="mudarStatus(${index}, 'Pessoal')"><i class="fas fa-user"></i></button>`;
        }
        if (orc.status === 'Aprovado') {
            botoes += `
        <button class="action-btn btn-pay" type="button" title="Pagamentos" onclick="abrirPagamentos(${orc.id})"><i class="fas fa-hand-holding-dollar"></i></button>`;
        }
        if (orc.status !== 'Cancelado') {
            botoes += `
        <button class="action-btn btn-cancel" type="button" title="Cancelar orçamento" onclick="mudarStatus(${index}, 'Cancelado')"><i class="fas fa-ban"></i></button>`;
        }
        botoes += `
        <button class="action-btn btn-delete" type="button" title="Excluir orçamento" onclick="excluirOrcamento(${index})"><i class="fas fa-trash-can"></i></button>`;

        return `
      <tr>
        <td class="num">${esc(orc.data)}</td>
        <td>
          <strong>${esc(orc.produto)}</strong><br>
          <small>${esc(orc.cliente)}</small>
        </td>
        <td class="num">
          <strong>${brl(orc.valorVenda)}</strong><br>
          ${orc.status === 'Aprovado' ? seloPagamento(orc) : `<small>Custo ${brl(orc.custoTotal)}</small>`}
        </td>
        <td>
          <span class="status-badge ${CLASSES_STATUS[orc.status] || ''}">${esc(orc.status)}</span>
          ${orc.status === 'Aprovado' ? `<br><small>${esc(ETAPAS_PRODUCAO.find(e => e.id === etapaDe(orc)).nome)}${orc.dataAprovacao ? ` · ${esc(orc.dataAprovacao)}` : ''}</small>` : ''}
        </td>
        <td class="acoes">${botoes}</td>
      </tr>`;
    }).join('');
}

function mudarStatus(index, novoStatus) {
    reloadFromStorage();

    const orc = orcamentos[index];
    if (!orc) return;

    // Aprovado e Pessoal já deram baixa no filamento
    const jaBaixouEstoque = orc.status === 'Aprovado' || orc.status === 'Pessoal';

    if (novoStatus === 'Cancelado') {
        const pergunta = (jaBaixouEstoque
            ? `Cancelar "${orc.produto}"? O filamento usado volta para o estoque.`
            : `Cancelar o orçamento "${orc.produto}"?`) +
            (totalPago(orc) > 0 ? `\n\nAtenção: já foram registrados ${brl(totalPago(orc))} em pagamentos. Lembre de devolver ao cliente se for o caso.` : '');
        if (!confirm(pergunta)) return;

        if (jaBaixouEstoque) {
            (orc.filamentosUsados || []).forEach(item => {
                const fil = filamentos.find(f => String(f.id) === String(item.id));
                if (fil) fil.estoqueAtual = Number(fil.estoqueAtual || 0) + Number(item.peso || 0);
            });
            salvarDados(DB_KEY_FILAMENTOS, filamentos);
        }
    }

    if ((novoStatus === 'Aprovado' || novoStatus === 'Pessoal') && !jaBaixouEstoque) {
        if (novoStatus === 'Aprovado') {
            const usados = (orc.filamentosUsados || [])
                .map(item => `• ${item.nome}: ${Number(item.peso || 0).toLocaleString('pt-BR')} g`)
                .join('\n');
            const pergunta = `Aprovar "${orc.produto}" (${brl(orc.valorVenda)})?` +
                (usados ? `\n\nSerá descontado do estoque:\n${usados}` : '');
            if (!confirm(pergunta)) return;
        }

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
    if (novoStatus === 'Aprovado') {
        orc.dataAprovacao = hojeBR();
        orc.producao = 'fila';
    }
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);

    const MENSAGENS = {
        Aprovado: 'Venda aprovada! Estoque atualizado.',
        Pessoal: 'Marcado como uso pessoal. Estoque atualizado.',
        Cancelado: jaBaixouEstoque ? 'Orçamento cancelado. Filamento devolvido ao estoque.' : 'Orçamento cancelado.'
    };
    avisar(MENSAGENS[novoStatus] || 'Status atualizado.');

    renderizarHistorico();
    atualizarDashboard();
}

function excluirOrcamento(index) {
    reloadFromStorage();

    const orc = orcamentos[index];
    if (!orc) return;

    const aviso = orc.status === 'Aprovado' || orc.status === 'Pessoal'
        ? '\n\nO estoque não será alterado. Para devolver o filamento, cancele antes de excluir.'
        : '';
    if (!confirm(`Excluir o orçamento "${orc.produto}" de ${orc.cliente}? Isso não pode ser desfeito.${aviso}`)) return;

    orcamentos.splice(index, 1);
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
    avisar('Orçamento excluído.');

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
    let faturamento = 0, lucro = 0, custo = 0, qtdVendas = 0, gramas = 0;

    orcamentos.forEach(o => {
        if (o.status !== 'Aprovado') return;

        // A venda conta no mês em que foi aprovada (orçamentos antigos não têm essa data)
        const partes = String(o.dataAprovacao || o.data || '').split('/');
        if (filtroMes && partes.length === 3 && `${partes[2]}-${partes[1]}` !== filtroMes) return;

        faturamento += Number(o.valorVenda || 0);
        lucro += Number(o.lucro || 0);
        custo += Number(o.custoTotal || 0);
        gramas += (o.filamentosUsados || []).reduce((soma, item) => soma + Number(item.peso || 0), 0);
        qtdVendas++;
    });

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setTxt('dash-faturamento', brl(faturamento));
    setTxt('dash-lucro', brl(lucro));
    setTxt('dash-custo', brl(custo));
    setTxt('dash-vendas', String(qtdVendas));
    setTxt('dash-filamento', `${gramas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} g`);

    // A receber considera todos os pedidos aprovados, de qualquer mês
    const aprovados = orcamentos.filter(o => o.status === 'Aprovado');
    setTxt('dash-receber', brl(aprovados.reduce((soma, o) => soma + faltaPagar(o), 0)));
    setTxt('dash-producao', String(aprovados.filter(o => etapaDe(o) !== 'entregue').length));

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

    renderizarTarefasPainel();

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

    const dados = { filamentos, maquinas, orcamentos, clientes, tarefas, empresa: carregarEmpresa() };
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
                salvarDados(DB_KEY_CLIENTES, dados.clientes || []),
                salvarDados(DB_KEY_TAREFAS, dados.tarefas || []),
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
const CAMPOS_EMPRESA = ['nome', 'whatsapp', 'instagram', 'email', 'documento', 'cidade', 'pix', 'valorHora', 'taxaVenda', 'validadeDias', 'condicoes', 'termos'];

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
    empresa.valorHora = Math.max(0, parseFloat(empresa.valorHora) || 0);
    empresa.taxaVenda = Math.min(90, Math.max(0, parseFloat(empresa.taxaVenda) || 0));
    salvarDados(DB_KEY_EMPRESA, empresa);
    avisar("Dados da empresa salvos!");
}

// =====================
// PAGAMENTOS
// =====================
const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência'];
let pagamentoOrcId = null;

function abrirPagamentos(orcId) {
    reloadFromStorage();
    const orc = orcamentos.find(o => String(o.id) === String(orcId));
    if (!orc) return;
    pagamentoOrcId = orc.id;

    let dlg = document.getElementById('dlg-pagamento');
    if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'dlg-pagamento';
        dlg.className = 'modal';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    }

    const falta = faltaPagar(orc);
    const pagos = orc.pagamentos || [];

    dlg.innerHTML = `
      <form method="dialog" class="modal-corpo" onsubmit="event.preventDefault(); registrarPagamento();">
        <div class="modal-topo">
          <h3><i class="fas fa-hand-holding-dollar"></i> Pagamentos</h3>
          <button type="button" class="modal-fechar" onclick="this.closest('dialog').close()" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        </div>
        <p class="hint"><strong>${esc(orc.produto)}</strong> · ${esc(orc.cliente)}</p>

        <div class="pag-resumo">
          <div><span>Total</span><strong>${brl(orc.valorVenda)}</strong></div>
          <div><span>Pago</span><strong class="ok">${brl(totalPago(orc))}</strong></div>
          <div><span>Falta</span><strong class="${falta > 0 ? 'falta' : 'ok'}">${brl(falta)}</strong></div>
        </div>

        ${pagos.length ? `
        <ul class="pag-lista">
          ${pagos.map(p => `
            <li>
              <div><strong>${brl(p.valor)}</strong> <small>${esc(p.forma)} · ${esc(p.data)}</small></div>
              <button type="button" class="action-btn btn-delete" title="Remover pagamento" onclick="removerPagamento(${p.id})"><i class="fas fa-trash-can"></i></button>
            </li>`).join('')}
        </ul>` : ''}

        ${falta > 0.009 ? `
        <div class="row">
          <div class="input-group">
            <label for="pag-valor">Valor recebido (R$)</label>
            <input type="number" id="pag-valor" step="0.01" min="0.01" value="${falta.toFixed(2)}" required>
          </div>
          <div class="input-group">
            <label for="pag-forma">Forma</label>
            <select id="pag-forma">${FORMAS_PAGAMENTO.map(f => `<option>${f}</option>`).join('')}</select>
          </div>
        </div>
        <div class="pag-atalhos">
          <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('pag-valor').value='${(Number(orc.valorVenda || 0) / 2).toFixed(2)}'">Sinal de 50%</button>
          <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('pag-valor').value='${falta.toFixed(2)}'">Valor restante</button>
        </div>
        <button type="submit" class="btn-primary full-width"><i class="fas fa-plus"></i> Registrar pagamento</button>` :
        '<p class="pag-quitado"><i class="fas fa-circle-check"></i> Pedido totalmente pago.</p>'}
      </form>
    `;

    if (!dlg.open) dlg.showModal();
}

function registrarPagamento() {
    reloadFromStorage();
    const orc = orcamentos.find(o => String(o.id) === String(pagamentoOrcId));
    if (!orc) return;

    const valor = parseFloat(document.getElementById('pag-valor').value);
    if (!(valor > 0)) return avisar('Informe o valor recebido.', 'erro');

    orc.pagamentos = orc.pagamentos || [];
    orc.pagamentos.push({ id: Date.now(), data: hojeBR(), valor, forma: document.getElementById('pag-forma').value });
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);

    avisar(faltaPagar(orc) < 0.01 ? 'Pagamento registrado. Pedido quitado!' : `Pagamento registrado. Falta ${brl(faltaPagar(orc))}.`);
    abrirPagamentos(orc.id);
    atualizarTela();
}

function removerPagamento(pagId) {
    reloadFromStorage();
    const orc = orcamentos.find(o => String(o.id) === String(pagamentoOrcId));
    if (!orc || !confirm('Remover este pagamento?')) return;

    orc.pagamentos = (orc.pagamentos || []).filter(p => String(p.id) !== String(pagId));
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
    avisar('Pagamento removido.');
    abrirPagamentos(orc.id);
    atualizarTela();
}

// =====================
// PRODUÇÃO (quadro)
// =====================
function renderizarProducao() {
    const quadro = document.getElementById('quadro-producao');
    if (!quadro) return;
    reloadFromStorage();

    const pedidos = orcamentos.filter(o => o.status === 'Aprovado');

    quadro.innerHTML = ETAPAS_PRODUCAO.map((etapa, i) => {
        let itens = pedidos.filter(o => etapaDe(o) === etapa.id);
        // Na coluna "Entregue" mostra só os mais recentes
        if (etapa.id === 'entregue') itens = itens.sort((a, b) => Number(b.entregueEm || 0) - Number(a.entregueEm || 0)).slice(0, 10);

        return `
        <section class="coluna coluna-${etapa.id}">
          <header class="coluna-topo">
            <span><i class="fas ${etapa.icone}"></i> ${etapa.nome}</span>
            <b>${pedidos.filter(o => etapaDe(o) === etapa.id).length}</b>
          </header>
          <div class="coluna-itens">
            ${itens.length ? itens.map(o => cartaoProducao(o, i)).join('') : '<p class="coluna-vazia">Nenhum pedido</p>'}
          </div>
        </section>`;
    }).join('');
}

function cartaoProducao(o, i) {
    const anterior = ETAPAS_PRODUCAO[i - 1];
    const proxima = ETAPAS_PRODUCAO[i + 1];
    const qtd = Number(o.quantidade || 1);
    const avisoPronto = linkWhats(o.telefone, `Olá, ${o.cliente}! Seu pedido "${o.produto}" está pronto! 🎉` +
        (faltaPagar(o) > 0 ? `\nFica faltando ${brl(faltaPagar(o))} para a retirada/entrega.` : '') +
        '\nQual o melhor horário para combinarmos a entrega?');

    return `
      <article class="cartao">
        <div class="cartao-topo">
          <strong>${esc(o.produto)}</strong>
          ${qtd > 1 ? `<span class="fil-tipo">${qtd} un.</span>` : ''}
        </div>
        <small><i class="fas fa-user"></i> ${esc(o.cliente)}</small>
        ${o.prazo ? `<small><i class="far fa-clock"></i> ${esc(o.prazo)}${o.dataAprovacao ? ` (aprovado ${esc(o.dataAprovacao)})` : ''}</small>` : ''}
        <div class="cartao-valores">
          <span class="num">${brl(o.valorVenda)}</span>
          ${seloPagamento(o)}
        </div>
        <div class="cartao-acoes">
          ${anterior ? `<button type="button" class="action-btn" title="Voltar para ${anterior.nome}" onclick="moverProducao(${o.id}, -1)"><i class="fas fa-arrow-left"></i></button>` : '<span></span>'}
          <div>
            ${botaoModelo(o.link, false)}
            <button type="button" class="action-btn btn-pay" title="Pagamentos" onclick="abrirPagamentos(${o.id})"><i class="fas fa-hand-holding-dollar"></i></button>
            ${etapaDe(o) === 'pronto' && o.telefone ? `<a class="action-btn btn-whats-mini" title="Avisar o cliente no WhatsApp" href="${avisoPronto}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a>` : ''}
          </div>
          ${proxima ? `<button type="button" class="action-btn btn-avancar com-texto" title="Mover para ${proxima.nome}" onclick="moverProducao(${o.id}, 1)">${proxima.nome} <i class="fas fa-arrow-right"></i></button>` : '<span></span>'}
        </div>
      </article>`;
}

function moverProducao(orcId, direcao) {
    reloadFromStorage();
    const orc = orcamentos.find(o => String(o.id) === String(orcId));
    if (!orc) return;

    const i = ETAPAS_PRODUCAO.findIndex(e => e.id === etapaDe(orc)) + direcao;
    const etapa = ETAPAS_PRODUCAO[i];
    if (!etapa) return;

    if (etapa.id === 'entregue' && faltaPagar(orc) > 0.009 &&
        !confirm(`Ainda falta receber ${brl(faltaPagar(orc))} deste pedido. Marcar como entregue mesmo assim?`)) return;

    orc.producao = etapa.id;
    if (etapa.id === 'entregue') orc.entregueEm = Date.now();
    salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
    avisar(`"${orc.produto}" movido para ${etapa.nome}.`);
    renderizarProducao();
}

// =====================
// CLIENTES
// =====================
let clienteEditandoId = null;

function pedidosDoCliente(c) {
    return orcamentos.filter(o => String(o.clienteId) === String(c.id) || (!o.clienteId && semAcento(o.cliente) === semAcento(c.nome)));
}

function salvarCliente() {
    reloadFromStorage();
    const campo = id => document.getElementById(id).value.trim();
    const nome = campo('cli-nome');
    if (!nome) return avisar('Informe o nome do cliente.', 'erro');

    const duplicado = clientes.find(c => semAcento(c.nome) === semAcento(nome) && String(c.id) !== String(clienteEditandoId));
    if (duplicado) return avisar('Já existe um cliente com esse nome.', 'erro');

    const dados = { nome, telefone: campo('cli-telefone'), email: campo('cli-email'), endereco: campo('cli-endereco'), obs: campo('cli-obs') };

    if (clienteEditandoId !== null) {
        const cli = clientes.find(c => String(c.id) === String(clienteEditandoId));
        if (cli) {
            const nomeAntigo = cli.nome;
            Object.assign(cli, dados);
            // Orçamentos ligados a ele passam a mostrar o nome novo
            orcamentos.forEach(o => {
                if (String(o.clienteId) === String(cli.id) || (!o.clienteId && o.cliente === nomeAntigo)) {
                    o.clienteId = cli.id;
                    o.cliente = cli.nome;
                    if (!o.telefone) o.telefone = cli.telefone;
                }
            });
            salvarDados(DB_KEY_ORCAMENTOS, orcamentos);
        }
        salvarDados(DB_KEY_CLIENTES, clientes);
        cancelarEdicaoCliente();
        return avisar('Cliente atualizado!');
    }

    clientes.push({ id: Date.now(), ...dados });
    salvarDados(DB_KEY_CLIENTES, clientes);
    limparFormCliente();
    renderizarClientes();
    avisar('Cliente cadastrado!');
}

function limparFormCliente() {
    ['cli-nome', 'cli-telefone', 'cli-email', 'cli-endereco', 'cli-obs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function editarCliente(id) {
    reloadFromStorage();
    const cli = clientes.find(c => String(c.id) === String(id));
    if (!cli) return;

    clienteEditandoId = cli.id;
    const valores = { 'cli-nome': cli.nome, 'cli-telefone': cli.telefone, 'cli-email': cli.email, 'cli-endereco': cli.endereco, 'cli-obs': cli.obs };
    Object.entries(valores).forEach(([campo, valor]) => { document.getElementById(campo).value = valor ?? ''; });

    const form = document.getElementById('form-cliente');
    form.classList.add('editando');
    document.getElementById('cli-form-titulo').innerHTML = `<i class="fas fa-pen"></i> Editando: ${esc(cli.nome)}`;
    document.getElementById('cli-btn-salvar').innerHTML = '<i class="fas fa-check"></i> Salvar alterações';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderizarClientes();
}

function cancelarEdicaoCliente() {
    clienteEditandoId = null;
    limparFormCliente();
    const form = document.getElementById('form-cliente');
    if (form) {
        form.classList.remove('editando');
        document.getElementById('cli-form-titulo').innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar cliente';
        document.getElementById('cli-btn-salvar').innerHTML = '<i class="fas fa-plus"></i> Cadastrar cliente';
    }
    renderizarClientes();
}

function excluirCliente(id) {
    reloadFromStorage();
    const cli = clientes.find(c => String(c.id) === String(id));
    if (!cli) return;
    const qtd = pedidosDoCliente(cli).length;
    if (!confirm(`Excluir o cliente "${cli.nome}"?` + (qtd ? `\n\nOs ${qtd} orçamento(s) dele continuam no histórico.` : ''))) return;

    if (String(cli.id) === String(clienteEditandoId)) cancelarEdicaoCliente();
    clientes = clientes.filter(c => String(c.id) !== String(id));
    salvarDados(DB_KEY_CLIENTES, clientes);
    renderizarClientes();
    avisar('Cliente excluído.');
}

function renderizarClientes() {
    const tbody = document.querySelector('#tabela-clientes tbody');
    if (!tbody) return;
    reloadFromStorage();

    const busca = semAcento(document.getElementById('cli-busca')?.value);
    const lista = clientes
        .map(c => {
            const pedidos = pedidosDoCliente(c);
            const vendas = pedidos.filter(o => o.status === 'Aprovado');
            return {
                c,
                pedidos: pedidos.filter(o => o.status !== 'Cancelado').length,
                total: vendas.reduce((s, o) => s + Number(o.valorVenda || 0), 0),
                falta: vendas.reduce((s, o) => s + faltaPagar(o), 0),
                ultimo: pedidos.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0)
            };
        })
        .filter(({ c }) => !busca || semAcento(`${c.nome} ${c.telefone} ${c.email}`).includes(busca))
        .sort((a, b) => b.total - a.total || a.c.nome.localeCompare(b.c.nome));

    if (!clientes.length) {
        tbody.innerHTML = linhaVazia(5, 'fa-users', 'Nenhum cliente ainda. Eles também são cadastrados automaticamente ao salvar um orçamento.');
        return;
    }
    if (!lista.length) {
        tbody.innerHTML = linhaVazia(5, 'fa-magnifying-glass', 'Nenhum cliente encontrado.');
        return;
    }

    tbody.innerHTML = lista.map(({ c, pedidos, total, falta, ultimo }) => `
      <tr class="${String(c.id) === String(clienteEditandoId) ? 'linha-editando' : ''}">
        <td>
          <div class="fil-nome">
            <span class="avatar">${esc(c.nome.trim().charAt(0).toUpperCase())}</span>
            <div>
              <strong>${esc(c.nome)}</strong><br>
              <small>${[c.telefone, c.email].filter(Boolean).map(esc).join(' · ') || 'Sem contato'}</small>
            </div>
          </div>
        </td>
        <td class="num">${pedidos}</td>
        <td class="num"><strong>${brl(total)}</strong>${falta > 0.009 ? `<br><span class="pag-badge pag-parcial">Falta ${brl(falta)}</span>` : ''}</td>
        <td class="num">${ultimo ? new Date(ultimo).toLocaleDateString('pt-BR') : '-'}</td>
        <td class="acoes">
          ${c.telefone ? `<a class="action-btn btn-whats-mini" title="Conversar no WhatsApp" href="${linkWhats(c.telefone, `Olá, ${c.nome}!`)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a>` : ''}
          <a class="action-btn" title="Novo orçamento para este cliente" href="orcamento.html?cliente=${c.id}"><i class="fas fa-calculator"></i></a>
          <button class="action-btn btn-edit" type="button" title="Editar" onclick="editarCliente(${c.id})"><i class="fas fa-pen"></i></button>
          <button class="action-btn btn-delete" type="button" title="Excluir" onclick="excluirCliente(${c.id})"><i class="fas fa-trash-can"></i></button>
        </td>
      </tr>`).join('');
}

// =====================
// TAREFAS (orçamentos a fazer, tarefas, impressões)
// =====================
const TIPOS_TAREFA = {
    orcamento: { nome: 'Orçamento a fazer', curto: 'Orçamento', icone: 'fa-file-invoice-dollar', adicionado: 'Orçamento a fazer adicionado!' },
    tarefa: { nome: 'Tarefa', curto: 'Tarefa', icone: 'fa-list-check', adicionado: 'Tarefa adicionada!' },
    impressao: { nome: 'Impressão a fazer', curto: 'Impressão', icone: 'fa-print', adicionado: 'Impressão adicionada!' }
};
const PRIORIDADES = { alta: { nome: 'Alta', peso: 0 }, media: { nome: 'Média', peso: 1 }, baixa: { nome: 'Baixa', peso: 2 } };

let tarefaEditandoId = null;
let tipoTarefaAtual = 'tarefa';
let filtroTarefas = 'pendentes';

// Data de hoje no formato do campo de data (AAAA-MM-DD)
function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function situacaoPrazo(t) {
    if (!t.prazo || t.concluida) return '';
    const hoje = hojeISO();
    if (t.prazo < hoje) return 'atrasada';
    if (t.prazo === hoje) return 'hoje';
    return '';
}

function textoPrazo(t) {
    if (!t.prazo) return '';
    const situacao = situacaoPrazo(t);
    if (situacao === 'hoje') return 'Hoje';
    const [a, m, d] = t.prazo.split('-');
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    if (t.prazo === `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}` && !t.concluida) return 'Amanhã';
    return `${d}/${m}/${a}`;
}

function ordenarTarefas(lista) {
    return [...lista].sort((a, b) => {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        if (a.concluida) return Number(b.concluidaEm || 0) - Number(a.concluidaEm || 0);
        const pa = a.prazo || '9999-99-99', pb = b.prazo || '9999-99-99';
        if (pa !== pb) return pa < pb ? -1 : 1;
        return (PRIORIDADES[a.prioridade]?.peso ?? 1) - (PRIORIDADES[b.prioridade]?.peso ?? 1);
    });
}

function escolherTipoTarefa(tipo) {
    tipoTarefaAtual = tipo;
    document.querySelectorAll('.tipo-opcao').forEach(b => b.classList.toggle('ativo', b.dataset.tipo === tipo));
    const form = document.getElementById('form-tarefa');
    if (form) form.dataset.tipo = tipo;

    const titulo = document.getElementById('tar-titulo');
    const placeholders = {
        orcamento: 'O que o cliente pediu? Ex.: 10 chaveiros personalizados',
        tarefa: 'Ex.: Comprar filamento PETG preto',
        impressao: 'O que imprimir? Ex.: Suporte de headset'
    };
    if (titulo) titulo.placeholder = placeholders[tipo];

    // Listas de impressoras e filamentos para impressões
    const maq = document.getElementById('tar-impressora');
    if (maq && tipo === 'impressao') {
        const atual = maq.value;
        maq.innerHTML = '<option value="">Qualquer impressora</option>' + maquinas.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join('');
        maq.value = atual;
    }
    const fil = document.getElementById('tar-filamento');
    if (fil && tipo === 'impressao') {
        const atual = fil.value;
        fil.innerHTML = '<option value="">A definir</option>' + filamentos.map(f => `<option value="${f.id}">${esc([f.tipo, f.cor, f.marca].filter(Boolean).join(' · '))}</option>`).join('');
        fil.value = atual;
    }

    const lista = document.getElementById('lista-clientes-tarefa');
    if (lista) lista.innerHTML = clientes.map(c => `<option value="${esc(c.nome)}"></option>`).join('');
}

function salvarTarefa() {
    reloadFromStorage();
    const valor = id => (document.getElementById(id)?.value || '').trim();

    const titulo = valor('tar-titulo');
    if (!titulo) return avisar('Descreva o que precisa ser feito.', 'erro');
    if (tipoTarefaAtual === 'orcamento' && !valor('tar-cliente')) return avisar('Informe o cliente do orçamento.', 'erro');
    if (valor('tar-link') && !linkSeguro(valor('tar-link'))) return avisar('O link do modelo não parece válido.', 'erro');

    const dados = {
        tipo: tipoTarefaAtual,
        titulo,
        cliente: valor('tar-cliente'),
        prazo: valor('tar-prazo'),
        prioridade: valor('tar-prioridade') || 'media',
        descricao: valor('tar-descricao'),
        link: linkSeguro(valor('tar-link')),
        impressoraId: tipoTarefaAtual === 'impressao' ? valor('tar-impressora') : '',
        filamentoId: tipoTarefaAtual === 'impressao' ? valor('tar-filamento') : '',
        quantidade: Math.max(1, parseInt(valor('tar-quantidade'), 10) || 1)
    };

    if (tarefaEditandoId !== null) {
        const t = tarefas.find(x => String(x.id) === String(tarefaEditandoId));
        if (t) Object.assign(t, dados);
        salvarDados(DB_KEY_TAREFAS, tarefas);
        cancelarEdicaoTarefa();
        return avisar('Tarefa atualizada!');
    }

    tarefas.push({ id: Date.now(), ...dados, concluida: false, criadaEm: Date.now() });
    salvarDados(DB_KEY_TAREFAS, tarefas);
    limparFormTarefa();
    if (filtroTarefas === 'concluidas') filtroTarefas = 'pendentes';
    renderizarTarefas();
    atualizarContadorTarefas();
    avisar(TIPOS_TAREFA[dados.tipo].adicionado);
}

function limparFormTarefa() {
    ['tar-titulo', 'tar-cliente', 'tar-prazo', 'tar-descricao', 'tar-link', 'tar-impressora', 'tar-filamento'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const prio = document.getElementById('tar-prioridade');
    if (prio) prio.value = 'media';
    const qtd = document.getElementById('tar-quantidade');
    if (qtd) qtd.value = '1';
}

function editarTarefa(id) {
    reloadFromStorage();
    const t = tarefas.find(x => String(x.id) === String(id));
    if (!t) return;

    tarefaEditandoId = t.id;
    escolherTipoTarefa(t.tipo);
    const valores = {
        'tar-titulo': t.titulo, 'tar-cliente': t.cliente, 'tar-prazo': t.prazo, 'tar-prioridade': t.prioridade || 'media',
        'tar-descricao': t.descricao, 'tar-link': t.link, 'tar-impressora': t.impressoraId, 'tar-filamento': t.filamentoId, 'tar-quantidade': t.quantidade || 1
    };
    Object.entries(valores).forEach(([campo, v]) => {
        const el = document.getElementById(campo);
        if (el) el.value = v ?? '';
    });

    const form = document.getElementById('form-tarefa');
    form.classList.add('editando');
    document.getElementById('tar-form-titulo').innerHTML = '<i class="fas fa-pen"></i> Editando item';
    document.getElementById('tar-btn-salvar').innerHTML = '<i class="fas fa-check"></i> Salvar alterações';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderizarTarefas();
}

function cancelarEdicaoTarefa() {
    tarefaEditandoId = null;
    limparFormTarefa();
    const form = document.getElementById('form-tarefa');
    if (form) {
        form.classList.remove('editando');
        document.getElementById('tar-form-titulo').innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar';
        document.getElementById('tar-btn-salvar').innerHTML = '<i class="fas fa-plus"></i> Adicionar';
    }
    renderizarTarefas();
    atualizarContadorTarefas();
}

function alternarTarefa(id) {
    reloadFromStorage();
    const t = tarefas.find(x => String(x.id) === String(id));
    if (!t) return;
    t.concluida = !t.concluida;
    t.concluidaEm = t.concluida ? Date.now() : null;
    salvarDados(DB_KEY_TAREFAS, tarefas);
    avisar(t.concluida ? 'Concluída! 🎉' : 'Voltou para pendentes.');
    atualizarTela();
}

function excluirTarefa(id) {
    reloadFromStorage();
    const t = tarefas.find(x => String(x.id) === String(id));
    if (!t || !confirm(`Excluir "${t.titulo}"?`)) return;
    if (String(t.id) === String(tarefaEditandoId)) cancelarEdicaoTarefa();
    tarefas = tarefas.filter(x => String(x.id) !== String(id));
    salvarDados(DB_KEY_TAREFAS, tarefas);
    avisar('Item excluído.');
    renderizarTarefas();
    atualizarContadorTarefas();
}

function limparConcluidas() {
    reloadFromStorage();
    const qtd = tarefas.filter(t => t.concluida).length;
    if (!qtd || !confirm(`Apagar ${qtd} item(ns) concluído(s)?`)) return;
    tarefas = tarefas.filter(t => !t.concluida);
    salvarDados(DB_KEY_TAREFAS, tarefas);
    avisar('Concluídas apagadas.');
    renderizarTarefas();
}

function filtrarTarefas(filtro) {
    filtroTarefas = filtro;
    renderizarTarefas();
}

function itemTarefaHTML(t, compacto = false) {
    const tipo = TIPOS_TAREFA[t.tipo] || TIPOS_TAREFA.tarefa;
    const situacao = situacaoPrazo(t);
    const prazo = textoPrazo(t);
    const maq = maquinas.find(m => String(m.id) === String(t.impressoraId));
    const fil = filamentos.find(f => String(f.id) === String(t.filamentoId));

    const detalhes = [
        t.cliente && `<span><i class="fas fa-user"></i> ${esc(t.cliente)}</span>`,
        t.tipo === 'impressao' && t.quantidade > 1 && `<span><i class="fas fa-cubes"></i> ${t.quantidade} un.</span>`,
        t.tipo === 'impressao' && maq && `<span><i class="fas fa-print"></i> ${esc(maq.nome)}</span>`,
        t.tipo === 'impressao' && fil && `<span><span class="swatch swatch-mini" style="background: ${corDoFilamento(fil.cor)};"></span> ${esc([fil.tipo, fil.cor].filter(Boolean).join(' '))}</span>`,
        prazo && `<span class="prazo ${situacao}"><i class="far fa-calendar"></i> ${situacao === 'atrasada' ? 'Atrasada · ' : ''}${prazo}</span>`
    ].filter(Boolean).join('');

    return `
      <li class="tarefa ${t.concluida ? 'feita' : ''} prio-${t.prioridade || 'media'} ${String(t.id) === String(tarefaEditandoId) ? 'linha-editando' : ''}">
        <button type="button" class="check" title="${t.concluida ? 'Marcar como pendente' : 'Marcar como concluída'}" onclick="alternarTarefa(${t.id})"><i class="fas fa-check"></i></button>
        <div class="tarefa-corpo">
          <div class="tarefa-titulo">
            <span class="tipo-chip tipo-${t.tipo}"><i class="fas ${tipo.icone}"></i> ${tipo.curto}</span>
            <strong>${esc(t.titulo)}</strong>
          </div>
          ${detalhes ? `<div class="tarefa-detalhes">${detalhes}</div>` : ''}
          ${!compacto && t.descricao ? `<p class="tarefa-desc">${esc(t.descricao)}</p>` : ''}
        </div>
        ${compacto ? (t.link ? `<div class="tarefa-acoes">${botaoModelo(t.link, false)}</div>` : '') : `
        <div class="tarefa-acoes">
          ${botaoModelo(t.link)}
          ${t.tipo === 'orcamento' && !t.concluida ? `<a class="action-btn btn-approve com-texto" href="orcamento.html?tarefa=${t.id}" title="Abrir o orçamento já preenchido"><i class="fas fa-calculator"></i> Fazer orçamento</a>` : ''}
          ${t.orcamentoId ? `<a class="action-btn btn-quote" href="orcamento-cliente.html?id=${t.orcamentoId}" title="Ver o orçamento feito"><i class="fas fa-file-invoice"></i></a>` : ''}
          <button type="button" class="action-btn btn-edit" title="Editar" onclick="editarTarefa(${t.id})"><i class="fas fa-pen"></i></button>
          <button type="button" class="action-btn btn-delete" title="Excluir" onclick="excluirTarefa(${t.id})"><i class="fas fa-trash-can"></i></button>
        </div>`}
      </li>`;
}

function renderizarTarefas() {
    const lista = document.getElementById('lista-tarefas');
    if (!lista) return;
    reloadFromStorage();

    const pendentes = tarefas.filter(t => !t.concluida);
    const contagem = {
        pendentes: pendentes.length,
        orcamento: pendentes.filter(t => t.tipo === 'orcamento').length,
        tarefa: pendentes.filter(t => t.tipo === 'tarefa').length,
        impressao: pendentes.filter(t => t.tipo === 'impressao').length,
        atrasadas: pendentes.filter(t => situacaoPrazo(t) === 'atrasada').length,
        concluidas: tarefas.length - pendentes.length
    };
    document.querySelectorAll('.filtro-tarefa').forEach(b => {
        b.classList.toggle('ativo', b.dataset.filtro === filtroTarefas);
        const n = b.querySelector('b');
        if (n) n.textContent = contagem[b.dataset.filtro] ?? '';
    });

    const filtros = {
        pendentes: t => !t.concluida,
        orcamento: t => !t.concluida && t.tipo === 'orcamento',
        tarefa: t => !t.concluida && t.tipo === 'tarefa',
        impressao: t => !t.concluida && t.tipo === 'impressao',
        atrasadas: t => situacaoPrazo(t) === 'atrasada',
        concluidas: t => t.concluida
    };
    const itens = ordenarTarefas(tarefas.filter(filtros[filtroTarefas] || filtros.pendentes));

    const botaoLimpar = document.getElementById('btn-limpar-concluidas');
    if (botaoLimpar) botaoLimpar.style.display = filtroTarefas === 'concluidas' && itens.length ? '' : 'none';

    const VAZIO = {
        pendentes: 'Tudo em dia! Nada pendente.',
        concluidas: 'Nenhum item concluído ainda.',
        atrasadas: 'Nenhum item atrasado. 👏'
    };
    lista.innerHTML = itens.length
        ? itens.map(t => itemTarefaHTML(t)).join('')
        : `<li class="tarefas-vazio"><i class="fas fa-mug-hot"></i>${VAZIO[filtroTarefas] || 'Nada por aqui.'}</li>`;
}

// Painel: próximos itens pendentes
function renderizarTarefasPainel() {
    const lista = document.getElementById('dash-tarefas');
    if (!lista) return;
    const proximas = ordenarTarefas(tarefas.filter(t => !t.concluida)).slice(0, 5);
    lista.innerHTML = proximas.length
        ? proximas.map(t => itemTarefaHTML(t, true)).join('')
        : '<li class="tarefas-vazio"><i class="fas fa-mug-hot"></i>Nada pendente.</li>';
}

// Número de pendências ao lado de "Tarefas" no menu
function atualizarContadorTarefas() {
    const link = document.querySelector('.sidebar a[href="tarefas.html"]');
    if (!link) return;
    const pendentes = tarefas.filter(t => !t.concluida);
    const atrasadas = pendentes.filter(t => situacaoPrazo(t) === 'atrasada').length;
    let badge = link.querySelector('.nav-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        link.appendChild(badge);
    }
    badge.textContent = pendentes.length;
    badge.hidden = !pendentes.length;
    badge.classList.toggle('alerta', atrasadas > 0);
    badge.title = atrasadas ? `${atrasadas} atrasada(s)` : `${pendentes.length} pendente(s)`;
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

        const taxa = document.getElementById('orc-taxa');
        if (taxa) taxa.value = Number(carregarEmpresa().taxaVenda || 0);

        // Vindo da tela de tarefas: orcamento.html?tarefa=<id>
        const tarefa = tarefas.find(t => String(t.id) === new URLSearchParams(location.search).get('tarefa'));
        if (tarefa) {
            const cad = clientes.find(c => semAcento(c.nome) === semAcento(tarefa.cliente));
            document.getElementById('orc-cliente').value = tarefa.cliente || '';
            document.getElementById('orc-telefone').value = cad?.telefone || '';
            document.getElementById('orc-produto').value = tarefa.titulo || '';
            document.getElementById('orc-obs').value = tarefa.descricao || '';
            document.getElementById('orc-link').value = tarefa.link || '';
            if (tarefa.quantidade > 1) document.getElementById('orc-quantidade').value = tarefa.quantidade;
        }

        // Vindo da tela de clientes: orcamento.html?cliente=<id>
        const cli = clientes.find(c => String(c.id) === new URLSearchParams(location.search).get('cliente'));
        if (cli) {
            document.getElementById('orc-cliente').value = cli.nome;
            document.getElementById('orc-telefone').value = cli.telefone || '';
        }
    }

    // Dados da empresa
    if (document.getElementById('emp-nome')) preencherFormEmpresa();

    // Tarefas
    if (document.getElementById('form-tarefa')) escolherTipoTarefa('tarefa');

    atualizarTela();
}

// Redesenha o que depende dos dados; chamado de novo quando chegam alterações de outro aparelho
function atualizarTela() {
    reloadFromStorage();

    if (document.getElementById('dash-filtro-mes')) atualizarDashboard();

    if (document.getElementById('orc-maquina')) {
        carregarOpcoesOrcamento();
        carregarClientesOrcamento();
        calcularEmTempoReal();
    }

    renderizarProducao();
    renderizarClientes();
    renderizarTarefas();
    atualizarContadorTarefas();

    if (document.querySelector('#tabela-maquinas tbody')) renderizarMaquinas();
    if (document.querySelector('#tabela-filamentos tbody')) renderizarFilamentos();
    if (document.querySelector('#tabela-historico tbody')) renderizarHistorico();
}

window.addEventListener('load', () => {
    if (!window.NUVEM_ATIVA) iniciarPagina();
});
