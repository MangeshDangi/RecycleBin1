const getApiUrl = (endpoint) => {
    if (typeof API_CONFIG === 'undefined') {
        console.warn('API_CONFIG not found, using default URL');
        return `https://recyclebin1.onrender.com${endpoint}`;
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

        const response = await fetch('https://recyclebin1.onrender.com/api/submit-code', {
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

// Character limits for various fields
const VALIDATION_LIMITS = {
    name: { min: 2, max: 50 },
    email: { min: 5, max: 100 },
    password: { min: 6, max: 50 }
};

// Validation helper functions
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePassword(password) {
    // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return regex.test(password);
}

function validateName(name) {
    // Allow letters, spaces, and hyphens, minimum 2 characters
    const regex = /^[A-Za-z\s-]{2,}$/;
    return regex.test(name);
}

function showValidationError(inputElement, message) {
    const errorDiv = inputElement.parentElement.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    inputElement.classList.add('error');
}

function clearValidationError(inputElement) {
    const errorDiv = inputElement.parentElement.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    inputElement.classList.remove('error');
}

// Update validation rules
const VALIDATION_RULES = {
    password: {
        minLength: 8,
        maxLength: 50,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true
    }
};

function validatePasswordStrength(password) {
    const result = {
        isValid: false,
        errors: [],
        strength: 'weak'
    };

    if (password.length < VALIDATION_RULES.password.minLength) {
        result.errors.push(`Password must be at least ${VALIDATION_RULES.password.minLength} characters`);
    }
    if (password.length > VALIDATION_RULES.password.maxLength) {
        result.errors.push(`Password must be less than ${VALIDATION_RULES.password.maxLength} characters`);
    }
    if (!/[A-Z]/.test(password)) {
        result.errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        result.errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        result.errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        result.errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    // Calculate password strength
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;

    switch (true) {
        case (strength >= 6):
            result.strength = 'strong';
            break;
        case (strength >= 4):
            result.strength = 'medium';
            break;
        default:
            result.strength = 'weak';
    }

    result.isValid = result.errors.length === 0;
    return result;
}

// Add this to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    
    if (passwordInput) {
        passwordInput.parentElement.appendChild(strengthIndicator);
        
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const validation = validatePasswordStrength(password);
            const errorDiv = passwordInput.parentElement.querySelector('.field-error');
            
            // Update password strength indicator
            strengthIndicator.className = `password-strength ${validation.strength}`;
            
            // Show first error if any
            if (validation.errors.length > 0) {
                errorDiv.textContent = validation.errors[0];
                errorDiv.style.display = 'block';
                passwordInput.classList.add('invalid');
            } else {
                errorDiv.style.display = 'none';
                passwordInput.classList.remove('invalid');
            }

            // Enforce max length
            if (password.length > VALIDATION_RULES.password.maxLength) {
                e.target.value = password.slice(0, VALIDATION_RULES.password.maxLength);
            }
        });

        // Add password requirements tooltip
        const requirementsTooltip = document.createElement('div');
        requirementsTooltip.className = 'password-requirements';
        requirementsTooltip.innerHTML = `
            Password must:
            <ul>
                <li>Be 8-50 characters long</li>
                <li>Contain at least one uppercase letter</li>
                <li>Contain at least one lowercase letter</li>
                <li>Contain at least one number</li>
                <li>Contain at least one special character (!@#$%^&*)</li>
            </ul>
        `;
        passwordInput.parentElement.appendChild(requirementsTooltip);
    }

    // Update confirm password validation
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', (e) => {
            const errorDiv = confirmPasswordInput.parentElement.querySelector('.field-error');
            if (e.target.value !== passwordInput.value) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                confirmPasswordInput.classList.add('invalid');
            } else {
                errorDiv.style.display = 'none';
                confirmPasswordInput.classList.remove('invalid');
            }
        });
    }
});

// Update the existing handleLogin function
async function handleLogin() {
    try {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const errorDiv = document.querySelector('#loginForm .auth-error');

        // Clear previous errors
        errorDiv.textContent = '';
        clearValidationError(emailInput);
        clearValidationError(passwordInput);

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate email
        if (!email) {
            showValidationError(emailInput, 'Email is required');
            return;
        }
        if (!validateEmail(email)) {
            showValidationError(emailInput, 'Please enter a valid email address');
            return;
        }
        if (email.length > VALIDATION_LIMITS.email.max) {
            showValidationError(emailInput, `Email must be less than ${VALIDATION_LIMITS.email.max} characters`);
            return;
        }

        // Validate password
        if (!password) {
            showValidationError(passwordInput, 'Password is required');
            return;
        }
        if (password.length < VALIDATION_LIMITS.password.min) {
            showValidationError(passwordInput, `Password must be at least ${VALIDATION_LIMITS.password.min} characters`);
            return;
        }

        // Show loading state
            const loginBtn = document.querySelector('#loginForm button');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

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
    } finally {
        const loginBtn = document.querySelector('#loginForm button');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}


// Update the existing handleSignup function
async function handleSignup() {
    try {
        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const errorDiv = document.querySelector('#signupForm .auth-error');

        // Clear previous errors
        errorDiv.textContent = '';
        [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
            clearValidationError(input);
        });

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate name
        if (!name) {
            showValidationError(nameInput, 'Name is required');
            return;
        }
        if (!validateName(name)) {
            showValidationError(nameInput, 'Name can only contain letters, spaces, and hyphens');
            return;
        }
        if (name.length < VALIDATION_LIMITS.name.min || name.length > VALIDATION_LIMITS.name.max) {
            showValidationError(nameInput, `Name must be between ${VALIDATION_LIMITS.name.min} and ${VALIDATION_LIMITS.name.max} characters`);
            return;
        }

        // Validate email
        if (!email) {
            showValidationError(emailInput, 'Email is required');
            return;
        }
        if (!validateEmail(email)) {
            showValidationError(emailInput, 'Please enter a valid email address');
            return;
        }
        if (email.length > VALIDATION_LIMITS.email.max) {
            showValidationError(emailInput, `Email must be less than ${VALIDATION_LIMITS.email.max} characters`);
            return;
        }

        // Validate password
        if (!password) {
            showValidationError(passwordInput, 'Password is required');
            return;
        }
        if (!validatePassword(password)) {
            showValidationError(passwordInput, 'Password must contain at least 6 characters, including uppercase, lowercase, and numbers');
            return;
        }
        if (password.length > VALIDATION_LIMITS.password.max) {
            showValidationError(passwordInput, `Password must be less than ${VALIDATION_LIMITS.password.max} characters`);
            return;
        }

        // Validate confirm password
        if (password !== confirmPassword) {
            showValidationError(confirmPasswordInput, 'Passwords do not match');
            return;
        }

        // Add enhanced password validation
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            showValidationError(passwordInput, passwordValidation.errors[0]);
            return;
        }

        // Show loading state
        const signupBtn = document.querySelector('#signupForm button');
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

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
    } finally {
        const signupBtn = document.querySelector('#signupForm button');
        signupBtn.disabled = false;
        signupBtn.textContent = 'Sign Up';
    }
}

// Add real-time validation on input
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Add real-time validation for signup form
    const signupInputs = {
        name: document.getElementById('signupName'),
        email: document.getElementById('signupEmail'),
        password: document.getElementById('signupPassword'),
        confirmPassword: document.getElementById('confirmPassword')
    };

    Object.entries(signupInputs).forEach(([field, input]) => {
        if (!input) return;

        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            clearValidationError(input);

            switch (field) {
                case 'name':
                    if (value.length > VALIDATION_LIMITS.name.max) {
                        e.target.value = value.slice(0, VALIDATION_LIMITS.name.max);
                    }
                    break;
                case 'email':
                    if (value.length > VALIDATION_LIMITS.email.max) {
                        e.target.value = value.slice(0, VALIDATION_LIMITS.email.max);
                    }
                    break;
                case 'password':
                case 'confirmPassword':
                    if (value.length > VALIDATION_LIMITS.password.max) {
                        e.target.value = value.slice(0, VALIDATION_LIMITS.password.max);
                    }
                    break;
            }
        });
    });

    // Add real-time validation for login form
    const loginInputs = {
        email: document.getElementById('loginEmail'),
        password: document.getElementById('loginPassword')
    };

    Object.entries(loginInputs).forEach(([field, input]) => {
        if (!input) return;

        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            clearValidationError(input);

            if (field === 'email' && value.length > VALIDATION_LIMITS.email.max) {
                e.target.value = value.slice(0, VALIDATION_LIMITS.email.max);
            }
            if (field === 'password' && value.length > VALIDATION_LIMITS.password.max) {
                e.target.value = value.slice(0, VALIDATION_LIMITS.password.max);
            }
        });
    });
});

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
        const response = await fetch('https://recyclebin1.onrender.com/api/eco-stats');
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
        const response = await fetch('https://recyclebin1.onrender.com/api/eco-stats');
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

        const response = await fetch('https://recyclebin1.onrender.com/api/submit-code', {
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
        const response = await fetch(`https://recyclebin1.onrender.com/api/transactions/${user.id}?filter=${filter}`, {
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
        const response = await fetch('https://recyclebin1.onrender.com/api/platform-stats');
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

// Add these validation constants
const TEXT_LIMITS = {
    name: { 
        minWords: 1,
        maxWords: 5,
        minChars: 2,
        maxChars: 50
    },
    address: {
        minWords: 3,
        maxWords: 15,
        minChars: 10,
        maxChars: 100
    },
    message: {
        minWords: 2,
        maxWords: 50,
        minChars: 10,
        maxChars: 500
    }
};

// Add these helper functions
function countWords(str) {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function validateTextInput(text, type) {
    const limits = TEXT_LIMITS[type];
    if (!limits) return { isValid: true };

    const words = countWords(text);
    const chars = text.length;

    const result = {
        isValid: true,
        errors: []
    };

    if (chars < limits.minChars) {
        result.errors.push(`Must be at least ${limits.minChars} characters`);
    }
    if (chars > limits.maxChars) {
        result.errors.push(`Must be less than ${limits.maxChars} characters`);
    }
    if (words < limits.minWords) {
        result.errors.push(`Must contain at least ${limits.minWords} word(s)`);
    }
    if (words > limits.maxWords) {
        result.errors.push(`Must contain less than ${limits.maxWords} words`);
    }

    result.isValid = result.errors.length === 0;
    return result;
}

// Update existing DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    // Add real-time word and character count display
    const textInputs = {
        'signupName': 'name',
        'dustbinAddress': 'address',
        'feedbackMessage': 'message'
    };

    Object.entries(textInputs).forEach(([inputId, type]) => {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Create counter elements
        const counterDiv = document.createElement('div');
        counterDiv.className = 'text-counter';
        counterDiv.innerHTML = `
            <span class="word-count">0 words</span>
            <span class="char-count">0/${TEXT_LIMITS[type].maxChars} chars</span>
        `;
        input.parentElement.appendChild(counterDiv);

        // Add input listener
        input.addEventListener('input', (e) => {
            const text = e.target.value;
            const words = countWords(text);
            const chars = text.length;
            const limits = TEXT_LIMITS[type];

            // Update counters
            const wordCounter = counterDiv.querySelector('.word-count');
            const charCounter = counterDiv.querySelector('.char-count');
            
            wordCounter.textContent = `${words} word${words !== 1 ? 's' : ''}`;
            charCounter.textContent = `${chars}/${limits.maxChars} chars`;

            // Validate and show error if needed
            const validation = validateTextInput(text, type);
            const errorDiv = input.parentElement.querySelector('.field-error');

            if (!validation.isValid) {
                errorDiv.textContent = validation.errors[0];
                errorDiv.style.display = 'block';
                input.classList.add('invalid');
                
                // Truncate text if over character limit
                if (chars > limits.maxChars) {
                    input.value = text.slice(0, limits.maxChars);
                }
            } else {
                errorDiv.style.display = 'none';
                input.classList.remove('invalid');
            }

            // Update counter colors based on limits
            wordCounter.className = 'word-count ' + 
                (words > limits.maxWords ? 'over-limit' : '');
            charCounter.className = 'char-count ' + 
                (chars > limits.maxChars ? 'over-limit' : '');
        });
    });
});

// Add these password validation states
const PASSWORD_VALIDATION = {
    INVALID: 'invalid-password',
    MISMATCH: 'password-mismatch',
    VALID: 'valid'
};

// Add this function to check password validity
function validateLoginPassword(password, errorDiv) {
    // Clear previous error states
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    if (!password) {
        return {
            status: PASSWORD_VALIDATION.INVALID,
            message: 'Password is required'
        };
    }

    // Check for minimum length
    if (password.length < VALIDATION_LIMITS.password.min) {
        return {
            status: PASSWORD_VALIDATION.INVALID,
            message: `Password must be at least ${VALIDATION_LIMITS.password.min} characters`
        };
    }

    return {
        status: PASSWORD_VALIDATION.VALID,
        message: ''
    };
}

// Update the handleLogin function
async function handleLogin() {
    try {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const errorDiv = document.querySelector('#loginForm .auth-error');

        // Clear previous errors
        errorDiv.textContent = '';
        clearValidationError(emailInput);
        clearValidationError(passwordInput);

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate email
        if (!email) {
            showValidationError(emailInput, 'Email is required');
            return;
        }

        // ...existing email validation code...

        // Validate password
        const passwordValidation = validateLoginPassword(password, errorDiv);
        if (passwordValidation.status !== PASSWORD_VALIDATION.VALID) {
            showValidationError(passwordInput, passwordValidation.message);
            passwordInput.classList.add('shake');
            setTimeout(() => passwordInput.classList.remove('shake'), 500);
            return;
        }

        // Show loading state
        const loginBtn = document.querySelector('#loginForm button');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

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

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            // Handle invalid password
            if (data.message?.toLowerCase().includes('password')) {
                showValidationError(passwordInput, 'Invalid password');
                passwordInput.classList.add('shake');
                setTimeout(() => passwordInput.classList.remove('shake'), 500);
                return;
            }
            throw new Error(data.message || 'Login failed');
        }

        // ...existing success handling code...

    } catch (error) {
        console.error('Login error:', error);
        const errorDiv = document.querySelector('#loginForm .auth-error');
        errorDiv.textContent = error.message || 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        const loginBtn = document.querySelector('#loginForm button');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

// Add event listener for real-time password validation
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...

    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('input', (e) => {
            const errorDiv = loginPassword.parentElement.querySelector('.field-error');
            const validation = validateLoginPassword(e.target.value, errorDiv);
            
            if (validation.status !== PASSWORD_VALIDATION.VALID) {
                showValidationError(loginPassword, validation.message);
            } else {
                clearValidationError(loginPassword);
            }
        });
    }
});
