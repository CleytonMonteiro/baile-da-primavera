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

// REMOVIDO: O objeto layoutMesas agora será carregado do Firebase.
let layoutMesasGlobal = {};

let isLoggedIn = false;
let mesasDataGlobal = {};

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
const scrollContainer = document.getElementById('scroll-container');
const searchInput = document.getElementById('search-input');
const searchCountSpan = document.getElementById('search-count');
const menuBtn = document.getElementById('menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const sideMenu = document.getElementById('side-menu');

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const mesasRef = ref(database, 'mesas');
const layoutRef = ref(database, 'layoutMesas'); // NOVO: Referência para o layout no Firebase
const auth = getAuth(app);

function renderizarMesas(mesasData) {
    document.querySelectorAll('.coluna-mesas').forEach(col => col.innerHTML = '');
    
    let mesasEncontradas = 0;

    for (const colId in layoutMesasGlobal) {
        const coluna = document.getElementById(colId);
        if (!coluna) continue; // Garante que a coluna existe no HTML
        
        layoutMesasGlobal[colId].forEach(mesaNum => {
            const mesaData = mesasData[mesaNum] || { status: 'livre', nome: '' };

            const termoBusca = searchInput.value.toUpperCase().trim();
            const correspondeBusca = termoBusca === '' || 
                                    mesaNum.toString().includes(termoBusca) || 
                                    (mesaData.nome && mesaData.nome.toUpperCase().includes(termoBusca));

            if (correspondeBusca) {
                mesasEncontradas++;
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
    searchCountSpan.textContent = `Mesas encontradas: ${mesasEncontradas}`;
}

// ... (O resto do código permanece o mesmo)

function abrirFormulario(numero, mesaData) {
    sideMenu.classList.remove('open'); 
    mesaNumeroInput.value = numero;
    nomeCompletoInput.value = mesaData.nome;
    statusMesaSelect.value = mesaData.status;
    nomeCompletoInput.classList.remove('input-erro');
    nomeErroSpan.style.display = 'none';
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
    const updateData = { nome: nome, status: status };
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

function setupEventListeners() {
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
    liberarBtn.addEventListener('click', liberarMesa);
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    searchInput.addEventListener('input', () => renderizarMesas(mesasDataGlobal));
    menuBtn.addEventListener('click', () => sideMenu.classList.add('open'));
    closeMenuBtn.addEventListener('click', () => sideMenu.classList.remove('open'));
}

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

    // NOVO: Carrega o layout do Firebase
    onValue(layoutRef, (snapshot) => {
        const layoutData = snapshot.val();
        if (layoutData) {
            layoutMesasGlobal = layoutData;
            onValue(mesasRef, (mesasSnapshot) => {
                mesasDataGlobal = mesasSnapshot.val();
                if (mesasDataGlobal) {
                    renderizarMesas(mesasDataGlobal);
                } else {
                    console.log("Banco de dados de mesas vazio. Inicializando...");
                    const mesasIniciais = {};
                    for (const colId in layoutMesasGlobal) {
                        layoutMesasGlobal[colId].forEach(mesaNum => {
                            mesasIniciais[mesaNum] = { status: 'livre', nome: '' };
                        });
                    }
                    set(mesasRef, mesasIniciais);
                }
            });
        } else {
            console.warn("Nenhum layout encontrado no Firebase. Por favor, configure-o no Painel de Admin.");
            // Mostra uma mensagem de aviso na tela se não houver layout
            document.querySelector('.layout-salão').innerHTML = '<h2>Nenhum layout encontrado. Por favor, acesse o <a href="admin.html">Painel de Admin</a> para configurar o layout inicial.</h2>';
        }
    });
});