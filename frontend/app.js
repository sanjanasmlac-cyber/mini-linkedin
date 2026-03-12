// ═══════════════════════════════════════════════════════════════
//  Mini AI LinkedIn - Frontend Application
// ═══════════════════════════════════════════════════════════════

// ─── Configuration ──────────────────────────────────────────
const API_URL = window.location.origin + '/api';
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=0a66c2&color=fff&bold=true&name=';

// ─── Firebase Configuration ─────────────────────────────────
// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAoQCsAuGMJB-JD1gH-Omq9UE6O_lWphUc",
  authDomain: "mini-linkedin-cee0a.firebaseapp.com",
  projectId: "mini-linkedin-cee0a",
  storageBucket: "mini-linkedin-cee0a.firebasestorage.app",
  messagingSenderId: "224762718139",
  appId: "1:224762718139:web:db4406b1b58bed84dcc69e",
  measurementId: "G-NNDDWYR0NT"
};

// Initialize Firebase (only if configured)
let firebaseInitialized = false;
try {
  if (firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
    console.log('✅ Firebase initialized');
  } else {
    console.warn('⚠️ Firebase not configured. Using development mode.');
  }
} catch (e) {
  console.warn('⚠️ Firebase initialization failed. Using development mode.');
}

// ─── App State ──────────────────────────────────────────────
let currentUser = null;
let authToken = null;
let currentPage = 'feed';
let feedPage = 1;
let feedHasMore = true;
let viewingUserId = null;
let editSkills = [];

// ─── Initialization ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  // Check for saved session
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showAuth();
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu && !profileMenu.closest('.relative')?.contains(e.target)) {
      profileMenu.classList.add('hidden');
    }
    const searchResults = document.getElementById('searchResults');
    if (searchResults && !e.target.closest('#searchInput')?.parentElement?.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

function switchAuthTab(tab) {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (tab === 'login') {
    loginTab.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-linkedin-500 text-white';
    signupTab.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-dark-300 hover:text-white';
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  } else {
    signupTab.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-linkedin-500 text-white';
    loginTab.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all text-dark-300 hover:text-white';
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  
  const btn = document.getElementById('signupBtn');
  btn.textContent = 'Creating Account...';
  btn.disabled = true;

  try {
    let firebaseId, token;

    if (firebaseInitialized) {
      // Use Firebase Auth
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      firebaseId = userCredential.user.uid;
      token = await userCredential.user.getIdToken();
    } else {
      // Dev mode: create a fake token
      firebaseId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      token = btoa(JSON.stringify({ uid: firebaseId, email, name }));
    }

    // Register in our backend
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, firebaseId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    authToken = token;
    currentUser = data.user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showToast('Welcome to Mini LinkedIn! 🎉', 'success');
    showApp();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Signing In...';
  btn.disabled = true;

  try {
    let firebaseId, token, name;

    if (firebaseInitialized) {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      firebaseId = userCredential.user.uid;
      token = await userCredential.user.getIdToken();
      name = userCredential.user.displayName || email.split('@')[0];
    } else {
      // Dev mode: find user by email in backend or create
      firebaseId = 'dev_' + btoa(email).replace(/=/g, '');
      name = email.split('@')[0];
      token = btoa(JSON.stringify({ uid: firebaseId, email, name }));
    }

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firebaseId, name })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    authToken = token;
    currentUser = data.user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showToast('Welcome back! 👋', 'success');
    showApp();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

async function handleDevLogin() {
  const devEmail = 'demo@minilinkedin.com';
  const devFirebaseId = 'dev_demo_user_001';
  const devName = 'Demo User';
  const token = btoa(JSON.stringify({ uid: devFirebaseId, email: devEmail, name: devName }));

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: devEmail, 
        firebaseId: devFirebaseId, 
        name: devName,
        profilePic: ''
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    authToken = token;
    currentUser = data.user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showToast('Logged in as Demo User 🚀', 'success');
    showApp();
  } catch (error) {
    showToast('Failed to connect to server. Make sure the backend is running.', 'error');
  }
}

function handleLogout() {
  if (firebaseInitialized) {
    firebase.auth().signOut();
  }
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  showAuth();
  showToast('Signed out successfully', 'info');
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════

function showAuth() {
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('appPage').classList.add('hidden');
  lucide.createIcons();
}

function showApp() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  updateNavProfile();
  navigateTo('feed');
}

function navigateTo(page, userId = null) {
  currentPage = page;
  
  // Hide all pages
  ['feedPage', 'profilePage', 'editProfilePage', 'notificationsPage', 'networkPage', 'otherProfilePage'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  // Update nav active states
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.querySelector('i')?.classList.remove('text-linkedin-400');
    btn.querySelector('i')?.classList.add('text-dark-300');
  });

  switch (page) {
    case 'feed':
      document.getElementById('feedPage').classList.remove('hidden');
      document.getElementById('navFeed')?.querySelector('i')?.classList.add('text-linkedin-400');
      document.getElementById('navFeed')?.querySelector('i')?.classList.remove('text-dark-300');
      loadFeed();
      loadSuggestedUsers();
      updateSidebar();
      break;
    case 'profile':
      document.getElementById('profilePage').classList.remove('hidden');
      viewingUserId = userId || currentUser?._id;
      loadProfile(viewingUserId);
      break;
    case 'edit-profile':
      document.getElementById('editProfilePage').classList.remove('hidden');
      loadEditProfile();
      break;
    case 'notifications':
      document.getElementById('notificationsPage').classList.remove('hidden');
      document.getElementById('navNotifications')?.querySelector('i')?.classList.add('text-linkedin-400');
      document.getElementById('navNotifications')?.querySelector('i')?.classList.remove('text-dark-300');
      loadNotifications();
      break;
    case 'network':
      document.getElementById('networkPage').classList.remove('hidden');
      document.getElementById('navNetwork')?.querySelector('i')?.classList.add('text-linkedin-400');
      document.getElementById('navNetwork')?.querySelector('i')?.classList.remove('text-dark-300');
      loadNetwork();
      break;
    case 'other-profile':
      document.getElementById('profilePage').classList.remove('hidden');
      viewingUserId = userId;
      loadProfile(userId);
      break;
  }

  lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Update Nav Profile ─────────────────────────────────────
function updateNavProfile() {
  if (!currentUser) return;
  const avatar = currentUser.profilePic || DEFAULT_AVATAR + encodeURIComponent(currentUser.name);
  
  document.getElementById('navProfilePic').src = avatar;
  document.getElementById('menuProfilePic').src = avatar;
  document.getElementById('menuName').textContent = currentUser.name;
  document.getElementById('menuHeadline').textContent = currentUser.headline || 'Add a headline';
  
  lucide.createIcons();
  checkUnreadNotifications();
}

function toggleProfileMenu() {
  document.getElementById('profileMenu').classList.toggle('hidden');
}

// ─── Update Sidebar ─────────────────────────────────────────
function updateSidebar() {
  if (!currentUser) return;
  const avatar = currentUser.profilePic || DEFAULT_AVATAR + encodeURIComponent(currentUser.name);
  
  document.getElementById('sidebarProfilePic').src = avatar;
  document.getElementById('createPostPic').src = avatar;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarHeadline').textContent = currentUser.headline || currentUser.bio || 'Add a headline';
  document.getElementById('sidebarConnections').textContent = currentUser.connections?.length || 0;
}

// ═══════════════════════════════════════════════════════════════
//  FEED
// ═══════════════════════════════════════════════════════════════

async function loadFeed(reset = true) {
  if (reset) {
    feedPage = 1;
    feedHasMore = true;
    document.getElementById('feedContainer').innerHTML = '';
  }

  const loadingEl = document.getElementById('feedLoading');
  if (reset) loadingEl.classList.remove('hidden');

  try {
    const response = await apiFetch(`/posts?page=${feedPage}&limit=10`);
    const data = await response.json();

    loadingEl.classList.add('hidden');

    if (data.posts.length === 0 && feedPage === 1) {
      document.getElementById('emptyFeed').classList.remove('hidden');
      document.getElementById('loadMoreContainer').classList.add('hidden');
      return;
    }

    document.getElementById('emptyFeed').classList.add('hidden');

    data.posts.forEach(post => {
      document.getElementById('feedContainer').innerHTML += renderPostCard(post);
    });

    // Update sidebar post count  
    const userPostCount = data.posts.filter(p => p.userId?._id === currentUser?._id).length;
    document.getElementById('sidebarPosts').textContent = userPostCount || currentUser?.postCount || 0;

    if (data.pagination.page >= data.pagination.pages) {
      feedHasMore = false;
      document.getElementById('loadMoreContainer').classList.add('hidden');
    } else {
      document.getElementById('loadMoreContainer').classList.remove('hidden');
    }

    lucide.createIcons();
  } catch (error) {
    loadingEl.classList.add('hidden');
    console.error('Load feed error:', error);
  }
}

function loadMorePosts() {
  if (!feedHasMore) return;
  feedPage++;
  loadFeed(false);
}

// ─── Render Post Card ───────────────────────────────────────
function renderPostCard(post) {
  const user = post.userId || {};
  const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name || 'User');
  const isLiked = post.likes?.includes(currentUser?._id);
  const timeAgo = getTimeAgo(post.createdAt);
  const isOwner = user._id === currentUser?._id;

  let skillTags = '';
  if (post.detectedSkills?.length > 0) {
    skillTags = `
      <div class="flex flex-wrap gap-1.5 mt-3">
        ${post.detectedSkills.map(skill => 
          `<span class="skill-tag px-2.5 py-1 rounded-lg text-xs text-linkedin-300">${escapeHtml(skill)}</span>`
        ).join('')}
      </div>
    `;
  }

  let imageBlock = '';
  if (post.imageUrl) {
    imageBlock = `
      <div class="mt-3 rounded-xl overflow-hidden">
        <img src="${post.imageUrl}" alt="Post image" class="w-full object-cover max-h-96 hover:scale-[1.02] transition-transform duration-300" loading="lazy">
      </div>
    `;
  }

  const commentsHtml = post.comments?.slice(-3).map(comment => {
    const commentUser = comment.userId || {};
    const commentAvatar = commentUser.profilePic || DEFAULT_AVATAR + encodeURIComponent(commentUser.name || 'User');
    return `
      <div class="flex gap-2 py-2">
        <img src="${commentAvatar}" alt="" class="w-7 h-7 rounded-full object-cover flex-shrink-0 cursor-pointer" onclick="navigateTo('other-profile', '${commentUser._id}')">
        <div class="flex-1 bg-dark-700/50 rounded-xl px-3 py-2">
          <p class="text-xs font-semibold text-white cursor-pointer hover:text-linkedin-400" onclick="navigateTo('other-profile', '${commentUser._id}')">${escapeHtml(commentUser.name || 'User')}</p>
          <p class="text-xs text-dark-300 mt-0.5">${escapeHtml(comment.text)}</p>
        </div>
      </div>
    `;
  }).join('') || '';

  return `
    <div class="glass rounded-2xl overflow-hidden post-card animate-fade-in" id="post-${post._id}">
      <!-- Post Header -->
      <div class="p-4 pb-0">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3 cursor-pointer" onclick="navigateTo('other-profile', '${user._id}')">
            <img src="${avatar}" alt="${escapeHtml(user.name)}" class="w-10 h-10 rounded-full object-cover">
            <div>
              <h4 class="text-sm font-semibold text-white hover:text-linkedin-400 transition-colors">${escapeHtml(user.name || 'User')}</h4>
              <p class="text-xs text-dark-400">${escapeHtml(user.headline || '')} • ${timeAgo}</p>
            </div>
          </div>
          ${isOwner ? `
            <button onclick="deletePost('${post._id}')" class="p-1.5 rounded-lg hover:bg-dark-700 transition-all" title="Delete post">
              <i data-lucide="trash-2" class="w-4 h-4 text-dark-400 hover:text-red-400"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Post Content -->
      <div class="px-4 mt-3">
        <p class="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">${escapeHtml(post.caption)}</p>
        ${skillTags}
      </div>

      ${imageBlock}

      <!-- Post Actions -->
      <div class="p-4 pt-3">
        <div class="flex items-center justify-between text-xs text-dark-400 mb-3">
          <span>${post.likes?.length || 0} likes</span>
          <span>${post.comments?.length || 0} comments</span>
        </div>

        <div class="flex gap-1 border-t border-dark-700/50 pt-3">
          <button onclick="toggleLike('${post._id}')" class="like-btn ${isLiked ? 'liked' : ''} flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-dark-700/50 transition-all text-sm ${isLiked ? 'text-red-400' : 'text-dark-300'}">
            <i data-lucide="heart" class="w-4 h-4 ${isLiked ? 'fill-red-400' : ''}"></i> Like
          </button>
          <button onclick="toggleCommentBox('${post._id}')" class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-dark-700/50 transition-all text-dark-300 text-sm">
            <i data-lucide="message-circle" class="w-4 h-4"></i> Comment
          </button>
          <button onclick="sharePost('${post._id}')" class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-dark-700/50 transition-all text-dark-300 text-sm">
            <i data-lucide="share-2" class="w-4 h-4"></i> Share
          </button>
        </div>

        <!-- Comments Section -->
        <div id="comments-${post._id}" class="mt-3 ${post.comments?.length > 0 ? '' : 'hidden'}">
          ${commentsHtml}
        </div>

        <!-- Comment Input (hidden by default) -->
        <div id="commentBox-${post._id}" class="hidden mt-3 flex gap-2">
          <img src="${currentUser?.profilePic || DEFAULT_AVATAR + encodeURIComponent(currentUser?.name || 'User')}" alt="" class="w-8 h-8 rounded-full object-cover flex-shrink-0">
          <div class="flex-1 flex gap-2">
            <input type="text" id="commentInput-${post._id}" placeholder="Write a comment..."
              class="input-dark flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-dark-400"
              onkeydown="if(event.key==='Enter') addComment('${post._id}')">
            <button onclick="addComment('${post._id}')" class="px-3 py-2 rounded-xl bg-linkedin-500 text-white text-sm hover:bg-linkedin-600 transition-all">
              <i data-lucide="send" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
//  POST ACTIONS
// ═══════════════════════════════════════════════════════════════

function openCreatePostModal() {
  document.getElementById('createPostModal').classList.remove('hidden');
  document.getElementById('postCaption').focus();
  lucide.createIcons();
}

function closeCreatePostModal() {
  document.getElementById('createPostModal').classList.add('hidden');
  document.getElementById('createPostForm').reset();
  removePostImage();
}

async function handleCreatePost(e) {
  e.preventDefault();
  const caption = document.getElementById('postCaption').value.trim();
  const imageFile = document.getElementById('postImage').files[0];

  if (!caption) return;

  const btn = document.getElementById('createPostBtn');
  btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Posting...';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('caption', caption);
    if (imageFile) formData.append('image', imageFile);

    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    closeCreatePostModal();
    showToast('Post created successfully! ✨', 'success');
    
    // Reload feed
    loadFeed(true);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Post';
    btn.disabled = false;
    lucide.createIcons();
  }
}

function previewPostImage(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    document.getElementById('postImagePreview').src = event.target.result;
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
    document.getElementById('imageUploadArea').classList.add('hidden');
    lucide.createIcons();
  };
  reader.readAsDataURL(file);
}

function removePostImage() {
  document.getElementById('postImage').value = '';
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('imageUploadArea').classList.remove('hidden');
}

async function toggleLike(postId) {
  try {
    const response = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Reload feed to reflect changes
    loadFeed(true);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function toggleCommentBox(postId) {
  const commentBox = document.getElementById(`commentBox-${postId}`);
  const commentsSection = document.getElementById(`comments-${postId}`);
  commentBox.classList.toggle('hidden');
  commentsSection.classList.remove('hidden');
  
  if (!commentBox.classList.contains('hidden')) {
    document.getElementById(`commentInput-${postId}`).focus();
  }
  lucide.createIcons();
}

async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  try {
    const response = await apiFetch(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    input.value = '';
    loadFeed(true);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const response = await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    showToast('Post deleted', 'info');
    loadFeed(true);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function sharePost(postId) {
  const url = `${window.location.origin}?post=${postId}`;
  navigator.clipboard?.writeText(url);
  showToast('Link copied to clipboard! 🔗', 'success');
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

async function loadProfile(userId) {
  try {
    const response = await apiFetch(`/users/${userId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const user = data.user;
    const isOwner = user._id === currentUser?._id;
    const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name);

    document.getElementById('profilePicLarge').src = avatar;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileHeadline').textContent = user.headline || 'No headline yet';
    document.getElementById('profileBio').textContent = user.bio || 'No bio yet. Tell us about yourself!';
    document.getElementById('profileEducation').textContent = user.education || 'Not specified';
    
    const locationEl = document.getElementById('profileLocation');
    if (user.location) {
      locationEl.classList.remove('hidden');
      locationEl.querySelector('span').textContent = user.location;
    } else {
      locationEl.classList.add('hidden');
    }

    document.getElementById('profileConnectionCount').querySelector('span').textContent = 
      `${user.connections?.length || 0} connections`;

    // Skills
    const skillsContainer = document.getElementById('profileSkills');
    if (user.skills?.length > 0) {
      skillsContainer.innerHTML = user.skills.map(skill =>
        `<span class="skill-tag px-3 py-1.5 rounded-lg text-xs text-linkedin-300 font-medium">${escapeHtml(skill)}</span>`
      ).join('');
    } else {
      skillsContainer.innerHTML = '<p class="text-dark-400 text-sm">No skills added yet</p>';
    }

    // Show/hide buttons
    document.getElementById('editProfileBtn').classList.toggle('hidden', !isOwner);
    document.getElementById('connectBtn').classList.toggle('hidden', isOwner);
    
    if (!isOwner) {
      const isConnected = currentUser?.connections?.includes(userId);
      const connectBtn = document.getElementById('connectBtn');
      if (isConnected) {
        connectBtn.innerHTML = '<i data-lucide="user-check" class="w-4 h-4"></i> Connected';
        connectBtn.classList.add('bg-linkedin-500/10');
      } else {
        connectBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i> Connect';
        connectBtn.classList.remove('bg-linkedin-500/10');
      }
    }

    // Load user's posts
    loadUserPosts(userId);
    lucide.createIcons();
  } catch (error) {
    showToast('Failed to load profile', 'error');
    navigateTo('feed');
  }
}

async function loadUserPosts(userId) {
  try {
    const response = await apiFetch(`/posts/user/${userId}`);
    const data = await response.json();

    const container = document.getElementById('profilePosts');
    const noPostsEl = document.getElementById('profileNoPosts');

    if (data.posts.length === 0) {
      container.innerHTML = '';
      noPostsEl.classList.remove('hidden');
    } else {
      noPostsEl.classList.add('hidden');
      container.innerHTML = data.posts.map(post => renderPostCard(post)).join('');
    }

    lucide.createIcons();
  } catch (error) {
    console.error('Load user posts error:', error);
  }
}

// ─── Edit Profile ───────────────────────────────────────────
function loadEditProfile() {
  if (!currentUser) return;
  
  const avatar = currentUser.profilePic || DEFAULT_AVATAR + encodeURIComponent(currentUser.name);
  document.getElementById('editProfilePic').src = avatar;
  document.getElementById('editName').value = currentUser.name || '';
  document.getElementById('editHeadline').value = currentUser.headline || '';
  document.getElementById('editBio').value = currentUser.bio || '';
  document.getElementById('editLocation').value = currentUser.location || '';
  document.getElementById('editEducation').value = currentUser.education || '';
  
  editSkills = [...(currentUser.skills || [])];
  renderEditSkills();
  lucide.createIcons();
}

function renderEditSkills() {
  const container = document.getElementById('editSkillTags');
  container.innerHTML = editSkills.map((skill, idx) =>
    `<span class="skill-tag px-3 py-1.5 rounded-lg text-xs text-linkedin-300 flex items-center gap-1.5">
      ${escapeHtml(skill)}
      <button type="button" onclick="removeSkill(${idx})" class="hover:text-red-400 transition-colors">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    </span>`
  ).join('');
  lucide.createIcons();
}

function handleAddSkill(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addSkillFromInput();
  }
}

function addSkillFromInput() {
  const input = document.getElementById('editSkillInput');
  const skill = input.value.trim();
  if (skill && !editSkills.includes(skill)) {
    editSkills.push(skill);
    renderEditSkills();
  }
  input.value = '';
}

function removeSkill(idx) {
  editSkills.splice(idx, 1);
  renderEditSkills();
}

function previewProfilePic(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    document.getElementById('editProfilePic').src = event.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  
  const btn = document.getElementById('saveProfileBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('editName').value.trim());
    formData.append('headline', document.getElementById('editHeadline').value.trim());
    formData.append('bio', document.getElementById('editBio').value.trim());
    formData.append('location', document.getElementById('editLocation').value.trim());
    formData.append('education', document.getElementById('editEducation').value.trim());
    formData.append('skills', JSON.stringify(editSkills));

    const profilePicFile = document.getElementById('editProfilePicFile').files[0];
    if (profilePicFile) {
      formData.append('profilePic', profilePicFile);
    }

    const response = await fetch(`${API_URL}/users/${currentUser._id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateNavProfile();

    showToast('Profile updated successfully! ✅', 'success');
    navigateTo('profile');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
}

async function toggleConnection() {
  if (!viewingUserId) return;

  try {
    const response = await apiFetch(`/users/${viewingUserId}/connect`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Refresh current user data
    const meResponse = await apiFetch('/users/me');
    const meData = await meResponse.json();
    if (meResponse.ok) {
      currentUser = meData.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    showToast(data.connected ? 'Connected! 🤝' : 'Disconnected', data.connected ? 'success' : 'info');
    loadProfile(viewingUserId);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

async function loadNotifications() {
  try {
    const response = await apiFetch('/notifications');
    const data = await response.json();

    const container = document.getElementById('notificationsList');
    const noNotifEl = document.getElementById('noNotifications');

    if (data.notifications.length === 0) {
      container.innerHTML = '';
      noNotifEl.classList.remove('hidden');
    } else {
      noNotifEl.classList.add('hidden');
      container.innerHTML = data.notifications.map(notif => renderNotification(notif)).join('');
    }

    lucide.createIcons();
  } catch (error) {
    console.error('Load notifications error:', error);
  }
}

function renderNotification(notif) {
  const fromUser = notif.fromUserId || {};
  const avatar = fromUser.profilePic || DEFAULT_AVATAR + encodeURIComponent(fromUser.name || 'System');
  const timeAgo = getTimeAgo(notif.createdAt);
  
  const iconMap = {
    'skill-match': 'zap',
    'like': 'heart',
    'comment': 'message-circle',
    'connection': 'user-plus',
    'system': 'bell'
  };
  const colorMap = {
    'skill-match': 'text-yellow-400',
    'like': 'text-red-400',
    'comment': 'text-blue-400',
    'connection': 'text-green-400',
    'system': 'text-dark-300'
  };

  return `
    <div class="flex items-start gap-3 p-4 hover:bg-dark-700/30 transition-all cursor-pointer ${notif.read ? 'opacity-60' : ''}"
      onclick="markNotificationRead('${notif._id}')">
      <div class="relative">
        <img src="${avatar}" alt="" class="w-10 h-10 rounded-full object-cover">
        <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-dark-800 flex items-center justify-center">
          <i data-lucide="${iconMap[notif.type] || 'bell'}" class="w-3 h-3 ${colorMap[notif.type] || 'text-dark-300'}"></i>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-dark-200">${escapeHtml(notif.message)}</p>
        <p class="text-xs text-dark-400 mt-1">${timeAgo}</p>
      </div>
      ${!notif.read ? '<div class="w-2 h-2 rounded-full bg-linkedin-500 mt-2 flex-shrink-0"></div>' : ''}
    </div>
  `;
}

async function markNotificationRead(notifId) {
  try {
    await apiFetch(`/notifications/${notifId}/read`, { method: 'PUT' });
    loadNotifications();
    checkUnreadNotifications();
  } catch (error) {
    console.error('Mark notification read error:', error);
  }
}

async function markAllNotificationsRead() {
  try {
    await apiFetch('/notifications/read-all', { method: 'PUT' });
    loadNotifications();
    checkUnreadNotifications();
    showToast('All notifications marked as read', 'info');
  } catch (error) {
    console.error('Mark all read error:', error);
  }
}

async function checkUnreadNotifications() {
  try {
    const response = await apiFetch('/notifications/unread-count');
    const data = await response.json();
    
    const badge = document.getElementById('notifBadge');
    if (data.count > 0) {
      badge.textContent = data.count > 9 ? '9+' : data.count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (error) {
    // Silently fail
  }
}

// ═══════════════════════════════════════════════════════════════
//  NETWORK
// ═══════════════════════════════════════════════════════════════

async function loadNetwork() {
  try {
    // Load connections
    if (currentUser?.connections?.length > 0) {
      const meResponse = await apiFetch('/users/me');
      const meData = await meResponse.json();
      if (meResponse.ok) {
        currentUser = meData.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    }

    const connectionsList = document.getElementById('connectionsList');
    const noConnections = document.getElementById('noConnections');

    if (currentUser?.connections?.length > 0) {
      noConnections.classList.add('hidden');
      connectionsList.innerHTML = currentUser.connections.map(conn => {
        const user = typeof conn === 'object' ? conn : { _id: conn, name: 'User' };
        const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name || 'User');
        return `
          <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700/30 transition-all cursor-pointer" 
            onclick="navigateTo('other-profile', '${user._id}')">
            <img src="${avatar}" alt="" class="w-10 h-10 rounded-full object-cover">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">${escapeHtml(user.name || 'User')}</p>
              <p class="text-xs text-dark-400 truncate">${escapeHtml(user.headline || '')}</p>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-dark-400"></i>
          </div>
        `;
      }).join('');
    } else {
      noConnections.classList.remove('hidden');
      connectionsList.innerHTML = '';
    }

    // Load suggestions
    const response = await apiFetch('/users?limit=12');
    const data = await response.json();

    const suggestionsContainer = document.getElementById('networkSuggestions');
    suggestionsContainer.innerHTML = data.users
      .filter(u => u._id !== currentUser?._id)
      .map(user => {
        const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name);
        const isConnected = currentUser?.connections?.some(c => (typeof c === 'object' ? c._id : c) === user._id);
        return `
          <div class="glass-light rounded-xl p-4 text-center hover:bg-dark-700/30 transition-all">
            <img src="${avatar}" alt="" class="w-16 h-16 rounded-full object-cover mx-auto mb-3 cursor-pointer" onclick="navigateTo('other-profile', '${user._id}')">
            <p class="text-sm font-semibold text-white cursor-pointer hover:text-linkedin-400" onclick="navigateTo('other-profile', '${user._id}')">${escapeHtml(user.name)}</p>
            <p class="text-xs text-dark-400 mt-0.5 line-clamp-1">${escapeHtml(user.headline || '')}</p>
            ${user.skills?.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2 justify-center">
                ${user.skills.slice(0, 2).map(s => 
                  `<span class="text-[10px] text-linkedin-300 bg-linkedin-500/10 px-2 py-0.5 rounded-full">${escapeHtml(s)}</span>`
                ).join('')}
              </div>
            ` : ''}
            <button onclick="quickConnect('${user._id}', this)" 
              class="mt-3 w-full py-2 rounded-lg text-sm font-medium transition-all ${isConnected 
                ? 'border border-linkedin-500/30 text-linkedin-400 hover:bg-linkedin-500/10' 
                : 'border border-dark-500 text-dark-200 hover:border-linkedin-500 hover:text-linkedin-400'}">
              ${isConnected ? 'Connected' : '+ Connect'}
            </button>
          </div>
        `;
      }).join('');

    lucide.createIcons();
  } catch (error) {
    console.error('Load network error:', error);
  }
}

async function quickConnect(userId, btn) {
  try {
    const response = await apiFetch(`/users/${userId}/connect`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Refresh user data
    const meResponse = await apiFetch('/users/me');
    const meData = await meResponse.json();
    if (meResponse.ok) {
      currentUser = meData.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    btn.textContent = data.connected ? 'Connected' : '+ Connect';
    showToast(data.connected ? 'Connected! 🤝' : 'Disconnected', data.connected ? 'success' : 'info');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ─── Suggested Users (Sidebar) ──────────────────────────────
async function loadSuggestedUsers() {
  try {
    const response = await apiFetch('/users?limit=5');
    const data = await response.json();

    const container = document.getElementById('suggestedUsers');
    const users = data.users.filter(u => u._id !== currentUser?._id).slice(0, 4);

    if (users.length === 0) {
      container.innerHTML = '<p class="text-dark-400 text-xs text-center py-2">No suggestions yet</p>';
      return;
    }

    container.innerHTML = users.map(user => {
      const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name);
      return `
        <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700/30 transition-all cursor-pointer"
          onclick="navigateTo('other-profile', '${user._id}')">
          <img src="${avatar}" alt="" class="w-9 h-9 rounded-full object-cover">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">${escapeHtml(user.name)}</p>
            <p class="text-[10px] text-dark-400 truncate">${escapeHtml(user.headline || '')}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Load suggested users error:', error);
  }
}

// ─── Search ─────────────────────────────────────────────────
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 2) {
    document.getElementById('searchResults').classList.add('hidden');
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const response = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      const container = document.getElementById('searchResults');
      
      if (data.users.length === 0) {
        container.innerHTML = '<p class="p-4 text-dark-400 text-sm text-center">No results found</p>';
      } else {
        container.innerHTML = data.users.map(user => {
          const avatar = user.profilePic || DEFAULT_AVATAR + encodeURIComponent(user.name);
          return `
            <div class="flex items-center gap-3 p-3 hover:bg-dark-700/30 transition-all cursor-pointer"
              onclick="navigateTo('other-profile', '${user._id}'); document.getElementById('searchResults').classList.add('hidden'); document.getElementById('searchInput').value = '';">
              <img src="${avatar}" alt="" class="w-8 h-8 rounded-full object-cover">
              <div>
                <p class="text-sm font-medium text-white">${escapeHtml(user.name)}</p>
                <p class="text-xs text-dark-400">${escapeHtml(user.headline || '')}</p>
              </div>
            </div>
          `;
        }).join('');
      }
      
      container.classList.remove('hidden');
    } catch (error) {
      console.error('Search error:', error);
    }
  }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  AI FEATURES
// ═══════════════════════════════════════════════════════════════

async function enhanceBioAI() {
  const bioInput = document.getElementById('editBio');
  const bio = bioInput.value.trim();
  
  if (!bio) {
    showToast('Please write a bio first, then use AI to enhance it', 'info');
    return;
  }

  showLoading('AI is enhancing your bio...');

  try {
    const response = await apiFetch('/ai/enhance-bio', {
      method: 'POST',
      body: JSON.stringify({ bio })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    bioInput.value = data.enhanced;
    showToast('Bio enhanced with AI! ✨', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function enhanceCaptionAI() {
  const captionInput = document.getElementById('postCaption');
  const caption = captionInput.value.trim();
  
  if (!caption) {
    showToast('Please write a caption first, then use AI to enhance it', 'info');
    return;
  }

  const btn = document.getElementById('enhanceCaptionBtn');
  btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Enhancing...';

  try {
    const response = await apiFetch('/ai/enhance-caption', {
      method: 'POST',
      body: JSON.stringify({ caption })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    captionInput.value = data.enhanced;
    showToast('Caption enhanced with AI! ✨', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.innerHTML = '<i data-lucide="sparkles" class="w-3 h-3"></i> AI Enhance';
    lucide.createIcons();
  }
}

// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════

// ─── API Fetch Helper ───────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Automatically handle expired tokens or unauthorized access
  if (response.status === 401) {
    console.warn('Unauthorized access detected. Redirecting to login...');
    handleLogout();
    return response;
  }

  return response;
}

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const id = 'toast-' + Date.now();
  
  const colors = {
    success: 'from-green-500/20 to-green-600/10 border-green-500/30',
    error: 'from-red-500/20 to-red-600/10 border-red-500/30',
    info: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    warning: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info',
    warning: 'alert-triangle'
  };

  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `toast glass px-4 py-3 rounded-xl flex items-center gap-3 min-w-[300px] max-w-[400px] bg-gradient-to-r ${colors[type]} border`;
  toast.innerHTML = `
    <i data-lucide="${icons[type]}" class="w-5 h-5 flex-shrink-0"></i>
    <p class="text-sm text-white flex-1">${escapeHtml(message)}</p>
    <button onclick="document.getElementById('${id}').remove()" class="text-dark-400 hover:text-white">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ─── Loading Overlay ────────────────────────────────────────
function showLoading(text = 'Loading...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.remove('hidden');
  lucide.createIcons();
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// ─── Time Ago ───────────────────────────────────────────────
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Escape HTML ────────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Periodic notification check ────────────────────────────
setInterval(() => {
  if (currentUser && authToken) {
    checkUnreadNotifications();
  }
}, 30000); // Check every 30 seconds
