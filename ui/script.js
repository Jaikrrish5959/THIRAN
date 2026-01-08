const API_BASE = '/api/v1';

// --- Theme Management ---
const themeToggleBtn = document.getElementById('themeToggle');
const body = document.body;

// Icons
const sunIcon = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
const moonIcon = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;

const applyTheme = (theme) => {
    if (theme === 'light') {
        body.setAttribute('data-theme', 'light');
        themeToggleBtn.innerHTML = moonIcon; // Show moon to switch to dark
    } else {
        body.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = sunIcon; // Show sun to switch to light
    }
    localStorage.setItem('theme', theme);
};

// Init Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    const current = body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
});

// --- State & Storage ---
let users = [];
// We use localStorage to persist known wallet IDs for this user's browser session
// Structure: { [id: number]: { userId: number, lastKnownBalance: number } }
let localWallets = JSON.parse(localStorage.getItem('local_wallets') || '{}');

// --- Toast System ---
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `<span style="font-weight:bold">${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- API Wrapper ---
const api = async (endpoint, method, data) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) throw result;

        logAction(`${method} ${url}`, 'SUCCESS', result);
        return { success: true, data: result };
    } catch (error) {
        logAction(`${method} ${url}`, 'ERROR', error);
        showToast(error.detail || 'An error occurred', 'error');
        return { success: false, error: error };
    }
};

const logAction = (action, status, details) => {
    const logContainer = document.getElementById('sessionLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${status.toLowerCase()}`;
    const time = new Date().toLocaleTimeString();

    // Format JSON nicely for log
    const detailsStr = JSON.stringify(details, null, 2);
    entry.innerText = `[${time}] ${action}\n${detailsStr}`;
    logContainer.prepend(entry);
};

// --- Dashboard Logic ---
const loadDashboard = async () => {
    // Only fetch if we are on a page that needs user data
    if (document.getElementById('userList') || document.querySelector('.user-select')) {
        const res = await api('/users/', 'GET');
        if (res.success) {
            users = res.data;
            if (document.getElementById('userCount')) {
                document.getElementById('userCount').innerText = users.length;
            }
            if (document.getElementById('userList')) {
                renderUserList();
            }
            if (document.querySelector('.user-select')) {
                updateSelectOptions();
            }
            if (document.getElementById('walletList')) {
                renderWalletList();
            }
        }
    } else if (document.getElementById('walletList')) {
        // Need users for names, so fetch them
        const userRes = await api('/users/', 'GET');
        if (userRes.success) {
            users = userRes.data;
        }
        renderWalletList();
    }
};

const renderUserList = () => {
    const list = document.getElementById('userList');
    if (!list) return;

    list.innerHTML = '';

    if (users.length === 0) {
        list.innerHTML = '<li class="empty-state">No users found. Create one to get started.</li>';
        return;
    }

    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:500; color:white;">${user.username}</span>
                <span style="font-size:0.8em; color:var(--text-secondary);">${user.email}</span>
            </div>
            <span class="badge">ID: ${user.id}</span>
        `;
        list.appendChild(li);
    });
};

const updateSelectOptions = () => {
    const userSelects = document.querySelectorAll('.user-select');
    userSelects.forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">Select Owner</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.innerText = `${user.username} (ID: ${user.id})`;
            select.appendChild(option);
        });
        if (current) select.value = current;
    });
};

const renderWalletList = async () => {
    const list = document.getElementById('walletList');
    if (!list) return;

    list.innerHTML = '<li class="empty-state">Loading...</li>';

    const res = await api('/wallets/', 'GET');
    if (!res.success) {
        list.innerHTML = '<li class="empty-state error">Failed to load wallets.</li>';
        return;
    }

    // Sort by ID descending
    const wallets = res.data.sort((a, b) => b.id - a.id);

    if (wallets.length === 0) {
        list.innerHTML = '<li class="empty-state">No wallets found. Create one to get started.</li>';
        return;
    }

    list.innerHTML = '';
    wallets.forEach(w => {
        const li = document.createElement('li');
        // Backend returns user_id, check if users loaded
        const user = users.find(u => u.id === w.user_id);
        const userName = user ? user.username : `User ${w.user_id}`;

        li.innerHTML = `
            <div style="display:flex; flex-direction:column; cursor:pointer;" onclick="fillWalletId(${w.id})">
                <span style="font-weight:600; color:var(--primary-color);">Wallet #${w.id}</span>
                <span style="font-size:0.8em; color:var(--text-secondary);">Owner: ${userName}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:bold; color:var(--success-color);">$${w.balance.toFixed(2)}</span>
                <button class="btn-text" onclick="checkBalance(${w.id})">Refresh</button>
            </div>
        `;
        list.appendChild(li);
    });
};

// Helper to save wallet to local history (Legacy, kept for potential future use or specific tracking)
// Helper to save wallet to local history (Removed in favor of backend list)
const saveLocalWallet = (id, userId, balance = null) => {
    // No-op
    if (document.getElementById('walletList')) {
        renderWalletList();
    }
};

window.fillWalletId = (id) => {
    const walletInput = document.querySelector('input[name="wallet_id"]');
    if (walletInput) walletInput.value = id;

    const fromInput = document.querySelector('input[name="from_wallet_id"]');
    if (fromInput) fromInput.value = id;
};

window.checkBalance = async (id) => {
    const res = await api(`/wallets/${id}`, 'GET');
    if (res.success) {
        const box = document.getElementById('balanceDisplay');
        const val = document.getElementById('balanceValue');

        // Only update if element exists (might be on a different page)
        if (box && val) {
            box.classList.remove('hidden');
            val.innerText = `$${res.data.balance.toFixed(2)}`;
        }

        showToast(`Balance updated: $${res.data.balance}`, 'success');

        // Refresh list if on wallets page
        if (document.getElementById('walletList')) {
            renderWalletList();
        }
    }
};

// --- Forms ---
const createUserForm = document.getElementById('createUserForm');
if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await api('/users/', 'POST', data);
        if (res.success) {
            showToast(`User '${res.data.username}' created!`);
            e.target.reset();
            loadDashboard();
        }
    });
}

const createWalletForm = document.getElementById('createWalletForm');
if (createWalletForm) {
    createWalletForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.user_id = parseInt(data.user_id);

        const res = await api('/wallets/', 'POST', data);
        if (res.success) {
            showToast(`Wallet #${res.data.id} created successfully!`);
            e.target.reset();
            // Refresh list if present
            if (document.getElementById('walletList')) renderWalletList();
        }
    });
}

const checkBalanceForm = document.getElementById('checkBalanceForm');
if (checkBalanceForm) {
    checkBalanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await window.checkBalance(data.wallet_id);
    });
}

const depositForm = document.getElementById('depositForm');
if (depositForm) {
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await api(`/wallets/${data.wallet_id}/deposit`, 'POST', { amount: parseFloat(data.amount) });
        if (res.success) {
            showToast(`Deposited $${data.amount} to Wallet #${data.wallet_id}`);
            e.target.reset();
            // Update balance display if visible and matching
            const visibleInput = document.querySelector('input[name="wallet_id"]');
            if (visibleInput && visibleInput.value == data.wallet_id) window.checkBalance(visibleInput.value);
        }
    });
}

const transferForm = document.getElementById('transferForm');
if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.from_wallet_id = parseInt(data.from_wallet_id);
        data.to_wallet_id = parseInt(data.to_wallet_id);
        data.amount = parseFloat(data.amount);

        const res = await api('/transfer/', 'POST', data);
        if (res.success) {
            showToast('Transfer completed successfully!');
            e.target.reset();
        }
    });
}

loadDashboard();