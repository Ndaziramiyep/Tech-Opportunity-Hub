/**
 * Tech Opportunity Hub - Main Application Script
 * 
 * A comprehensive platform for managing tech opportunities including jobs,
 * internships, training programs, and events. Built with Firebase backend.
 * 
 * @author Tech Opportunity Hub Team
 * @version 1.0.0
 */

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

/**
 * Firebase project configuration
 * Replace these values with your Firebase project credentials
 * @type {Object}
 */
const firebaseConfig = {
    apiKey: "AIzaSyCkiyURiZjsgjyXt6eFIVLryICq5aXKSt0",
    authDomain: "opportunity-platform.firebaseapp.com",
    projectId: "opportunity-platform",
    storageBucket: "opportunity-platform.firebasestorage.app",
    messagingSenderId: "500232883910",
    appId: "1:500232883910:web:6795706173988043ec11c7",
    measurementId: "G-WEX0B7FM2F"
};

// Initialize Firebase services
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();      // Authentication service
const db = firebase.firestore();    // Firestore database
const storage = firebase.storage(); // Storage service

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Global application state
 * @type {Object}
 */
let currentUser = null;              // Currently authenticated user
let userRole = 'user';               // User role: 'user' or 'admin'
let opportunities = [];               // Current displayed opportunities
let allOpportunities = [];           // All opportunities for filtering
let savedOpportunities = new Set();  // Set of saved opportunity IDs
let applications = [];                // User's applications
let notifications = [];               // User's notifications
let currentFilters = {               // Active filter settings
    type: 'all',
    category: 'all'
};

// DOM Elements
const elements = {
    // Navigation
    userDropdown: document.getElementById('userDropdown'),
    userMenu: document.getElementById('userMenu'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileMenu: document.getElementById('mobileMenu'),
    
    // Modals
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    opportunityModal: document.getElementById('opportunityModal'),
    createOpportunityModal: document.getElementById('createOpportunityModal'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    createOpportunityForm: document.getElementById('createOpportunityForm'),
    
    // Content Areas
    mainContent: document.getElementById('mainContent'),
    featuredOpportunities: document.getElementById('featuredOpportunities'),
    allOpportunities: document.getElementById('allOpportunities'),
    
    // Dashboard
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    userRole: document.getElementById('userRole'),
    applicationsList: document.getElementById('applicationsList'),
    savedList: document.getElementById('savedList'),
    
    // Admin
    adminOpportunitiesTable: document.getElementById('adminOpportunitiesTable'),
    adminEventsTable: document.getElementById('adminEventsTable'),
    usersTable: document.getElementById('usersTable'),
    
    // Forms
    editOpportunityForm: document.getElementById('editOpportunityForm'),
    contactForm: document.getElementById('contactForm')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initFirebaseAuth();
    setupEventListeners();
    loadOpportunities();
    setupNavigation();
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Initialize Firebase Authentication and set up auth state listener
 * Automatically updates UI when user logs in or out
 */
function initFirebaseAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile(user.uid);
            updateUIForAuthenticatedUser();
            await loadUserSavedOpportunities();
        } else {
            currentUser = null;
            userRole = 'user';
            updateUIForGuest();
        }
    });
}

async function loadUserProfile(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            const userData = doc.data();
            userRole = userData.role || 'user';
            elements.userName.textContent = userData.name || user.displayName;
            elements.userEmail.textContent = userData.email || user.email;
            elements.userRole.textContent = userRole === 'admin' ? 'Administrator' : 'User';
        } else {
            // Create user profile if it doesn't exist
            await createUserProfile(userId);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading profile', 'error');
    }
}

async function createUserProfile(userId) {
    try {
        await db.collection('users').doc(userId).set({
            name: currentUser.displayName || 'User',
            email: currentUser.email,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            profileComplete: false
        });
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            showSection(sectionId);
            updateActiveNavLink(link);
        });
    });

    // Mobile menu
    elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    
    // User dropdown
    elements.userDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.userMenu.style.display = 
            elements.userMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        elements.userMenu.style.display = 'none';
        if (elements.mobileMenu.style.display === 'block') {
            elements.mobileMenu.style.display = 'none';
        }
    });

    // Authentication
    elements.loginBtn?.addEventListener('click', () => showModal('loginModal'));
    elements.registerBtn?.addEventListener('click', () => showModal('registerModal'));
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    document.getElementById('mobileLoginBtn')?.addEventListener('click', () => showModal('loginModal'));
    document.getElementById('mobileRegisterBtn')?.addEventListener('click', () => showModal('registerModal'));
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', handleLogout);

    // Modal switching
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('loginModal');
        showModal('registerModal');
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('registerModal');
        showModal('loginModal');
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = closeBtn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                // Reset form if it's the create opportunity modal
                if (modal.id === 'createOpportunityModal') {
                    const form = document.getElementById('createOpportunityForm');
                    if (form) {
                        form.reset();
                    }
                }
            }
        });
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Prevent modal content clicks from closing the modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });

    // Forms submission
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.registerForm?.addEventListener('submit', handleRegister);
    elements.createOpportunityForm?.addEventListener('submit', handleCreateOpportunity);
    elements.editOpportunityForm?.addEventListener('submit', handleUpdateOpportunity);
    elements.contactForm?.addEventListener('submit', handleContactForm);
    
    // Submit event button
    document.getElementById('submitEventBtn')?.addEventListener('click', () => {
        if (currentUser) {
            showModal('submitEventModal');
        } else {
            showToast('Please login to submit an event', 'error');
            showModal('loginModal');
        }
    });
    
    // Submit event form
    document.getElementById('submitEventForm')?.addEventListener('submit', handleSubmitEvent);

    // Category cards (these are actually type filters, not category filters)
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.category; // This is actually a type value
            // Navigate to opportunities section and filter by type
            showSection('opportunities');
            // Set the type filter
            const typeFilter = document.getElementById('typeFilter');
            if (typeFilter) {
                typeFilter.value = type;
            }
            // Clear category filter when filtering by type from category cards
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = 'all';
            }
            // Apply filters
            applyFilters();
        });
    });

    // Explore button
    document.getElementById('exploreBtn')?.addEventListener('click', () => {
        showSection('opportunities');
    });

    // Filter button
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    
    // Clear filters button
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

    // Filter dropdowns - apply on change (optional, or keep Apply button)
    document.getElementById('typeFilter')?.addEventListener('change', () => {
        updateClearFiltersButton();
        applyFilters();
    });
    document.getElementById('categoryFilter')?.addEventListener('change', () => {
        updateClearFiltersButton();
        applyFilters();
    });

    // Create opportunity button
    document.getElementById('createOpportunityBtn')?.addEventListener('click', () => {
        showModal('createOpportunityModal');
    });

    // Dashboard tabs
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            showDashboardTab(tabId);
        });
    });

    // Admin tabs
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.adminTab;
            showAdminTab(tabId);
        });
    });

    // Admin create opportunity
    document.getElementById('adminCreateOpportunity')?.addEventListener('click', () => {
        showModal('createOpportunityModal');
    });

    // Profile update button
    document.getElementById('updateProfileBtn')?.addEventListener('click', handleUpdateProfile);

    // Add category button
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
        showAddCategoryModal();
    });
}

// Navigation
function setupNavigation() {
    // Handle hash-based navigation
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
}

function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'home';
    showSection(hash);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${hash}`) {
            link.classList.add('active');
        }
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show requested section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionId) {
            case 'opportunities':
                // Only load if we don't have all opportunities yet, or reload if needed
                if (allOpportunities.length === 0) {
                    loadAllOpportunities();
                } else {
                    // Apply current filters to already loaded opportunities
                    applyFilters();
                }
                break;
            case 'events':
                loadEvents();
                break;
            case 'dashboard':
                if (currentUser) loadDashboardData();
                break;
            case 'admin':
                if (userRole === 'admin') loadAdminData();
                break;
        }
    }
    
    // Close mobile menu
    elements.mobileMenu.style.display = 'none';
}

function toggleMobileMenu() {
    elements.mobileMenu.style.display = 
        elements.mobileMenu.style.display === 'block' ? 'none' : 'block';
}

function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// Authentication Handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showToast('Logging in...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        closeModal('loginModal');
        // Reset form
        elements.loginForm.reset();
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        showToast('Creating account...', 'info');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user profile in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            profileComplete: false
        });
        
        closeModal('registerModal');
        // Reset form
        elements.registerForm.reset();
        showToast('Registration successful!', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
        showSection('home');
    } catch (error) {
        console.error('Logout error:', error);
        showToast(error.message, 'error');
    }
}

// UI Updates
function updateUIForAuthenticatedUser() {
    // Show authenticated user links
    document.getElementById('authLinks').style.display = 'block';
    document.getElementById('mobileAuthLinks').style.display = 'block';
    
    // Hide login/register links
    elements.loginBtn.style.display = 'none';
    elements.registerBtn.style.display = 'none';
    document.getElementById('mobileLoginBtn').style.display = 'none';
    document.getElementById('mobileRegisterBtn').style.display = 'none';
    
    // Update user info in dropdown
    const userSpan = elements.userDropdown.querySelector('span');
    userSpan.textContent = currentUser.displayName || 'User';
    
    // Show admin links if user is admin
    if (userRole === 'admin') {
        document.getElementById('adminLinks').style.display = 'block';
    }
    
    // Show create opportunity button for admins
    if (userRole === 'admin') {
        document.getElementById('createOpportunityBtn').style.display = 'inline-flex';
    }
    
    // Show submit event button for all users
    const submitEventBtn = document.getElementById('submitEventBtn');
    if (submitEventBtn) {
        submitEventBtn.style.display = 'inline-flex';
    }
}

function updateUIForGuest() {
    // Hide authenticated user links
    document.getElementById('authLinks').style.display = 'none';
    document.getElementById('mobileAuthLinks').style.display = 'none';
    document.getElementById('adminLinks').style.display = 'none';
    
    // Show login/register links
    elements.loginBtn.style.display = 'block';
    elements.registerBtn.style.display = 'block';
    document.getElementById('mobileLoginBtn').style.display = 'block';
    document.getElementById('mobileRegisterBtn').style.display = 'block';
    
    // Update user info in dropdown
    const userSpan = elements.userDropdown.querySelector('span');
    userSpan.textContent = 'Guest';
    
    // Hide create opportunity button
    document.getElementById('createOpportunityBtn').style.display = 'none';
    
    // Hide submit event button
    const submitEventBtn = document.getElementById('submitEventBtn');
    if (submitEventBtn) {
        submitEventBtn.style.display = 'none';
    }
}

// Modal Management
function showModal(modalId, show = true) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    if (show) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Reset form if it's the create opportunity modal
        if (modalId === 'createOpportunityModal') {
            const form = document.getElementById('createOpportunityForm');
            if (form) {
                form.reset();
            }
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ============================================================================
// OPPORTUNITIES MANAGEMENT
// ============================================================================

/**
 * Load featured opportunities for the home page
 * Fetches up to 6 active opportunities, sorted by creation date
 * @returns {Promise<void>}
 */
async function loadOpportunities() {
    try {
        showLoading(elements.featuredOpportunities);
        
        let snapshot;
        try {
            // Try with orderBy first (requires index)
            snapshot = await db.collection('opportunities')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .limit(6)
                .get();
        } catch (indexError) {
            // If index error, try without orderBy or without status filter
            // Firestore index warning - this is expected and handled gracefully
            // The app will work without the index, but creating it improves performance
            if (indexError.code === 'failed-precondition') {
                console.info('Firestore index not found, using fallback query. This is normal and the app will work correctly.');
            } else {
                console.warn('Index error, trying alternative query:', indexError);
            }
            try {
                snapshot = await db.collection('opportunities')
                    .where('status', '==', 'active')
                    .limit(6)
                    .get();
            } catch (statusError) {
                // If that also fails, try loading all and filtering client-side
                console.warn('Status filter error, loading all opportunities:', statusError);
                snapshot = await db.collection('opportunities')
                    .limit(20)
                    .get();
            }
        }
        
        opportunities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include active opportunities if we loaded all
            if (!data.status || data.status === 'active') {
                opportunities.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort manually by createdAt
        opportunities.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
            return bDate - aDate;
        });
        
        // Store in allOpportunities for filtering (if not already loaded)
        if (allOpportunities.length === 0) {
            allOpportunities = [...opportunities];
        }
        
        // Limit to 6 for featured
        opportunities = opportunities.slice(0, 6);
        
        displayFeaturedOpportunities();
    } catch (error) {
        console.error('Error loading opportunities:', error);
        let errorMessage = 'Failed to load opportunities';
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        // Show user-friendly message
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your Firestore rules.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
        showError(elements.featuredOpportunities, errorMessage);
    }
}

async function loadAllOpportunities() {
    try {
        showLoading(elements.allOpportunities);
        
        let snapshot;
        try {
            // Try with orderBy first (requires index)
            snapshot = await db.collection('opportunities')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (indexError) {
            // If index error, try without orderBy or without status filter
            // Firestore index warning - this is expected and handled gracefully
            // The app will work without the index, but creating it improves performance
            if (indexError.code === 'failed-precondition') {
                console.info('Firestore index not found, using fallback query. This is normal and the app will work correctly.');
            } else {
                console.warn('Index error, trying alternative query:', indexError);
            }
            try {
                snapshot = await db.collection('opportunities')
                    .where('status', '==', 'active')
                    .get();
            } catch (statusError) {
                // If that also fails, try loading all and filtering client-side
                console.warn('Status filter error, loading all opportunities:', statusError);
                snapshot = await db.collection('opportunities')
                    .get();
            }
        }
        
        allOpportunities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include active opportunities if we loaded all
            if (!data.status || data.status === 'active') {
                allOpportunities.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort manually by createdAt
        allOpportunities.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
            return bDate - aDate;
        });
        
        // Apply current filters
        applyFilters();
    } catch (error) {
        console.error('Error loading opportunities:', error);
        let errorMessage = 'Failed to load opportunities';
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        // Show user-friendly message
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your Firestore rules.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
        }
        showError(elements.allOpportunities, errorMessage);
    }
}

function displayFeaturedOpportunities() {
    if (!opportunities.length) {
        elements.featuredOpportunities.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <h3>No opportunities found</h3>
                <p>Check back later for new opportunities</p>
            </div>
        `;
        return;
    }
    
    const featured = opportunities.slice(0, 6);
    elements.featuredOpportunities.innerHTML = featured.map(opp => createOpportunityCard(opp)).join('');
    attachOpportunityCardListeners();
}

function displayAllOpportunities() {
    if (!opportunities.length) {
        const typeFilter = document.getElementById('typeFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const hasActiveFilters = (typeFilter && typeFilter.value !== 'all') || 
                                (categoryFilter && categoryFilter.value !== 'all');
        
        if (hasActiveFilters && allOpportunities.length > 0) {
            elements.allOpportunities.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <h3>No opportunities match your filters</h3>
                    <p>Try adjusting your filters or <button class="btn-primary" onclick="clearFilters()" style="margin-top: 1rem;">clear all filters</button></p>
                </div>
            `;
        } else {
            elements.allOpportunities.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <h3>No opportunities found</h3>
                    <p>Check back later for new opportunities</p>
                </div>
            `;
        }
        // Update filter status
        updateFilterStatus(0, allOpportunities.length);
        return;
    }
    
    // Ensure the container uses grid layout
    if (!elements.allOpportunities.classList.contains('opportunities-grid')) {
        elements.allOpportunities.classList.add('opportunities-grid');
        elements.allOpportunities.classList.remove('opportunities-list');
    }
    
    elements.allOpportunities.innerHTML = opportunities.map(opp => createOpportunityCard(opp)).join('');
    attachOpportunityCardListeners();
}

function createOpportunityCard(opportunity) {
    const typeClass = `type-${opportunity.type}`;
    const typeLabel = opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1);
    const isSaved = savedOpportunities.has(opportunity.id);
    
    return `
        <div class="opportunity-card" data-id="${opportunity.id}">
            <div class="opportunity-header">
                <h3>${opportunity.title}</h3>
                <div class="opportunity-meta">
                    <span class="opportunity-type ${typeClass}">${typeLabel}</span>
                    <span><i class="fas fa-building"></i> ${opportunity.company || 'Not specified'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${opportunity.location || 'Remote'}</span>
                </div>
            </div>
            <div class="opportunity-body">
                <div class="opportunity-info">
                    <div class="info-item">
                        <i class="fas fa-tag"></i>
                        <span>${getCategoryLabel(opportunity.category)}</span>
                    </div>
                    ${opportunity.deadline ? `
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>Deadline: ${formatDate(opportunity.deadline)}</span>
                    </div>
                    ` : ''}
                    ${opportunity.salary ? `
                    <div class="info-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>${opportunity.salary}</span>
                    </div>
                    ` : ''}
                </div>
                <p class="opportunity-description">${opportunity.description}</p>
            </div>
            <div class="opportunity-footer">
                <span class="posted-date">Posted: ${formatDate(opportunity.createdAt?.toDate())}</span>
                <div class="opportunity-actions">
                    <button class="btn-secondary view-btn" data-id="${opportunity.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${currentUser ? `
                    <button class="btn-secondary save-btn" data-id="${opportunity.id}" data-saved="${isSaved}">
                        <i class="fas ${isSaved ? 'fa-bookmark' : 'fa-bookmark'}"></i> ${isSaved ? 'Saved' : 'Save'}
                    </button>
                    ` : ''}
                    ${currentUser ? `
                    <button class="btn-primary apply-btn" data-id="${opportunity.id}">
                        <i class="fas fa-paper-plane"></i> Apply
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function attachOpportunityCardListeners() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const opportunityId = e.target.closest('.view-btn').dataset.id;
            showOpportunityDetails(opportunityId);
        });
    });
    
    // Save buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const opportunityId = e.target.closest('.save-btn').dataset.id;
            toggleSaveOpportunity(opportunityId, btn);
        });
    });
    
    // Apply buttons
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const opportunityId = e.target.closest('.apply-btn').dataset.id;
            applyForOpportunity(opportunityId);
        });
    });
}

async function showOpportunityDetails(opportunityId) {
    try {
        const doc = await db.collection('opportunities').doc(opportunityId).get();
        if (doc.exists) {
            const opportunity = { id: doc.id, ...doc.data() };
            displayOpportunityDetails(opportunity);
            showModal('opportunityModal');
        }
    } catch (error) {
        console.error('Error loading opportunity details:', error);
        showToast('Failed to load opportunity details', 'error');
    }
}

function displayOpportunityDetails(opportunity) {
    const detailsDiv = document.getElementById('opportunityDetails');
    const typeClass = `type-${opportunity.type}`;
    const typeLabel = opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1);
    
    detailsDiv.innerHTML = `
        <h2>${opportunity.title}</h2>
        <div class="opportunity-header">
            <div class="opportunity-meta">
                <span class="opportunity-type ${typeClass}">${typeLabel}</span>
                <span><i class="fas fa-building"></i> ${opportunity.company || 'Not specified'}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${opportunity.location || 'Remote'}</span>
                ${opportunity.deadline ? `
                <span><i class="fas fa-clock"></i> Deadline: ${formatDate(opportunity.deadline)}</span>
                ` : ''}
            </div>
        </div>
        
        <div class="opportunity-details">
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p>${opportunity.description}</p>
            </div>
            
            ${opportunity.requirements ? `
            <div class="detail-section">
                <h3><i class="fas fa-list-check"></i> Requirements</h3>
                <p>${opportunity.requirements}</p>
            </div>
            ` : ''}
            
            ${opportunity.benefits ? `
            <div class="detail-section">
                <h3><i class="fas fa-gift"></i> Benefits</h3>
                <p>${opportunity.benefits}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3><i class="fas fa-tags"></i> Details</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <strong>Category:</strong>
                        <span>${getCategoryLabel(opportunity.category)}</span>
                    </div>
                    ${opportunity.salary ? `
                    <div class="detail-item">
                        <strong>Salary/Stipend:</strong>
                        <span>${opportunity.salary}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <strong>Posted Date:</strong>
                        <span>${formatDate(opportunity.createdAt?.toDate())}</span>
                    </div>
                    ${opportunity.link ? `
                    <div class="detail-item">
                        <strong>Application Link:</strong>
                        <a href="${opportunity.link}" target="_blank">${opportunity.link}</a>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="opportunity-actions detailed-actions">
            ${currentUser ? `
            <button class="btn-primary apply-btn" data-id="${opportunity.id}">
                <i class="fas fa-paper-plane"></i> Apply Now
            </button>
            ` : `
            <button class="btn-primary" onclick="showModal('loginModal')">
                <i class="fas fa-sign-in-alt"></i> Login to Apply
            </button>
            `}
        </div>
    `;
}

async function toggleSaveOpportunity(opportunityId, button) {
    if (!currentUser) {
        showToast('Please login to save opportunities', 'error');
        return;
    }
    
    try {
        if (savedOpportunities.has(opportunityId)) {
            // Remove from saved
            await db.collection('users').doc(currentUser.uid)
                .collection('saved').doc(opportunityId).delete();
            savedOpportunities.delete(opportunityId);
            button.innerHTML = '<i class="fas fa-bookmark"></i> Save';
            button.dataset.saved = 'false';
            showToast('Removed from saved', 'success');
        } else {
            // Add to saved
            await db.collection('users').doc(currentUser.uid)
                .collection('saved').doc(opportunityId).set({
                    opportunityId: opportunityId,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            savedOpportunities.add(opportunityId);
            button.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
            button.dataset.saved = 'true';
            showToast('Saved opportunity', 'success');
        }
    } catch (error) {
        console.error('Error toggling save:', error);
        showToast('Failed to save opportunity', 'error');
    }
}

async function applyForOpportunity(opportunityId) {
    if (!currentUser) {
        showToast('Please login to apply', 'error');
        return;
    }
    
    try {
        // Check if already applied
        const existingApp = await db.collection('applications')
            .where('userId', '==', currentUser.uid)
            .where('opportunityId', '==', opportunityId)
            .get();
        
        if (!existingApp.empty) {
            showToast('You have already applied for this opportunity', 'warning');
            return;
        }
        
        // Create application
        await db.collection('applications').add({
            userId: currentUser.uid,
            opportunityId: opportunityId,
            status: 'pending',
            appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: currentUser.email,
            userName: currentUser.displayName
        });
        
        // Log the action
        await logUserAction('apply_opportunity', `Applied for opportunity: ${opportunityId}`, { opportunityId });
        
        showToast('Application submitted successfully!', 'success');
        
        // Reload user data
        if (window.location.hash === '#dashboard') {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error applying:', error);
        showToast('Failed to submit application', 'error');
    }
}

// ============================================================================
// DASHBOARD FUNCTIONS
// ============================================================================

/**
 * Load all dashboard data for the current user
 * Includes applications, saved opportunities, notifications, and profile
 * @returns {Promise<void>}
 */
async function loadDashboardData() {
    if (!currentUser) return;
    
    await loadApplications();
    await loadSavedOpportunities();
    await loadNotifications();
    await loadUserProfileForDashboard();
}

async function loadApplications() {
    try {
        if (!currentUser) return;
        
        const applicationsList = document.getElementById('applicationsList');
        if (!applicationsList) return;
        
        showLoading(applicationsList);
        
        let snapshot;
        try {
            snapshot = await db.collection('applications')
                .where('userId', '==', currentUser.uid)
                .orderBy('appliedAt', 'desc')
                .get();
        } catch (indexError) {
            console.info('Index error for applications, using fallback query');
            // Try without orderBy
            snapshot = await db.collection('applications')
                .where('userId', '==', currentUser.uid)
                .get();
        }
        
        applications = [];
        const opportunitiesMap = new Map();
        
        for (const doc of snapshot.docs) {
            const application = { id: doc.id, ...doc.data() };
            applications.push(application);
            
            // Load opportunity details
            if (!opportunitiesMap.has(application.opportunityId)) {
                try {
                    const oppDoc = await db.collection('opportunities').doc(application.opportunityId).get();
                    if (oppDoc.exists) {
                        opportunitiesMap.set(application.opportunityId, oppDoc.data());
                    }
                } catch (error) {
                    console.warn('Error loading opportunity for application:', application.opportunityId, error);
                }
            }
        }
        
        // Sort manually if orderBy wasn't used
        if (snapshot.docs.length > 0) {
            applications.sort((a, b) => {
                const aDate = a.appliedAt?.toDate ? a.appliedAt.toDate() : (a.appliedAt ? new Date(a.appliedAt) : new Date(0));
                const bDate = b.appliedAt?.toDate ? b.appliedAt.toDate() : (b.appliedAt ? new Date(b.appliedAt) : new Date(0));
                return bDate - aDate;
            });
        }
        
        displayApplications(opportunitiesMap);
    } catch (error) {
        console.error('Error loading applications:', error);
        const applicationsList = document.getElementById('applicationsList');
        if (applicationsList) {
            showError(applicationsList, 'Failed to load applications. Please try again.');
        }
    }
}

function displayApplications(opportunitiesMap) {
    if (!applications.length) {
        elements.applicationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>No applications yet</h3>
                <p>Apply for opportunities to see them here</p>
                <button class="btn-primary" onclick="showSection('opportunities')">
                    Browse Opportunities
                </button>
            </div>
        `;
        return;
    }
    
    elements.applicationsList.innerHTML = applications.map(app => {
        const opportunity = opportunitiesMap.get(app.opportunityId);
        if (!opportunity) return '';
        
        const statusClass = `status-${app.status}`;
        
        return `
            <div class="application-card">
                <div class="application-header">
                    <h4>${opportunity.title}</h4>
                    <span class="status-badge ${statusClass}">${app.status}</span>
                </div>
                <div class="application-body">
                    <p><i class="fas fa-building"></i> ${opportunity.company || 'Not specified'}</p>
                    <p><i class="fas fa-calendar"></i> Applied: ${formatDate(app.appliedAt?.toDate())}</p>
                </div>
                <div class="application-actions">
                    <button class="btn-secondary" onclick="viewApplication('${app.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load user's saved opportunities IDs into the Set for quick lookup
 * This is called when user logs in to populate the savedOpportunities Set
 * @returns {Promise<void>}
 */
async function loadUserSavedOpportunities() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('saved')
            .get();
        
        savedOpportunities.clear();
        snapshot.forEach(doc => {
            const oppId = doc.data().opportunityId;
            if (oppId) {
                savedOpportunities.add(oppId);
            }
        });
        
        console.log(`Loaded ${savedOpportunities.size} saved opportunities for user`);
    } catch (error) {
        console.error('Error loading saved opportunities:', error);
        // Don't show error toast here as it's a background operation
    }
}

async function loadSavedOpportunities() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('saved')
            .orderBy('savedAt', 'desc')
            .get();
        
        const savedIds = [];
        snapshot.forEach(doc => {
            savedIds.push(doc.data().opportunityId);
        });
        
        // Load opportunity details
        const savedOpps = [];
        for (const oppId of savedIds) {
            const doc = await db.collection('opportunities').doc(oppId).get();
            if (doc.exists && doc.data().status === 'active') {
                savedOpps.push({ id: doc.id, ...doc.data() });
            }
        }
        
        displaySavedOpportunities(savedOpps);
    } catch (error) {
        console.error('Error loading saved opportunities:', error);
        showError(elements.savedList, 'Failed to load saved opportunities');
    }
}

function displaySavedOpportunities(opportunities) {
    if (!opportunities.length) {
        elements.savedList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bookmark"></i>
                <h3>No saved opportunities</h3>
                <p>Save opportunities to view them here</p>
            </div>
        `;
        return;
    }
    
    elements.savedList.innerHTML = opportunities.map(opp => {
        const typeClass = `type-${opp.type}`;
        const typeLabel = opp.type.charAt(0).toUpperCase() + opp.type.slice(1);
        
        return `
            <div class="saved-card">
                <div class="saved-header">
                    <h4>${opp.title}</h4>
                    <span class="opportunity-type ${typeClass}">${typeLabel}</span>
                </div>
                <div class="saved-body">
                    <p><i class="fas fa-building"></i> ${opp.company || 'Not specified'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${opp.location || 'Remote'}</p>
                    <p class="saved-description">${opp.description.substring(0, 100)}...</p>
                </div>
                <div class="saved-actions">
                    <button class="btn-secondary" onclick="showOpportunityDetails('${opp.id}')">
                        View
                    </button>
                    <button class="btn-danger" onclick="removeSaved('${opp.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadNotifications() {
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('notifications')
            .where('read', '==', false)
            .orderBy('createdAt', 'desc')
            .get();
        
        notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        // Update notification badge
        const badge = document.getElementById('notificationCount');
        badge.textContent = notifications.length;
        
        // Display notifications
        displayNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function displayNotifications() {
    const container = document.getElementById('notificationsList');
    if (!notifications.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-card ${notif.read ? 'read' : 'unread'}">
            <div class="notification-header">
                <h4>${notif.title}</h4>
                <span class="notification-time">${formatDate(notif.createdAt?.toDate())}</span>
            </div>
            <div class="notification-body">
                <p>${notif.message}</p>
            </div>
            <div class="notification-actions">
                <button class="btn-secondary" onclick="markNotificationRead('${notif.id}')">
                    Mark as Read
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Load all admin panel data
 * Includes opportunities, users, analytics, and categories
 * Only accessible to admin users
 * @returns {Promise<void>}
 */
async function loadAdminData() {
    if (userRole !== 'admin') {
        console.warn('User is not an admin, cannot load admin data');
        return;
    }
    
    console.log('Loading admin data...');
    
    try {
        // Load data for the currently active tab first
        const activeTab = document.querySelector('.admin-tab.active');
        const activeTabId = activeTab ? activeTab.id : 'manage-opportunities';
        
        // Load all data in parallel for better performance
        await Promise.all([
            loadAllOpportunitiesForAdmin(),
            loadAllEventsForAdmin(),
            loadAllUsers(),
            loadAnalytics(),
            loadCategories(),
            loadUserLogs()
        ]);
        
        console.log('Admin data loaded successfully');
    } catch (error) {
        console.error('Error loading admin data:', error);
        showToast('Error loading admin data. Please refresh the page.', 'error');
    }
}

async function loadAllOpportunitiesForAdmin() {
    try {
        // Wait a bit to ensure DOM is ready (fixes online deployment issue)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const tableElement = document.getElementById('adminOpportunitiesTable');
        if (!tableElement) {
            console.warn('adminOpportunitiesTable element not found');
            return;
        }
        
        console.log('Loading opportunities for admin...');
        
        // Show loading state
        tableElement.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading opportunities...</p>
                    </div>
                </td>
            </tr>
        `;
        
        let snapshot;
        try {
            snapshot = await db.collection('opportunities')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (indexError) {
            // If orderBy fails, try without it
            console.warn('Index error, loading without orderBy:', indexError);
            snapshot = await db.collection('opportunities').get();
        }
        
        tableElement.innerHTML = '';
        
        if (snapshot.empty) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-briefcase"></i>
                            <h3>No opportunities found</h3>
                            <p>Create your first opportunity to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Process all opportunities and count applications
        const opportunities = [];
        for (const doc of snapshot.docs) {
            const opp = { id: doc.id, ...doc.data() };
            
            // Count applications
            try {
                const appsSnapshot = await db.collection('applications')
                    .where('opportunityId', '==', opp.id)
                    .get();
                opp.applicationCount = appsSnapshot.size;
            } catch (error) {
                console.warn('Error counting applications for opportunity:', opp.id, error);
                opp.applicationCount = 0;
            }
            
            opportunities.push(opp);
        }
        
        // Sort manually if orderBy wasn't used
        if (opportunities.length > 0 && !opportunities[0].createdAt) {
            // No sorting needed if no createdAt
        } else {
            opportunities.sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                return bDate - aDate;
            });
        }
        
        // Display all opportunities
        if (opportunities.length === 0) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-briefcase"></i>
                            <h3>No opportunities found</h3>
                            <p>Create your first opportunity to get started</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            opportunities.forEach(opp => {
                const row = document.createElement('tr');
                const typeLabel = opp.type ? opp.type.charAt(0).toUpperCase() + opp.type.slice(1) : 'N/A';
                const status = opp.status || 'active';
                
                row.innerHTML = `
                    <td>${opp.title || 'Untitled'}</td>
                    <td><span class="opportunity-type type-${opp.type || 'job'}">${typeLabel}</span></td>
                    <td>${getCategoryLabel(opp.category || '')}</td>
                    <td>${formatDate(opp.createdAt?.toDate())}</td>
                    <td>${opp.applicationCount || 0}</td>
                    <td><span class="status-badge status-${status}">${status}</span></td>
                    <td class="table-actions">
                        <button class="btn-secondary" onclick="editOpportunity('${opp.id}')" title="Edit Opportunity">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-danger" onclick="deleteOpportunity('${opp.id}')" title="Delete Opportunity">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableElement.appendChild(row);
            });
        }
        
        console.log(`Loaded ${opportunities.length} opportunities for admin`);
    } catch (error) {
        console.error('Error loading opportunities for admin:', error);
        const tableElement = document.getElementById('adminOpportunitiesTable');
        if (tableElement) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error loading opportunities</h3>
                            <p>${error.message || 'Please try again later'}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        showToast('Failed to load opportunities', 'error');
    }
}

async function loadAllUsers() {
    try {
        // Wait a bit to ensure DOM is ready (fixes online deployment issue)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const tableElement = document.getElementById('usersTable');
        if (!tableElement) {
            console.warn('usersTable element not found');
            return;
        }
        
        console.log('Loading users for admin...');
        
        // Show loading state
        tableElement.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading users...</p>
                    </div>
                </td>
            </tr>
        `;
        
        const snapshot = await db.collection('users').get();
        
        tableElement.innerHTML = '';
        
        if (snapshot.empty) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>No users found</h3>
                            <p>Users will appear here once they register</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        if (snapshot.empty) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>No users found</h3>
                            <p>Users will appear here once they register</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            snapshot.forEach((doc) => {
                const user = { id: doc.id, ...doc.data() };
                
                const row = document.createElement('tr');
                const role = user.role || 'user';
                const isCurrentUser = user.id === currentUser?.uid;
                
                row.innerHTML = `
                    <td>${user.name || 'Unknown'}</td>
                    <td>${user.email || 'No email'}</td>
                    <td><span class="user-role">${role}</span></td>
                    <td>${formatDate(user.createdAt?.toDate())}</td>
                    <td><span class="status-badge status-active">Active</span></td>
                    <td class="table-actions">
                        ${role !== 'admin' ? `
                        <button class="btn-success" onclick="makeAdmin('${user.id}')" title="Make Admin">
                            <i class="fas fa-user-shield"></i> Make Admin
                        </button>
                        ` : `
                        <button class="btn-warning" onclick="removeAdmin('${user.id}')" title="Remove Admin" ${isCurrentUser ? 'disabled style="opacity: 0.5;"' : ''}>
                            <i class="fas fa-user-slash"></i> Remove Admin
                        </button>
                        `}
                        <button class="btn-danger" onclick="deleteUser('${user.id}')" title="Delete User" ${isCurrentUser ? 'disabled style="opacity: 0.5;"' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableElement.appendChild(row);
            });
        }
        
        console.log(`Loaded ${snapshot.size} users for admin`);
    } catch (error) {
        console.error('Error loading users:', error);
        const tableElement = document.getElementById('usersTable');
        if (tableElement) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error loading users</h3>
                            <p>${error.message || 'Please try again later'}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        showToast('Failed to load users', 'error');
    }
}

async function loadAnalytics() {
    try {
        // Total opportunities
        const oppsSnapshot = await db.collection('opportunities').get();
        document.getElementById('totalOpportunities').textContent = oppsSnapshot.size;
        
        // Total users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        // Total applications
        const appsSnapshot = await db.collection('applications').get();
        document.getElementById('totalApplications').textContent = appsSnapshot.size;
        
        // Active opportunities
        const activeOppsSnapshot = await db.collection('opportunities')
            .where('status', '==', 'active')
            .get();
        document.getElementById('activeOpportunities').textContent = activeOppsSnapshot.size;
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Update Opportunity
async function handleUpdateOpportunity(e) {
    e.preventDefault();
    
    if (!currentUser || userRole !== 'admin') {
        showToast('Only admins can update opportunities', 'error');
        return;
    }
    
    const opportunityId = document.getElementById('editOpportunityId').value;
    if (!opportunityId) {
        showToast('Invalid opportunity ID', 'error');
        return;
    }
    
    const updateData = {
        title: document.getElementById('editOpportunityTitle').value,
        type: document.getElementById('editOpportunityType').value,
        category: document.getElementById('editOpportunityCategory').value,
        company: document.getElementById('editOpportunityCompany').value,
        location: document.getElementById('editOpportunityLocation').value,
        description: document.getElementById('editOpportunityDescription').value,
        requirements: document.getElementById('editOpportunityRequirements').value,
        benefits: document.getElementById('editOpportunityBenefits').value,
        salary: document.getElementById('editOpportunitySalary').value,
        link: document.getElementById('editOpportunityLink').value,
        deadline: document.getElementById('editOpportunityDeadline').value,
        status: document.getElementById('editOpportunityStatus').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName
    };
    
    try {
        showToast('Updating opportunity...', 'info');
        await db.collection('opportunities').doc(opportunityId).update(updateData);
        
        // Reset form
        elements.editOpportunityForm.reset();
        
        // Close modal
        closeModal('editOpportunityModal');
        
        // Show success message
        showToast('Opportunity updated successfully!', 'success');
        
        // Reload opportunities
        if (window.location.hash === '#admin') {
            loadAllOpportunitiesForAdmin();
            loadAllEventsForAdmin();
        }
        loadOpportunities();
        loadAllOpportunities();
        loadEvents();
    } catch (error) {
        console.error('Error updating opportunity:', error);
        showToast('Failed to update opportunity', 'error');
    }
}

// Contact Form Handler
async function handleContactForm(e) {
    e.preventDefault();
    
    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'new'
    };
    
    try {
        showToast('Sending message...', 'info');
        await db.collection('contacts').add(contactData);
        
        // Reset form
        elements.contactForm.reset();
        
        showToast('Thank you! Your message has been sent successfully.', 'success');
    } catch (error) {
        console.error('Error sending contact message:', error);
        showToast('Failed to send message. Please try again.', 'error');
    }
}

// Create Opportunity
async function handleCreateOpportunity(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login to create opportunities', 'error');
        return;
    }
    
    if (userRole !== 'admin') {
        showToast('Only admins can create opportunities', 'error');
        return;
    }
    
    const opportunity = {
        title: document.getElementById('opportunityTitle').value,
        type: document.getElementById('opportunityType').value,
        category: document.getElementById('opportunityCategory').value,
        company: document.getElementById('opportunityCompany').value,
        location: document.getElementById('opportunityLocation').value,
        description: document.getElementById('opportunityDescription').value,
        requirements: document.getElementById('opportunityRequirements').value,
        benefits: document.getElementById('opportunityBenefits').value,
        salary: document.getElementById('opportunitySalary').value,
        link: document.getElementById('opportunityLink').value,
        deadline: document.getElementById('opportunityDeadline').value,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName
    };
    
    try {
        showToast('Creating opportunity...', 'info');
        await db.collection('opportunities').add(opportunity);
        
        // Reset form
        document.getElementById('createOpportunityForm').reset();
        
        // Close modal
        closeModal('createOpportunityModal');
        
        // Show success message
        showToast('Opportunity created successfully!', 'success');
        
        // Reload opportunities
        if (window.location.hash === '#admin') {
            loadAllOpportunitiesForAdmin();
        }
        loadOpportunities();
        loadAllOpportunities();
    } catch (error) {
        console.error('Error creating opportunity:', error);
        showToast('Failed to create opportunity', 'error');
    }
}

// Utility Functions
function getCategoryLabel(category) {
    const categories = {
        'web-dev': 'Web Development',
        'mobile-dev': 'Mobile Development',
        'data-science': 'Data Science',
        'ai-ml': 'AI/ML',
        'cybersecurity': 'Cybersecurity',
        'cloud': 'Cloud Computing'
    };
    return categories[category] || category;
}

function formatDate(date) {
    if (!date) return 'Not specified';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function showLoading(container) {
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

function showError(container, message) {
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function showDashboardTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.classList.add('active');
        
        // Load tab-specific data
        if (tabId === 'profile' && currentUser) {
            loadUserProfileForDashboard();
        }
    }
    
    // Activate corresponding menu item
    const menuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
}

function showAdminTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.classList.add('active');
        
        // Load tab-specific data
        switch(tabId) {
            case 'manage-opportunities':
                loadAllOpportunitiesForAdmin();
                break;
            case 'manage-events':
                loadAllEventsForAdmin();
                break;
            case 'manage-users':
                loadAllUsers();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'categories':
                loadCategories();
                break;
            case 'user-logs':
                loadUserLogs();
                break;
        }
    }
    
    // Activate corresponding menu item
    const menuItem = document.querySelector(`.admin-menu-item[data-admin-tab="${tabId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
}

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Apply active filters to opportunities
 * Filters by type and/or category based on current filter settings
 * Updates the display and shows filter status
 */
function applyFilters() {
    // Get filter values
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const selectedType = typeFilter ? typeFilter.value : 'all';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    // Update current filters
    currentFilters.type = selectedType;
    currentFilters.category = selectedCategory;
    
    // Filter opportunities
    let filtered = [...allOpportunities];
    
    // Filter by type
    if (selectedType !== 'all') {
        filtered = filtered.filter(opp => opp.type === selectedType);
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
        filtered = filtered.filter(opp => opp.category === selectedCategory);
    }
    
    // Update opportunities array with filtered results
    opportunities = filtered;
    
    // Display filtered opportunities
    displayAllOpportunities();
    
    // Update clear filters button visibility
    updateClearFiltersButton();
    
    // Show filter status in the UI
    updateFilterStatus(filtered.length, allOpportunities.length);
}

function updateClearFiltersButton() {
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    const hasActiveFilters = (typeFilter && typeFilter.value !== 'all') || 
                            (categoryFilter && categoryFilter.value !== 'all');
    
    if (clearFiltersBtn) {
        clearFiltersBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }
}

function updateFilterStatus(filteredCount, totalCount) {
    // Find or create filter status element
    let statusElement = document.getElementById('filterStatus');
    if (!statusElement) {
        const filtersDiv = document.querySelector('.filters');
        if (filtersDiv) {
            statusElement = document.createElement('div');
            statusElement.id = 'filterStatus';
            statusElement.style.cssText = 'margin-top: 1rem; color: var(--gray-color); font-size: 0.9rem;';
            filtersDiv.appendChild(statusElement);
        }
    }
    
    if (statusElement) {
        if (filteredCount < totalCount) {
            statusElement.textContent = `Showing ${filteredCount} of ${totalCount} opportunities`;
            statusElement.style.display = 'block';
        } else {
            statusElement.textContent = `Showing all ${totalCount} opportunities`;
            statusElement.style.display = 'block';
        }
    }
}

function filterOpportunitiesByCategory(category) {
    // Navigate to opportunities section
    showSection('opportunities');
    
    // Set the category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = category;
    }
    
    // Apply filters
    applyFilters();
}

function filterOpportunitiesByType(type) {
    // Navigate to opportunities section
    showSection('opportunities');
    
    // Set the type filter
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.value = type;
    }
    
    // Apply filters
    applyFilters();
}

function clearFilters() {
    // Reset filter dropdowns
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (typeFilter) typeFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';
    
    // Update current filters
    currentFilters.type = 'all';
    currentFilters.category = 'all';
    
    // Apply filters (will show all)
    applyFilters();
    
    showToast('Filters cleared', 'info');
}

// Additional admin functions
async function editOpportunity(opportunityId) {
    try {
        const doc = await db.collection('opportunities').doc(opportunityId).get();
        if (!doc.exists) {
            showToast('Opportunity not found', 'error');
            return;
        }
        
        const opp = { id: doc.id, ...doc.data() };
        
        // Populate form
        document.getElementById('editOpportunityId').value = opp.id;
        document.getElementById('editOpportunityTitle').value = opp.title || '';
        document.getElementById('editOpportunityType').value = opp.type || '';
        document.getElementById('editOpportunityCategory').value = opp.category || '';
        document.getElementById('editOpportunityCompany').value = opp.company || '';
        document.getElementById('editOpportunityLocation').value = opp.location || '';
        document.getElementById('editOpportunityDescription').value = opp.description || '';
        document.getElementById('editOpportunityRequirements').value = opp.requirements || '';
        document.getElementById('editOpportunityBenefits').value = opp.benefits || '';
        document.getElementById('editOpportunitySalary').value = opp.salary || '';
        document.getElementById('editOpportunityLink').value = opp.link || '';
        document.getElementById('editOpportunityStatus').value = opp.status || 'active';
        
        // Format date for input
        if (opp.deadline) {
            let deadlineDate;
            if (opp.deadline.toDate) {
                deadlineDate = opp.deadline.toDate();
            } else if (opp.deadline instanceof Date) {
                deadlineDate = opp.deadline;
            } else {
                deadlineDate = new Date(opp.deadline);
            }
            document.getElementById('editOpportunityDeadline').value = deadlineDate.toISOString().split('T')[0];
        } else {
            document.getElementById('editOpportunityDeadline').value = '';
        }
        
        showModal('editOpportunityModal');
    } catch (error) {
        console.error('Error loading opportunity for edit:', error);
        showToast('Failed to load opportunity', 'error');
    }
}

async function deleteOpportunity(opportunityId) {
    if (confirm('Are you sure you want to delete this opportunity?')) {
        try {
            await db.collection('opportunities').doc(opportunityId).delete();
            showToast('Opportunity deleted successfully', 'success');
            
            // Reload all relevant data
            if (window.location.hash === '#admin') {
                loadAllOpportunitiesForAdmin();
                loadAllEventsForAdmin();
            }
            loadOpportunities();
            loadAllOpportunities();
            loadEvents();
        } catch (error) {
            console.error('Error deleting opportunity:', error);
            showToast('Failed to delete opportunity', 'error');
        }
    }
}

async function makeAdmin(userId) {
    if (confirm('Are you sure you want to make this user an admin?')) {
        try {
            await db.collection('users').doc(userId).update({
                role: 'admin'
            });
            showToast('User promoted to admin', 'success');
            loadAllUsers();
        } catch (error) {
            console.error('Error promoting user:', error);
            showToast('Failed to promote user', 'error');
        }
    }
}

async function removeAdmin(userId) {
    // Prevent removing admin from current user
    if (userId === currentUser?.uid) {
        showToast('You cannot remove admin privileges from yourself', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to remove admin privileges from this user?')) {
        try {
            await db.collection('users').doc(userId).update({
                role: 'user'
            });
            showToast('Admin privileges removed successfully', 'success');
            loadAllUsers();
        } catch (error) {
            console.error('Error removing admin privileges:', error);
            showToast('Failed to remove admin privileges', 'error');
        }
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await db.collection('users').doc(userId).delete();
            showToast('User deleted successfully', 'success');
            loadAllUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Failed to delete user', 'error');
        }
    }
}

async function removeSaved(opportunityId) {
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('saved').doc(opportunityId).delete();
        showToast('Removed from saved', 'success');
        loadSavedOpportunities();
    } catch (error) {
        console.error('Error removing saved:', error);
        showToast('Failed to remove from saved', 'error');
    }
}

async function markNotificationRead(notificationId) {
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('notifications').doc(notificationId).update({
                read: true
            });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function viewApplication(applicationId) {
    // Implementation for viewing application details
    showToast('View application details feature coming soon', 'info');
}

// Export functions for HTML onclick handlers
window.showModal = showModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.showSection = showSection;
window.showOpportunityDetails = showOpportunityDetails;
window.removeSaved = removeSaved;
window.markNotificationRead = markNotificationRead;
window.viewApplication = viewApplication;
window.editOpportunity = editOpportunity;
window.deleteOpportunity = deleteOpportunity;
window.makeAdmin = makeAdmin;
window.deleteUser = deleteUser;
window.clearFilters = clearFilters;
window.applyFilters = applyFilters;
window.filterOpportunitiesByCategory = filterOpportunitiesByCategory;
window.filterOpportunitiesByType = filterOpportunitiesByType;
window.removeAdmin = removeAdmin;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.approveEvent = approveEvent;
window.exportLogsToPDF = exportLogsToPDF;
window.clearAllLogs = clearAllLogs;
window.deleteLog = deleteLog;

// Events Functions
async function loadEvents() {
    try {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return;
        
        showLoading(eventsList);
        
        let snapshot;
        try {
            snapshot = await db.collection('opportunities')
                .where('status', '==', 'active')
                .where('type', '==', 'event')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (indexError) {
            // Firestore index warning - this is expected and handled gracefully
            // The app will work without the index, but creating it improves performance
            if (indexError.code === 'failed-precondition') {
                console.info('Firestore index not found, using fallback query. This is normal and the app will work correctly.');
            } else {
                console.warn('Index error, trying alternative query:', indexError);
            }
            try {
                snapshot = await db.collection('opportunities')
                    .where('status', '==', 'active')
                    .where('type', '==', 'event')
                    .get();
            } catch (statusError) {
                console.warn('Status filter error, loading all events:', statusError);
                snapshot = await db.collection('opportunities')
                    .where('type', '==', 'event')
                    .get();
            }
        }
        
        const events = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.status || data.status === 'active') {
                events.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort by date if available
        events.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
            return bDate - aDate;
        });
        
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        const eventsList = document.getElementById('eventsList');
        if (eventsList) {
            showError(eventsList, 'Failed to load events');
        }
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    if (!events.length) {
        eventsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <h3>No events found</h3>
                <p>Check back later for upcoming tech events</p>
            </div>
        `;
        return;
    }
    
    eventsList.innerHTML = events.map(event => createOpportunityCard(event)).join('');
    attachOpportunityCardListeners();
}

// Profile Functions
async function loadUserProfileForDashboard() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const userData = doc.data();
            
            // Populate profile form
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profilePhone = document.getElementById('profilePhone');
            const profileSkills = document.getElementById('profileSkills');
            const profileBio = document.getElementById('profileBio');
            
            if (profileName) profileName.value = userData.name || currentUser.displayName || '';
            if (profileEmail) profileEmail.value = userData.email || currentUser.email || '';
            if (profilePhone) profilePhone.value = userData.phone || '';
            if (profileSkills) profileSkills.value = userData.skills ? userData.skills.join(', ') : '';
            if (profileBio) profileBio.value = userData.bio || '';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login to update profile', 'error');
        return;
    }
    
    try {
        const name = document.getElementById('profileName').value;
        const phone = document.getElementById('profilePhone').value;
        const skills = document.getElementById('profileSkills').value.split(',').map(s => s.trim()).filter(s => s);
        const bio = document.getElementById('profileBio').value;
        
        const updateData = {
            name: name,
            phone: phone,
            skills: skills,
            bio: bio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        // Update display name in Firebase Auth
        if (name && name !== currentUser.displayName) {
            await currentUser.updateProfile({
                displayName: name
            });
        }
        
        // Log the action
        await logUserAction('update_profile', 'Updated profile information', {});
        
        // Update UI
        if (elements.userName) elements.userName.textContent = name;
        const userSpan = elements.userDropdown.querySelector('span');
        if (userSpan) userSpan.textContent = name;
        
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

// Categories Management Functions
async function loadCategories() {
    try {
        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;
        
        // Default categories
        const defaultCategories = [
            { id: 'web-dev', name: 'Web Development', description: 'Frontend and backend web technologies' },
            { id: 'mobile-dev', name: 'Mobile Development', description: 'iOS, Android, and cross-platform mobile apps' },
            { id: 'data-science', name: 'Data Science', description: 'Data analysis, machine learning, and analytics' },
            { id: 'ai-ml', name: 'AI/ML', description: 'Artificial Intelligence and Machine Learning' },
            { id: 'cybersecurity', name: 'Cybersecurity', description: 'Security, encryption, and threat protection' },
            { id: 'cloud', name: 'Cloud Computing', description: 'Cloud platforms and infrastructure' }
        ];
        
        // Try to load custom categories from Firestore
        let customCategories = [];
        try {
            const snapshot = await db.collection('categories').orderBy('name').get();
            customCategories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.warn('Could not load custom categories, using defaults:', error);
        }
        
        // Combine default and custom categories
        const allCategories = [...defaultCategories, ...customCategories.filter(c => !defaultCategories.find(d => d.id === c.id))];
        
        displayCategories(allCategories);
        console.log(`Loaded ${allCategories.length} categories (${defaultCategories.length} default, ${customCategories.length} custom)`);
    } catch (error) {
        console.error('Error loading categories:', error);
        const categoriesList = document.getElementById('categoriesList');
        if (categoriesList) {
            showError(categoriesList, 'Failed to load categories');
        }
    }
}

function displayCategories(categories) {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    if (!categories.length) {
        categoriesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <h3>No categories found</h3>
            </div>
        `;
        return;
    }
    
    categoriesList.innerHTML = categories.map(category => `
        <div class="category-item" data-id="${category.id}">
            <div class="category-item-content">
                <h3>${category.name}</h3>
                <p>${category.description || 'No description'}</p>
                <span class="category-id">ID: ${category.id}</span>
            </div>
            <div class="category-item-actions">
                <button class="btn-secondary" onclick="editCategory('${category.id}')" title="Edit Category">
                    <i class="fas fa-edit"></i>
                </button>
                ${category.id.startsWith('custom-') || !['web-dev', 'mobile-dev', 'data-science', 'ai-ml', 'cybersecurity', 'cloud'].includes(category.id) ? `
                <button class="btn-danger" onclick="deleteCategory('${category.id}')" title="Delete Category">
                    <i class="fas fa-trash"></i>
                </button>
                ` : `
                <span class="category-default-badge">Default</span>
                `}
            </div>
        </div>
    `).join('');
}

function showAddCategoryModal() {
    const name = prompt('Enter category name:');
    if (!name || !name.trim()) return;
    
    const description = prompt('Enter category description (optional):') || '';
    const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    addCategory(id, name.trim(), description.trim());
}

async function addCategory(id, name, description) {
    try {
        await db.collection('categories').doc(id).set({
            name: name,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Category added successfully!', 'success');
        loadCategories();
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('Failed to add category', 'error');
    }
}

async function editCategory(categoryId) {
    const name = prompt('Enter new category name:');
    if (!name || !name.trim()) return;
    
    const description = prompt('Enter new category description (optional):') || '';
    
    try {
        await db.collection('categories').doc(categoryId).update({
            name: name.trim(),
            description: description.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Category updated successfully!', 'success');
        loadCategories();
    } catch (error) {
        console.error('Error updating category:', error);
        showToast('Failed to update category', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        await db.collection('categories').doc(categoryId).delete();
        showToast('Category deleted successfully!', 'success');
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    }
}

// User Logs Functions
async function loadUserLogs() {
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const tableElement = document.getElementById('userLogsTable');
        if (!tableElement) {
            console.warn('userLogsTable element not found');
            return;
        }
        
        console.log('Loading user logs...');
        
        // Show loading state
        tableElement.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading logs...</p>
                    </div>
                </td>
            </tr>
        `;
        
        const snapshot = await db.collection('userLogs')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        tableElement.innerHTML = '';
        
        if (snapshot.empty) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-history"></i>
                            <h3>No logs found</h3>
                            <p>User activity logs will appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        snapshot.forEach((doc) => {
            const log = { id: doc.id, ...doc.data() };
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.userName || log.userId || 'Unknown'}</td>
                <td>${log.action || 'N/A'}</td>
                <td>${log.details || 'No details'}</td>
                <td>${formatDate(log.timestamp?.toDate())}</td>
                <td class="table-actions">
                    <button class="btn-danger" onclick="deleteLog('${log.id}')" title="Delete Log">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableElement.appendChild(row);
        });
        
        console.log(`Loaded ${snapshot.size} user logs`);
    } catch (error) {
        console.error('Error loading user logs:', error);
        const tableElement = document.getElementById('userLogsTable');
        if (tableElement) {
            tableElement.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error loading logs</h3>
                            <p>${error.message || 'Please try again later'}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Log user action
async function logUserAction(action, details, metadata = {}) {
    if (!currentUser) return;
    
    try {
        await db.collection('userLogs').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Unknown',
            userEmail: currentUser.email,
            action: action,
            details: details,
            metadata: metadata,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging user action:', error);
        // Don't show error to user as logging is non-critical
    }
}

// Delete single log
async function deleteLog(logId) {
    if (!confirm('Are you sure you want to delete this log entry?')) return;
    
    try {
        await db.collection('userLogs').doc(logId).delete();
        showToast('Log deleted successfully', 'success');
        loadUserLogs();
    } catch (error) {
        console.error('Error deleting log:', error);
        showToast('Failed to delete log', 'error');
    }
}

// Clear all logs
async function clearAllLogs() {
    if (!confirm('Are you sure you want to delete ALL user logs? This action cannot be undone.')) return;
    
    try {
        showToast('Deleting all logs...', 'info');
        const snapshot = await db.collection('userLogs').get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        showToast('All logs deleted successfully', 'success');
        loadUserLogs();
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Failed to clear logs', 'error');
    }
}

// Export logs to PDF
async function exportLogsToPDF() {
    try {
        showToast('Generating PDF...', 'info');
        const snapshot = await db.collection('userLogs')
            .orderBy('timestamp', 'desc')
            .limit(500)
            .get();
        
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        
        // Create PDF content
        let pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>User Activity Logs</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #2563eb; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #2563eb; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>User Activity Logs Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Logs: ${logs.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            pdfContent += `
                <tr>
                    <td>${log.userName || log.userId || 'Unknown'}</td>
                    <td>${log.action || 'N/A'}</td>
                    <td>${log.details || 'No details'}</td>
                    <td>${formatDate(log.timestamp?.toDate())}</td>
                </tr>
            `;
        });
        
        pdfContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        // Open in new window for printing/saving as PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        printWindow.print();
        
        showToast('PDF ready for printing/download', 'success');
    } catch (error) {
        console.error('Error exporting logs to PDF:', error);
        showToast('Failed to export logs', 'error');
    }
}

// Approve event (admin only)
async function approveEvent(eventId) {
    if (!currentUser || userRole !== 'admin') {
        showToast('Only admins can approve events', 'error');
        return;
    }
    
    try {
        await db.collection('opportunities').doc(eventId).update({
            status: 'active',
            requiresApproval: false,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentUser.uid,
            approvedByName: currentUser.displayName
        });
        
        // Log the action
        await logUserAction('approve_event', `Approved event: ${eventId}`, { eventId });
        
        showToast('Event approved and published!', 'success');
        loadAllEventsForAdmin();
        loadEvents();
    } catch (error) {
        console.error('Error approving event:', error);
        showToast('Failed to approve event', 'error');
    }
}