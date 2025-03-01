document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin page loading...');
    
    // Remove loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    try {
        // Check admin authentication
        if (!requireAdmin()) {
            console.log('Not authenticated as admin, redirecting...');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('Admin authenticated, initializing dashboard...');

        // Initialize dashboard
        initializeDashboard();
        
        // Setup tab switching
        setupTabSwitching();
        
        // Set up event listeners
        setupEventListeners();
        
        // Force dashboard to be visible
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab) {
            dashboardTab.style.display = 'block';
            setTimeout(() => {
                initializeActivityChart();
            }, 100);
        }
        
        // Update admin name
        const user = getCurrentUser();
        const adminName = document.querySelector('.admin-name');
        if (adminName && user) {
            adminName.textContent = user.name;
        }
        
    } catch (error) {
        console.error('Error initializing admin page:', error);
        alert('Error loading admin dashboard');
    } finally {
        // Remove loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
});

function requireAdmin() {
    const user = getCurrentUser();
    if (!user || !user.isAdmin) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

const ADMIN_TOKEN = 'your-admin-token-here'; // Must match server token

function getAdminHeaders() {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'admin-token': ADMIN_TOKEN
    };
}

async function initializeDashboard() {
    try {
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.add('loading');
        });

        // Get locations and calculate active bins
        const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
        const activeBins = locations.filter(bin => bin.status === 'AVAILABLE').length;
        const totalBins = locations.length;

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/dashboard-stats', {
            method: 'GET',
            headers: getAdminHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const { data } = await response.json();
        console.log('Dashboard data:', data);

        // Update stats with real data
        updateDashboardStats({
            totalUsers: {
                value: data.users[0]?.total[0]?.count || 0,
                change: `+${data.users[0]?.weeklyGrowth[0]?.count || 0}`,
                timespan: 'this week'
            },
            activeSensors: {
                value: activeBins,
                change: `${activeBins}/${totalBins}`,
                timespan: 'active now'
            },
            totalPoints: {
                value: data.points[0]?.total || 0,
                change: `+${data.transactions[0]?.pointsToday[0]?.total || 0}`,
                timespan: 'today'
            },
            totalRedemptions: {
                value: data.transactions[0]?.total[0]?.count || 0,
                change: `+${data.transactions[0]?.today[0]?.count || 0}`,
                timespan: 'today'
            }
        });

        // Update activity chart if data exists
        if (data.activityData) {
            updateActivityChart(data.activityData);
        }

        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('loading');
        });

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showNotification('Error loading dashboard data: ' + error.message, 'error');
        
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('loading');
            card.classList.add('error');
        });
    }
}

// Add this function to update active bins count
function updateActiveBinsCount() {
    try {
        const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
        const activeBins = locations.filter(bin => bin.status === 'AVAILABLE').length;
        const totalBins = locations.length;
        
        animateCounterUpdate('activeSensors', activeBins, 1000);
        document.querySelector('#activeSensors + .stat-change').textContent = 
            `${activeBins}/${totalBins} Available`;
    } catch (error) {
        console.error('Error updating active bins count:', error);
    }
}

function updateDashboardStats(stats) {
    // Update total users with animation
    animateCounterUpdate('totalUsers', stats.totalUsers.value, 1000);
    document.querySelector('#totalUsers + .stat-change').textContent = 
        `${stats.totalUsers.change} ${stats.totalUsers.timespan}`;

    // Update active sensors with animation
    animateCounterUpdate('activeSensors', stats.activeSensors.value, 1000);
    document.querySelector('#activeSensors + .stat-change').textContent = 
        `${stats.activeSensors.change} ${stats.activeSensors.timespan}`;

    // Update total points with animation
    animateCounterUpdate('totalPoints', stats.totalPoints.value, 1000);
    document.querySelector('#totalPoints + .stat-change').textContent = 
        `${stats.totalPoints.change} ${stats.totalPoints.timespan}`;

    // Update total redemptions with animation
    animateCounterUpdate('totalRedemptions', stats.totalRedemptions.value, 1000);
    document.querySelector('#totalRedemptions + .stat-change').textContent = 
        `${stats.totalRedemptions.change} ${stats.totalRedemptions.timespan}`;
}

function animateCounterUpdate(elementId, endValue, duration) {
    const element = document.getElementById(elementId);
    const startValue = parseInt(element.textContent) || 0;
    const change = endValue - startValue;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentValue = Math.floor(startValue + (change * progress));
        element.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

let activityChart = null;

function initializeActivityChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (activityChart) {
        activityChart.destroy();
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 163, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 255, 163, 0)');

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'User Activity',
                data: [65, 59, 80, 81, 56, 55],
                borderColor: '#00ffa3',
                backgroundColor: gradient,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e6f4ff' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(10, 17, 40, 0.8)',
                    titleColor: '#00ffa3'
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: { color: '#e6f4ff' }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: { color: '#e6f4ff' }
                }
            }
        }
    });
}

function updateActivityChart(activityData) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (activityChart) {
        activityChart.destroy();
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 163, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 255, 163, 0)');

    const labels = activityData.map(item => item._id);
    const values = activityData.map(item => item.count);
    const points = activityData.map(item => item.points);

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Transactions',
                    data: values,
                    borderColor: '#00ffa3',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Points',
                    data: points,
                    borderColor: '#00d4ff',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e6f4ff' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(10, 17, 40, 0.8)',
                    titleColor: '#00ffa3',
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: { 
                        color: '#e6f4ff',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: { color: '#e6f4ff' }
                }
            }
        }
    });
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function setupTabSwitching() {
    const dashboard = document.getElementById('dashboard');
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Only proceed if all elements exist
    if (!dashboard || !menuItems.length || !tabContents.length) {
        console.error('Required tab elements not found');
        return;
    }

    // Initialize dashboard tab
    dashboard.classList.add('active');
    dashboard.style.display = 'block';
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            const activeTab = document.getElementById(tabName);
            
            if (!activeTab) {
                console.error(`Tab '${tabName}' not found`);
                return;
            }
            
            // Update active states
            menuItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => {
                if (t) {
                    t.style.display = 'none';
                    t.classList.remove('active');
                }
            });
            
            item.classList.add('active');
            activeTab.style.display = 'block';
            setTimeout(() => activeTab.classList.add('active'), 10);
            
            // Load tab-specific data
            loadTabData(tabName);
            
            // Reinitialize chart if on dashboard
            if (tabName === 'dashboard') {
                setTimeout(() => {
                    initializeActivityChart();
                }, 100);
            }
        });
    });
}

async function loadTabData(tabName) {
    switch(tabName) {
        case 'users':
            await loadUsers();
            break;
        case 'transactions':
            await loadTransactions();
            break;
        case 'dustbins':
            await loadDustbins();
            break;
    }
}

// User Management
async function loadUsers() {
    try {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('Users table body element not found');
            return;
        }

        // Show loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="loading-spinner"></div>
                    <span>Loading users...</span>
                </td>
            </tr>`;

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const data = await response.json();
        console.log('Users data:', data);

        if (!data.users || !Array.isArray(data.users)) {
            throw new Error('Invalid data format received');
        }

        tbody.innerHTML = data.users.map(user => `
            <tr>
                <td data-label="Name">
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-name">${user.name}</div>
                    </div>
                </td>
                <td data-label="Email">${user.email}</td>
                <td data-label="Points">
                    <div class="points-badge">
                        ${user.points || 0}
                        <i class="fas fa-coins"></i>
                    </div>
                </td>
                <td data-label="Status">
                    <span class="status-badge ${getUserStatus(user)}">
                        ${getUserStatus(user)}
                    </span>
                </td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="viewUserDetails('${user._id}')" class="action-btn view" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="editUser('${user._id}')" class="action-btn edit" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteUser('${user._id}')" class="action-btn delete" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="no-data">No users found</td></tr>';

        // Update dashboard counts with the new data
        updateDashboardCounts({
            totalUsers: data.totalUsers,
            totalPoints: data.totalPoints
        });

    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-row">
                        <i class="fas fa-exclamation-circle"></i>
                        Error loading users: ${error.message}
                    </td>
                </tr>`;
        }
        showNotification(error.message, 'error');
    }
}

function getUserStatus(user) {
    if (user.lastActivity) {
        const lastActivity = new Date(user.lastActivity);
        const now = new Date();
        const daysSinceActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysSinceActivity < 7) return 'active';
        if (daysSinceActivity < 30) return 'inactive';
        return 'dormant';
    }
    return 'new';
}

async function confirmDeleteUser(userId) {
    const modal = createConfirmationModal(
        'Delete User',
        'Are you sure you want to delete this user? This action cannot be undone.',
        async () => {
            try {
                const response = await fetch(`https://recyclebin1.onrender.com/api/admin/users/${userId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Failed to delete user');
                
                const data = await response.json();
                if (data.success) {
                    showNotification('User deleted successfully');
                    loadUsers();
                } else {
                    throw new Error(data.message || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showNotification(error.message, 'error');
            }
        }
    );
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Add new function to view user details
async function viewUserDetails(userId) {
    try {
        const response = await fetch(`https://recyclebin1.onrender.com/api/admin/users/${userId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const user = data.user;
        
        // Create and show modal with user details
        const modalHtml = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>User Details</h2>
                <div class="user-details">
                    <div class="detail-row">
                        <span class="label">Name:</span>
                        <span class="value">${user.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Email:</span>
                        <span class="value">${user.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Points:</span>
                        <span class="value">${user.points || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="value"><span class="status-badge active">Active</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Joined:</span>
                        <span class="value">${formatDate(user.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);

        // Handle modal close
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        // Close modal on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        };

    } catch (error) {
        console.error('Error fetching user details:', error);
        showNotification('Error loading user details', 'error');
    }
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Update existing edit user function
async function editUser(userId) {
    try {
        const response = await fetch(`https://recyclebin1.onrender.com/api/admin/users/${userId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const user = data.user;
        
        const modalHtml = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit User</h2>
                <form id="editUserForm">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="editName" value="${user.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editEmail" value="${user.email}" required>
                    </div>
                    <div class="form-group">
                        <label>Points</label>
                        <input type="number" id="editPoints" value="${user.points || 0}" required>
                    </div>
                    <button type="submit" class="action-btn">Save Changes</button>
                </form>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);

        // Handle form submission
        const form = modal.querySelector('#editUserForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`https://recyclebin1.onrender.com/api/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: form.querySelector('#editName').value,
                        email: form.querySelector('#editEmail').value,
                        points: parseInt(form.querySelector('#editPoints').value)
                    })
                });

                const result = await response.json();
                if (result.success) {
                    showNotification('User updated successfully');
                    loadUsers(); // Reload the user list
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error updating user:', error);
                showNotification(error.message || 'Error updating user', 'error');
            }
        };

        // Handle modal close
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        // Close modal on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        };

    } catch (error) {
        console.error('Error editing user:', error);
        showNotification('Error loading user data', 'error');
    }
}

// Transaction Management
// Add helper function for admin requests
function getAdminHeaders() {
    return {
        'Content-Type': 'application/json',
        'admin-token': getAdminToken()
    };
}

// Add this function near the top of the file
function getAdminToken() {
    return 'your-admin-token-here'; // Must match the token in server.js
}

// Update loadTransactions function
async function loadTransactions() {
    try {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) {
            console.error('Transactions table body element not found');
            return;
        }

        // Show loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="loading-spinner"></div>
                    <span>Loading transactions...</span>
                </td>
            </tr>`;

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/transactions', {
            method: 'GET',
            headers: getAdminHeaders()
        });

        if (response.status === 401) {
            showNotification('Admin authentication required', 'error');
            window.location.href = 'index.html';
            return;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch transactions (${response.status})`);
        }
        
        const data = await response.json();
        console.log('Transactions data:', data);

        if (!data.transactions || !Array.isArray(data.transactions)) {
            throw new Error('Invalid data format received');
        }

        tbody.innerHTML = data.transactions.map(tx => `
            <tr>
                <td data-label="Date">${formatDate(tx.createdAt)}</td>
                <td data-label="User">${tx.userId?.name || 'Unknown'}</td>
                <td data-label="Type">
                    <span class="transaction-type ${tx.type.toLowerCase()}">
                        ${tx.type}
                    </span>
                </td>
                <td data-label="Points">
                    <span class="points ${tx.type === 'EARN' ? 'positive' : 'negative'}">
                        ${tx.type === 'EARN' ? '+' : '-'}${Math.abs(tx.points)}
                    </span>
                </td>
                <td data-label="Code">${tx.code || '-'}</td>
                <td data-label="Status">
                    <span class="status-badge ${tx.success !== false ? 'success' : 'failure'}">
                        ${tx.success !== false ? 'Successful' : 'Unsuccessful'}
                    </span>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6">No transactions found</td></tr>';

        // Add CSS for status badges if not already present
        if (!document.getElementById('status-badge-styles')) {
            const style = document.createElement('style');
            style.id = 'status-badge-styles';
            style.textContent = `
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.85em;
                    font-weight: 500;
                }
                .status-badge.success {
                    background-color: rgba(0, 255, 163, 0.1);
                    color: #00ffa3;
                    border: 1px solid rgba(0, 255, 163, 0.2);
                }
                .status-badge.failure {
                    background-color: rgba(255, 107, 107, 0.1);
                    color: #ff6b6b;
                    border: 1px solid rgba(255, 107, 107, 0.2);
                }
            `;
            document.head.appendChild(style);
        }

    } catch (error) {
        console.error('Error loading transactions:', error);
        const errorTbody = document.getElementById('transactionsTableBody');
        if (errorTbody) {
            errorTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-row">
                        <i class="fas fa-exclamation-circle"></i>
                        Error loading transactions: ${error.message}
                    </td>
                </tr>`;
        }
        showNotification('Error loading transactions', 'error');
    }
}

// Update viewTransactionDetails function
async function viewTransactionDetails(txId) {
    try {
        const response = await fetch(`https://recyclebin1.onrender.com/api/admin/transactions/${txId}`, {
            headers: getAdminHeaders()
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const tx = data.transaction;
        
        const modalHtml = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Transaction Details</h2>
                <div class="transaction-details">
                    <div class="detail-row">
                        <span class="label">Type:</span>
                        <span class="value">
                            <span class="transaction-type ${tx.type.toLowerCase()}">${tx.type}</span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Points:</span>
                        <span class="value">
                            <span class="points ${tx.type === 'EARN' ? 'positive' : 'negative'}">
                                ${tx.type === 'EARN' ? '+' : '-'}${Math.abs(tx.points)}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Code:</span>
                        <span class="value">${tx.code || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">User:</span>
                        <span class="value">${tx.userId?.name || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span class="value">${formatDate(tx.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        setTimeout(() => modal.classList.add('show'), 10);

        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        };

    } catch (error) {
        console.error('Error fetching transaction details:', error);
        showNotification('Error loading transaction details', 'error');
    }
}

// Update confirmDeleteTransaction function
async function confirmDeleteTransaction(txId) {
    const modal = createConfirmationModal(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This will also reverse any points associated with it.',
        async () => {
            try {
                const response = await fetch(`https://recyclebin1.onrender.com/api/admin/transactions/${txId}`, {
                    method: 'DELETE',
                    headers: getAdminHeaders()
                });
                
                if (!response.ok) throw new Error('Failed to delete transaction');
                
                const data = await response.json();
                if (data.success) {
                    showNotification('Transaction deleted successfully');
                    loadTransactions();
                } else {
                    throw new Error(data.message || 'Failed to delete transaction');
                }
            } catch (error) {
                console.error('Error deleting transaction:', error);
                showNotification(error.message, 'error');
            }
        }
    );
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Dustbin Management
function setupEventListeners() {
    const dustbinModal = document.getElementById('dustbinModal');
    const closeBtn = dustbinModal.querySelector('.close');
    
    closeBtn.onclick = () => dustbinModal.classList.remove('show');
    
    window.onclick = (event) => {
        if (event.target === dustbinModal) {
            dustbinModal.classList.remove('show');
        }
    };
    setupDustbinManagement();
    initializeSearchFunctionality();
}

function addNewDustbin() {
    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    form.reset();
    modal.classList.add('show');
}

// Export functionality
async function exportUsers() {
    try {
        showNotification('Preparing users data for export...', 'info');
        
        // Fetch users data
        const response = await fetch('https://recyclebin1.onrender.com/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const data = await response.json();
        if (!data.users || !Array.isArray(data.users)) {
            throw new Error('Invalid data format received');
        }

        // Prepare CSV data
        const headers = ['Name', 'Email', 'Points', 'Status', 'Registration Date', 'Total Transactions'];
        const csvData = data.users.map(user => [
            user.name,
            user.email,
            user.points || 0,
            getUserStatus(user),
            formatDate(user.createdAt),
            user.totalTransactions || 0
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users_export_${formatDateForFilename(new Date())}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Users data exported successfully!');
    } catch (error) {
        console.error('Error exporting users:', error);
        showNotification('Failed to export users data', 'error');
    }
}

// Add helper function for filename date formatting
function formatDateForFilename(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const time = String(d.getHours()).padStart(2, '0') + 
                String(d.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${time}`;
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

function initializeSearchFunctionality() {
    const searchConfigs = {
        userSearch: {
            tableId: 'usersTableBody',
            searchFields: ['name', 'email', 'points', 'status']
        },
        transactionSearch: {
            tableId: 'transactionsTableBody',
            searchFields: ['id', 'user', 'type', 'points', 'date', 'status']
        },
        dustbinSearch: {
            tableId: 'dustbinsTableBody',
            searchFields: ['id', 'name', 'location', 'status']
        }
    };

    Object.entries(searchConfigs).forEach(([searchId, config]) => {
        const searchInput = document.getElementById(searchId);
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const tableBody = document.getElementById(config.tableId);
                
                if (!tableBody) return;

                const rows = tableBody.getElementsByTagName('tr');
                
                Array.from(rows).forEach(row => {
                    if (row.classList.contains('loading-row') || 
                        row.classList.contains('error-row') || 
                        row.classList.contains('no-data')) {
                        return;
                    }

                    const searchableContent = config.searchFields
                        .map(field => row.querySelector(`[data-label="${field}"]`)?.textContent || '')
                        .join(' ')
                        .toLowerCase();

                    const isVisible = searchableContent.includes(searchTerm);
                    row.style.display = isVisible ? '' : 'none';
                });

                // Show no results message if needed
                const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
                if (visibleRows.length === 0 && searchTerm) {
                    const noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results';
                    noResultsRow.innerHTML = `
                        <td colspan="6" class="no-data">
                            <i class="fas fa-search"></i>
                            No results found for "${searchTerm}"
                        </td>
                    `;
                    tableBody.appendChild(noResultsRow);
                } else {
                    const noResultsRow = tableBody.querySelector('.no-results');
                    if (noResultsRow) noResultsRow.remove();
                }
            }, 300));

            // Add clear search button functionality
            const clearBtn = searchInput.parentElement.querySelector('.clear-search');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                });
            }
        }
    });
}

// Add this to setupEventListeners function
function setupEventListeners() {
    // ...existing code...
    initializeSearchFunctionality();
}

// Enhanced debounce function with immediate option
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

function setupRealTimeUpdates() {
    // Simulate real-time updates
    setInterval(() => {
        const stats = document.querySelectorAll('.stat-value');
        stats.forEach(stat => {
            const currentValue = parseInt(stat.textContent);
            const newValue = currentValue + Math.floor(Math.random() * 10);
            animateValue(stat, currentValue, newValue, 1000);
        });
    }, 5000);
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const animate = () => {
        current += increment;
        element.textContent = Math.floor(current);
        
        if ((increment > 0 && current < end) || (increment < 0 && current > end)) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = end;
        }
    };
    
    requestAnimationFrame(animate);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add these new functions for better user interaction
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }, 100);
}

// Update existing functions to use the new notification system
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                showNotification('User deleted successfully');
                loadUsers(); // Reload the user list
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('Error deleting user', 'error');
        }
    }
}

// Add event listeners for mobile responsiveness
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});

function updateDashboardCounts(data) {
    if (!data) return;

    // Update total users count
    const totalUsersElement = document.getElementById('totalUsers');
    if (totalUsersElement) {
        totalUsersElement.textContent = data.totalUsers || '0';
    }

    // Update total points
    const totalPointsElement = document.getElementById('totalPoints');
    if (totalPointsElement) {
        totalPointsElement.textContent = data.totalPoints?.toLocaleString() || '0';
    }
}

async function loadDustbins() {
    try {
        const tbody = document.getElementById('dustbinsTableBody');
        if (!tbody) {
            console.error('Dustbins table body element not found');
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="loading-spinner"></div>
                    <span>Loading dustbins...</span>
                </td>
            </tr>`;

        // Use the dummy locations for now
        const dustbins = API_CONFIG.DUMMY_LOCATIONS;
        
        tbody.innerHTML = dustbins.map(bin => `
            <tr>
                <td data-label="ID">${bin.id}</td>
                <td data-label="Name">${bin.name}</td>
                <td data-label="Location">${bin.address}</td>
                <td data-label="Status">
                    <span class="status-badge ${bin.status.toLowerCase()}">
                        ${bin.status}
                    </span>
                </td>
                <td data-label="Last Updated">${formatDate(new Date())}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="editDustbin('${bin.id}')" class="action-btn edit" title="Edit Dustbin">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteDustbin('${bin.id}')" class="action-btn delete" title="Delete Dustbin">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6">No dustbins found</td></tr>';

    } catch (error) {
        console.error('Error loading dustbins:', error);
        showNotification('Error loading dustbins', 'error');
    }
}

function editDustbin(binId) {
    const bin = API_CONFIG.DUMMY_LOCATIONS.find(b => b.id === binId);
    if (!bin) return;

    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    
    // Populate form fields
    form.querySelector('#dustbinName').value = bin.name;
    form.querySelector('#dustbinAddress').value = bin.address;
    form.querySelector('#dustbinLat').value = bin.lat;
    form.querySelector('#dustbinLng').value = bin.lng;
    form.querySelector('#dustbinStatus').value = bin.status;

    // Add bin ID to form for updating
    form.dataset.binId = binId;
    
    modal.classList.add('show');
}

function addNewDustbin() {
    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    form.reset();
    delete form.dataset.binId;
    modal.classList.add('show');
}

function handleDustbinSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const isEdit = !!form.dataset.binId;
    
    const dustbinData = {
        id: isEdit ? form.dataset.binId : Date.now().toString(),
        name: form.querySelector('#dustbinName').value,
        address: form.querySelector('#dustbinAddress').value,
        lat: parseFloat(form.querySelector('#dustbinLat').value),
        lng: parseFloat(form.querySelector('#dustbinLng').value),
        status: form.querySelector('#dustbinStatus').value,
        lastUpdated: new Date().toISOString()
    };

    // Get existing locations
    let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || API_CONFIG.DUMMY_LOCATIONS;

    if (isEdit) {
        // Update existing dustbin
        const index = locations.findIndex(b => b.id === dustbinData.id);
        if (index !== -1) {
            locations[index] = dustbinData;
        }
    } else {
        // Add new dustbin
        locations.push(dustbinData);
    }

    // Save updated locations
    saveDustbinsToStorage(locations);
    
    // Update API_CONFIG to reflect changes immediately
    API_CONFIG.DUMMY_LOCATIONS = locations;

    showNotification(`Dustbin ${isEdit ? 'updated' : 'added'} successfully`);
    document.getElementById('dustbinModal').classList.remove('show');
    loadDustbins();
    updateActiveBinsCount(); // Add this line before closing the modal
}

function confirmDeleteDustbin(binId) {
    const modal = createConfirmationModal(
        'Delete Dustbin',
        'Are you sure you want to delete this dustbin?',
        async () => {
            let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || API_CONFIG.DUMMY_LOCATIONS;
            const index = locations.findIndex(b => b.id === binId);
            
            if (index !== -1) {
                locations.splice(index, 1);
                saveDustbinsToStorage(locations);
                API_CONFIG.DUMMY_LOCATIONS = locations;
                showNotification('Dustbin deleted successfully');
                loadDustbins();
                updateActiveBinsCount(); // Add this line after deletion
            }
        }
    );
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function setupDustbinManagement() {
    const form = document.getElementById('dustbinForm');
    if (form) {
        form.addEventListener('submit', handleDustbinSubmit);
    }
}

// Add these functions after the existing dustbin management code
function saveDustbinsToStorage(dustbins) {
    localStorage.setItem('smartbin_locations', JSON.stringify(dustbins));
}

function handleDustbinSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const isEdit = !!form.dataset.binId;
    
    const dustbinData = {
        id: isEdit ? form.dataset.binId : Date.now().toString(),
        name: form.querySelector('#dustbinName').value,
        address: form.querySelector('#dustbinAddress').value,
        lat: parseFloat(form.querySelector('#dustbinLat').value),
        lng: parseFloat(form.querySelector('#dustbinLng').value),
        status: form.querySelector('#dustbinStatus').value
    };

    // Get existing locations or use default ones
    let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || API_CONFIG.DUMMY_LOCATIONS;

    if (isEdit) {
        // Update existing dustbin
        const index = locations.findIndex(b => b.id === dustbinData.id);
        if (index !== -1) {
            locations[index] = dustbinData;
        }
    } else {
        // Add new dustbin
        locations.push(dustbinData);
    }

    // Save updated locations
    saveDustbinsToStorage(locations);
    
    // Update API_CONFIG to reflect changes immediately
    API_CONFIG.DUMMY_LOCATIONS = locations;

    showNotification(`Dustbin ${isEdit ? 'updated' : 'added'} successfully`);
    document.getElementById('dustbinModal').classList.remove('show');
    loadDustbins();
    updateActiveBinsCount(); // Add this line before closing the modal
}

function confirmDeleteDustbin(binId) {
    const modal = createConfirmationModal(
        'Delete Dustbin',
        'Are you sure you want to delete this dustbin?',
        async () => {
            let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || API_CONFIG.DUMMY_LOCATIONS;
            const index = locations.findIndex(b => b.id === binId);
            
            if (index !== -1) {
                locations.splice(index, 1);
                saveDustbinsToStorage(locations);
                API_CONFIG.DUMMY_LOCATIONS = locations;
                showNotification('Dustbin deleted successfully');
                loadDustbins();
                updateActiveBinsCount(); // Add this line after deletion
            }
        }
    );
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Add this to the existing setupEventListeners function
function setupEventListeners() {
    // ...existing code...
    setupDustbinManagement();
}

// ...existing code...

// ...existing code...

async function viewUserDetails(userId) {
    try {
        const modal = document.getElementById('userDetailsModal');
        if (!modal) {
            console.error('User details modal not found');
            return;
        }

        // Show loading state
        modal.classList.add('show');
        document.querySelector('#userDetailsModal .user-name-large').textContent = 'Loading...';
        document.querySelector('#userDetailsModal .user-email').textContent = 'Loading...';
        document.querySelector('#userTotalPoints').textContent = '...';
        document.querySelector('#userRecycleCount').textContent = '...';
        document.querySelector('#userJoinDate').textContent = '...';
        document.querySelector('#userActivityTimeline').innerHTML = '<div class="loading-spinner"></div>';

        // Fetch user details
        const response = await fetch(`https://recyclebin1.onrender.com/api/admin/users/${userId}`);
        const userData = await response.json();

        if (!userData.success) {
            throw new Error(userData.message);
        }

        const user = userData.user;

        // Fetch user's transactions
        const txResponse = await fetch(`https://recyclebin1.onrender.com/api/admin/transactions?userId=${userId}`, {
            headers: getAdminHeaders()
        });
        const txData = await txResponse.json();

        // Update modal content
        document.querySelector('#userDetailsModal .user-avatar-large').textContent = user.name.charAt(0).toUpperCase();
        document.querySelector('#userDetailsModal .user-name-large').textContent = user.name;
        document.querySelector('#userDetailsModal .user-email').textContent = user.email;
        document.querySelector('#userTotalPoints').textContent = user.points || 0;
        document.querySelector('#userRecycleCount').textContent = txData.transactions?.filter(tx => tx.type === 'EARN').length || 0;
        document.querySelector('#userJoinDate').textContent = formatDate(user.createdAt);

        // Populate activity timeline
        const timeline = document.querySelector('#userActivityTimeline');
        if (txData.transactions && txData.transactions.length > 0) {
            timeline.innerHTML = txData.transactions.slice(0, 5).map(tx => `
                <div class="activity-item ${tx.type.toLowerCase()}">
                    <div class="activity-icon">
                        <i class="fas ${tx.type === 'EARN' ? 'fa-plus-circle' : 'fa-minus-circle'}"></i>
                    </div>
                    <div class="activity-details">
                        <span class="activity-type">${tx.type}</span>
                        <span class="activity-points">${tx.points} points</span>
                        <span class="activity-date">${formatDate(tx.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            timeline.innerHTML = '<p class="no-activity">No recent activity</p>';
        }

        // Set up close button
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
        };

        // Close on outside click
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        };

    } catch (error) {
        console.error('Error viewing user details:', error);
        showNotification('Error loading user details', 'error');
    }
}

// Add this CSS style injection for the new modal features
const style = document.createElement('style');
style.textContent = `
    .activity-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin: 8px 0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }

    .activity-item.earn {
        border-left: 3px solid #00ffa3;
    }

    .activity-item.redeem {
        border-left: 3px solid #ff6b6b;
    }

    .activity-icon {
        margin-right: 12px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
    }

    .activity-item.earn .activity-icon i {
        color: #00ffa3;
    }

    .activity-item.redeem .activity-icon i {
        color: #ff6b6b;
    }

    .activity-details {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .activity-type {
        font-weight: 600;
        color: #e6f4ff;
    }

    .activity-points {
        color: #00ffa3;
        font-size: 0.9em;
    }

    .activity-date {
        color: #8b9bb4;
        font-size: 0.8em;
    }

    .no-activity {
        text-align: center;
        color: #8b9bb4;
        padding: 20px;
    }

    .loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #00ffa3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

document.head.appendChild(style);

async function exportTransactions() {
    try {
        showNotification('Preparing transactions data for export...', 'info');
        
        // Fetch transactions data with admin token
        const response = await fetch('https://recyclebin1.onrender.com/api/admin/transactions', {
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        const data = await response.json();
        if (!data.transactions || !Array.isArray(data.transactions)) {
            throw new Error('Invalid data format received');
        }

        // Prepare CSV data
        const headers = ['Date', 'User', 'Type', 'Points', 'Code', 'Status'];
        const csvData = data.transactions.map(tx => [
            formatDate(tx.createdAt),
            tx.userId?.name || 'Unknown',
            tx.type,
            tx.type === 'EARN' ? `+${tx.points}` : `-${tx.points}`,
            tx.code || '-',
            tx.isUsed ? 'Used' : 'Active'
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_export_${formatDateForFilename(new Date())}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Transactions data exported successfully!');
    } catch (error) {
        console.error('Error exporting transactions:', error);
        showNotification('Failed to export transactions data', 'error');
    }
}

// ...existing code...

// Update loadSensorCodes function with better error handling
async function loadSensorCodes() {
    try {
        const tbody = document.getElementById('sensorCodesTableBody');
        if (!tbody) {
            console.error('Sensor codes table body element not found');
            return;
        }

        // Show loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-row">
                    <div class="loading-spinner"></div>
                    <span>Loading sensor codes...</span>
                </td>
            </tr>`;

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/sensor-codes');
        console.log('Response status:', response.status); // Debug log

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received sensor codes:', data); // Debug log

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch sensor codes');
        }

        tbody.innerHTML = data.codes.map(code => `
            <tr>
                <td data-label="Code">${code.code}</td>
                <td data-label="Sensor ID">${code.sensorId}</td>
                <td data-label="Created Date">${formatDate(code.createdAt)}</td>
                <td data-label="Status">
                    <span class="status-badge available">Available</span>
                </td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="viewSensorCodeQR('${code.code}')" class="action-btn view" title="View QR Code">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button onclick="confirmDeleteSensorCode('${code._id}')" class="action-btn delete" title="Delete Code">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="no-data">No sensor codes found</td></tr>';

    } catch (error) {
        console.error('Error loading sensor codes:', error);
        showNotification('Error loading sensor codes: ' + error.message, 'error');
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="error-row">
                        <i class="fas fa-exclamation-circle"></i>
                        Error loading sensor codes: ${error.message}
                    </td>
                </tr>`;
        }
    }
}

// Update setupEventListeners function
function setupEventListeners() {
    // ...existing code...
    
    // Add sensor code tab handling
    const codesTab = document.querySelector('[data-tab="codes"]');
    if (codesTab) {
        codesTab.addEventListener('click', () => {
            loadSensorCodes();
        });
    }

    // Load sensor codes immediately if we're on the codes tab
    if (window.location.hash === '#codes') {
        loadSensorCodes();
    }
}

// ...existing code...

async function generateSensorCode() {
    try {
        const sensorId = prompt('Enter Sensor ID:');
        if (!sensorId) {
            showNotification('Sensor ID is required', 'error');
            return;
        }

        showNotification('Generating sensor code...', 'info');

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/sensor-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...getAdminHeaders() // Include admin headers
            },
            body: JSON.stringify({ sensorId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate sensor code');
        }

        const data = await response.json();
        
        if (data.success && data.sensorCode) {
            showNotification('Sensor code generated successfully: ' + data.sensorCode.code, 'success');
            await loadSensorCodes(); // Reload the list
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error generating sensor code:', error);
        showNotification(error.message, 'error');
    }
}

async function confirmDeleteSensorCode(codeId) {
    const confirmed = confirm('Are you sure you want to delete this sensor code?');
    if (!confirmed) return;

    try {
        const response = await fetch(`https://recyclebin1.onrender.com/api/admin/sensor-codes/${codeId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            showNotification('Sensor code deleted successfully');
            loadSensorCodes(); // Reload the list
        } else {
            throw new Error(data.message || 'Failed to delete sensor code');
        }
    } catch (error) {
        console.error('Error deleting sensor code:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

function viewSensorCodeQR(code) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${code}`;
    
    const modalHtml = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Sensor Code QR</h2>
            <div class="qr-container">
                <img src="${qrUrl}" alt="QR Code" />
                <p class="code-text">${code}</p>
                <button onclick="downloadQR('${qrUrl}', '${code}')" class="action-btn">
                    <i class="fas fa-download"></i> Download QR
                </button>
            </div>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    };
}

async function downloadQR(url, code) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `sensor-code-${code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error downloading QR code:', error);
        showNotification('Error downloading QR code', 'error');
    }
}

// Add event listener for the codes tab
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    const codesTab = document.querySelector('[data-tab="codes"]');
    if (codesTab) {
        codesTab.addEventListener('click', loadSensorCodes);
    }
});

// ...existing code...

async function loadSensorCodes() {
    try {
        const response = await fetch('https://recyclebin1.onrender.com/api/admin/sensor-codes', {
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch sensor codes');

        const data = await response.json();
        const tbody = document.getElementById('sensorCodesTableBody');
        
        if (!tbody) return;

        if (!data.codes || data.codes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">No sensor codes found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.codes.map(code => `
            <tr>
                <td><span class="code-display">${code.code}</span></td>
                <td>${code.sensorId}</td>
                <td>${new Date(code.createdAt).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${code.used ? 'used' : 'available'}">
                        ${code.used ? 'Used' : 'Available'}
                    </span>
                </td>
                <td>
                    <button onclick="viewSensorCodeQR('${code.code}')" class="action-btn">
                        <i class="fas fa-qrcode"></i>
                    </button>
                    <button onclick="confirmDeleteSensorCode('${code._id}')" class="action-btn delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading sensor codes:', error);
        showNotification('Error loading sensor codes', 'error');
    }
}

// Add this new function for generating sensor codes
async function generateSensorCode() {
    try {
        const sensorId = prompt('Enter Sensor ID:');
        if (!sensorId) return;

        const response = await fetch('https://recyclebin1.onrender.com/api/admin/sensor-codes', {
            method: 'POST',
            headers: getAdminHeaders(),
            body: JSON.stringify({ sensorId })
        });

        if (!response.ok) throw new Error('Failed to generate sensor code');

        const data = await response.json();
        if (data.success) {
            showNotification('Sensor code generated successfully', 'success');
            await loadSensorCodes(); // Refresh the list
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error generating sensor code:', error);
        showNotification(error.message, 'error');
    }
}

function setupDustbinManagement() {
    const form = document.getElementById('dustbinForm');
    const modal = document.getElementById('dustbinModal');
    const cancelBtn = modal.querySelector('.cancel-btn');
    
    if (form) {
        form.addEventListener('submit', handleDustbinSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }
}

function handleDustbinSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const isEdit = !!form.dataset.binId;
    
    try {
        const dustbinData = {
            id: isEdit ? form.dataset.binId : Date.now().toString(),
            name: form.querySelector('#dustbinName').value,
            address: form.querySelector('#dustbinAddress').value,
            lat: parseFloat(form.querySelector('#dustbinLat').value),
            lng: parseFloat(form.querySelector('#dustbinLng').value),
            status: form.querySelector('#dustbinStatus').value,
            capacity: parseInt(form.querySelector('#dustbinCapacity').value),
            lastUpdated: new Date().toISOString()
        };

        // Validate coordinates
        if (isNaN(dustbinData.lat) || isNaN(dustbinData.lng)) {
            throw new Error('Invalid coordinates');
        }

        // Get existing locations
        let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];

        if (isEdit) {
            const index = locations.findIndex(b => b.id === dustbinData.id);
            if (index !== -1) {
                locations[index] = dustbinData;
            } else {
                throw new Error('Dustbin not found');
            }
        } else {
            locations.push(dustbinData);
        }

        // Save to localStorage
        localStorage.setItem('smartbin_locations', JSON.stringify(locations));

        // Update API_CONFIG to reflect changes immediately
        window.API_CONFIG.DUMMY_LOCATIONS = locations;

        // Dispatch custom event for real-time updates
        window.dispatchEvent(new CustomEvent('dustbinsUpdated', {
            detail: { locations }
        }));

        // Close modal and show success message
        document.getElementById('dustbinModal').classList.remove('show');
        showNotification(`Dustbin ${isEdit ? 'updated' : 'added'} successfully`);
        
        // Reload dustbins table
        loadDustbins();
        updateActiveBinsCount(); // Add this line before closing the modal

    } catch (error) {
        console.error('Error handling dustbin submit:', error);
        showNotification(error.message || 'Error saving dustbin', 'error');
    }
}

function addNewDustbin() {
    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    
    if (!modal || !form) {
        console.error('Modal or form elements not found');
        return;
    }

    // Reset form and remove any previous ID
    form.reset();
    delete form.dataset.binId;

    // Set default values if needed
    form.querySelector('#dustbinStatus').value = 'AVAILABLE';
    form.querySelector('#dustbinCapacity').value = '100';

    // Show modal
    modal.classList.add('show');
}

function editDustbin(binId) {
    const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
    const bin = locations.find(b => b.id === binId);
    
    if (!bin) {
        showNotification('Dustbin not found', 'error');
        return;
    }

    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    
    if (!modal || !form) {
        console.error('Modal or form elements not found');
        return;
    }

    // Populate form fields
    form.querySelector('#dustbinName').value = bin.name;
    form.querySelector('#dustbinAddress').value = bin.address;
    form.querySelector('#dustbinLat').value = bin.lat;
    form.querySelector('#dustbinLng').value = bin.lng;
    form.querySelector('#dustbinStatus').value = bin.status;
    form.querySelector('#dustbinCapacity').value = bin.capacity || 100;

    // Add bin ID to form for updating
    form.dataset.binId = binId;
    
    // Show modal
    modal.classList.add('show');
}

function confirmDeleteDustbin(binId) {
    const modal = createConfirmationModal(
        'Delete Dustbin',
        'Are you sure you want to delete this dustbin? This action cannot be undone.',
        async () => {
            try {
                let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
                const index = locations.findIndex(b => b.id === binId);
                
                if (index === -1) {
                    throw new Error('Dustbin not found');
                }

                // Remove the dustbin
                locations.splice(index, 1);
                
                // Save updated locations
                localStorage.setItem('smartbin_locations', JSON.stringify(locations));
                
                // Update API_CONFIG
                window.API_CONFIG.DUMMY_LOCATIONS = locations;

                // Dispatch update event
                window.dispatchEvent(new CustomEvent('dustbinsUpdated', {
                    detail: { locations }
                }));

                showNotification('Dustbin deleted successfully');
                loadDustbins();
                updateActiveBinsCount(); // Add this line after deletion

            } catch (error) {
                console.error('Error deleting dustbin:', error);
                showNotification(error.message || 'Error deleting dustbin', 'error');
            }
        }
    );
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function createConfirmationModal(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal confirmation-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="confirm-btn">Confirm</button>
            </div>
        </div>
    `;

    // Handle cancel
    const cancelBtn = modal.querySelector('.cancel-btn');
    cancelBtn.onclick = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    };

    // Handle confirm
    const confirmBtn = modal.querySelector('.confirm-btn');
    confirmBtn.onclick = async () => {
        await onConfirm();
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    };

    return modal;
}

// Update loadDustbins function
async function loadDustbins() {
    try {
        const tbody = document.getElementById('dustbinsTableBody');
        if (!tbody) {
            console.error('Dustbins table body element not found');
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="loading-spinner"></div>
                    <span>Loading dustbins...</span>
                </td>
            </tr>`;

        // Get locations from localStorage
        const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
        
        if (locations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">No dustbins found</td>
                </tr>`;
            return;
        }

        tbody.innerHTML = locations.map(bin => `
            <tr>
                <td data-label="ID">${bin.id}</td>
                <td data-label="Name">${bin.name}</td>
                <td data-label="Location">${bin.address}</td>
                <td data-label="Status">
                    <span class="status-badge ${bin.status.toLowerCase()}">
                        ${bin.status}
                    </span>
                </td>
                <td data-label="Last Updated">${formatDate(bin.lastUpdated || new Date())}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="editDustbin('${bin.id}')" class="action-btn edit" title="Edit Dustbin">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteDustbin('${bin.id}')" class="action-btn delete" title="Delete Dustbin">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading dustbins:', error);
        showNotification('Error loading dustbins', 'error');
    }
}

// ...existing code...

function closeDustbinModal() {
    const modal = document.getElementById('dustbinModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function setupDustbinManagement() {
    const modal = document.getElementById('dustbinModal');
    const closeBtn = modal.querySelector('.close');
    
    // Close modal when clicking X button
    if (closeBtn) {
        closeBtn.onclick = closeDustbinModal;
    }

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            closeDustbinModal();
        }
    };
}

function addNewDustbin() {
    const modal = document.getElementById('dustbinModal');
    const form = document.getElementById('dustbinForm');
    
    if (!modal || !form) {
        console.error('Modal or form elements not found');
        return;
    }

    // Reset form and remove any previous ID
    form.reset();
    delete form.dataset.binId;

    // Set default values
    form.querySelector('#dustbinStatus').value = 'AVAILABLE';
    form.querySelector('#dustbinLat').value = '19.0760';
    form.querySelector('#dustbinLng').value = '72.8777';

    // Show modal
    modal.classList.add('show');
}

function editDustbin(binId) {
    try {
        const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
        const bin = locations.find(b => b.id === binId);
        
        if (!bin) {
            showNotification('Dustbin not found', 'error');
            return;
        }

        const modal = document.getElementById('dustbinModal');
        const form = document.getElementById('dustbinForm');
        
        if (!modal || !form) {
            throw new Error('Modal or form elements not found');
        }

        // Populate form fields
        form.querySelector('#dustbinName').value = bin.name;
        form.querySelector('#dustbinAddress').value = bin.address;
        form.querySelector('#dustbinLat').value = bin.lat;
        form.querySelector('#dustbinLng').value = bin.lng;
        form.querySelector('#dustbinStatus').value = bin.status;

        // Add bin ID to form for updating
        form.dataset.binId = binId;
        
        // Show modal
        modal.classList.add('show');
    } catch (error) {
        console.error('Error editing dustbin:', error);
        showNotification('Error loading dustbin data', 'error');
    }
}

function handleDustbinSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const isEdit = !!form.dataset.binId;
        
        const dustbinData = {
            id: isEdit ? form.dataset.binId : Date.now().toString(),
            name: form.querySelector('#dustbinName').value.trim(),
            address: form.querySelector('#dustbinAddress').value.trim(),
            lat: parseFloat(form.querySelector('#dustbinLat').value),
            lng: parseFloat(form.querySelector('#dustbinLng').value),
            status: form.querySelector('#dustbinStatus').value,
            lastUpdated: new Date().toISOString()
        };

        // Validate data
        if (!dustbinData.name || !dustbinData.address) {
            throw new Error('Please fill in all required fields');
        }

        if (isNaN(dustbinData.lat) || isNaN(dustbinData.lng)) {
            throw new Error('Invalid coordinates');
        }

        // Get existing locations
        let locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];

        if (isEdit) {
            const index = locations.findIndex(b => b.id === dustbinData.id);
            if (index !== -1) {
                locations[index] = dustbinData;
            } else {
                throw new Error('Dustbin not found');
            }
        } else {
            locations.push(dustbinData);
        }

        // Save to localStorage
        localStorage.setItem('smartbin_locations', JSON.stringify(locations));

        // Update global config
        window.API_CONFIG.DUMMY_LOCATIONS = locations;

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('dustbinsUpdated', {
            detail: { locations }
        }));

        // Close modal and show success message
        closeDustbinModal();
        showNotification(`Dustbin ${isEdit ? 'updated' : 'added'} successfully`);
        
        // Reload dustbin list
        loadDustbins();
        updateActiveBinsCount(); // Add this line before closing the modal

    } catch (error) {
        console.error('Error saving dustbin:', error);
        showNotification(error.message || 'Error saving dustbin', 'error');
    }
}

function loadDustbins() {
    try {
        const tbody = document.getElementById('dustbinsTableBody');
        if (!tbody) {
            throw new Error('Dustbins table body element not found');
        }

        // Show loading state
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="loading-spinner"></div></tr>';

        // Get locations from localStorage
        const locations = JSON.parse(localStorage.getItem('smartbin_locations')) || [];
        
        if (locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No dustbins found</td></tr>';
            return;
        }

        // Update table with dustbin data
        tbody.innerHTML = locations.map(bin => `
            <tr>
                <td data-label="ID">${bin.id}</td>
                <td data-label="Name">${bin.name}</td>
                <td data-label="Location">${bin.address}</td>
                <td data-label="Status">
                    <span class="status-badge ${bin.status.toLowerCase()}">
                        ${bin.status}
                    </span>
                </td>
                <td data-label="Last Updated">${formatDate(bin.lastUpdated || new Date())}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button onclick="editDustbin('${bin.id}')" class="action-btn edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteDustbin('${bin.id}')" class="action-btn delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading dustbins:', error);
        showNotification('Error loading dustbins', 'error');
    }
}

// ...existing code...

window.addEventListener('dustbinsUpdated', (event) => {
    const locations = event.detail.locations;
    const activeBins = locations.filter(bin => bin.status === 'AVAILABLE').length;
    const totalBins = locations.length;
    
    animateCounterUpdate('activeSensors', activeBins, 1000);
    document.querySelector('#activeSensors + .stat-change').textContent = 
        `${activeBins}/${totalBins} active now`;
});

// ...existing code...
