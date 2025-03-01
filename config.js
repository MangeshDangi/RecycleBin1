window.API_CONFIG = {
    BASE_URL: 'https://recyclebin1.onrender.com',
    ENDPOINTS: {
        LOGIN: '/api/auth/login',       // Updated to match server route
        SIGNUP: '/api/auth/signup',      // Updated to match server route
        USER_DATA: '/api/user-data',
        SUBMIT_CODE: '/api/submit-code',
        REDEEM: '/api/redeem'
    },
    DUMMY_LOCATIONS: [
        {
            id: "1",
            name: "Central Park Bin",
            address: "Marine Drive, Mumbai",
            lat: 18.9442,
            lng: 72.8227,
            status: "AVAILABLE"
        },
        {
            id: "2",
            name: "Mall Recycler",
            address: "Phoenix Mall, Lower Parel",
            lat: 18.9920,
            lng: 72.8265,
            status: "FULL"
        },
        {
            id: "3",
            name: "Station Bin",
            address: "Dadar Station (W)",
            lat: 19.0178,
            lng: 72.8478,
            status: "MAINTENANCE"
        },
        {
            id: "4",
            name: "Beach Bin",
            address: "Juhu Beach",
            lat: 19.0883,
            lng: 72.8262,
            status: "AVAILABLE"
        },
        {
            id: "5",
            name: "Market Bin",
            address: "Crawford Market",
            lat: 18.9475,
            lng: 72.8343,
            status: "AVAILABLE"
        }
    ]
};

// Add test admin user for development
window.createTestAdmin = function() {
    const adminUser = {
        id: 'admin1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
        points: 1000
    };
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    return 'Test admin user created!';
};

// const API_CONFIG = {
//     BASE_URL: 'http://localhost:3000',
//     ENDPOINTS: {
//         'LOGIN': '/api/auth/login',
//         'SIGNUP': '/api/auth/signup',
//         'USER_DATA': '/api/user-data',
//         'SUBMIT_CODE': '/api/submit-code',
//         'REDEEM': '/api/redeem'
//     }
// };
