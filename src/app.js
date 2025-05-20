import { auth, provider, db, storage } from './firebase-config.js';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// UI Elements
const googleLoginBtn = document.getElementById('googleLogin');
const logoutBtn = document.getElementById('logout');
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const authButtons = document.getElementById('authButtons');

// Auth State
let currentUser = null;

// Handle Auth State Changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        googleLoginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        taskForm.style.display = 'flex';
        loadTasks();
    } else {
        currentUser = null;
        googleLoginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        taskForm.style.display = 'none';
        taskList.innerHTML = `<div class="task-card"><div class="task-details"><h3>Please sign in to view and manage your tasks.</h3></div></div>`;
    }
});

// Google Sign In
googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        alert('Authentication failed: ' + err.message);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// Add New Task
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('taskInput').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const file = document.getElementById('fileUpload').files[0];

    let fileUrl = '';
    if (file) {
        const storageRef = ref(storage, `attachments/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'tasks'), {
        title,
        description,
        fileUrl,
        createdAt: new Date(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email
    });

    taskForm.reset();
});

// Load Tasks (Real-Time)
function loadTasks() {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        taskList.innerHTML = '';
        snapshot.docs.forEach(docSnap => {
            const task = docSnap.data();
            // Show only current user's tasks (or remove this check for shared tasks)
            if (task.userId !== currentUser.uid) return;
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <div class="task-details">
                    <h3>${task.title}</h3>
                    <p>${task.description || ''}</p>
                    ${task.fileUrl ? `<a href="${task.fileUrl}" target="_blank">View Attachment</a>` : ''}
                    <div style="font-size:0.9em;color:#888;margin-top:8px;">By: ${task.userName}</div>
                </div>
                <div class="task-actions">
                    <button data-id="${docSnap.id}">Delete</button>
                </div>
            `;
            card.querySelector('button').onclick = async () => {
                await deleteDoc(doc(db, 'tasks', docSnap.id));
            };
            taskList.appendChild(card);
        });
        if (!taskList.innerHTML) {
            taskList.innerHTML = `<div class="task-card"><div class="task-details"><h3>No tasks yet. Add your first task!</h3></div></div>`;
        }
    });
}
