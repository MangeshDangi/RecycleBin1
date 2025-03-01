// Remove duplicate userPoints declaration and update initialization
window.userPoints = 0; // Use window to share between files

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

async function fetchUserPoints() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        console.log('Fetching points for user:', user.id); // Debug log
        const response = await fetch(`https://recyclebin1.onrender.com/api/user-data/${user.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received user data:', data); // Debug log

        if (data.success) {
            userPoints = data.user.points;
            
            // Update UI with new points
            const pointsElement = document.getElementById('userPoints');
            if (pointsElement) {
                pointsElement.textContent = userPoints;
                pointsElement.classList.add('points-update');
                setTimeout(() => pointsElement.classList.remove('points-update'), 500);
            }

            // Update reward buttons state
            updateRewardButtonStates();
        } else {
            throw new Error(data.message || 'Failed to fetch points');
        }
    } catch (error) {
        console.error('Error fetching points:', error);
        showNotification('Error loading points: ' + error.message, 'error');
    }
}

function updatePointsDisplay() {
    const pointsElement = document.getElementById('userPoints');
    if (pointsElement) {
        pointsElement.textContent = userPoints.toLocaleString();
        pointsElement.classList.add('points-update');
        setTimeout(() => pointsElement.classList.remove('points-update'), 500);
    }
}

function updateRewardButtonStates() {
    document.querySelectorAll('.reward-item button').forEach(button => {
        const requiredPoints = parseInt(button.getAttribute('data-points'));
        button.disabled = userPoints < requiredPoints;
        
        // Update button appearance
        if (userPoints < requiredPoints) {
            button.classList.add('disabled');
            button.title = `Need ${requiredPoints - userPoints} more points`;
        } else {
            button.classList.remove('disabled');
            button.title = 'Click to redeem';
        }
    });
}

// Set up auto-refresh of points
function setupPointsRefresh() {
    fetchUserPoints(); // Initial fetch
    setInterval(fetchUserPoints, 30000); // Refresh every 30 seconds
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    setupPointsRefresh();
    updateLoginButton();
});

function updateLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        };
    }
}

// Show notification function
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

// ...existing code for redeemReward and other functions...

async function redeemReward(points, rewardType) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login first!');
        window.location.href = 'index.html';
        return;
    }

    if (userPoints < points) {
        alert('Not enough points to redeem this reward.');
        return;
    }

    try {
        const response = await fetch('https://recyclebin1.onrender.com/api/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                points: points,
                rewardType: rewardType
            })
        });

        const data = await response.json();
        if (data.success) {
            userPoints = data.newBalance;
            updatePointsDisplay();
            showRedemptionSuccess(data.code, rewardType, data.expiresAt);
            
            // Update user in localStorage
            user.points = data.newBalance;
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            throw new Error(data.message || 'Redemption failed');
        }
    } catch (error) {
        console.error('Error redeeming reward:', error);
        showNotification(error.message || 'Error processing redemption', 'error');
    }
}

function showRedemptionSuccess(code, rewardType, expiresAt) {
    const expiryDate = new Date(expiresAt).toLocaleDateString();
    const modal = document.createElement('div');
    modal.className = 'modal redemption-success';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Redemption Successful!</h2>
            <div class="code-display">
                <p>Your ${rewardType} code:</p>
                <div class="code">${code}</div>
                <button onclick="copyCode('${code}')" class="copy-btn">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <p class="expiry">Valid until: ${expiryDate}</p>
            <p class="note">Please save this code. You won't be able to see it again.</p>
            <button onclick="closeModal(this)" class="close-btn">Close</button>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// ...existing code...
