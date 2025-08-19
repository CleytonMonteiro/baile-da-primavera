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

const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginEmailInput = document.getElementById('login-email-admin');
const adminLoginSenhaInput = document.getElementById('login-senha-admin');
const adminLoginBtn = document.getElementById('login-btn-admin');
const adminLoginErroSpan = document.getElementById('login-erro-admin');
const adminLogoutBtn = document.getElementById('logout-btn-admin');
const adminStatusText = document.getElementById('status-text-admin');
const adminContent = document.getElementById('admin-content');
const layoutJsonTextArea = document.getElementById('layout-json');
const salvarLayoutBtn = document.getElementById('salvar-layout-btn');

function handleAdminLogin() {
    signInWithEmailAndPassword(auth, adminLoginEmailInput.value, adminLoginSenhaInput.value)
        .then(() => {
            adminLoginForm.style.display = 'none';
            adminLoginErroSpan.style.display = 'none';
        })
        .catch((error) => {
            adminLoginErroSpan.style.display = 'block';
        });
}

function handleAdminLogout() {
    signOut(auth);
}

function carregarLayout() {
    onValue(layoutRef, (snapshot) => {
        const layoutData = snapshot.val();
        if (layoutData) {
            layoutJsonTextArea.value = JSON.stringify(layoutData, null, 2);
        } else {
            layoutJsonTextArea.value = JSON.stringify({}, null, 2);
        }
    });
}

function salvarLayout() {
    salvarLayoutBtn.textContent = 'Salvando...';
    salvarLayoutBtn.disabled = true;

    try {
        const novoLayout = JSON.parse(layoutJsonTextArea.value);
        set(layoutRef, novoLayout)
            .then(() => {
                alert("Layout salvo com sucesso!");
            })
            .catch(error => {
                alert("Erro ao salvar layout: " + error.message);
            })
            .finally(() => {
                salvarLayoutBtn.textContent = 'Salvar Layout';
                salvarLayoutBtn.disabled = false;
            });
    } catch (e) {
        alert("Erro de sintaxe no JSON. Por favor, corrija o formato.");
        salvarLayoutBtn.textContent = 'Salvar Layout';
        salvarLayoutBtn.disabled = false;
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        adminStatusText.textContent = `Logado como: ${user.email}`;
        adminLogoutBtn.style.display = 'inline-block';
        adminContent.style.display = 'flex';
        adminLoginForm.style.display = 'none';
        carregarLayout();
    } else {
        adminStatusText.textContent = 'Faça login para gerenciar.';
        adminLogoutBtn.style.display = 'none';
        adminContent.style.display = 'none';
        adminLoginForm.style.display = 'flex';
    }
});

adminLoginBtn.addEventListener('click', handleAdminLogin);
adminLogoutBtn.addEventListener('click', handleAdminLogout);
salvarLayoutBtn.addEventListener('click', salvarLayout);