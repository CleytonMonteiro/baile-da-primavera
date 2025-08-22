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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const layoutRef = ref(database, 'layoutMesas');
const editorContainer = document.getElementById('editor-container');

let currentLayout = {}; // Armazenará o layout atual para edição

// Protege a página contra acesso não autorizado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("Acesso negado. Por favor, faça login como administrador.");
        window.location.href = 'index.html';
    }
});


// Função para renderizar o editor com os dados do layout
function renderEditor() {
    editorContainer.innerHTML = ''; // Limpa o container
    
    for (const columnId in currentLayout) {
        const columnData = currentLayout[columnId];
        const columnDiv = document.createElement('div');
        columnDiv.className = 'layout-column';
        columnDiv.innerHTML = `<h3>Coluna: ${columnId}</h3>`;
        
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
        
        // Formulário para adicionar mesa na coluna
        const addForm = document.createElement('div');
        addForm.className = 'add-mesa-form';
        addForm.innerHTML = `
            <input type="number" placeholder="Nº Mesa" class="add-mesa-input">
            <button class="add-mesa-btn" data-column="${columnId}">Adicionar</button>
        `;
        columnDiv.appendChild(addForm);
        
        editorContainer.appendChild(columnDiv);
    }
}

// Carrega os dados do layout do Firebase
onValue(layoutRef, (snapshot) => {
    if (snapshot.exists()) {
        currentLayout = snapshot.val();
        renderEditor();
    } else {
        editorContainer.innerHTML = '<h2>Nenhum layout encontrado no banco de dados.</h2>';
    }
});

// A LÓGICA PARA ADICIONAR, REMOVER E SALVAR SERÁ IMPLEMENTADA NA PRÓXIMA ETAPA.