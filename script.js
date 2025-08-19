import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, set, child } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";

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
const analytics = getAnalytics(app);
const database = getDatabase(app);
const mesasRef = ref(database, 'mesas');
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
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
    const cancelarBtn = document.getElementById('cancelar-btn');
    const authStatus = document.getElementById('auth-status');
    const statusText = document.getElementById('status-text');
    const logoutBtn = document.getElementById('logout-btn');
    const nomeErroSpan = document.getElementById('nome-erro');

    let isLoggedIn = false;

    function renderizarMesas(mesasData) {
        document.querySelectorAll('.coluna-mesas').forEach(col => col.innerHTML = '');
        
        for (const colId in layoutMesas) {
            const coluna = document.getElementById(colId);
            layoutMesas[colId].forEach(mesaNum => {
                const mesaDiv = document.createElement('div');
                const mesaData = mesasData[mesaNum] || { status: 'livre', nome: '' };
                mesaDiv.classList.add('mesa', mesaData.status);
                mesaDiv.textContent = mesaNum.toString().padStart(2, '0');
                mesaDiv.dataset.numero = mesaNum;
                
                if (mesaData.status !== 'livre' && mesaData.nome) {
                    mesaDiv.setAttribute('data-tooltip', `Responsável: ${mesaData.nome}`);
                } else {
                    mesaDiv.removeAttribute('data-tooltip');
                }

                mesaDiv.addEventListener('click', () => {
                    if (isLoggedIn) {
                        abrirFormulario(mesaNum, mesaData);
                    } else {
                        loginForm.style.display = 'flex';
                    }
                });
                
                coluna.appendChild(mesaDiv);
            });
        }
    }

    function abrirFormulario(numero, mesaData) {
        mesaNumeroInput.value = numero;
        nomeCompletoInput.value = mesaData.nome;
        statusMesaSelect.value = mesaData.status;
        nomeCompletoInput.classList.remove('input-erro');
        nomeErroSpan.style.display = 'none';
        cadastroForm.style.display = 'flex';
    }

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const senha = loginSenhaInput.value;
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                console.log("Login realizado com sucesso!");
                loginForm.style.display = 'none';
                loginErroSpan.style.display = 'none';
            })
            .catch((error) => {
                console.error("Erro de login:", error);
                loginErroSpan.style.display = 'block';
                loginForm.classList.add('alerta-erro');
            });
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Logout realizado com sucesso.");
        }).catch((error) => {
            console.error("Erro ao fazer logout:", error);
        });
    });

    salvarBtn.addEventListener('click', () => {
        if (nomeCompletoInput.value.trim() === '') {
            nomeErroSpan.style.display = 'block';
            nomeCompletoInput.classList.add('input-erro');
            return;
        }
        
        nomeErroSpan.style.display = 'none';
        nomeCompletoInput.classList.remove('input-erro');
        
        // NOVO: Feedback visual de salvamento
        salvarBtn.textContent = 'Salvando...';
        salvarBtn.disabled = true;

        const numeroMesa = parseInt(mesaNumeroInput.value);
        const novoNome = nomeCompletoInput.value;
        const novoStatus = statusMesaSelect.value;
        
        const updateData = {
            nome: novoNome,
            status: novoStatus
        };
        
        set(child(mesasRef, numeroMesa.toString()), updateData)
            .then(() => {
                console.log("Mesa atualizada no Firebase com sucesso!");
                cadastroForm.style.display = 'none';
            })
            .catch(error => {
                console.error("Erro ao atualizar mesa no Firebase:", error);
                alert("Erro ao salvar. Verifique a conexão com o Firebase.");
            })
            .finally(() => {
                // NOVO: Retorna o botão ao estado normal
                salvarBtn.textContent = 'Salvar';
                salvarBtn.disabled = false;
            });
    });

    cancelarBtn.addEventListener('click', () => {
        cadastroForm.style.display = 'none';
    });
    
    nomeCompletoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

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
        const mesasData = snapshot.val();
        if (mesasData) {
            renderizarMesas(mesasData);
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