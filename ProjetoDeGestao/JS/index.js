// --- CONFIGURAÇÃO E DADOS ---
const DB_KEY_FILAMENTOS = 'nexus_filamentos';
const DB_KEY_MAQUINAS = 'nexus_maquinas';
const DB_KEY_ORCAMENTOS = 'nexus_orcamentos';

// Estado inicial
let filamentos = JSON.parse(localStorage.getItem(DB_KEY_FILAMENTOS)) || [];
let maquinas = JSON.parse(localStorage.getItem(DB_KEY_MAQUINAS)) || [];
let orcamentos = JSON.parse(localStorage.getItem(DB_KEY_ORCAMENTOS)) || [];

let orcamentoAtualCalculado = null;

// --- MENU MOBILE ---
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// --- NAVEGAÇÃO ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

    document.getElementById(sectionId).classList.add('active-section');

    const buttons = document.querySelectorAll('nav button');
    // Mapeamento de botões
    const map = {
        'dashboard': 0, 'orcamento': 1, 'historico': 2, 
        'filamentos': 3, 'maquinas': 4, 'backup': 5
    };
    if(map[sectionId] !== undefined) buttons[map[sectionId]].classList.add('active');

    // Lógica específica de cada seção
    if(sectionId === 'orcamento') {
        carregarOpcoesOrcamento();
        if(document.getElementById('filamentos-container').children.length === 0) {
            adicionarLinhaFilamento(true); 
        }
        calcularEmTempoReal(); 
    }
    if(sectionId === 'historico') renderizarHistorico();
    if(sectionId === 'filamentos') renderizarFilamentos();
    if(sectionId === 'maquinas') renderizarMaquinas();
    if(sectionId === 'dashboard') atualizarDashboard();

    // Fecha o menu mobile ao clicar em um item
    if(window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if(sidebar.classList.contains('active')) toggleMenu();
    }
}

// --- MÁQUINAS ---
function salvarMaquina() {
    const nome = document.getElementById('maq-nome').value;
    const valor = parseFloat(document.getElementById('maq-valor').value);
    const potencia = parseFloat(document.getElementById('maq-potencia').value);
    const kwh = parseFloat(document.getElementById('maq-kwh').value);
    const vidaUtil = parseFloat(document.getElementById('maq-vida').value) || 3000;

    if (!nome || isNaN(valor)) return alert("Preencha os dados corretamente.");

    const maquina = { id: Date.now(), nome, valor, potencia, kwh, vidaUtil };
    maquinas.push(maquina);
    localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(maquinas));

    document.getElementById('maq-nome').value = '';
    document.getElementById('maq-valor').value = '';
    document.getElementById('maq-vida').value = '3000';
    renderizarMaquinas();
    alert("Máquina cadastrada!");
}

function renderizarMaquinas() {
    const tbody = document.querySelector('#tabela-maquinas tbody');
    tbody.innerHTML = '';
    maquinas.forEach((m, index) => {
        const vida = m.vidaUtil || 3000;
        tbody.innerHTML += `
            <tr>
                <td>${m.nome}</td>
                <td>R$ ${m.valor.toFixed(2)}</td>
                <td>${m.potencia}W</td>
                <td>${vida}h</td>
                <td><button class="action-btn btn-delete" onclick="deletarMaquina(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });
}

function deletarMaquina(index) {
    if(confirm("Excluir máquina?")) {
        maquinas.splice(index, 1);
        localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(maquinas));
        renderizarMaquinas();
    }
}

// --- FILAMENTOS ---
function salvarFilamento() {
    const marca = document.getElementById('fil-marca').value;
    const cor = document.getElementById('fil-cor').value;
    const tipo = document.getElementById('fil-tipo').value;
    const preco = parseFloat(document.getElementById('fil-preco').value);
    const peso = parseFloat(document.getElementById('fil-peso').value);

    if (!marca || isNaN(preco)) return alert("Preencha os dados corretamente.");

    const custoPorGrama = preco / peso;

    const filamento = { 
        id: Date.now(), 
        marca, cor, tipo, preco, pesoTotal: peso, estoqueAtual: peso, custoPorGrama 
    };

    filamentos.push(filamento);
    localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));

    document.getElementById('fil-marca').value = '';
    document.getElementById('fil-cor').value = '';
    renderizarFilamentos();
    alert("Filamento cadastrado!");
}

function renderizarFilamentos() {
    const tbody = document.querySelector('#tabela-filamentos tbody');
    tbody.innerHTML = '';
    filamentos.forEach((f, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${f.marca} - ${f.cor}</td>
                <td>R$ ${f.preco.toFixed(2)}</td>
                <td>${f.estoqueAtual.toFixed(1)}g</td>
                <td>R$ ${f.custoPorGrama.toFixed(4)}</td>
                <td><button class="action-btn btn-delete" onclick="deletarFilamento(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });
}

function deletarFilamento(index) {
    if(confirm("Excluir filamento?")) {
        filamentos.splice(index, 1);
        localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));
        renderizarFilamentos();
    }
}

// --- ORÇAMENTO ---
function carregarOpcoesOrcamento() {
    const selectMaq = document.getElementById('orc-maquina');
    const valorAtual = selectMaq.value;
    selectMaq.innerHTML = '<option value="">Selecione...</option>';
    maquinas.forEach(m => {
        selectMaq.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
    });
    if(valorAtual) selectMaq.value = valorAtual;
}

function adicionarLinhaFilamento(reset = false) {
    const container = document.getElementById('filamentos-container');
    if(reset) container.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'filament-row';

    let options = '<option value="">Escolha o Filamento</option>';
    filamentos.forEach(f => {
        options += `<option value="${f.id}">${f.marca} ${f.cor} (R$${f.custoPorGrama.toFixed(3)}/g)</option>`;
    });

    div.innerHTML = `
        <select class="orc-filamento-select" onchange="calcularEmTempoReal()">${options}</select>
        <input type="number" class="orc-filamento-peso" placeholder="Peso (g)" oninput="calcularEmTempoReal()">
        <button class="btn-delete" onclick="this.parentElement.remove(); calcularEmTempoReal()">X</button>
    `;
    container.appendChild(div);
}

function limparPrecoManual() {
    document.getElementById('orc-preco-manual').value = '';
}

function calcularEmTempoReal() {
    const maquinaId = document.getElementById('orc-maquina').value;
    const tempoHoras = parseFloat(document.getElementById('orc-tempo').value) || 0;
    const extras = parseFloat(document.getElementById('orc-extras').value) || 0;
    const margemErro = parseFloat(document.getElementById('orc-erro').value) || 0;
    const margemLucro = parseFloat(document.getElementById('orc-margem-lucro').value) || 0;
    const precoManual = parseFloat(document.getElementById('orc-preco-manual').value);

    let custoFilamentoTotal = 0;
    let filamentosUsados = []; 

    const selects = document.querySelectorAll('.orc-filamento-select');
    const pesos = document.querySelectorAll('.orc-filamento-peso');

    for(let i=0; i<selects.length; i++) {
        const idFil = selects[i].value;
        const peso = parseFloat(pesos[i].value) || 0;
        if(idFil && peso > 0) {
            const fil = filamentos.find(f => f.id == idFil);
            if(fil) {
                custoFilamentoTotal += (fil.custoPorGrama * peso);
                filamentosUsados.push({ id: fil.id, peso: peso, nome: `${fil.marca} ${fil.cor}` });
            }
        }
    }

    let custoEnergia = 0;
    let custoDesgaste = 0;

    if(maquinaId) {
        const maquina = maquinas.find(m => m.id == maquinaId);
        if(maquina) {
            custoEnergia = (maquina.potencia / 1000) * tempoHoras * maquina.kwh;
            const vidaUtilHoras = maquina.vidaUtil || 3000; 
            custoDesgaste = (maquina.valor / vidaUtilHoras) * tempoHoras;
        }
    }

    let subtotal = custoFilamentoTotal + custoEnergia + custoDesgaste + extras;
    const valorErro = subtotal * (margemErro / 100);
    const custoFinal = subtotal + valorErro;

    let precoVenda = 0;
    let valorLucro = 0;

    if(precoManual > 0) {
        precoVenda = precoManual;
        valorLucro = precoVenda - custoFinal;
    } else {
        valorLucro = custoFinal * (margemLucro / 100);
        precoVenda = custoFinal + valorLucro;
    }

    document.getElementById('res-filamento').innerText = `R$ ${custoFilamentoTotal.toFixed(2)}`;
    document.getElementById('res-energia').innerText = `R$ ${custoEnergia.toFixed(2)}`;
    document.getElementById('res-desgaste').innerText = `R$ ${custoDesgaste.toFixed(2)}`;
    document.getElementById('res-extras').innerText = `R$ ${extras.toFixed(2)}`;
    document.getElementById('res-erro').innerText = `R$ ${valorErro.toFixed(2)}`;
    document.getElementById('res-total-custo').innerText = `R$ ${custoFinal.toFixed(2)}`;
    document.getElementById('res-preco-final').innerText = `R$ ${precoVenda.toFixed(2)}`;
    document.getElementById('res-lucro-final').innerText = `Lucro: R$ ${valorLucro.toFixed(2)}`;

    orcamentoAtualCalculado = {
        custoTotal: custoFinal,
        valorVenda: precoVenda,
        lucro: valorLucro,
        filamentosUsados
    };
}

function salvarOrcamento() {
    calcularEmTempoReal();
    const cliente = document.getElementById('orc-cliente').value;
    const produto = document.getElementById('orc-produto').value;
    const categoria = document.getElementById('orc-categoria').value;
    const maquinaId = document.getElementById('orc-maquina').value;

    if(!cliente || !produto) return alert("Preencha Cliente e Produto.");
    if(!maquinaId) return alert("Selecione uma máquina.");
    if(!orcamentoAtualCalculado) return alert("Erro no cálculo.");

    const novoOrcamento = {
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        cliente, 
        telefone: document.getElementById('orc-telefone').value,
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

    document.getElementById('orc-cliente').value = '';
    document.getElementById('orc-produto').value = '';
    document.getElementById('orc-telefone').value = '';
    showSection('historico');
}

// --- HISTÓRICO ---
function renderizarHistorico() {
    const tbody = document.querySelector('#tabela-historico tbody');
    tbody.innerHTML = '';

    orcamentos.forEach((orc, index) => {
        let badgeClass = '';
        if(orc.status === 'Pendente') badgeClass = 'status-pendente';
        if(orc.status === 'Aprovado') badgeClass = 'status-aprovado';
        if(orc.status === 'Cancelado') badgeClass = 'status-cancelado';
        if(orc.status === 'Pessoal') badgeClass = 'status-pessoal';

        let botoes = '';
        if(orc.status === 'Pendente') {
            botoes = `
                <button class="action-btn btn-approve" onclick="mudarStatus(${index}, 'Aprovado')"><i class="fas fa-check"></i></button>
                <button class="action-btn btn-personal" onclick="mudarStatus(${index}, 'Pessoal')"><i class="fas fa-user"></i></button>
                <button class="action-btn btn-cancel" onclick="mudarStatus(${index}, 'Cancelado')"><i class="fas fa-times"></i></button>
            `;
        }

        // Tabela simplificada para mobile (colunas combinadas)
        tbody.innerHTML += `
            <tr>
                <td>${orc.data}</td>
                <td>
                    <strong>${orc.produto}</strong><br>
                    <small>${orc.cliente}</small>
                </td>
                <td>
                    <small>Custo: R$${orc.custoTotal.toFixed(2)}</small><br>
                    <strong>Venda: R$${orc.valorVenda.toFixed(2)}</strong>
                </td>
                <td><span class="status-badge ${badgeClass}">${orc.status}</span></td>
                <td>${botoes}</td>
            </tr>
        `;
    });
}

function mudarStatus(index, novoStatus) {
    const orc = orcamentos[index];
    if(novoStatus === 'Aprovado' || novoStatus === 'Pessoal') {
        let estoqueOk = true;
        orc.filamentosUsados.forEach(item => {
            const fil = filamentos.find(f => f.id == item.id);
            if(!fil || fil.estoqueAtual < item.peso) {
                estoqueOk = false;
                alert(`Estoque insuficiente: ${item.nome}`);
            }
        });
        if(!estoqueOk) return;

        orc.filamentosUsados.forEach(item => {
            const filIndex = filamentos.findIndex(f => f.id == item.id);
            if(filIndex > -1) filamentos[filIndex].estoqueAtual -= item.peso;
        });
        localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(filamentos));
    }
    orc.status = novoStatus;
    localStorage.setItem(DB_KEY_ORCAMENTOS, JSON.stringify(orcamentos));
    renderizarHistorico();
    atualizarDashboard();
}

// --- DASHBOARD ---
function atualizarDashboard() {
    const filtroMes = document.getElementById('dash-filtro-mes').value; 
    let faturamento = 0, lucro = 0, custo = 0, qtdVendas = 0;

    orcamentos.forEach(o => {
        let dataValida = true;
        if(filtroMes) {
            const partes = o.data.split('/');
            const anoMesOrcamento = `${partes[2]}-${partes[1]}`; 
            if(anoMesOrcamento !== filtroMes) dataValida = false;
        }
        if(dataValida && o.status === 'Aprovado') {
            faturamento += o.valorVenda;
            lucro += o.lucro;
            custo += o.custoTotal;
            qtdVendas++;
        }
    });

    document.getElementById('dash-faturamento').innerText = `R$ ${faturamento.toFixed(2)}`;
    document.getElementById('dash-lucro').innerText = `R$ ${lucro.toFixed(2)}`;
    document.getElementById('dash-custo').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('dash-vendas').innerText = qtdVendas;

    const lista = document.getElementById('dash-history-list');
    lista.innerHTML = '';
    orcamentos.slice(0, 5).forEach(o => {
        lista.innerHTML += `
            <li style="padding: 10px; border-bottom: 1px solid #2a5241; display: flex; justify-content: space-between;">
                <span>${o.produto}</span>
                <span class="${o.status === 'Aprovado' ? 'highlight' : ''}">${o.status}</span>
            </li>
        `;
    });
}

// --- BACKUP ---
function gerarBackup() {
    const dados = { filamentos, maquinas, orcamentos };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dados))));
    document.getElementById('backup-output').value = encoded;
}

function copiarBackup() {
    const textarea = document.getElementById('backup-output');
    textarea.select();
    document.execCommand('copy');
    alert("Copiado!");
}

function restaurarBackup() {
    const codigo = document.getElementById('backup-input').value;
    if(!codigo) return alert("Cole o código.");
    if(confirm("Substituir dados atuais?")) {
        try {
            const dados = JSON.parse(decodeURIComponent(escape(window.atob(codigo))));
            if(dados.filamentos) {
                localStorage.setItem(DB_KEY_FILAMENTOS, JSON.stringify(dados.filamentos));
                localStorage.setItem(DB_KEY_MAQUINAS, JSON.stringify(dados.maquinas));
                localStorage.setItem(DB_KEY_ORCAMENTOS, JSON.stringify(dados.orcamentos));
                alert("Restaurado!");
                location.reload();
            }
        } catch (e) { alert("Código inválido."); }
    }
}

// Inicialização
window.onload = () => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    document.getElementById('dash-filtro-mes').value = `${ano}-${mes}`;
    showSection('dashboard');
};