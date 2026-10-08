// =====================
// NUVEM (Firebase): login + sincronização dos dados
// =====================
// O script.js continua lendo do localStorage, que aqui funciona como cache.
// Este módulo baixa os dados da conta logada para esse cache, envia cada gravação
// para o Firestore e redesenha a tela quando outro aparelho altera algo.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Chave no localStorage -> documento em usuarios/{uid}/dados/
const DOCUMENTOS = {
    nexus_filamentos: 'filamentos',
    nexus_maquinas: 'maquinas',
    nexus_orcamentos: 'orcamentos',
    nexus_empresa: 'empresa',
    nexus_clientes: 'clientes'
};
const CHAVE_UID = 'nexus_uid';

window.NUVEM_ATIVA = true;

const raiz = document.documentElement;

// Páginas públicas (ex.: orçamento de exemplo) não exigem login
if (raiz.dataset.publico === 'sim') {
    window.addEventListener('load', () => iniciarPagina());
} else {
    raiz.classList.add('nuvem-carregando');
    iniciarNuvem();
}

function iniciarNuvem() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });

    const avisoLento = setTimeout(() => mostrarErro('Não foi possível conectar. Verifique a internet e recarregue a página.'), 15000);

    onAuthStateChanged(auth, async usuario => {
        if (!usuario) {
            limparCache();
            const voltar = location.pathname.split('/').pop() + location.search;
            location.replace(`login.html?voltar=${encodeURIComponent(voltar)}`);
            return;
        }

        const colecao = collection(db, 'usuarios', usuario.uid, 'dados');
        const uidAnterior = localStorage.getItem(CHAVE_UID);
        if (uidAnterior && uidAnterior !== usuario.uid) limparCache();

        try {
            const snap = await getDocs(colecao);

            if (snap.empty && !uidAnterior && temDadosLocais()) {
                // Primeiro login neste navegador: leva para a nuvem o que já estava salvo aqui
                await Promise.all(Object.keys(DOCUMENTOS)
                    .filter(chave => localStorage.getItem(chave))
                    .map(chave => gravar(db, usuario.uid, chave, JSON.parse(localStorage.getItem(chave)))));
            } else {
                aplicarNoCache(snap);
            }
        } catch (erro) {
            console.error(erro);
            clearTimeout(avisoLento);
            mostrarErro('Erro ao carregar seus dados. Recarregue a página.');
            return;
        }

        clearTimeout(avisoLento);
        localStorage.setItem(CHAVE_UID, usuario.uid);

        window.nuvem = {
            usuario,
            salvar: (chave, valor) => comLimite(gravar(db, usuario.uid, chave, valor)),
            sair: async () => {
                await signOut(auth);
            }
        };

        mostrarUsuario(usuario);
        raiz.classList.remove('nuvem-carregando');
        iniciarPagina();

        // Alterações feitas em outro aparelho/aba
        let primeira = true;
        onSnapshot(colecao, snap => {
            if (primeira) { primeira = false; return; }
            if (snap.metadata.hasPendingWrites) return;
            aplicarNoCache(snap);
            atualizarTela();
        });
    });
}

function gravar(db, uid, chave, valor) {
    const nome = DOCUMENTOS[chave];
    if (!nome) return Promise.resolve();
    return setDoc(doc(db, 'usuarios', uid, 'dados', nome), { valor, atualizadoEm: serverTimestamp() });
}

// Sem internet a promessa só termina quando reconectar; o Firestore guarda a gravação
// e envia depois, então não seguramos a tela por mais que alguns segundos.
function comLimite(promessa) {
    return Promise.race([promessa, new Promise(r => setTimeout(r, 4000))]);
}

function aplicarNoCache(snap) {
    const recebidos = {};
    snap.forEach(d => { recebidos[d.id] = d.data().valor; });

    Object.entries(DOCUMENTOS).forEach(([chave, nome]) => {
        if (recebidos[nome] === undefined) localStorage.removeItem(chave);
        else localStorage.setItem(chave, JSON.stringify(recebidos[nome]));
    });
}

function temDadosLocais() {
    return Object.keys(DOCUMENTOS).some(chave => {
        try {
            const valor = JSON.parse(localStorage.getItem(chave));
            return Array.isArray(valor) ? valor.length > 0 : !!valor;
        } catch {
            return false;
        }
    });
}

function limparCache() {
    [...Object.keys(DOCUMENTOS), CHAVE_UID].forEach(chave => localStorage.removeItem(chave));
}

function mostrarUsuario(usuario) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.querySelector('.user-box')) return;

    const box = document.createElement('div');
    box.className = 'user-box';
    box.innerHTML = `
      <span class="user-email" title="${esc(usuario.email)}"><i class="fas fa-user-circle"></i> ${esc(usuario.email)}</span>
      <button type="button" class="btn-secondary btn-sm"><i class="fas fa-sign-out-alt"></i> Sair</button>
    `;
    box.querySelector('button').addEventListener('click', () => window.nuvem.sair());
    sidebar.appendChild(box);
}

function mostrarErro(mensagem) {
    raiz.classList.remove('nuvem-carregando');
    if (document.querySelector('.nuvem-erro')) return;
    const aviso = document.createElement('div');
    aviso.className = 'nuvem-erro';
    aviso.textContent = mensagem;
    document.body.prepend(aviso);
}
