import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
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
const eventoRef = ref(database, 'informacoesEvento');

const layoutContainer = document.querySelector('.scroll-container');
const statusText = document.getElementById('status-text');
const logoutBtn = document.getElementById('logout-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const eventTitle = document.getElementById('event-title');
const eventDate = document.getElementById('event-date');

const searchInput = document.getElementById('search-input');
const filterButtonsContainer = document.getElementById('filter-buttons');

const totalCountSpan = document.getElementById('total-count');
const livreCountSpan = document.getElementById('livre-count');
const reservadaCountSpan = document.getElementById('reservada-count');
const vendidaCountSpan = document.getElementById('vendida-count');

const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginSenhaInput = document.getElementById('login-senha');
const loginBtn = document.getElementById('login-btn');
const loginErroSpan = document.getElementById('login-erro');
const cancelarLoginBtn = document.getElementById('cancelar-login-btn');
const cadastroForm = document.getElementById('cadastro-form');
const modalTitulo = document.getElementById('modal-titulo');
const modalNumeroMesa = document.getElementById('modal-numero-mesa');
const mesaNumeroInput = document.getElementById('mesa-numero');
const nomeCompletoInput = document.getElementById('nome-completo');
const statusMesaSelect = document.getElementById('status-mesa');
const salvarBtn = document.getElementById('salvar-btn');
const cancelarBtn = document.getElementById('cancelar-btn');
const liberarBtn = document.getElementById('liberar-btn');
const nomeErroSpan = document.getElementById('nome-erro');
const precoMesaInput = document.getElementById('preco-mesa');
const lugaresMesaInput = document.getElementById('lugares-mesa');

let mesasDataGlobal = {};
let layoutMesasGlobal = {};
let isSupervisorLoggedIn = false;
let searchTerm = '';
let filterStatus = 'all';

function showToast(text, isError = false) {
    Toastify({
        text: text,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: isError ? "linear-gradient(to right, #ff5f6d, #ffc371)" : "linear-gradient(to right, #00b09b, #96c93d)",
    }).showToast();
}

function updateStats() {
    let countTotal = 0;
    let countReservada = 0;
    let countVendida = 0;

    if (layoutMesasGlobal) {
        for (const colId in layoutMesasGlobal) {
            countTotal += (layoutMesasGlobal[colId] || []).length;
        }
    }

    if (mesasDataGlobal) {
        Object.values(mesasDataGlobal).forEach(mesa => {
            if (mesa.status === 'reservada') countReservada++;
            else if (mesa.status === 'vendida') countVendida++;
        });
    }

    const countLivre = countTotal - (countReservada + countVendida);

    totalCountSpan.textContent = countTotal;
    livreCountSpan.textContent = countLivre;
    reservadaCountSpan.textContent = countReservada;
    vendidaCountSpan.textContent = countVendida;
}


function renderizarLayoutPublico() {
    const secoes = {
        esq: document.getElementById('col-esq'),
        cen: document.getElementById('col-cen'),
        dir: document.getElementById('col-dir')
    };
    Object.values(secoes).forEach(sec => sec.innerHTML = '');

    if (!layoutMesasGlobal) {
        loadingOverlay.style.display = 'none';
        return;
    }
    
    updateStats();

    for (const colId in layoutMesasGlobal) {
        let secaoAlvo = null;
        if (colId.startsWith('col-esq')) secaoAlvo = secoes.esq;
        else if (colId.startsWith('col-cen')) secaoAlvo = secoes.cen;
        else if (colId.startsWith('col-dir')) secaoAlvo = secoes.dir;
        
        if (secaoAlvo) {
            const colunaDiv = document.createElement('div');
            colunaDiv.classList.add('coluna-mesas');
            
            const mesasArray = Array.isArray(layoutMesasGlobal[colId]) ? layoutMesasGlobal[colId] : [];
            mesasArray.forEach(mesaNum => {
                const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre', nome: '', preco: 0, lugares: 4 };
                const searchText = searchTerm.toLowerCase();

                const statusMatch = filterStatus === 'all' || mesaData.status === filterStatus;
                const searchMatch = !searchText ||
                                    mesaNum.toString().includes(searchText) ||
                                    (mesaData.nome && mesaData.nome.toLowerCase().includes(searchText));

                if (statusMatch && searchMatch) {
                    const mesaDiv = document.createElement('div');
                    mesaDiv.classList.add('mesa', mesaData.status);
                    mesaDiv.textContent = mesaNum.toString().padStart(2, '0');
                    mesaDiv.dataset.numero = mesaNum;

                    if (mesaData.status !== 'livre') {
                        let tooltipText = [];
                        if (mesaData.nome) tooltipText.push(mesaData.nome);
                        if (mesaData.preco) tooltipText.push(`Preço: R$ ${parseFloat(mesaData.preco).toFixed(2)}`);
                        if (mesaData.lugares) tooltipText.push(`Lugares: ${mesaData.lugares}`);
                        mesaDiv.dataset.tooltip = tooltipText.join('\n');
                    }
                    
                    colunaDiv.appendChild(mesaDiv);
                }
            });
            secaoAlvo.appendChild(colunaDiv);
        }
    }
    
    loadingOverlay.style.display = 'none';
}

function abrirModalCadastro(mesaNum) {
    const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre', nome: '', preco: '' };
    modalNumeroMesa.textContent = mesaNum.toString().padStart(2, '0');
    mesaNumeroInput.value = mesaNum;
    nomeCompletoInput.value = mesaData.nome || '';
    statusMesaSelect.value = mesaData.status || 'livre';
    precoMesaInput.value = mesaData.preco || '';
    lugaresMesaInput.value = mesaData.lugares || '4';
    cadastroForm.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderizarLayoutPublico();
    });

    filterButtonsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-btn');
        if (target) {
            filterButtonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            filterStatus = target.dataset.status;
            renderizarLayoutPublico();
        }
    });
    
    layoutContainer.addEventListener('click', (e) => {
        const mesaClicada = e.target.closest('.mesa');
        if (mesaClicada) {
            if (isSupervisorLoggedIn) {
                abrirModalCadastro(mesaClicada.dataset.numero);
            } else {
                loginForm.style.display = 'flex';
            }
        }
    });
    loginBtn.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, loginEmailInput.value, loginSenhaInput.value)
            .then(() => {
                loginForm.style.display = 'none';
                loginErroSpan.style.display = 'none';
                loginEmailInput.value = '';
                loginSenhaInput.value = '';
            })
            .catch(() => loginErroSpan.style.display = 'block');
    });
    salvarBtn.addEventListener('click', () => {
        const mesaNum = mesaNumeroInput.value;
        const nome = nomeCompletoInput.value.trim();
        const status = statusMesaSelect.value;
        const preco = parseFloat(precoMesaInput.value) || 0;
        const lugares = parseInt(lugaresMesaInput.value) || 4;

        if (!nome && status !== 'livre') {
            nomeErroSpan.style.display = 'block';
            return;
        }
        nomeErroSpan.style.display = 'none';

        const mesaDataParaSalvar = {
            nome: status === 'livre' ? '' : nome,
            status: status,
            preco: preco,
            lugares: lugares
        };

        update(ref(database, 'mesas/' + mesaNum), mesaDataParaSalvar)
            .then(() => {
                cadastroForm.style.display = 'none';
                showToast("Mesa atualizada com sucesso!");
            })
            .catch((error) => showToast("Erro ao salvar: " + error.message, true));
    });
    liberarBtn.addEventListener('click', () => {
        const mesaNum = mesaNumeroInput.value;
        const lugaresAtuais = parseInt(lugaresMesaInput.value) || 4;
        
        update(ref(database, 'mesas/' + mesaNum), {
            nome: '',
            status: 'livre',
            lugares: lugaresAtuais
        }).then(() => {
            cadastroForm.style.display = 'none';
            showToast(`Mesa ${mesaNum} liberada!`);
        });
    });
    cancelarBtn.addEventListener('click', () => cadastroForm.style.display = 'none');
    cancelarLoginBtn.addEventListener('click', () => loginForm.style.display = 'none');
    logoutBtn.addEventListener('click', () => signOut(auth));

    onValue(eventoRef, (snapshot) => {
        const data = snapshot.val();
        const nomeEvento = (data && data.nome) ? data.nome : "Evento AABB";
        
        eventTitle.textContent = nomeEvento;
        document.title = `AABB ARACAJU - ${nomeEvento}`;

        if (data && data.data) {
            const [ano, mes, dia] = data.data.split('-');
            eventDate.textContent = `${dia}/${mes}/${ano}`;
        } else {
            eventDate.textContent = '';
        }
    });

    onAuthStateChanged(auth, (user) => {
        isSupervisorLoggedIn = !!user;
        if (user) {
            statusText.textContent = `Logado como: ${user.email}`;
            logoutBtn.style.display = 'inline-block';
        } else {
            statusText.textContent = 'Clique em uma mesa para gerenciar ou fazer login.';
            logoutBtn.style.display = 'none';
        }
    });

    onValue(layoutRef, (snapshot) => {
        layoutMesasGlobal = snapshot.val() || {};
        onValue(mesasRef, (mesasSnapshot) => {
            mesasDataGlobal = mesasSnapshot.val() || {};
            renderizarLayoutPublico();
        });
    });
});