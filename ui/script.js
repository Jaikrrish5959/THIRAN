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
        // Handle non-JSON responses from server errors
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // If not JSON, it might remain silent or throw error. Try to read text.
            // For 404 HTML pages, this avoids "Unexpected token <"
            const text = await response.text();
            throw { detail: "Server returned non-JSON response: " + text.substring(0, 50) + "..." };
        }

        const result = await response.json();

        if (!response.ok) throw result;

        logAction(`${method} ${url}`, 'SUCCESS', result);
        return { success: true, data: result };
    } catch (error) {
        logAction(`${method} ${url}`, 'ERROR', error);
        showToast(error.detail || error.message || 'An error occurred', 'error');
        return { success: false, error: error };
    }
};

const logAction = (action, status, details) => {
    const logContainer = document.getElementById('sessionLog');
    if (!logContainer) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${status.toLowerCase()}`;
    const time = new Date().toLocaleTimeString();

    // Format JSON nicely for log
    const detailsStr = JSON.stringify(details, null, 2);
    entry.innerText = `[${time}] ${action}\n${detailsStr}`;
    logContainer.prepend(entry);
};

// --- Delete Functions ---
window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await api(`/users/${id}`, 'DELETE');
    if (res.success) {
        showToast(`User ${id} deleted`);
        // Reload both lists as deleting user deletes wallets too
        await loadUsers();
        await loadWallets();
    } else {
        console.error("Delete User Failed:", res.error);
    }
};

window.deleteWallet = async (id) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    const res = await api(`/wallets/${id}`, 'DELETE');
    if (res.success) {
        showToast(`Wallet ${id} deleted`);
        await loadWallets();
    }
};

// --- Data Loading Functions ---

const loadUsers = async () => {
    // Only fetch if we are on a page that needs user data
    if (!document.getElementById('userList') && !document.querySelector('.user-select')) return;

    const res = await api('/users/', 'GET');
    if (res.success) {
        users = res.data;
        updateUserUI();
    }
};

const updateUserUI = () => {
    // Update Badge
    const countBadge = document.getElementById('userCount');
    if (countBadge) countBadge.innerText = users.length;

    // Update List
    const list = document.getElementById('userList');
    if (list) {
        list.innerHTML = '';
        if (users.length === 0) {
            list.innerHTML = '<li class="empty-state">No users found. Create one to get started.</li>';
        } else {
            users.forEach((user, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:var(--primary-color);">#${index + 1}</span>
                        <span style="font-weight:500; color:white;">${user.username}</span>
                        <span style="font-size:0.8em; color:var(--text-secondary);">${user.email}</span>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span class="badge">ID: ${user.id}</span>
                        <button class="btn-text danger" onclick="deleteUser(${user.id})">Delete</button>
                    </div>
                `;
                list.appendChild(li);
            });
        }
    }

    // Update Select Options
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

const loadWallets = async () => {
    const list = document.getElementById('walletList');
    if (!list) return;

    list.innerHTML = '<li class="empty-state">Loading...</li>';

    // Need users for names, so ensure they are loaded (if not already)
    if (users.length === 0) {
        const userRes = await api('/users/', 'GET');
        if (userRes.success) users = userRes.data;
    }

    const res = await api('/wallets/', 'GET');
    if (!res.success) {
        list.innerHTML = '<li class="empty-state error">Failed to load wallets.</li>';
        return;
    }

    const wallets = res.data.sort((a, b) => b.id - a.id);

    if (wallets.length === 0) {
        list.innerHTML = '<li class="empty-state">No wallets found. Create one to get started.</li>';
        return;
    }

    list.innerHTML = '';
    wallets.forEach((w, index) => {
        const li = document.createElement('li');
        const user = users.find(u => u.id === w.user_id);
        const userName = user ? user.username : `User ${w.user_id}`;

        li.innerHTML = `
            <div style="display:flex; flex-direction:column; cursor:pointer;" onclick="fillWalletId(${w.id})">
                <span style="font-weight:600; color:var(--primary-color);">#${index + 1} &nbsp; Wallet ${w.id}</span>
                <span style="font-size:0.8em; color:var(--text-secondary);">Owner: ${userName}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:bold; color:var(--success-color);">$${w.balance.toFixed(2)}</span>
                <button class="btn-text" onclick="checkBalance(${w.id})">Refresh</button>
                <button class="btn-text danger" onclick="deleteWallet(${w.id})">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
};

window.loadTransactions = async () => {
    const tableBody = document.getElementById('txnList');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">Loading...</td></tr>';

    const res = await api('/transfer/history', 'GET');
    if (!res.success) {
        tableBody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:var(--danger-color);">Failed to load logs.</td></tr>';
        return;
    }

    const txns = res.data;
    if (txns.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">No transactions found.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    txns.forEach(t => {
        const date = new Date(t.timestamp).toLocaleString();
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border-color)';
        row.innerHTML = `
            <td style="padding:10px; color:var(--text-secondary);">#${t.id}</td>
            <td style="padding:10px;">${date}</td>
            <td style="padding:10px;">Wallet ${t.from_wallet_id}</td>
            <td style="padding:10px;">Wallet ${t.to_wallet_id}</td>
            <td style="padding:10px; font-weight:bold; color:var(--success-color);">$${t.amount.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });
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

        if (box && val) {
            box.classList.remove('hidden');
            val.innerText = `$${res.data.balance.toFixed(2)}`;
        }

        showToast(`Balance updated: $${res.data.balance}`, 'success');

        // Always try to refresh wallet list if visible
        loadWallets();
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
            // EXPLICIT REFRESH
            await loadUsers();
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
            // Wait slightly before reloading to ensure server consistency if async
            setTimeout(() => loadWallets(), 100);
        } else {
            console.error("Wallet Creation Failed:", res.error);
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

            // Note: If we are on the deposit page, there is no wallet list to update,
            // but if we were, we should. The checkBalance call updates balance display.
            const visibleInput = document.querySelector('input[name="wallet_id"]');
            if (visibleInput && visibleInput.value == data.wallet_id) {
                await window.checkBalance(visibleInput.value);
            }
        }
    });
}

const transferForm = document.getElementById('transferForm');
if (transferForm) {
    // Toggle Logic
    const raceToggle = document.getElementById('raceToggle');
    const receiver2Group = document.getElementById('receiver2Group');

    if (raceToggle) {
        raceToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                receiver2Group.classList.remove('hidden');
                document.querySelector('input[name="to_wallet_id_2"]').required = true;
                document.getElementById('transferBtn').innerText = "💸 Run Payroll Batch";
            } else {
                receiver2Group.classList.add('hidden');
                document.querySelector('input[name="to_wallet_id_2"]').required = false;
                document.getElementById('transferBtn').innerText = "Transfer";
            }
        });
    }

    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const amount = parseFloat(data.amount);
        const fromId = parseInt(data.from_wallet_id);
        const toId1 = parseInt(data.to_wallet_id);

        // Validation for negative amount
        if (amount <= 0) {
            showToast('Amount must be positive!', 'error');
            return;
        }

        // Validation: Self Transfer
        if (fromId === toId1) {
            showToast('Cannot transfer to self!', 'error');
            return;
        }

        if (raceToggle && raceToggle.checked) {
            // RACE CONDITION MODE
            const toId2 = parseInt(data.to_wallet_id_2);

            if (fromId === toId2) {
                showToast('Cannot transfer to self (Receiver 2)!', 'error');
                return;
            }
            if (toId1 === toId2) {
                showToast('Receivers must be different for race test!', 'error');
                return;
            }
            if (isNaN(toId2)) {
                showToast('Receiver 2 ID is invalid', 'error');
                return;
            }

            showToast('Processing Payroll Batch...', 'info');

            // Construct Batch Payload
            const batchPayload = {
                from_wallet_id: fromId,
                transfers: [
                    { to_wallet_id: toId1, amount: amount },
                    { to_wallet_id: toId2, amount: amount }
                ]
            };

            const res = await api('/transfer/batch', 'POST', batchPayload);

            if (res.success) {
                showToast(`Payroll Success! Processed ${res.data.length} transactions.`, 'success');
                e.target.reset();
            } else {
                showToast(`batch Failed: ${res.error.detail || 'Unknown error'}`, 'error');
            }

        } else {
            // NORMAL MODE
            const res = await api('/transfer/', 'POST', {
                from_wallet_id: fromId,
                to_wallet_id: toId1,
                amount: amount
            });
            if (res.success) {
                showToast('Transfer completed successfully!');
                e.target.reset();
            }
        }
    });
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadWallets();
});