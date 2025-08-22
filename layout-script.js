import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

const defaultLayout = {
  "col-cen-1": [67, 68, 69],
  "col-cen-2": [64, 65, 66],
  "col-cen-3": [61, 62, 63],
  "col-cen-4": [58, 59, 60],
  "col-cen-5": [55, 56, 57],
  "col-cen-6": [52, 53, 54],
  "col-cen-7": [49, 50, 51],
  "col-dir-1": [41, 42, 43, 44, 45, 46, 47, 48],
  "col-dir-2": [33, 34, 35, 36, 37, 38, 39, 40],
  "col-dir-3": [25, 26, 27, 28, 29, 30, 31, 32],
  "col-dir-4": [17, 18, 19, 20, 21, 22, 23, 24],
  "col-dir-5": [9, 10, 11, 12, 13, 14, 15, 16],
  "col-dir-6": [1, 2, 3, 4, 5, 6, 7, 8],
  "col-esq-1": [94, 95, 96, 97, 98, 99, 100, 101],
  "col-esq-2": [86, 87, 88, 89, 90, 91, 92, 93],
  "col-esq-3": [78, 79, 80, 81, 82, 83, 84, 85],
  "col-esq-4": [70, 71, 72, 73, 74, 75, 76, 77]
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const layoutRef = ref(database, 'layoutMesas');

const editorContainer = document.getElementById('editor-container');
const deleteModeToggle = document.getElementById('delete-mode-toggle');
const addColumnBtn = document.getElementById('add-column-btn');
const saveLayoutBtn = document.getElementById('save-layout-btn');
const resetLayoutBtn = document.getElementById('reset-layout-btn');

let editableLayout = {};

onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("Acesso negado. Por favor, faça login como administrador.");
        window.location.href = 'index.html';
    }
});

function renderEditor() {
    editorContainer.innerHTML = '';
    
    const getColumnWeight = (columnId) => {
        if (columnId.startsWith('col-esq')) return 1;
        if (columnId.startsWith('col-cen')) return 2;
        if (columnId.startsWith('col-dir')) return 3;
        return 4;
    };

    const sortedColumnKeys = Object.keys(editableLayout).sort((a, b) => {
        const weightA = getColumnWeight(a);
        const weightB = getColumnWeight(b);
        if (weightA !== weightB) {
            return weightA - weightB;
        }
        return a.localeCompare(b);
    });

    sortedColumnKeys.forEach(columnId => {
        const columnData = editableLayout[columnId] || [];
        const columnDiv = document.createElement('div');
        columnDiv.className = 'layout-column';
        columnDiv.innerHTML = `<h3>${columnId} <button class="remove-column-btn" data-column="${columnId}">X</button></h3>`;
        
        const mesasListDiv = document.createElement('div');
        mesasListDiv.className = 'mesas-list';
        
        if(Array.isArray(columnData)) {
            columnData.forEach(mesaNum => {
                const mesaItemDiv = document.createElement('div');
                mesaItemDiv.className = 'mesa-item';
                mesaItemDiv.innerHTML = `
                    <span>${mesaNum}</span>
                    <button class="remove-mesa-btn" data-column="${columnId}" data-mesa="${mesaNum}">-</button>
                `;
                mesasListDiv.appendChild(mesaItemDiv);
            });
        }
        
        columnDiv.appendChild(mesasListDiv);
        
        const addForm = document.createElement('div');
        addForm.className = 'add-mesa-form';
        addForm.innerHTML = `
            <input type="number" placeholder="Nº Mesa" class="add-mesa-input">
            <button class="add-mesa-btn" data-column="${columnId}">Adicionar</button>
        `;
        columnDiv.appendChild(addForm);
        editorContainer.appendChild(columnDiv);
    });
}

onValue(layoutRef, (snapshot) => {
    let dataFromDB = {};
    if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
        dataFromDB = snapshot.val();
    } else {
        console.log("Nenhum layout encontrado no Firebase. Carregando layout padrão.");
        dataFromDB = JSON.parse(JSON.stringify(defaultLayout));
    }

    // --- CORREÇÃO APLICADA AQUI ---
    // Garante que cada coluna seja um Array de verdade antes de usar.
    editableLayout = {};
    for (const columnId in dataFromDB) {
        const columnData = dataFromDB[columnId];
        if (Array.isArray(columnData)) {
            // Se já for um array, ótimo.
            editableLayout[columnId] = columnData;
        } else if (typeof columnData === 'object' && columnData !== null) {
            // Se for um objeto (como o Firebase às vezes retorna), converte para array.
            editableLayout[columnId] = Object.values(columnData);
        } else {
            // Caso seja algo inesperado, cria uma coluna vazia.
            editableLayout[columnId] = [];
        }
    }
    // --- FIM DA CORREÇÃO ---

    renderEditor();
});

deleteModeToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('delete-mode-active', e.target.checked);
});

addColumnBtn.addEventListener('click', () => {
    const columnName = prompt("Digite o nome da nova coluna (ex: col-esq-3, palco, etc.):");
    if (columnName && !editableLayout[columnName]) {
        editableLayout[columnName] = [];
        renderEditor();
    } else if (editableLayout[columnName]) {
        alert("Erro: Já existe uma coluna com este nome.");
    }
});

resetLayoutBtn.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja descartar todas as alterações atuais e restaurar o layout padrão do salão?")) {
        editableLayout = JSON.parse(JSON.stringify(defaultLayout));
        renderEditor();
    }
});

editorContainer.addEventListener('click', (e) => {
    const target = e.target;
    const columnId = target.dataset.column;

    if (target.classList.contains('add-mesa-btn')) {
        const input = target.previousElementSibling;
        const mesaNum = parseInt(input.value);
        if (mesaNum) {
            if (!editableLayout[columnId]) editableLayout[columnId] = [];
            if (!editableLayout[columnId].includes(mesaNum)) {
                editableLayout[columnId].push(mesaNum);
                editableLayout[columnId].sort((a,b) => a-b);
                renderEditor();
            } else {
                 alert("Número de mesa já existente na coluna.");
            }
        } else {
            alert("Número de mesa inválido.");
        }
    }
    
    if (target.classList.contains('remove-mesa-btn')) {
        const mesaNum = parseInt(target.dataset.mesa);
        const mesaIndex = editableLayout[columnId].indexOf(mesaNum);
        if (mesaIndex > -1) {
            editableLayout[columnId].splice(mesaIndex, 1);
            renderEditor();
        }
    }
    
    if (target.classList.contains('remove-column-btn')) {
        if (confirm(`Tem certeza que deseja excluir a coluna "${columnId}" e todas as suas mesas?`)) {
            delete editableLayout[columnId];
            renderEditor();
        }
    }
});

saveLayoutBtn.addEventListener('click', () => {
    if(confirm("Tem certeza que deseja salvar este novo layout? O layout antigo no banco de dados será substituído permanentemente.")) {
        set(layoutRef, editableLayout)
            .then(() => alert("Layout salvo com sucesso!"))
            .catch((err) => alert("Erro ao salvar o layout: " + err.message));
    }
});