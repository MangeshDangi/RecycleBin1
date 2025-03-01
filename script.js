const getApiUrl = (endpoint) => {
    if (typeof API_CONFIG === 'undefined') {
        console.warn('API_CONFIG not found, using default URL');
        return `http://localhost:3000${endpoint}`;
    }
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};

function initSlider() { 
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return; // Add this check
    
    let currentSlide = 0;
    slides[0].classList.add('active');

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    setInterval(nextSlide, 5000);
}

// Modify the initialization of userPoints
let userPoints = 0;

// Add this function to initialize points on page load
function initializeUserPoints() {
    const user = getCurrentUser();
    if (user && user.points !== undefined) {
        userPoints = user.points;
        updatePointsDisplay();
    }
}

// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize slider if we're on the index page
    if (document.querySelector('.slide')) {
        initSlider();
    }
    initializeUserPoints(); // Add this line
    updateEcoStats(); // Add this line

    // Update mobile menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Toggle body scroll
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            // Toggle menu icon
            const icon = menuToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
                const icon = menuToggle.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            });
        });
    }

    // Initialize transaction history tabs
    const historyTabs = document.querySelectorAll('.tab-btn');
    if (historyTabs) {
        historyTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                historyTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadTransactionHistory(tab.dataset.tab);
            });
        });
    }

    // Load initial transaction history
    loadTransactionHistory();
});

// ------------------------------ //
//   SUBMIT CODE FUNCTION         //
// ------------------------------ //
async function submitCode() {
    try {
        const codeInput = document.getElementById('codeInput');
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter a code', 'error');
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            showNotification('Please log in first', 'error');
            return;
        }

        // Disable the submit button and show loading state
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        showNotification('Processing code...', 'info');

        const response = await fetch('http://localhost:3000/api/submit-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                userId: user.id
            })
        });

        const data = await response.json();
        console.log('Submit code response:', data);

        // Re-enable the submit button
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit code');
        }

        if (data.success) {
            // Update points display
            const pointsDisplay = document.getElementById('pointsBalance');
            if (pointsDisplay) {
                animatePoints(parseInt(pointsDisplay.textContent) || 0, data.newTotal, pointsDisplay);
            }
            
            // Show success animation
            showPointsAnimation(data.points);
            
            // Clear input
            codeInput.value = '';
            
            // Show success message
            showNotification(data.message, 'success');

            // Update stored user data
            const currentUser = getCurrentUser();
            if (currentUser) {
                currentUser.points = data.newTotal;
                setCurrentUser(currentUser);
            }

            // Update UI elements
            await updateEcoStats();
            await loadTransactionHistory();
            await updatePlatformStats();
            updateUserTier(data.newTotal);
        } else {
            showNotification(data.message || 'Invalid code', 'error');
        }
    } catch (error) {
        console.error('Error submitting code:', error);
        showNotification(error.message || 'Error processing code', 'error');
        
        // Re-enable the submit button on error
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
}

function showPointsAnimation(points) {
    const animation = document.createElement('div');
    animation.className = 'points-animation';
    animation.textContent = `+${points}`;
    document.body.appendChild(animation);

    // Trigger animation
    setTimeout(() => {
        animation.classList.add('show');
        setTimeout(() => {
            animation.classList.remove('show');
            setTimeout(() => animation.remove(), 300);
        }, 1500);
    }, 10);
}

function updatePointsDisplay(newTotal) {
    const pointsDisplay = document.getElementById('userPoints');
    if (pointsDisplay) {
        const oldPoints = parseInt(pointsDisplay.textContent) || 0;
        animatePoints(oldPoints, newTotal, pointsDisplay);
    }
}

function animatePoints(start, end, element) {
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Add this CSS for the points animation
const style = document.createElement('style');
style.textContent = `
    .points-animation {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.5);
        color: #00ffa3;
        font-size: 4em;
        font-weight: bold;
        opacity: 0;
        z-index: 1000;
        text-shadow: 0 0 10px rgba(0, 255, 163, 0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .points-animation.show {
        transform: translate(-50%, -100%) scale(1);
        opacity: 1;
    }
`;
document.head.appendChild(style);

// ------------------------------ //
//   REDEEM REWARDS FUNCTION      //
// ------------------------------ //
async function redeemReward(points) {
    if (userPoints < points) {
        alert('Not enough points!');
        return;
    }

    try {
        const response = await fetch('/api/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points })
        });

        const data = await response.json();
        if (data.success) {
            userPoints -= points;
            updatePointsDisplay();
            alert('Reward redeemed successfully!');
        }
    } catch (error) {
        alert('Error redeeming reward');
    }
}

function updatePointsDisplay() {
    const pointsElement = document.getElementById('pointsBalance');
    pointsElement.classList.add('animate__animated', 'animate__bounceIn');
    pointsElement.textContent = userPoints;
    
    setTimeout(() => {
        pointsElement.classList.remove('animate__animated', 'animate__bounceIn');
    }, 1000);
}

// ------------------------------ //
//   SESSION MANAGEMENT           //
// ------------------------------ //
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

// Add this function after the session management section
async function fetchUserData(userId) {
    try {
        // Add validation for admin user
        if (userId === 'admin1') {
            const adminUser = getCurrentUser();
            if (adminUser) {
                userPoints = adminUser.points || 0;
                updatePointsDisplay();
                return;
            }
        }

        const response = await fetch(`${getApiUrl('USER_DATA')}/${userId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('User data received:', data); // Debug log

        if (data.success) {
            userPoints = data.user.points;
            updatePointsDisplay();
            updateUserTier(data.user.points);
        } else {
            throw new Error(data.message || 'Failed to fetch user data');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Don't show error for admin user
        if (userId !== 'admin1') {
            showNotification('Error updating points. Please try again later.', 'error');
        }
    }
}

// Modify the checkLoginState function to include points update
function checkLoginState() {
    const user = getCurrentUser();
    const loginBtn = document.getElementById('loginBtn');
    const adminLink = document.querySelector('.admin-link');
    const dashboardLink = document.querySelector('a[href="dashboard.html"]');

    if (user) {
        // User is logged in
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = handleLogout;
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
        }
        
        // Show admin link if user is admin
        if (adminLink) {
            adminLink.style.display = user.isAdmin ? 'block' : 'none';
        }

        // Update header if exists
        const userGreeting = document.querySelector('.nav-container h2');
        if (userGreeting) {
            userGreeting.textContent = `Welcome, ${user.name}`;
        }
        
        // Initialize points from stored user data first
        userPoints = user.points || 0;
        updatePointsDisplay();
        
        // Then fetch latest data from server
        fetchUserData(user.id);
    } else {
        // User is logged out
        loginBtn.textContent = 'Login';
        loginBtn.onclick = () => modal.classList.add('show');
        if (dashboardLink) {
            dashboardLink.style.display = 'none';
        }
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// Add admin authentication middleware
function requireAdmin() {
    const user = getCurrentUser();
    if (!user || !user.isAdmin) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ------------------------------ //
//   LOGIN & SIGNUP FUNCTION      //
// ------------------------------ //

// Modal handling
let modal;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modal
    modal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close');
    
    if (modal && loginBtn && closeBtn) {
        // Setup modal triggers
        loginBtn.addEventListener('click', () => {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            switchForm('login');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    // Initialize other components
    if (document.querySelector('.slide')) {
        initSlider();
    }
    initializeUserPoints();
    checkLoginState();
});

window.onclick = (event) => {
    if (event.target === modal) {
        modal.classList.remove('show');
    }
}

// Remove the tab-related event listeners and simplify form switching
function switchForm(formType) {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => form.classList.remove('active'));
    document.getElementById(`${formType}Form`).classList.add('active');
}

async function handleLogin() {
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.querySelector('#loginForm .auth-error');

        if (!email || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }

        console.log('Attempting login with:', { email }); // Debug log

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            mode: 'cors',
            credentials: 'include'
        });

        console.log('Response status:', response.status); // Debug log

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Login response:', data); // Debug log
        
        if (!data.success) {
            errorDiv.textContent = data.message || 'Login failed';
            return;
        }

        // Store user data and update UI
        setCurrentUser(data.user);
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Clear error message if successful
        errorDiv.textContent = '';
        
        // Update points and UI without page reload
        userPoints = data.user.points || 0;
        updatePointsDisplay();
        checkLoginState();

    } catch (error) {
        console.error('Login error:', error);
        const errorDiv = document.querySelector('#loginForm .auth-error');
        errorDiv.textContent = 'Connection error. Please make sure the server is running.';
    }
}

async function handleSignup() {
    try {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.querySelector('#signupForm .auth-error');

        if (!name || !email || !password || !confirmPassword) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SIGNUP}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            errorDiv.textContent = data.message || 'Signup failed';
            return;
        }

        // Success - switch to login form
        alert('Account created successfully! Please login.');
        switchForm('login');
        document.getElementById('loginEmail').value = email;

    } catch (error) {
        console.error('Signup error:', error);
        const errorDiv = document.querySelector('#signupForm .auth-error');
        errorDiv.textContent = 'Connection error. Please try again.';
    }
}

// Add new functions for auth state management
async function handleLogout() {
    try {
        clearCurrentUser();
        location.reload();
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Add this to ensure checkLoginState runs on page load
window.addEventListener('load', () => {
    checkLoginState();
    const user = getCurrentUser();
    if (!user) {
        setTimeout(() => {
            modal.classList.add('show');
        }, 1000);
    }
});

// ------------------------------ //
//   MODAL & UI EVENTS            //
// ------------------------------ //

// Initialize modal and event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.slide')) {
        initSlider(); // Initialize slider
    }
    initializeUserPoints(); // Add this line
    
    const modal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close');
    
    if (modal && loginBtn && closeBtn) {
        // Setup modal triggers
        loginBtn.addEventListener('click', () => {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            // Always show login form first
            switchForm('login');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Enable scrolling
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    // Check login state
    checkLoginState();
    const user = getCurrentUser();
    if (!user && modal) {
        setTimeout(() => {
            modal.classList.add('show');
            switchForm('login');
        }, 1000);
    }
});

//-------------------------------------------//
//   MAP INITIALIZE AND RESIZE FUNCTION      //
//-------------------------------------------//

let map;
let markers = [];

// Update the fetchDustbinLocations function in script.js
async function fetchDustbinLocations() {
    try {
        // First try to get locations from localStorage
        const storedLocations = localStorage.getItem('smartbin_locations');
        if (storedLocations) {
            return JSON.parse(storedLocations);
        }
        
        // If no stored locations, use dummy data and store it
        const defaultLocations = API_CONFIG.DUMMY_LOCATIONS;
        localStorage.setItem('smartbin_locations', JSON.stringify(defaultLocations));
        return defaultLocations;
    } catch (error) {
        console.error('Error fetching dustbin locations:', error);
        return [];
    }
}

// Update the map marker style
function createCustomMarker(location) {
    const statusColors = {
        AVAILABLE: '#00ffa3',
        FULL: '#ff4757',
        MAINTENANCE: '#ffa502'
    };

    const markerHtml = `
        <div class="custom-marker ${location.status.toLowerCase()}">
            <i class="fas fa-recycle"></i>
        </div>
    `;

    return L.divIcon({
        html: markerHtml,
        className: 'custom-marker-container',
        iconSize: [40, 40]
    });
}

function updateDustbinList(locations) {
    const dustbinList = document.querySelector('.dustbin-list');
    if (!dustbinList) return;

    dustbinList.innerHTML = locations.map(location => `
        <li class="dustbin-item" data-id="${location.id}">
            <i class="fas fa-recycle"></i>
            <div class="dustbin-info">
                <div class="dustbin-name">${location.name}</div>
                <div class="dustbin-address">${location.address}</div>
                <div class="dustbin-status ${location.status.toLowerCase()}">
                    Status: ${location.status}
                </div>
            </div>
        </li>
    `).join('');

    // Add click event to center map on selected location
    dustbinList.querySelectorAll('.dustbin-item').forEach(item => {
        item.addEventListener('click', () => {
            const location = locations.find(loc => loc.id === item.dataset.id);
            if (location) {
                map.setView([location.lat, location.lng], 16);
            }
        });
    });
}

function initializeMap(locations) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Create markers for each location
    locations.forEach(location => {
        const marker = L.marker([location.lat, location.lng], {
            icon: createCustomMarker(location)
        })
            .addTo(map)
            .bindPopup(`
                <div class="map-popup">
                    <h3>${location.name}</h3>
                    <p>${location.address}</p>
                    <div class="status ${location.status.toLowerCase()}">
                        Status: ${location.status}
                    </div>
                </div>
            `);
        markers.push(marker);
    });

    // Fit map to show all markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

async function updateLocations() {
    const locations = await fetchDustbinLocations();
    updateDustbinList(locations);
    initializeMap(locations);
}

// Update the existing map initialization
document.addEventListener("DOMContentLoaded", async function () {
    map = L.map('map').setView([19.0760, 72.8777], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Get user's location
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 15);
        });
    }

    // Initial load of locations
    await updateLocations();

    // Update locations every 5 minutes
    setInterval(updateLocations, 300000);
});

window.addEventListener('resize', () => {
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
});

// Add notification functionality
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add styles if they don't exist
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 8px;
                background: rgba(10, 17, 40, 0.9);
                color: #fff;
                font-size: 14px;
                z-index: 10000;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .notification.success {
                border-left: 4px solid #00ffa3;
            }
            
            .notification.error {
                border-left: 4px solid #ff4757;
            }
            
            .notification.info {
                border-left: 4px solid #00d4ff;
            }
            
            .notification.show {
                transform: translateX(0);
            }
        `;
        document.head.appendChild(style);
    }

    // Add to DOM
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add this function to calculate trees saved based on recycling points
function calculateTreesSaved(points) {
    // Each 100 points = 1 tree saved
    const trees = points / 100;
    return trees >= 1000 ? (trees/1000).toFixed(1) + 'K' : Math.floor(trees);
}

// Add this function to update eco stats
async function updateEcoStats() {
    try {
        const response = await fetch('http://localhost:3000/api/eco-stats');
        const data = await response.json();
        
        if (data.success) {
            const treeSavedElement = document.getElementById('treeSavedCount');
            if (treeSavedElement) {
                const currentValue = parseFloat(treeSavedElement.textContent.replace('K', '')) || 0;
                const treeCount = data.totalPoints / 100; // Calculate trees saved
                
                animateTreeCount(currentValue, treeCount, treeSavedElement);
            }
        }
    } catch (error) {
        console.error('Error updating eco stats:', error);
    }
}

// Add new function to animate tree count
function animateTreeCount(start, end, element) {
    const duration = 2000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = start + (end - start) * progress;
        const displayValue = current >= 1000 ? 
            (current/1000).toFixed(1) + 'K' : 
            Math.floor(current);
            
        element.textContent = displayValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Update the calculateTreesSaved function
function calculateTreesSaved(points) {
    // Each 100 points = 1 tree saved
    const trees = points / 100;
    return trees >= 1000 ? (trees/1000).toFixed(1) + 'K' : Math.floor(trees);
}

// Update the updateEcoStats function
async function updateEcoStats() {
    try {
        const response = await fetch('http://localhost:3000/api/eco-stats');
        const data = await response.json();
        
        if (data.success) {
            const treeSavedElement = document.getElementById('treeSavedCount');
            if (treeSavedElement) {
                const currentValue = parseFloat(treeSavedElement.textContent.replace('K', '')) || 0;
                const treeCount = data.totalPoints / 100; // Calculate trees saved
                
                animateTreeCount(currentValue, treeCount, treeSavedElement);
            }
        }
    } catch (error) {
        console.error('Error updating eco stats:', error);
    }
}

// Add new function to animate tree count
function animateTreeCount(start, end, element) {
    const duration = 2000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = start + (end - start) * progress;
        const displayValue = current >= 1000 ? 
            (current/1000).toFixed(1) + 'K' : 
            Math.floor(current);
            
        element.textContent = displayValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Update submitCode to refresh eco stats after successful submission
async function submitCode() {
    try {
        const codeInput = document.getElementById('codeInput');
        const code = codeInput.value.trim();
        
        if (!code) {
            showNotification('Please enter a code', 'error');
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            showNotification('Please log in first', 'error');
            return;
        }

        // Disable the submit button and show loading state
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        showNotification('Processing code...', 'info');

        const response = await fetch('http://localhost:3000/api/submit-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                userId: user.id
            })
        });

        const data = await response.json();
        console.log('Submit code response:', data);

        // Re-enable the submit button
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit code');
        }

        if (data.success) {
            // Update points display
            const pointsDisplay = document.getElementById('pointsBalance');
            if (pointsDisplay) {
                animatePoints(parseInt(pointsDisplay.textContent) || 0, data.newTotal, pointsDisplay);
            }
            
            // Show success animation
            showPointsAnimation(data.points);
            
            // Clear input
            codeInput.value = '';
            
            // Show success message
            showNotification(data.message, 'success');

            // Update stored user data
            const currentUser = getCurrentUser();
            if (currentUser) {
                currentUser.points = data.newTotal;
                setCurrentUser(currentUser);
            }

            // Update UI elements
            await updateEcoStats();
            await loadTransactionHistory();
            await updatePlatformStats();
            updateUserTier(data.newTotal);
        } else {
            showNotification(data.message || 'Invalid code', 'error');
        }
    } catch (error) {
        console.error('Error submitting code:', error);
        showNotification(error.message || 'Error processing code', 'error');
        
        // Re-enable the submit button on error
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
}

// Update the DOMContentLoaded event to initialize eco stats
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    updateEcoStats(); // Add this line
    // ...existing code...
});

// Add function to handle tier updates
function updateUserTier(points) {
    const tierElement = document.getElementById('userTier');
    if (!tierElement) return;

    let tier = 'Bronze';
    if (points >= 5000) tier = 'Elite';
    else if (points >= 2500) tier = 'Gold';
    else if (points >= 1000) tier = 'Silver';

    const tierColors = {
        'Elite': '#00ffa3',
        'Gold': '#ffd700',
        'Silver': '#c0c0c0',
        'Bronze': '#cd7f32'
    };

    tierElement.textContent = tier;
    tierElement.style.color = tierColors[tier];
    
    // Update tier icon
    const tierIcon = document.querySelector('.tier-icon');
    if (tierIcon) {
        tierIcon.className = `tier-icon ${tier.toLowerCase()}`;
    }

    // Add animation
    tierElement.classList.add('tier-update');
    setTimeout(() => tierElement.classList.remove('tier-update'), 1000);
}

// Add CSS styles for tiers
const tierStyles = document.createElement('style');
tierStyles.textContent = `
    .tier-update {
        animation: tierPulse 1s ease;
    }

    @keyframes tierPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }

    .tier-icon {
        margin-right: 8px;
        font-size: 1.2em;
    }

    .tier-icon.elite { color: #00ffa3; }
    .tier-icon.gold { color: #ffd700; }
    .tier-icon.silver { color: #c0c0c0; }
    .tier-icon.bronze { color: #cd7f32; }
`;
document.head.appendChild(tierStyles);

// Add Transaction History Functions
async function loadTransactionHistory(filter = 'all') {
    const user = getCurrentUser();
    if (!user) return;

    const transactionList = document.getElementById('transactionList');
    if (!transactionList) return;

    transactionList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`http://localhost:3000/api/transactions/${user.id}?filter=${filter}`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to fetch transactions');

        const data = await response.json();
        
        if (data.success) {
            if (data.transactions.length === 0) {
                transactionList.innerHTML = `
                    <div class="no-transactions">
                        <p>No transactions found</p>
                    </div>
                `;
                return;
            }

            transactionList.innerHTML = data.transactions
                .map(tx => `
                    <div class="transaction-item ${tx.type.toLowerCase()}">
                        <div class="transaction-icon">
                            <i class="fas ${tx.type === 'EARN' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-title">
                                ${tx.type === 'EARN' ? 'Points Earned' : 'Points Redeemed'}
                            </div>
                            <div class="transaction-date">
                                ${formatDate(tx.createdAt)}
                            </div>
                        </div>
                        <div class="transaction-points">
                            ${tx.type === 'EARN' ? '+' : '-'}${tx.points}
                        </div>
                    </div>
                `)
                .join('');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionList.innerHTML = `
            <div class="error-message">
                Failed to load transactions
            </div>
        `;
    }
}

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Add function to animate number counting
function animateCounter(element, start, end, duration = 2000) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current.toLocaleString() + '+';
        
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Add function to load and update platform stats
async function updatePlatformStats() {
    try {
        const response = await fetch('http://localhost:3000/api/platform-stats');
        const data = await response.json();
        
        if (data.success) {
            const statsContainer = document.querySelector('.about-stats');
            if (!statsContainer) return;

            // Update users count
            const usersElement = statsContainer.querySelector('.counter:nth-child(1)');
            if (usersElement) {
                const currentUsers = parseInt(usersElement.textContent) || 0;
                animateCounter(usersElement, currentUsers, data.stats.activeUsers);
            }

            // Update smart bins count
            const binsElement = statsContainer.querySelector('.counter:nth-child(2)');
            if (binsElement) {
                const currentBins = parseInt(binsElement.textContent) || 0;
                animateCounter(binsElement, currentBins, data.stats.smartBins);
            }

            // Update recycled waste
            const wasteElement = statsContainer.querySelector('.counter:nth-child(3)');
            if (wasteElement) {
                const currentWaste = parseInt(wasteElement.textContent) || 0;
                animateCounter(wasteElement, currentWaste, data.stats.wasteRecycled);
            }
        }
    } catch (error) {
        console.error('Error updating platform stats:', error);
    }
}

// Add intersection observer to trigger animation when stats are visible
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    const statsSection = document.querySelector('.about-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updatePlatformStats();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }
});
