import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";

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

// --- Elementos do DOM ---
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

// NOVO: Selecionando as seções de layout
const secaoEsquerdaAdmin = document.getElementById('secao-esquerda-admin');
const secaoCentroAdmin = document.getElementById('secao-centro-admin');
const secaoDireitaAdmin = document.getElementById('secao-direita-admin');


let mesasDataGlobal = {};
let layoutMesasGlobal = {};
let isDeleteMode = false;
let isLoggedIn = false;

function handleAdminLogin() {
    signInWithEmailAndPassword(auth, adminLoginEmailInput.value, adminLoginSenhaInput.value)
        .catch(() => adminLoginErroSpan.style.display = 'block');
}

function handleAdminLogout() {
    signOut(auth);
}

function renderizarLayoutAdmin() {
    // Limpa todas as seções antes de renderizar
    secaoEsquerdaAdmin.innerHTML = '';
    secaoCentroAdmin.innerHTML = '';
    secaoDireitaAdmin.innerHTML = '';
    
    if (!layoutMesasGlobal) {
        inicializarSortable();
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

        // NOVO: Lógica para distribuir as colunas nas seções corretas
        if (colId.startsWith('col-esq')) {
            secaoEsquerdaAdmin.appendChild(colunaDiv);
        } else if (colId.startsWith('col-cen')) {
            secaoCentroAdmin.appendChild(colunaDiv);
        } else if (colId.startsWith('col-dir')) {
            secaoDireitaAdmin.appendChild(colunaDiv);
        } else { // Coloca colunas novas ou não identificadas na primeira seção
            secaoEsquerdaAdmin.appendChild(colunaDiv);
        }
    }
    inicializarSortable();
    
    const layoutContainer = document.querySelector('.layout-salão-admin');
    if (isDeleteMode) {
        layoutContainer.classList.add('delete-mode');
    } else {
        layoutContainer.classList.remove('delete-mode');
    }
}

function inicializarSortable() {
    // NOVO: Torna as seções sortable para permitir mover colunas ENTRE elas
    [secaoEsquerdaAdmin, secaoCentroAdmin, secaoDireitaAdmin].forEach(secao => {
        new Sortable(secao, {
            group: 'colunas', // Permite arrastar colunas entre as seções
            handle: '.coluna-admin',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag'
        });
    });
    
    // Mantém a lógica para tornar o interior das colunas sortable para as mesas
    const colunas = document.querySelectorAll('.coluna-admin');
    colunas.forEach(coluna => {
        new Sortable(coluna, {
            group: 'mesas', // Permite arrastar mesas entre QUALQUER coluna
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag'
        });
    });
}

function salvarLayout() {
    salvarLayoutBtn.textContent = 'Salvando...';
    salvarLayoutBtn.disabled = true;

    const novoLayout = {};
    const colunas = document.querySelectorAll('.coluna-admin');
    colunas.forEach(coluna => {
        const mesas = Array.from(coluna.children)
            .filter(el => el.classList.contains('mesa'))
            .map(mesaDiv => parseInt(mesaDiv.dataset.numero));
        const colunaId = coluna.id.replace('-admin', '');
        novoLayout[colunaId] = mesas;
    });

    set(layoutRef, novoLayout)
        .then(() => alert("Layout salvo com sucesso!"))
        .catch(error => alert("Erro ao salvar layout: " + error.message))
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
    if (primeiraColuna) {
        primeiraColuna.appendChild(mesaDiv);
    } else {
        alert("Adicione uma coluna antes de adicionar uma mesa.");
    }
}

function resetarMesas() {
    if (confirm("Tem certeza que deseja apagar todos os dados de mesas? Esta ação não pode ser desfeita.")) {
        set(mesasRef, {})
            .then(() => alert("Todas as mesas foram resetadas com sucesso!"))
            .catch(error => alert("Erro ao resetar mesas: " + error.message));
    }
}

function excluirMesa(mesaDiv) {
    if (confirm(`Tem certeza que deseja excluir a mesa ${mesaDiv.dataset.numero}?`)) {
        mesaDiv.remove();
    }
}

function adicionarColuna() {
    const colunasExistentes = document.querySelectorAll('.coluna-admin');
    const proximoNumero = colunasExistentes.length + 1;
    let novaColunaId = `col-nova-${proximoNumero}`;

    const colunaDiv = document.createElement('div');
    colunaDiv.classList.add('coluna-admin');
    colunaDiv.id = `${novaColunaId}-admin`;

    const excluirColunaBtn = document.createElement('button');
    excluirColunaBtn.classList.add('excluir-coluna-btn');
    excluirColunaBtn.textContent = 'X';
    colunaDiv.appendChild(excluirColunaBtn);
    
    // NOVO: Adiciona a nova coluna na primeira seção por padrão
    secaoEsquerdaAdmin.appendChild(colunaDiv);
    inicializarSortable(); // Re-inicializa para que a nova coluna também seja funcional
}

function excluirColuna(colunaDiv) {
    const mesasNaColuna = colunaDiv.querySelectorAll('.mesa');
    if (mesasNaColuna.length > 0) {
        alert("Não é possível excluir uma coluna com mesas. Por favor, arraste as mesas para outra coluna antes de excluir.");
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
    // Delegate click events for delete buttons
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
    adminLoginBtn.addEventListener('click', handleAdminLogin);
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
    
    onAuthStateChanged(auth, (user) => {
        isLoggedIn = !!user;
        if (user) {
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
            adminStatusText.textContent = 'Faça login para gerenciar.';
            adminLogoutBtn.style.display = 'none';
            adminContent.style.display = 'none';
            adminLoginForm.style.display = 'flex';
        }
    });
});