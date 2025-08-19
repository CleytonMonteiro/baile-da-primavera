import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, set, child } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
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

// REFACTOR: Definição única do layout das mesas para evitar duplicação
const layoutMesas = {
    'col-esq-1': [101, 100, 99, 98, 97, 96, 95, 94],
    'col-esq-2': [86, 87, 88, 89, 90, 91, 92, 93],
    'col-esq-3': [85, 84, 83, 82, 81, 80, 79, 78], 
    'col-esq-4': [70, 71, 72, 73, 74, 75, 76, 77],
    'col-cen-1': [69, 68, 67],
    'col-cen-2': [64, 65, 66],
    'col-cen-3': [63, 62, 61],
    'col-cen-4': [58, 59, 60],
    'col-cen-5': [57, 56, 55],
    'col-cen-6': [52, 53, 54],
    'col-cen-7': [51, 50, 49],
    'col-dir-1': [41, 42, 43, 44, 45, 46, 47, 48],
    'col-dir-2': [40, 39, 38, 37, 36, 35, 34, 33],
    'col-dir-3': [25, 26, 27, 28, 29, 30, 31, 32],
    'col-dir-4': [24, 23, 22, 21, 20, 19, 18, 17],
    'col-dir-5': [9, 10, 11, 12, 13, 14, 15, 16],
    'col-dir-6': [8, 7, 6, 5, 4, 3, 2, 1]
};

// Variáveis de estado global
let isLoggedIn = false;
let mesasDataGlobal = {};

// Elementos HTML
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginSenhaInput = document.getElementById('login-senha');
const loginBtn = document.getElementById('login-btn');
const loginErroSpan = document.getElementById('login-erro');
const cadastroForm = document.getElementById('cadastro-form');
const mesaNumeroInput = document.getElementById('mesa-numero');
const nomeCompletoInput = document.getElementById('nome-completo');
const statusMesaSelect = document.getElementById('status-mesa');
const salvarBtn = document.getElementById('salvar-btn');
const liberarBtn = document.getElementById('liberar-btn');
const cancelarBtn = document.getElementById('cancelar-btn');
const authStatus = document.getElementById('auth-status');
const statusText = document.getElementById('status-text');
const logoutBtn = document.getElementById('logout-btn');
const nomeErroSpan = document.getElementById('nome-erro');
const scrollContainer = document.getElementById('scroll-container'); // O container principal das mesas
const searchInput = document.getElementById('search-input');

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const mesasRef = ref(database, 'mesas');
const auth = getAuth(app);

// ---- FUNÇÕES DE LÓGICA ----

function renderizarMesas(mesasData) {
    document.querySelectorAll('.coluna-mesas').forEach(col => col.innerHTML = '');
    
    for (const colId in layoutMesas) {
        const coluna = document.getElementById(colId);
        layoutMesas[colId].forEach(mesaNum => {
            const mesaData = mesasData[mesaNum] || { status: 'livre', nome: '' };

            // Verifica se a mesa corresponde ao termo de busca
            const termoBusca = searchInput.value.toUpperCase().trim();
            const correspondeBusca = termoBusca === '' || 
                                    mesaNum.toString().includes(termoBusca) || 
                                    (mesaData.nome && mesaData.nome.toUpperCase().includes(termoBusca));

            if (correspondeBusca) {
                const mesaDiv = document.createElement('div');
                mesaDiv.classList.add('mesa', mesaData.status);
                mesaDiv.textContent = mesaNum.toString().padStart(2, '0');
                mesaDiv.dataset.numero = mesaNum;
                
                if (mesaData.status !== 'livre' && mesaData.nome) {
                    mesaDiv.setAttribute('data-tooltip', `Responsável: ${mesaData.nome}`);
                } else {
                    mesaDiv.removeAttribute('data-tooltip');
                }
                
                coluna.appendChild(mesaDiv);
            }
        });
    }
}

function abrirFormulario(numero, mesaData) {
    mesaNumeroInput.value = numero;
    nomeCompletoInput.value = mesaData.nome;
    statusMesaSelect.value = mesaData.status;
    nomeCompletoInput.classList.remove('input-erro');
    nomeErroSpan.style.display = 'none';
    
    // Oculta o botão "Liberar" se a mesa já estiver livre
    if (mesaData.status === 'livre') {
        liberarBtn.style.display = 'none';
    } else {
        liberarBtn.style.display = 'inline-block';
    }

    cadastroForm.style.display = 'flex';
}

function fecharFormulario() {
    cadastroForm.style.display = 'none';
}

function salvarMesa(status, nome) {
    salvarBtn.textContent = 'Salvando...';
    salvarBtn.disabled = true;

    const numeroMesa = parseInt(mesaNumeroInput.value);
    
    const updateData = {
        nome: nome,
        status: status
    };
    
    set(child(mesasRef, numeroMesa.toString()), updateData)
        .then(() => {
            console.log("Mesa atualizada no Firebase com sucesso!");
            fecharFormulario();
        })
        .catch(error => {
            console.error("Erro ao atualizar mesa no Firebase:", error);
            alert("Erro ao salvar. Verifique a conexão com o Firebase.");
        })
        .finally(() => {
            salvarBtn.textContent = 'Salvar';
            salvarBtn.disabled = false;
        });
}

function liberarMesa() {
    salvarMesa('livre', '');
}

function handleLogin() {
    const email = loginEmailInput.value;
    const senha = loginSenhaInput.value;
    signInWithEmailAndPassword(auth, email, senha)
        .then(() => {
            console.log("Login realizado com sucesso!");
            loginForm.style.display = 'none';
            loginErroSpan.style.display = 'none';
        })
        .catch((error) => {
            console.error("Erro de login:", error);
            loginErroSpan.style.display = 'block';
            loginForm.classList.add('alerta-erro');
        });
}

function handleLogout() {
    signOut(auth).then(() => {
        console.log("Logout realizado com sucesso.");
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// ---- DELEGAÇÃO DE EVENTOS E LISTENERS ----

function setupEventListeners() {
    // Delegação de eventos para as mesas
    document.querySelector('.layout-salão').addEventListener('click', (e) => {
        const mesa = e.target.closest('.mesa');
        if (mesa && isLoggedIn) {
            const numeroMesa = parseInt(mesa.dataset.numero);
            const mesaData = mesasDataGlobal[numeroMesa] || { status: 'livre', nome: '' };
            abrirFormulario(numeroMesa, mesaData);
        } else if (mesa && !isLoggedIn) {
            loginForm.style.display = 'flex';
        }
    });

    // Eventos do Formulário de Cadastro
    salvarBtn.addEventListener('click', () => {
        if (nomeCompletoInput.value.trim() === '') {
            nomeErroSpan.style.display = 'block';
            nomeCompletoInput.classList.add('input-erro');
            return;
        }
        nomeErroSpan.style.display = 'none';
        nomeCompletoInput.classList.remove('input-erro');
        salvarMesa(statusMesaSelect.value, nomeCompletoInput.value);
    });

    cancelarBtn.addEventListener('click', fecharFormulario);
    nomeCompletoInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    
    // NOVO: Evento para o botão "Liberar Mesa"
    liberarBtn.addEventListener('click', liberarMesa);

    // Eventos de Autenticação
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    // NOVO: Evento para o campo de busca
    searchInput.addEventListener('input', () => renderizarMesas(mesasDataGlobal));
}

// ---- INICIALIZAÇÃO ----

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            isLoggedIn = true;
            statusText.textContent = `Logado como: ${user.email}`;
            logoutBtn.style.display = 'inline-block';
        } else {
            isLoggedIn = false;
            statusText.textContent = 'Faça login para gerenciar as mesas.';
            logoutBtn.style.display = 'none';
        }
    });

    onValue(mesasRef, (snapshot) => {
        mesasDataGlobal = snapshot.val();
        if (mesasDataGlobal) {
            renderizarMesas(mesasDataGlobal);
        } else {
            console.log("Banco de dados vazio. Inicializando mesas...");
            const mesasIniciais = {};
            for (const colId in layoutMesas) {
                layoutMesas[colId].forEach(mesaNum => {
                    mesasIniciais[mesaNum] = { status: 'livre', nome: '' };
                });
            }
            set(mesasRef, mesasIniciais)
                .then(() => console.log("Dados iniciais das mesas salvos no Firebase."))
                .catch(error => console.error("Erro ao salvar dados iniciais:", error));
        }
    });
});