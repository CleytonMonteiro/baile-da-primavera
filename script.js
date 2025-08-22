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

// --- NOVAS CONSTANTES ---
const LOCK_TIMEOUT_MINUTES = 3; // Bloqueio expira em 3 minutos
let currentUser = null; // Guardará o usuário logado

let mesasDataGlobal = {};
let layoutMesasGlobal = {};
let isSupervisorLoggedIn = false;
let searchTerm = '';
let filterStatus = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // ... (todas as suas declarações de constantes de elementos HTML permanecem as mesmas)
    const layoutContainer = document.querySelector('.scroll-container');
    const statusText = document.getElementById('status-text');
    const logoutBtn = document.getElementById('logout-btn');
    const loginLinkBtn = document.getElementById('login-link-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const eventTitle = document.getElementById('event-title');
    const eventDate = document.getElementById('event-date');
    const searchInput = document.getElementById('search-input');
    const filterButtonsContainer = document.getElementById('filter-buttons');
    const totalCountSpan = document.getElementById('total-count');
    const livreCountSpan = document.getElementById('livre-count');
    const reservadaCountSpan = document.getElementById('reservada-count');
    const vendidaCountSpan = document.getElementById('vendida-count');
    const arrecadadoTotalSpan = document.getElementById('arrecadado-total');
    const statArrecadado = document.getElementById('stat-arrecadado');
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginSenhaInput = document.getElementById('login-senha');
    const loginBtn = document.getElementById('login-btn');
    const loginErroSpan = document.getElementById('login-erro');
    const cancelarLoginBtn = document.getElementById('cancelar-login-btn');
    const cadastroForm = document.getElementById('cadastro-form');
    const modalNumeroMesa = document.getElementById('modal-numero-mesa');
    const mesaNumeroInput = document.getElementById('mesa-numero');
    const nomeCompletoInput = document.getElementById('nome-completo');
    const statusMesaSelect = document.getElementById('status-mesa');
    const salvarBtn = document.getElementById('salvar-btn');
    const cancelarBtn = document.getElementById('cancelar-btn');
    const liberarBtn = document.getElementById('liberar-btn');
    const nomeErroSpan = document.getElementById('nome-erro');
    const precoMesaInput = document.getElementById('preco-mesa');
    const contatoMesaInput = document.getElementById('contato-mesa');
    const emailMesaInput = document.getElementById('email-mesa');
    const pagamentoContainer = document.getElementById('pagamento-container');
    const pagamentoCheckbox = document.getElementById('pagamento-confirmado');
    const exportContainer = document.getElementById('export-container');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportFilter = document.getElementById('export-filter');
    const infoPanel = document.getElementById('info-panel');
    const infoPanelCloseBtn = document.getElementById('info-panel-close-btn');
    const infoPanelNumero = document.getElementById('info-panel-numero');
    const infoPanelStatus = document.getElementById('info-panel-status');
    const infoPanelNome = document.getElementById('info-panel-nome');
    const infoPanelDadosRestritos = document.getElementById('info-panel-dados-restritos');
    const infoPanelPreco = document.getElementById('info-panel-preco');
    const infoPanelContato = document.getElementById('info-panel-contato');
    const infoPanelEmail = document.getElementById('info-panel-email');
    const infoPanelPagamento = document.getElementById('info-panel-pagamento');
    const manageTableBtn = document.getElementById('manage-table-btn');

    // --- NOVAS FUNÇÕES DE BLOQUEIO ---
    async function lockTable(mesaNum) {
        if (!currentUser) return;
        const lockData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: Date.now()
        };
        await update(ref(database, `mesas/${mesaNum}/lockInfo`), lockData);
    }

    async function unlockTable(mesaNum) {
        await set(ref(database, `mesas/${mesaNum}/lockInfo`), null);
    }

    function renderizarLayoutPublico() {
        const secoes = { esq: document.getElementById('col-esq'), cen: document.getElementById('col-cen'), dir: document.getElementById('col-dir') };
        Object.values(secoes).forEach(sec => { if(sec) sec.innerHTML = ''; });
        if (!layoutMesasGlobal) { if(loadingOverlay) loadingOverlay.style.display = 'none'; return; }
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
                    const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre' };
                    const searchText = searchTerm.toLowerCase();
                    const statusMatch = filterStatus === 'all' || mesaData.status === filterStatus;
                    const searchMatch = !searchText || mesaNum.toString().includes(searchText) || (mesaData.nome && mesaData.nome.toLowerCase().includes(searchText));
                    
                    if (statusMatch && searchMatch) {
                        const mesaDiv = document.createElement('div');
                        mesaDiv.classList.add('mesa', mesaData.status);
                        mesaDiv.textContent = mesaNum.toString().padStart(2, '0');
                        mesaDiv.dataset.numero = mesaNum;

                        // LÓGICA VISUAL DE BLOQUEIO
                        const lockInfo = mesaData.lockInfo;
                        if (lockInfo && (Date.now() - lockInfo.timestamp < LOCK_TIMEOUT_MINUTES * 60 * 1000)) {
                            mesaDiv.classList.add('bloqueada');
                            mesaDiv.title = `Bloqueada por ${lockInfo.userEmail}`;
                        }

                        colunaDiv.appendChild(mesaDiv);
                    }
                });
                secaoAlvo.appendChild(colunaDiv);
            }
        }
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    }

    async function abrirModalCadastro(mesaNum) {
        // Bloqueia a mesa antes de abrir o modal
        await lockTable(mesaNum);

        const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre' };
        modalNumeroMesa.textContent = mesaNum.toString().padStart(2, '0');
        mesaNumeroInput.value = mesaNum;
        nomeCompletoInput.value = mesaData.nome || '';
        statusMesaSelect.value = mesaData.status || 'livre';
        precoMesaInput.value = mesaData.preco || '';
        contatoMesaInput.value = mesaData.contato || '';
        emailMesaInput.value = mesaData.email || '';
        pagamentoCheckbox.checked = mesaData.pago || false;
        pagamentoContainer.style.display = (statusMesaSelect.value === 'vendida') ? 'flex' : 'none';
        cadastroForm.style.display = 'flex';
    }

    // --- LISTENER DE CLIQUE ATUALIZADO ---
    layoutContainer.addEventListener('click', (e) => {
        const mesaClicada = e.target.closest('.mesa');
        if (!mesaClicada) return;

        const mesaNum = mesaClicada.dataset.numero;
        const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre' };

        // VERIFICAÇÃO DE BLOQUEIO
        const lockInfo = mesaData.lockInfo;
        if (lockInfo) {
            const isLockExpired = Date.now() - lockInfo.timestamp > LOCK_TIMEOUT_MINUTES * 60 * 1000;
            const isLockedByCurrentUser = currentUser && lockInfo.userId === currentUser.uid;

            if (!isLockExpired && !isLockedByCurrentUser) {
                showToast(`Mesa bloqueada para edição por ${lockInfo.userEmail}.`, true);
                return;
            }
        }

        if (mesaData.status === 'livre') {
            if (isSupervisorLoggedIn) {
                abrirModalCadastro(mesaNum);
            } else {
                loginForm.style.display = 'flex';
            }
        } else {
            showInfoPanel(mesaNum);
        }
    });

    manageTableBtn.addEventListener('click', () => {
        const mesaNum = infoPanel.dataset.currentTable;
        if (mesaNum) {
            infoPanel.classList.remove('visible');
            abrirModalCadastro(mesaNum); // A verificação de lock já está no começo do click
        }
    });

    // --- BOTÕES AGORA DESBLOQUEIAM A MESA ---
    salvarBtn.addEventListener('click', async () => {
        const mesaNum = mesaNumeroInput.value;
        const nome = nomeCompletoInput.value.trim();
        const status = statusMesaSelect.value;
        const preco = parseFloat(precoMesaInput.value) || 0;
        const contato = contatoMesaInput.value;
        const email = emailMesaInput.value.trim();
        const pago = pagamentoCheckbox.checked;

        if (!nome && status !== 'livre') { nomeErroSpan.style.display = 'block'; return; }
        nomeErroSpan.style.display = 'none';

        const mesaDataParaSalvar = { nome, status, preco, contato, email, pago: (status === 'vendida') ? pago : false };
        await update(ref(database, 'mesas/' + mesaNum), mesaDataParaSalvar);
        await unlockTable(mesaNum); // Desbloqueia
        
        cadastroForm.style.display = 'none';
        showToast("Mesa atualizada com sucesso!");
    });

    liberarBtn.addEventListener('click', async () => {
        const mesaNum = mesaNumeroInput.value;
        const dadosParaLiberar = { nome: '', status: 'livre', contato: '', email: '', pago: false, lockInfo: null };
        await set(ref(database, 'mesas/' + mesaNum), dadosParaLiberar); // set apaga o lockInfo
        // unlockTable(mesaNum) não é mais necessário aqui
        
        cadastroForm.style.display = 'none';
        showToast(`Mesa ${mesaNum} liberada!`);
    });

    cancelarBtn.addEventListener('click', async () => {
        const mesaNum = mesaNumeroInput.value;
        await unlockTable(mesaNum); // Desbloqueia
        cadastroForm.style.display = 'none';
        infoPanel.classList.remove('visible');
    });

    // --- ATUALIZAÇÃO DO onAuthStateChanged ---
    onAuthStateChanged(auth, (user) => {
        isSupervisorLoggedIn = !!user;
        currentUser = user; // Armazena o usuário atual
        if (user) {
            statusText.textContent = `Logado como: ${user.email}`;
            logoutBtn.style.display = 'inline-block';
            loginLinkBtn.style.display = 'none';
            exportContainer.style.display = 'flex';
            statArrecadado.style.display = 'inline-block';
        } else {
            statusText.textContent = 'Clique em uma mesa para ver os detalhes.';
            logoutBtn.style.display = 'none';
            loginLinkBtn.style.display = 'inline-block';
            exportContainer.style.display = 'none';
            statArrecadado.style.display = 'none';
        }
    });
    
    // O resto do seu código (funções de toast, stats, exportação, etc.) permanece o mesmo...
    // Vou colar o resto aqui para garantir que você tenha o arquivo completo e correto.
    const phoneMask = IMask(contatoMesaInput, { mask: '(00) 00000-0000' });
    nomeCompletoInput.addEventListener('input', () => { nomeCompletoInput.value = nomeCompletoInput.value.toUpperCase(); });
    statusMesaSelect.addEventListener('change', () => {
        pagamentoContainer.style.display = (statusMesaSelect.value === 'vendida') ? 'flex' : 'none';
        if (statusMesaSelect.value !== 'vendida') { pagamentoCheckbox.checked = false; }
    });
    searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; renderizarLayoutPublico(); });
    filterButtonsContainer.addEventListener('click', (e) => { const target = e.target.closest('.filter-btn'); if (target) { filterButtonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); target.classList.add('active'); filterStatus = target.dataset.status; renderizarLayoutPublico(); } });
    infoPanelCloseBtn.addEventListener('click', () => { infoPanel.classList.remove('visible'); });
    loginLinkBtn.addEventListener('click', () => { loginForm.style.display = 'flex'; });
    loginBtn.addEventListener('click', () => { signInWithEmailAndPassword(auth, loginEmailInput.value, loginSenhaInput.value).then(() => { loginForm.style.display = 'none'; loginErroSpan.style.display = 'none'; loginEmailInput.value = ''; loginSenhaInput.value = ''; }).catch(() => loginErroSpan.style.display = 'block'); });
    cancelarLoginBtn.addEventListener('click', () => loginForm.style.display = 'none');
    logoutBtn.addEventListener('click', () => { signOut(auth); infoPanel.classList.remove('visible'); });
    exportCsvBtn.addEventListener('click', () => {
        const filterValue = exportFilter.value; const data = getExportData(filterValue); if (data.length === 0) { showToast("Nenhuma mesa encontrada para exportar com este filtro.", true); return; }
        let csvContent = "Numero da Mesa,Nome Completo,Contato,E-mail,Status\n";
        data.forEach(item => { csvContent += `${item.numero},"${item.nome}","${item.contato}","${item.email}","${item.status}"\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); const url = URL.createObjectURL(blob); const fileName = `relatorio_mesas_${filterValue}.csv`;
        link.setAttribute("href", url); link.setAttribute("download", fileName); link.style.visibility = 'hidden';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });
    exportPdfBtn.addEventListener('click', () => {
        const filterValue = exportFilter.value; const data = getExportData(filterValue); if (data.length === 0) { showToast("Nenhuma mesa encontrada para exportar com este filtro.", true); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        const tableColumn = ["Nº", "Nome Completo", "Contato", "E-mail", "Status"]; const tableRows = [];
        data.forEach(item => { tableRows.push([ item.numero, item.nome, item.contato, item.email, item.status ]); });
        const filterText = exportFilter.options[exportFilter.selectedIndex].text;
        doc.text(`Relatório de Mesas: ${filterText}`, 14, 15);
        doc.autoTable(tableColumn, tableRows, { startY: 20 }); const fileName = `relatorio_mesas_${filterValue}.pdf`; doc.save(fileName);
    });
    onValue(eventoRef, (snapshot) => {
        const data = snapshot.val();
        const nomeEvento = (data && data.nome) ? data.nome : "Evento AABB";
        eventTitle.textContent = nomeEvento; document.title = `AABB ARACAJU - ${nomeEvento}`;
        if (data && data.data) { const [ano, mes, dia] = data.data.split('-'); eventDate.textContent = `${dia}/${mes}/${ano}`; } else { eventDate.textContent = ''; }
    });
    onValue(layoutRef, (snapshot) => {
        layoutMesasGlobal = snapshot.val() || {};
        onValue(mesasRef, (mesasSnapshot) => {
            mesasDataGlobal = mesasSnapshot.val() || {};
            renderizarLayoutPublico();
        });
    });
    function showInfoPanel(mesaNum) {
        const mesaData = mesasDataGlobal[mesaNum] || { status: 'livre' };
        infoPanel.dataset.currentTable = mesaNum;
        infoPanelNumero.textContent = mesaNum.toString().padStart(2, '0');
        infoPanelStatus.textContent = mesaData.status.charAt(0).toUpperCase() + mesaData.status.slice(1);
        infoPanelNome.textContent = (mesaData.nome && mesaData.nome.toUpperCase()) || '---';
        if (isSupervisorLoggedIn) {
            infoPanelDadosRestritos.style.display = 'block';
            manageTableBtn.style.display = 'block';
            infoPanelPreco.textContent = `R$ ${(parseFloat(mesaData.preco) || 0).toFixed(2)}`;
            infoPanelContato.textContent = mesaData.contato || '---';
            infoPanelEmail.textContent = mesaData.email || '---';
            infoPanelPagamento.textContent = (mesaData.status === 'vendida') ? (mesaData.pago ? 'Confirmado' : 'Pendente') : 'N/A';
        } else {
            infoPanelDadosRestritos.style.display = 'none';
            manageTableBtn.style.display = 'none';
        }
        infoPanel.classList.add('visible');
    }
    function updateStats() {
        let countTotal = 0, countReservada = 0, countVendida = 0, totalArrecadado = 0;
        if (layoutMesasGlobal) { for (const colId in layoutMesasGlobal) { countTotal += (layoutMesasGlobal[colId] || []).length; } }
        if (mesasDataGlobal) {
            Object.values(mesasDataGlobal).forEach(mesa => {
                if (mesa.status === 'reservada') { countReservada++; }
                else if (mesa.status === 'vendida') { countVendida++; if (mesa.pago === true) { totalArrecadado += parseFloat(mesa.preco) || 0; } }
            });
        }
        const countLivre = countTotal - (countReservada + countVendida);
        totalCountSpan.textContent = countTotal;
        livreCountSpan.textContent = countLivre;
        reservadaCountSpan.textContent = countReservada;
        vendidaCountSpan.textContent = countVendida;
        arrecadadoTotalSpan.textContent = `R$ ${totalArrecadado.toFixed(2).replace('.', ',')}`;
    }
    function getExportData(filterValue) {
        const allTablesData = [];
        if (layoutMesasGlobal) { for (const colId in layoutMesasGlobal) { (layoutMesasGlobal[colId] || []).forEach(numeroMesa => { const data = mesasDataGlobal[numeroMesa] || { status: 'livre' }; allTablesData.push({ numero: parseInt(numeroMesa), nome: data.nome || '', contato: data.contato || '', email: data.email || '', status: data.status || 'livre' }); }); } }
        const filteredData = allTablesData.filter(table => { if (filterValue === 'ocupadas') { return table.status === 'reservada' || table.status === 'vendida'; } return table.status === filterValue; });
        return filteredData.sort((a, b) => a.numero - b.numero);
    }
});