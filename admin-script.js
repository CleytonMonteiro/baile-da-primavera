import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const layoutRef = ref(database, 'layoutMesas');
const mesasRef = ref(database, 'mesas');
const activityLogRef = ref(database, 'activityLog');

let masterTableList = [];
let currentSort = { column: 'numero', direction: 'asc' };
let searchTerm = '';
let layoutDataGlobal = null;
let mesasDataGlobal = null;
let statusChart = null;

const totalArrecadadoEl = document.getElementById('total-arrecadado');
const mesasVendidasEl = document.getElementById('mesas-vendidas');
const mesasReservadasEl = document.getElementById('mesas-reservadas');
const mesasLivresEl = document.getElementById('mesas-livres');
const mesasTbodyEl = document.getElementById('mesas-tbody');
const searchInput = document.getElementById('table-search-input');
const tableHeaders = document.getElementById('table-headers');
const activityLogListEl = document.getElementById('activity-log-list');
const ctx = document.getElementById('statusChart').getContext('2d');
const backToMapLink = document.getElementById('back-to-map-link'); // NOVO ELEMENTO

function updateUI() {
    if (!layoutDataGlobal || !mesasDataGlobal) return;

    let totalMesas = 0, countVendida = 0, countReservada = 0, totalArrecadado = 0;
    masterTableList = [];

    for (const colId in layoutDataGlobal) {
        (layoutDataGlobal[colId] || []).forEach(num => {
            masterTableList.push({ numero: parseInt(num), status: 'livre', nome: '---', preco: 0, pago: false });
        });
    }
    totalMesas = masterTableList.length;

    for (const mesaNum in mesasDataGlobal) {
        const mesaInfo = mesasDataGlobal[mesaNum];
        const mesaNaLista = masterTableList.find(m => m.numero == mesaNum);
        if (mesaNaLista) {
            Object.assign(mesaNaLista, {
                status: mesaInfo.status,
                nome: mesaInfo.nome || '---',
                preco: parseFloat(mesaInfo.preco) || 0,
                pago: mesaInfo.pago || false,
            });
        }
        if (mesaInfo.status === 'vendida') {
            countVendida++;
            if (mesaInfo.pago) totalArrecadado += parseFloat(mesaInfo.preco) || 0;
        } else if (mesaInfo.status === 'reservada') {
            countReservada++;
        }
    }
    const countLivre = totalMesas - countVendida - countReservada;

    totalArrecadadoEl.textContent = `R$ ${totalArrecadado.toFixed(2).replace('.', ',')}`;
    mesasVendidasEl.textContent = countVendida;
    mesasReservadasEl.textContent = countReservada;
    mesasLivresEl.textContent = countLivre;

    if (statusChart) {
        statusChart.data.datasets[0].data = [countLivre, countReservada, countVendida];
        statusChart.update();
    } else {
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Livres', 'Reservadas', 'Vendidas'], datasets: [{ label: 'Status das Mesas', data: [countLivre, countReservada, countVendida], backgroundColor: ['#28a745', '#ffc107', '#dc3545'], borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
        });
    }
    renderTable();
}

function renderTable() {
    let filteredList = masterTableList;
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredList = masterTableList.filter(mesa =>
            mesa.numero.toString().includes(lowerCaseSearchTerm) ||
            mesa.status.toLowerCase().includes(lowerCaseSearchTerm) ||
            mesa.nome.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }
    filteredList.sort((a, b) => {
        const valA = a[currentSort.column], valB = b[currentSort.column];
        let comparison = (valA > valB) ? 1 : (valA < valB) ? -1 : 0;
        return currentSort.direction === 'desc' ? comparison * -1 : comparison;
    });
    mesasTbodyEl.innerHTML = '';
    filteredList.forEach(mesa => {
        const row = document.createElement('tr');
        let statusPagamento = mesa.status === 'vendida' ? (mesa.pago ? 'Sim' : 'Não') : '---';
        row.innerHTML = `
            <td>${String(mesa.numero).padStart(2, '0')}</td>
            <td class="status-${mesa.status}">${mesa.status.charAt(0).toUpperCase() + mesa.status.slice(1)}</td>
            <td>${mesa.nome}</td>
            <td>${mesa.preco.toFixed(2).replace('.', ',')}</td>
            <td>${statusPagamento}</td>
        `;
        mesasTbodyEl.appendChild(row);
    });
    tableHeaders.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; renderTable(); });
tableHeaders.addEventListener('click', (e) => {
    const column = e.target.dataset.sort;
    if (!column) return;
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    renderTable();
});

// --- LISTENER ADICIONADO PARA O LINK DE VOLTAR ---
backToMapLink.addEventListener('click', (e) => {
    e.preventDefault(); // Previne a navegação normal do link
    // Redireciona para o index.html com um parâmetro de tempo para "burlar" o cache
    window.location.href = `index.html?t=${new Date().getTime()}`;
});

onValue(layoutRef, (snapshot) => { layoutDataGlobal = snapshot.val() || {}; updateUI(); });
onValue(mesasRef, (snapshot) => { mesasDataGlobal = snapshot.val() || {}; updateUI(); });
onValue(query(activityLogRef, orderByChild('timestamp'), limitToLast(50)), (snapshot) => {
    activityLogListEl.innerHTML = '';
    if (!snapshot.exists()) { activityLogListEl.innerHTML = '<li><p>Nenhuma atividade registrada ainda.</p></li>'; return; }
    const logEntries = [];
    snapshot.forEach(childSnapshot => { logEntries.push(childSnapshot.val()); });
    logEntries.reverse().forEach(entry => {
        const li = document.createElement('li');
        const actionClass = entry.action.split(' ')[0].toLowerCase();
        const iconLetter = entry.action.charAt(0);
        const date = new Date(entry.timestamp);
        const formattedDate = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        li.innerHTML = `
            <div class="log-icon log-${actionClass}">${iconLetter}</div>
            <div class="log-details"><p>${entry.details}</p><p class="log-user">${entry.userEmail}</p></div>
            <span class="log-timestamp">${formattedDate}</span>
        `;
        activityLogListEl.appendChild(li);
    });
});