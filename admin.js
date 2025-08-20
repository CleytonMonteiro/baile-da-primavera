import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGVgqwdSOJJn0plwfKkHEsofxvfHFCf6w",
    authDomain: "layoutsalaodefesta.firebaseapp.com",
    databaseURL: "https://layoutsalaodefesta-default-rtdb.firebaseio.com",
    projectId: "layoutsalaodefesta",
    storageBucket: "layoutsalaodefesta.firebasestorage.app",
    messagingSenderId: "1060371531536",
    appId: "1:1060371531536:web:fbed496ff9a78982580795",
    measurementId: "G-L21G98V5CL"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const layoutRef = ref(database, 'layoutMesas');
const mesasRef = ref(database, 'mesas');

const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginEmailInput = document.getElementById('login-email-admin');
const adminLoginSenhaInput = document.getElementById('login-senha-admin');
const adminLoginBtn = document.getElementById('login-btn-admin');
const adminLoginErroSpan = document.getElementById('login-erro-admin');
const adminLogoutBtn = document.getElementById('logout-btn-admin');
const adminStatusText = document.getElementById('status-text-admin');
const adminContent = document.getElementById('admin-content');
const salvarLayoutBtn = document.getElementById('salvar-layout-btn');
const addMesaBtn = document.getElementById('add-mesa-btn');
const resetMesasBtn = document.getElementById('reset-mesas-btn');
const addColunaBtn = document.getElementById('add-coluna-btn');
const toggleExcluirBtn = document.getElementById('toggle-excluir-btn');
const loadingOverlay = document.getElementById('loading-overlay');

const secaoEsquerdaAdmin = document.getElementById('secao-esquerda-admin');
const secaoCentroAdmin = document.getElementById('secao-centro-admin');
const secaoDireitaAdmin = document.getElementById('secao-direita-admin');

let mesasDataGlobal = {};
let layoutMesasGlobal = {};
let isDeleteMode = false;
let isLoggedIn = false;

function showToast(text, isError = false) {
    Toastify({
        text: text,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: isError ? "linear-gradient(to right, #ff5f6d, #ffc371)" : "linear-gradient(to right, #00b09b, #96c93d)",
    }).showToast();
}

function handleAdminLogin() {
    adminLoginErroSpan.style.display = 'none'; // Esconde o erro antigo

    signInWithEmailAndPassword(auth, adminLoginEmailInput.value, adminLoginSenhaInput.value)
        .then((userCredential) => {
            // Sucesso no login. O onAuthStateChanged vai cuidar do resto.
            console.log("Login bem-sucedido para:", userCredential.user.email);
        })
        .catch((error) => {
            // Falha no login. Mostra o erro na tela.
            console.error("Falha no login:", error.code, error.message);
            adminLoginErroSpan.style.display = 'block';
        });
}

function handleAdminLogout() {
    signOut(auth);
}

function renderizarLayoutAdmin() {
    secaoEsquerdaAdmin.innerHTML = '';
    secaoCentroAdmin.innerHTML = '';
    secaoDireitaAdmin.innerHTML = '';
    
    if (!layoutMesasGlobal) {
        inicializarSortable();
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        return;
    }

    for (const colId in layoutMesasGlobal) {
        const colunaDiv = document.createElement('div');
        colunaDiv.classList.add('coluna-admin');
        colunaDiv.id = `${colId}-admin`;
        const excluirColunaBtn = document.createElement('button');
        excluirColunaBtn.classList.add('excluir-coluna-btn');
        excluirColunaBtn.textContent = 'X';
        colunaDiv.appendChild(excluirColunaBtn);
        const mesasArray = Array.isArray(layoutMesasGlobal[colId]) ? layoutMesasGlobal[colId] : [];
        mesasArray.forEach(mesaNum => {
            const mesaDiv = document.createElement('div');
            mesaDiv.classList.add('mesa');
            mesaDiv.textContent = mesaNum.toString().padStart(2, '0');
            mesaDiv.dataset.numero = mesaNum;
            const excluirBtn = document.createElement('button');
            excluirBtn.classList.add('excluir-mesa-btn');
            excluirBtn.textContent = 'X';
            mesaDiv.appendChild(excluirBtn);
            colunaDiv.appendChild(mesaDiv);
        });
        if (colId.startsWith('col-esq')) secaoEsquerdaAdmin.appendChild(colunaDiv);
        else if (colId.startsWith('col-cen')) secaoCentroAdmin.appendChild(colunaDiv);
        else if (colId.startsWith('col-dir')) secaoDireitaAdmin.appendChild(colunaDiv);
        else secaoEsquerdaAdmin.appendChild(colunaDiv);
    }
    inicializarSortable();
    
    const layoutContainer = document.querySelector('.layout-salão-admin');
    if (isDeleteMode) layoutContainer.classList.add('delete-mode');
    else layoutContainer.classList.remove('delete-mode');
    
    if(loadingOverlay) loadingOverlay.style.display = 'none';
}

function inicializarSortable() {
    [secaoEsquerdaAdmin, secaoCentroAdmin, secaoDireitaAdmin].forEach(secao => {
        if(secao) new Sortable(secao, { group: 'colunas', handle: '.coluna-admin', animation: 150, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag' });
    });
    document.querySelectorAll('.coluna-admin').forEach(coluna => {
        new Sortable(coluna, { group: 'mesas', animation: 150, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag' });
    });
}

function salvarLayout() {
    salvarLayoutBtn.textContent = 'Salvando...';
    salvarLayoutBtn.disabled = true;

    const novoLayout = {};
    document.querySelectorAll('.coluna-admin').forEach(coluna => {
        const mesas = Array.from(coluna.children).filter(el => el.classList.contains('mesa')).map(mesaDiv => parseInt(mesaDiv.dataset.numero));
        novoLayout[coluna.id.replace('-admin', '')] = mesas;
    });

    set(layoutRef, novoLayout)
        .then(() => showToast("Layout salvo com sucesso!"))
        .catch(error => showToast("Erro ao salvar layout: " + error.message, true))
        .finally(() => {
            salvarLayoutBtn.textContent = 'Salvar Layout';
            salvarLayoutBtn.disabled = false;
        });
}

function adicionarMesa() {
    let mesasExistentes = [];
    if (layoutMesasGlobal) {
        for (const colId in layoutMesasGlobal) {
            mesasExistentes = mesasExistentes.concat(layoutMesasGlobal[colId] || []);
        }
    }
    const proximoNumero = Math.max(0, ...mesasExistentes.filter(n => n)) + 1;

    const mesaDiv = document.createElement('div');
    mesaDiv.classList.add('mesa');
    mesaDiv.textContent = proximoNumero.toString().padStart(2, '0');
    mesaDiv.dataset.numero = proximoNumero;
    const excluirBtn = document.createElement('button');
    excluirBtn.classList.add('excluir-mesa-btn');
    excluirBtn.textContent = 'X';
    mesaDiv.appendChild(excluirBtn);

    const primeiraColuna = document.querySelector('.coluna-admin');
    if (primeiraColuna) primeiraColuna.appendChild(mesaDiv);
    else showToast("Adicione uma coluna antes de adicionar uma mesa.", true);
}

function resetarMesas() {
    if (confirm("ATENÇÃO!\n\nTem certeza que deseja apagar TODOS os dados de status e nomes de TODAS as mesas?\n\nEsta ação não pode ser desfeita.")) {
        set(mesasRef, {})
            .then(() => showToast("Todas as mesas foram resetadas com sucesso!"))
            .catch(error => showToast("Erro ao resetar mesas: " + error.message, true));
    }
}

function excluirMesa(mesaDiv) {
    if (confirm(`Tem certeza que deseja excluir a mesa ${mesaDiv.dataset.numero}?`)) {
        mesaDiv.remove();
    }
}

function adicionarColuna() {
    const proximoNumero = document.querySelectorAll('.coluna-admin').length + 1;
    const novaColunaId = `col-nova-${proximoNumero}`;
    const colunaDiv = document.createElement('div');
    colunaDiv.classList.add('coluna-admin');
    colunaDiv.id = `${novaColunaId}-admin`;
    const excluirColunaBtn = document.createElement('button');
    excluirColunaBtn.classList.add('excluir-coluna-btn');
    excluirColunaBtn.textContent = 'X';
    colunaDiv.appendChild(excluirColunaBtn);
    secaoEsquerdaAdmin.appendChild(colunaDiv);
    inicializarSortable();
}

function excluirColuna(colunaDiv) {
    if (colunaDiv.querySelectorAll('.mesa').length > 0) {
        showToast("Não é possível excluir uma coluna com mesas.", true);
        return;
    }
    if (confirm("Tem certeza que deseja excluir esta coluna?")) {
        colunaDiv.remove();
    }
}

function toggleDeleteMode() {
    isDeleteMode = !isDeleteMode;
    const layoutContainer = document.querySelector('.layout-salão-admin');
    if (isDeleteMode) {
        layoutContainer.classList.add('delete-mode');
        toggleExcluirBtn.textContent = 'Sair do Modo Excluir';
    } else {
        layoutContainer.classList.remove('delete-mode');
        toggleExcluirBtn.textContent = 'Modo Excluir';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(!adminLoginBtn) {
        console.error("Botão de login não encontrado no DOM.");
        return;
    }
    
    adminLoginBtn.addEventListener('click', handleAdminLogin);

    // O resto dos listeners
    adminContent.addEventListener('click', (e) => {
        if (isDeleteMode) {
            const mesaBtn = e.target.closest('.excluir-mesa-btn');
            if (mesaBtn) {
                excluirMesa(mesaBtn.closest('.mesa'));
                return;
            }
            const colunaBtn = e.target.closest('.excluir-coluna-btn');
            if (colunaBtn) {
                excluirColuna(colunaBtn.closest('.coluna-admin'));
            }
        }
    });

    salvarLayoutBtn.addEventListener('click', salvarLayout);
    addMesaBtn.addEventListener('click', adicionarMesa);
    resetMesasBtn.addEventListener('click', resetarMesas);
    addColunaBtn.addEventListener('click', adicionarColuna);
    toggleExcluirBtn.addEventListener('click', toggleDeleteMode);
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
    
    onAuthStateChanged(auth, (user) => {
        const adminEmail = "cleyton@aabb-aracaju.com.br"; 

        if (user && user.email === adminEmail) {
            isLoggedIn = true;
            adminStatusText.textContent = `Logado como: ${user.email}`;
            adminLogoutBtn.style.display = 'inline-block';
            adminContent.style.display = 'flex';
            adminLoginForm.style.display = 'none';

            onValue(layoutRef, (snapshot) => {
                layoutMesasGlobal = snapshot.val() || {};
                onValue(mesasRef, (mesasSnapshot) => {
                    mesasDataGlobal = mesasSnapshot.val() || {};
                    renderizarLayoutAdmin();
                });
            });
        } else {
            isLoggedIn = false;
            adminStatusText.textContent = 'Faça login para gerenciar.';
            adminLogoutBtn.style.display = 'none';
            adminContent.style.display = 'none';
            adminLoginForm.style.display = 'flex';
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            if (user) {
                signOut(auth);
                showToast("Acesso negado. Permissão apenas para administradores.", true);
            }
        }
    });
});