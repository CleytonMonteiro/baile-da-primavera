import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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

// --- VARIÁVEIS DE ESTADO PARA FILTRO E ORDENAÇÃO ---
let masterTableList = [];
let currentSort = { column: 'numero', direction: 'asc' };
let searchTerm = '';

// --- ELEMENTOS DO HTML ---
const totalArrecadadoEl = document.getElementById('total-arrecadado');
const mesasVendidasEl = document.getElementById('mesas-vendidas');
const mesasReservadasEl = document.getElementById('mesas-reservadas');
const mesasLivresEl = document.getElementById('mesas-livres');
const mesasTbodyEl = document.getElementById('mesas-tbody');
const searchInput = document.getElementById('table-search-input');
const tableHeaders = document.getElementById('table-headers');
const ctx = document.getElementById('statusChart').getContext('2d');
let statusChart = null;

// --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO ---
function render() {
    // 1. FILTRAR
    let filteredList = masterTableList;
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredList = masterTableList.filter(mesa => {
            return (
                mesa.numero.toString().includes(lowerCaseSearchTerm) ||
                mesa.status.toLowerCase().includes(lowerCaseSearchTerm) ||
                mesa.nome.toLowerCase().includes(lowerCaseSearchTerm)
            );
        });
    }

    // 2. ORDENAR
    filteredList.sort((a, b) => {
        const valA = a[currentSort.column];
        const valB = b[currentSort.column];
        
        let comparison = 0;
        if (valA > valB) {
            comparison = 1;
        } else if (valA < valB) {
            comparison = -1;
        }
        return currentSort.direction === 'desc' ? comparison * -1 : comparison;
    });

    // 3. RENDERIZAR TABELA
    mesasTbodyEl.innerHTML = '';
    filteredList.forEach(mesa => {
        const row = document.createElement('tr');
        let statusPagamento = '---';
        if (mesa.status === 'vendida') {
            statusPagamento = mesa.pago ? 'Sim' : 'Não';
        }
        row.innerHTML = `
            <td>${String(mesa.numero).padStart(2, '0')}</td>
            <td class="status-${mesa.status}">${mesa.status.charAt(0).toUpperCase() + mesa.status.slice(1)}</td>
            <td>${mesa.nome}</td>
            <td>${mesa.preco.toFixed(2).replace('.', ',')}</td>
            <td>${statusPagamento}</td>
        `;
        mesasTbodyEl.appendChild(row);
    });

    // 4. ATUALIZAR VISUAL DOS CABEÇALHOS
    tableHeaders.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// --- EVENT LISTENERS ---
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    render();
});

tableHeaders.addEventListener('click', (e) => {
    const column = e.target.dataset.sort;
    if (!column) return;

    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    render();
});

// --- ATUALIZAÇÃO DE DADOS DO FIREBASE ---
onValue(layoutRef, (layoutSnapshot) => {
    const layoutData = layoutSnapshot.val() || {};
    onValue(mesasRef, (mesasSnapshot) => {
        const mesasData = mesasSnapshot.val() || {};
        
        // --- ATUALIZAÇÃO DE MÉTRICAS E GRÁFICO ---
        let totalMesas = 0;
        let countVendida = 0;
        let countReservada = 0;
        let totalArrecadado = 0;
        
        masterTableList = []; // Reinicia a lista mestre

        for (const colId in layoutData) {
            (layoutData[colId] || []).forEach(num => {
                const numeroMesa = parseInt(num);
                masterTableList.push({ numero: numeroMesa, status: 'livre', nome: '---', preco: 0, pago: false });
            });
        }
        totalMesas = masterTableList.length;

        for (const mesaNum in mesasData) {
            const mesaInfo = mesasData[mesaNum];
            const mesaNaLista = masterTableList.find(m => m.numero == mesaNum);

            if (mesaNaLista) {
                mesaNaLista.status = mesaInfo.status;
                mesaNaLista.nome = mesaInfo.nome || '---';
                mesaNaLista.preco = parseFloat(mesaInfo.preco) || 0;
                mesaNaLista.pago = mesaInfo.pago || false;
            }

            if (mesaInfo.status === 'vendida') {
                countVendida++;
                if (mesaInfo.pago) {
                    totalArrecadado += parseFloat(mesaInfo.preco) || 0;
                }
            } else if (mesaInfo.status === 'reservada') {
                countReservada++;
            }
        }
        const countLivre = totalMesas - countVendida - countReservada;

        totalArrecadadoEl.textContent = `R$ ${totalArrecadado.toFixed(2).replace('.', ',')}`;
        mesasVendidasEl.textContent = countVendida;
        mesasReservadasEl.textContent = countReservada;
        mesasLivresEl.textContent = countLivre;

        // --- ATUALIZA GRÁFICO ---
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

        // CHAMA A RENDERIZAÇÃO INICIAL DA TABELA
        render();
    });
});