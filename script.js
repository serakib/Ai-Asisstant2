<script>
// ══════════════════════════════════════════════════════════
//  ⚙️ GLOBAL CONFIGURATION
// ══════════════════════════════════════════════════════════
const BACKEND_URL = "https://ai-assisstant-2.onrender.com";
const FETCH_TIMEOUT_MS = 60000;
const LOGIN_PAGE_URL = 'https://serakib.github.io/Medical-Admission-Tracker-login/';

// Google Drive API Configuration (এখানে আপনার API Key ও Client ID বসাতে হবে)
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_APP_ID = 'YOUR_GOOGLE_APP_ID'; // Google Cloud Console থেকে পাওয়া App ID

// ══════════════════════════════════════════════════════════
//  🎙️ VOICE ARTISTS CONFIGURATION
// ══════════════════════════════════════════════════════════
const VOICE_ARTISTS = [
    { id:'emma', name:'Emma', gender:'female', style:'Friendly · Warm · Clear', lang:'🇧🇩 Bengali (BD)', demo:'হ্যালো, আমি এমা। আমি আপনাকে সাহায্য করতে পেরে খুশি হব।' },
    { id:'ryan', name:'Ryan', gender:'male', style:'Professional · Calm', lang:'🇧🇩 Bengali (BD)', demo:'হ্যালো, আমি রায়ান। আপনার যেকোনো প্রশ্ন করতে পারেন।' },
    { id:'sophia', name:'Sophia', gender:'female', style:'Young · Energetic', lang:'🇮🇳 Bengali (IN)', demo:'হাই, আমি সোফিয়া। চলুন শুরু করি।' },
    { id:'david', name:'David', gender:'male', style:'Mature · Deep', lang:'🇮🇳 Bengali (IN)', demo:'আমি ডেভিড। আপনার প্রশ্নের উত্তর দিতে প্রস্তুত।' },
    { id:'olivia', name:'Olivia', gender:'female', style:'Elegant · Slow', lang:'🇧🇩 Bengali (BD)', demo:'আমি অলিভিয়া। ধীরে স্পষ্টভাবে কথা বলি।' },
    { id:'james', name:'James', gender:'male', style:'Deep · Narrator', lang:'🇧🇩 Bengali (BD)', demo:'আমি জেমস। গুরুত্বপূর্ণ বিষয়গুলো বুঝিয়ে দিই।' },
    { id:'charlotte', name:'Charlotte', gender:'female', style:'British · Elegant', lang:'🇬🇧 English (US)', demo:'Hello, I am Charlotte. I am ready to help you.' }
];

const BROWSER_VOICE_MAP = {
    emma:{gender:'female',pitch:1.1,rate:1.0,lang:'bn-BD'},
    ryan:{gender:'male',pitch:0.9,rate:1.0,lang:'bn-BD'},
    sophia:{gender:'female',pitch:1.3,rate:1.15,lang:'bn-IN'},
    david:{gender:'male',pitch:0.7,rate:0.95,lang:'bn-IN'},
    olivia:{gender:'female',pitch:1.0,rate:0.85,lang:'bn-BD'},
    james:{gender:'male',pitch:0.6,rate:0.9,lang:'bn-BD'},
    charlotte:{gender:'female',pitch:1.0,rate:1.0,lang:'en-US'}
};

// ══════════════════════════════════════════════════════════
//  🌍 STATE VARIABLES
// ══════════════════════════════════════════════════════════
let selectedVoice = localStorage.getItem('voiceArtist') || 'emma';
let returnToView = 'home';
let msgIdCounter = 0;
let deepThinkEnabled = localStorage.getItem('deepThink') === 'true';
let smartSearchEnabled = localStorage.getItem('smartSearch') === 'true';
let attachedFile = null;
let isSending = false;
let recognition = null;
let silenceTimer = null;
let finalTranscript = '';
let isRecognizing = false;
let voiceModeOn = false;
let micMuted = false;
let isSpeaking = false;
let ttsAbortController = null;
let pendingTtsResolve = null;
let micPermissionRequested = false;
let currentFeedbackMsgId = null;
let libraryItems = JSON.parse(localStorage.getItem('medtracker_library') || '[]');
let currentAutoDelete = localStorage.getItem('medtracker_autoDelete') || 'never';

// ══════════════════════════════════════════════════════════
//  🔐 LOGIN / LOGOUT SYSTEM
// ══════════════════════════════════════════════════════════
function redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    const loginUrl = `${LOGIN_PAGE_URL}?returnUrl=${returnUrl}&source=main`;
    const popup = window.open(loginUrl, 'MedTrackerLogin', 'width=500,height=650,scrollbars=yes,resizable=yes,top=100,left=300');
    if (!popup || popup.closed) window.location.href = loginUrl;
}

function checkLoginState() {
    const userData = localStorage.getItem('medtracker_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            showUserProfile(user);
        } catch (e) {
            localStorage.removeItem('medtracker_user');
        }
    }
}

function showUserProfile(user) {
    // হেডার UI
    document.getElementById('headerLoginBtn').style.display = 'none';
    const headerProfile = document.getElementById('headerUserProfile');
    if (headerProfile) {
        headerProfile.style.display = 'flex';
        document.getElementById('headerUserAvatar').src = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1A73E8&color=fff`;
        document.getElementById('headerUserName').textContent = user.name || 'User';
        document.getElementById('headerUserEmail').textContent = user.email || '';
    }

    // সাইডবার UI
    const sidebarLoginBtn = document.getElementById('sidebarLoginBtn');
    const sidebarUserProfile = document.getElementById('sidebarUserProfile');
    if (sidebarLoginBtn && sidebarUserProfile) {
        sidebarLoginBtn.style.display = 'none';
        sidebarUserProfile.style.display = 'flex';
        document.getElementById('sidebarUserAvatar').src = user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1A73E8&color=fff`;
        document.getElementById('sidebarUserName').textContent = user.name || 'User';
        document.getElementById('sidebarUserEmail').textContent = user.email || '';
    }
}

function handleLogout() {
    localStorage.removeItem('medtracker_user');
    document.getElementById('headerLoginBtn').style.display = 'block';
    document.getElementById('headerUserProfile').style.display = 'none';
    
    const sidebarLoginBtn = document.getElementById('sidebarLoginBtn');
    const sidebarUserProfile = document.getElementById('sidebarUserProfile');
    if (sidebarLoginBtn && sidebarUserProfile) {
        sidebarLoginBtn.style.display = 'flex';
        sidebarUserProfile.style.display = 'none';
    }
    showToast('✅ লগআউট সফল হয়েছে', 2000);
}

window.addEventListener('message', (event) => {
    if (event.origin !== 'https://serakib.github.io') return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'LOGIN_SUCCESS' && data.user) {
        localStorage.setItem('medtracker_user', JSON.stringify(data.user));
        showUserProfile(data.user);
        showToast(`👋 স্বাগতম, ${data.user.name}!`, 2500);
    }
    if (data.type === 'LOGOUT') handleLogout();
});

// ══════════════════════════════════════════════════════════
//  🧭 SIDEBAR & NAVIGATION
// ══════════════════════════════════════════════════════════
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
}

function switchView(v) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    const t = document.getElementById('view-' + v);
    if (t) t.classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const n = document.getElementById('nav-' + v);
    if (n) n.classList.add('active');

    if (v === 'library') renderLibrary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // মোবাইলে সাইডবার বন্ধ করে দেওয়া
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }
}

function toggleFaq(el) {
    document.querySelectorAll('.faq-item').forEach(i => { if (i !== el) i.classList.remove('active'); });
    el.classList.toggle('active');
}

function startNewChat() {
    document.getElementById('chatMessages').innerHTML = `
        <div class="message bot">
            <div class="msg-content">হ্যালো! আমি আপনার AI অ্যাসিস্ট্যান্ট। মেডিকেল অ্যাডমিশন, স্টাডি টিপস বা যেকোনো বিষয়ে প্রশ্ন করতে পারেন। 🧠 Deep Think বা 🌐 Smart Search চালু করে আরও স্মার্ট উত্তর পান।</div>
        </div>
        <div class="typing-indicator" id="typingIndicator"><span></span><span></span><span></span></div>
    `;
    switchView('home');
    showToast('✨ নতুন চ্যাট শুরু হয়েছে', 2000);
}

function toggleSearch() {
    showToast('🔍 সার্চ ফিচার শীঘ্রই আসছে', 2000);
}

// ══════════════════════════════════════════════════════════
//  📎 ATTACHMENT MENU
// ══════════════════════════════════════════════════════════
function toggleAttachMenu() {
    document.getElementById('attachDropdown').classList.toggle('open');
}

// মেনু বাইরে ক্লিক করলে বন্ধ করে দেওয়া
document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.attach-menu-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('attachDropdown').classList.remove('open');
    }
});

// ══════════════════════════════════════════════════════════
//  📂 GOOGLE DRIVE PICKER
// ══════════════════════════════════════════════════════════
function loadGoogleDriveApi() {
    if (typeof gapi === 'undefined') return;
    gapi.load('client:picker', () => {
        gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        }).then(() => {
            console.log('Google Drive API initialized');
        }).catch(err => console.error('Drive API init error:', err));
    });
}

function openGoogleDrivePicker() {
    if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY') {
        showToast('⚠️ Google API Key সেট করা হয়নি! গাইড দেখুন।', 4000);
        return;
    }
    if (typeof google === 'undefined' || !google.picker) {
        showToast('⏳ Google API লোড হচ্ছে...', 2000);
        loadGoogleDriveApi();
        setTimeout(openGoogleDrivePicker, 1500);
        return;
    }

    const picker = new google.picker.PickerBuilder()
        .addView(google.picker.ViewId.DOCS)
        .addView(google.picker.ViewId.IMAGE)
        .setOAuthToken('') // OAuth টোকেন এখানে সেট করতে হবে (Login পেজ থেকে আসবে)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback((data) => {
            if (data.action === google.picker.Action.PICKED) {
                const file = data.docs[0];
                showToast(`✅ ফাইল নির্বাচন করা হয়েছে: ${file.name}`, 2500);
                // এখানে ফাইলটি ডাউনলোড করে চ্যাটে যুক্ত করার লজিক বসবে
                console.log('Picked file:', file);
            }
        })
        .build();
    picker.setVisible(true);
}

// ══════════════════════════════════════════════════════════
//  📚 LIBRARY SYSTEM (LocalStorage)
// ══════════════════════════════════════════════════════════
function saveToLibrary(name, type, base64Data, size) {
    const item = {
        id: 'lib-' + Date.now(),
        name: name,
        type: type,
        data: base64Data,
        size: size,
        timestamp: Date.now()
    };
    libraryItems.push(item);
    localStorage.setItem('medtracker_library', JSON.stringify(libraryItems));
    renderLibrary();
    showToast('📚 লাইব্রেরিতে সেভ করা হয়েছে', 2000);
}

function renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;
    if (libraryItems.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">লাইব্রেরি খালি। ফাইল আপলোড করলে এখানে জমা হবে।</div>';
        return;
    }
    grid.innerHTML = libraryItems.map(item => `
        <div style="background:var(--bg-elev); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${new Date(item.timestamp).toLocaleDateString()} · ${(item.size / 1024).toFixed(1)} KB</div>
            <div style="display:flex; gap:6px; margin-top:auto;">
                <button onclick="viewLibraryItem('${item.id}')" style="flex:1; padding:6px; background:var(--primary); color:#fff; border:none; border-radius:6px; font-size:0.75rem; cursor:pointer; font-family:inherit;">View</button>
                <button onclick="deleteLibraryItem('${item.id}')" style="flex:1; padding:6px; background:rgba(239,68,68,0.1); color:#EF4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; font-size:0.75rem; cursor:pointer; font-family:inherit;">Delete</button>
            </div>
        </div>
    `).join('');
}

function viewLibraryItem(id) {
    const item = libraryItems.find(i => i.id === id);
    if (!item) return;
    showToast(`📄 ${item.name} খোলা হচ্ছে...`, 2000);
    // এখানে ফাইল ওপেন করার লজিক বসবে
}

function deleteLibraryItem(id) {
    libraryItems = libraryItems.filter(i => i.id !== id);
    localStorage.setItem('medtracker_library', JSON.stringify(libraryItems));
    renderLibrary();
    showToast('🗑️ ফাইল ডিলিট করা হয়েছে', 2000);
}

function clearAllLibrary() {
    if (confirm('আপনি কি নিশ্চিতভাবে সব ফাইল ডিলিট করতে চান?')) {
        libraryItems = [];
        localStorage.setItem('medtracker_library', JSON.stringify(libraryItems));
        renderLibrary();
        showToast('🗑️ সব ফাইল ডিলিট করা হয়েছে', 2000);
    }
}

function updateAutoDeleteSetting() {
    const select = document.getElementById('autoDeleteSelect');
    currentAutoDelete = select.value;
    localStorage.setItem('medtracker_autoDelete', currentAutoDelete);
    showToast(`⏳ Auto Delete: ${currentAutoDelete === 'never' ? 'Never' : currentAutoDelete + ' days'}`, 2000);
}

function checkAutoDelete() {
    if (currentAutoDelete === 'never') return;
    const days = parseInt(currentAutoDelete);
    const now = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    const initialLength = libraryItems.length;
    libraryItems = libraryItems.filter(item => (now - item.timestamp) < (days * msInDay));
    if (libraryItems.length !== initialLength) {
        localStorage.setItem('medtracker_library', JSON.stringify(libraryItems));
        renderLibrary();
        showToast(`🗑️ ${initialLength - libraryItems.length}টি পুরনো ফাইল অটো-ডিলিট হয়েছে`, 3000);
    }
}

// ══════════════════════════════════════════════════════════
//  🎨 THEME & MODE TOGGLES
// ══════════════════════════════════════════════════════════
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const hljsLink = document.getElementById('hljs-theme');
    if (hljsLink) {
        hljsLink.href = isLight
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css';
    }
}

function updateModeButtons() {
    document.getElementById('deepThinkBtn').classList.toggle('active', deepThinkEnabled);
    document.getElementById('smartSearchBtn').classList.toggle('active', smartSearchEnabled);
}

function toggleDeepThink() {
    deepThinkEnabled = !deepThinkEnabled;
    localStorage.setItem('deepThink', deepThinkEnabled);
    updateModeButtons();
    showToast(deepThinkEnabled ? '🧠 Deep Think চালু' : '🧠 Deep Think বন্ধ', 2000);
}

function toggleSmartSearch() {
    smartSearchEnabled = !smartSearchEnabled;
    localStorage.setItem('smartSearch', smartSearchEnabled);
    updateModeButtons();
    showToast(smartSearchEnabled ? '🌐 Smart Search চালু' : '🌐 Smart Search বন্ধ', 2000);
}

// ══════════════════════════════════════════════════════════
//  🧠 THOUGHT PANEL (DeepSeek Style - English Steps)
// ══════════════════════════════════════════════════════════
const THINK_STEPS = {
    deep: ['Analyzing the question...', 'Retrieving relevant concepts and facts...', 'Considering different perspectives...', 'Formulating the response...'],
    search: ['Initiating web search...', 'Looking for reliable sources...', 'Verifying information...', 'Collecting recent data...']
};

function createThinkingPanel() {
    const panel = document.createElement('div');
    panel.className = 'think-panel open';
    panel.dataset.startTime = Date.now();
    panel.innerHTML = `
        <div class="think-header">
            <span class="think-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </span>
            <span class="think-title">
                <span class="think-text">Thinking...</span>
                <span class="dot-stream"><span></span><span></span><span></span></span>
            </span>
            <span class="chev">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
        </div>
        <div class="think-body"></div>
    `;
    panel.querySelector('.think-header').onclick = () => panel.classList.toggle('open');
    return panel;
}

function addThinkStep(panel, text, delayMs = 600) {
    return new Promise(resolve => {
        const body = panel.querySelector('.think-body');
        const step = document.createElement('div');
        step.className = 'think-step active';
        step.innerHTML = '<span class="step-bullet"></span><span class="step-text"></span>';
        step.querySelector('.step-text').textContent = text;
        body.appendChild(step);
        body.querySelectorAll('.think-step').forEach((s, i, arr) => { if (i < arr.length - 1) s.classList.remove('active'); });
        setTimeout(() => { step.classList.remove('active'); step.classList.add('done'); resolve(); }, delayMs);
    });
}

function finishThinkingPanel(panel) {
    if (!panel) return;
    const elapsed = Math.max(1, Math.round((Date.now() - parseInt(panel.dataset.startTime || '0')) / 1000));
    const title = panel.querySelector('.think-text');
    if (title) title.textContent = `Thought for ${elapsed} seconds`;
    panel.classList.add('done');
    panel.classList.remove('open');
}

async function runThinkingSequence(panel) {
    if (deepThinkEnabled) { for (const s of THINK_STEPS.deep) await addThinkStep(panel, s, 550); }
    if (smartSearchEnabled) { for (const s of THINK_STEPS.search) await addThinkStep(panel, s, 500); }
}

// ══════════════════════════════════════════════════════════
//  💬 CHAT & MESSAGE HANDLING
// ══════════════════════════════════════════════════════════
function renderMarkdown(text) {
    if (!text) return '';
    let html = marked.parse(text);
    // MathJax/KaTeX auto-render
    setTimeout(() => {
        if (window.renderMathInElement) {
            document.querySelectorAll('.msg-content').forEach(el => {
                renderMathInElement(el, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false
                });
            });
        }
        document.querySelectorAll('pre code').forEach((block) => {
            if (window.hljs) hljs.highlightElement(block);
        });
    }, 100);
    return html;
}

function addMessage(text, sender, file, opts = {}) {
    const d = document.createElement('div');
    d.classList.add('message', sender);
    d.dataset.msgId = 'cmsg-' + (++msgIdCounter);
    
    const content = document.createElement('div');
    content.classList.add('msg-content');
    
    if (file) {
        const i = document.createElement('img');
        const objUrl = URL.createObjectURL(file);
        i.src = objUrl;
        i.onload = () => setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
        content.appendChild(i);
    }
    
    if (text) {
        if (sender === 'bot') {
            content.innerHTML = renderMarkdown(text);
        } else {
            const p = document.createElement('div');
            p.innerText = text;
            content.appendChild(p);
        }
    }
    d.appendChild(content);

    const actions = document.createElement('div');
    actions.classList.add('msg-actions');
    if (sender === 'bot') {
        actions.innerHTML = `
            <button class="msg-action" title="Copy" onclick="copyChatMsg(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="msg-action like-btn" title="Good" onclick="rateChatMsg(this,'like')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></button>
            <button class="msg-action dislike-btn" title="Bad" onclick="openFeedbackModal(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
            <button class="msg-action" title="Read aloud" onclick="replayChatMsg(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>
            <button class="msg-action" title="Regenerate" onclick="regenerateChatMsg(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg></button>`;
    } else {
        actions.innerHTML = `
            <button class="msg-action" title="Copy" onclick="copyChatMsg(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
    }
    d.appendChild(actions);

    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator && typingIndicator.parentNode === chatMessages) chatMessages.insertBefore(d, typingIndicator);
    else chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return d;
}

// ══════════════════════════════════════════════════════════
//  🚀 SEND MESSAGE
// ══════════════════════════════════════════════════════════
async function sendMessage() {
    if (isSending) return;
    const userInput = document.getElementById('userInput');
    const text = userInput.value.trim();
    if (!text && !attachedFile) return;
    
    isSending = true;
    document.getElementById('sendBtn').disabled = true;
    if (isRecognizing) try { recognition.stop(); } catch(e){}
    
    const fileToSend = attachedFile;
    addMessage(text, 'user', fileToSend);
    userInput.value = '';
    clearFile();

    // লাইব্রেরিতে সেভ করা (যদি ফাইল থাকে)
    if (fileToSend) {
        const reader = new FileReader();
        reader.onload = (e) => {
            saveToLibrary(fileToSend.name, fileToSend.type, e.target.result, fileToSend.size);
        };
        reader.readAsDataURL(fileToSend);
    }

    let thinkPanel = null;
    if (deepThinkEnabled || smartSearchEnabled) {
        thinkPanel = createThinkingPanel();
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && typingIndicator.parentNode === chatMessages) chatMessages.insertBefore(thinkPanel, typingIndicator);
        else chatMessages.appendChild(thinkPanel);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await runThinkingSequence(thinkPanel);
    }

    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'flex';
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
    
    try {
        const fd = new FormData();
        fd.append('message', text || '');
        if (fileToSend) fd.append('image', fileToSend);
        if (deepThinkEnabled) fd.append('deep_thinking', 'true');
        if (smartSearchEnabled) fd.append('smart_search', 'true');
        
        const res = await fetchWithTimeout(`${BACKEND_URL}/api/chat`, { method:'POST', body: fd });
        const data = await res.json();
        typingIndicator.style.display = 'none';
        finishThinkingPanel(thinkPanel);
        
        if (res.ok && data.reply) {
            addMessage(data.reply, 'bot');
            // লাইব্রেরিতে AI এর রেসপন্স সেভ করা
            saveToLibrary('AI Response - ' + new Date().toLocaleTimeString(), 'text/plain', data.reply, data.reply.length);
        } else {
            addMessage('❌ ' + (data.error || 'উত্তর পাওয়া যায়নি'), 'bot');
        }
    } catch (e) {
        typingIndicator.style.display = 'none';
        finishThinkingPanel(thinkPanel);
        const msg = e.name === 'AbortError' ? '⏱️ সার্ভার সাড়া দিচ্ছে না। আবার চেষ্টা করুন।' : '❌ নেটওয়ার্ক সমস্যা';
        addMessage(msg, 'bot');
    }
    isSending = false;
    document.getElementById('sendBtn').disabled = false;
    userInput.focus();
}

// ══════════════════════════════════════════════════════════
//  📋 MESSAGE ACTIONS (Copy, Rate, Replay, Regenerate)
// ══════════════════════════════════════════════════════════
function copyChatMsg(btn) {
    const txt = btn.closest('.message').querySelector('.msg-content').innerText;
    navigator.clipboard.writeText(txt).then(() => {
        btn.style.color = '#10B981';
        setTimeout(() => btn.style.color = '', 1200);
    });
}

const ICON_SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
let currentPlayingBtn = null;

async function replayChatMsg(btn) {
    if (btn.classList.contains('playing')) {
        stopAllAudio();
        btn.classList.remove('playing');
        btn.innerHTML = ICON_SPEAKER;
        if (currentPlayingBtn === btn) currentPlayingBtn = null;
        return;
    }
    if (currentPlayingBtn && currentPlayingBtn !== btn) {
        currentPlayingBtn.classList.remove('playing');
        currentPlayingBtn.innerHTML = ICON_SPEAKER;
    }
    stopAllAudio();
    const txt = btn.closest('.message').querySelector('.msg-content').innerText.trim();
    if (!txt) return;
    btn.classList.add('playing');
    btn.innerHTML = ICON_STOP;
    currentPlayingBtn = btn;
    try { await speakText(txt); } catch(e) {}
    finally {
        btn.classList.remove('playing');
        btn.innerHTML = ICON_SPEAKER;
        if (currentPlayingBtn === btn) currentPlayingBtn = null;
    }
}

function rateChatMsg(btn, type) {
    const msgEl = btn.closest('.message');
    const likeBtn = msgEl.querySelector('.like-btn');
    const text = msgEl.querySelector('.msg-content').innerText;
    if (type === 'like') {
        if (likeBtn.classList.contains('active-like')) likeBtn.classList.remove('active-like');
        else { likeBtn.classList.add('active-like'); }
    }
    const feedback = JSON.parse(localStorage.getItem('feedback') || '{}');
    feedback[msgEl.dataset.msgId] = { type, text: text.slice(0, 100), time: Date.now() };
    localStorage.setItem('feedback', JSON.stringify(feedback));
}

async function regenerateChatMsg(btn) {
    if (isSending) return;
    const msgEl = btn.closest('.message');
    let prevUserText = '';
    let prev = msgEl.previousElementSibling;
    while (prev) {
        if (prev.classList && prev.classList.contains('user')) {
            prevUserText = prev.querySelector('.msg-content').innerText;
            break;
        }
        prev = prev.previousElementSibling;
    }
    if (!prevUserText) return;
    isSending = true;
    msgEl.remove();

    let thinkPanel = null;
    if (deepThinkEnabled || smartSearchEnabled) {
        thinkPanel = createThinkingPanel();
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');
        chatMessages.insertBefore(thinkPanel, typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await runThinkingSequence(thinkPanel);
    }

    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'flex';
    try {
        const fd = new FormData();
        fd.append('message', prevUserText);
        if (deepThinkEnabled) fd.append('deep_thinking', 'true');
        if (smartSearchEnabled) fd.append('smart_search', 'true');
        const res = await fetchWithTimeout(`${BACKEND_URL}/api/chat`, { method:'POST', body: fd });
        const data = await res.json();
        typingIndicator.style.display = 'none';
        finishThinkingPanel(thinkPanel);
        if (res.ok && data.reply) addMessage(data.reply, 'bot');
        else addMessage('❌ ' + (data.error || 'উত্তর পাওয়া যায়নি'), 'bot');
    } catch (e) {
        typingIndicator.style.display = 'none';
        finishThinkingPanel(thinkPanel);
        addMessage('❌ নেটওয়ার্ক সমস্যা', 'bot');
    }
    isSending = false;
}

// ══════════════════════════════════════════════════════════
//  👎 FEEDBACK MODAL
// ══════════════════════════════════════════════════════════
function openFeedbackModal(btn) {
    const msgEl = btn.closest('.message');
    currentFeedbackMsgId = msgEl.dataset.msgId;
    document.getElementById('feedbackModal').classList.add('open');
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('open');
    currentFeedbackMsgId = null;
}

function submitFeedback() {
    const selected = document.querySelector('input[name="feedbackReason"]:checked');
    const text = document.getElementById('feedbackText').value;
    if (!selected && !text) {
        showToast('⚠️ অনুগ্রহ করে একটি কারণ নির্বাচন করুন', 2000);
        return;
    }
    const feedback = JSON.parse(localStorage.getItem('feedback') || '{}');
    feedback[currentFeedbackMsgId] = {
        type: 'dislike',
        reason: selected ? selected.value : 'Other',
        text: text,
        time: Date.now()
    };
    localStorage.setItem('feedback', JSON.stringify(feedback));
    closeFeedbackModal();
    showToast('✅ আপনার মতামতের জন্য ধন্যবাদ!', 2500);
    
    // UI তে ডিসলাইক অ্যাক্টিভ করা
    if (currentFeedbackMsgId) {
        const msgEl = document.querySelector(`[data-msg-id="${currentFeedbackMsgId}"]`);
        if (msgEl) {
            const dislikeBtn = msgEl.querySelector('.dislike-btn');
            if (dislikeBtn) dislikeBtn.classList.add('active-dislike');
        }
    }
}

// ══════════════════════════════════════════════════════════
//  🎧 VOICE ENGINE (TTS & Sanitizer)
// ══════════════════════════════════════════════════════════
function sanitizeForTTS(text) {
    if (!text) return text;
    let cleaned = text;
    cleaned = cleaned.replace(/```[\s\S]*?```/g, ' কোড ব্লক ');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    cleaned = cleaned.replace(/\\int/g, ' ইন্টিগ্রাল ');
    cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 বাটি $2');
    cleaned = cleaned.replace(/\^2/g, ' স্কয়ার ');
    cleaned = cleaned.replace(/\^3/g, ' কিউব ');
    cleaned = cleaned.replace(/\^([0-9a-zA-Z]+)/g, ' টু দ্য পাওয়ার $1 ');
    cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, ' রুট $1 ');
    cleaned = cleaned.replace(/\\pm/g, ' প্লাস মাইনাস ');
    cleaned = cleaned.replace(/\\times/g, ' মাল্টিপ্লাইড বাই ');
    cleaned = cleaned.replace(/\\div/g, ' ডিভাইডেড বাই ');
    cleaned = cleaned.replace(/=/g, ' ইকুয়ালস ');
    cleaned = cleaned.replace(/\+/g, ' প্লাস ');
    cleaned = cleaned.replace(/-/g, ' মাইনাস ');
    cleaned = cleaned.replace(/\\[a-zA-Z]+/g, ' ');
    cleaned = cleaned.replace(/\$/g, '');
    cleaned = cleaned.replace(/[*_#~]/g, '');
    return cleaned;
}

let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch(e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
}

function playAudioWithFade(audioEl, { fadeIn = 0.08, fadeOut = 0.12 } = {}) {
    return new Promise((resolve) => {
        const ctx = getAudioCtx();
        if (!ctx) { audioEl.onended = resolve; audioEl.play().catch(resolve); return; }
        let srcNode = null;
        try {
            srcNode = ctx.createMediaElementSource(audioEl);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);
            srcNode.connect(gain).connect(ctx.destination);
            const dur = isFinite(audioEl.duration) ? audioEl.duration : 0;
            const fadeOutAt = Math.max(fadeIn + 0.05, dur - fadeOut);
            const finish = () => { try { srcNode.disconnect(); } catch(e){} resolve(); };
            audioEl.onended = finish;
            audioEl.onerror = finish;
            audioEl.play().then(() => {
                if (dur > 0) {
                    const t = ctx.currentTime + fadeOutAt;
                    try {
                        gain.gain.setValueAtTime(1, t);
                        gain.gain.linearRampToValueAtTime(0, t + fadeOut);
                    } catch(e) {}
                }
            }).catch(finish);
        } catch (e) {
            audioEl.onended = resolve;
            audioEl.play().catch(resolve);
        }
    });
}

let voicesReady = null;
function ensureVoicesLoaded() {
    if (voicesReady) return voicesReady;
    voicesReady = new Promise((resolve) => {
        if (!('speechSynthesis' in window)) { resolve([]); return; }
        let resolved = false;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            resolve(speechSynthesis.getVoices() || []);
        };
        const list = speechSynthesis.getVoices();
        if (list && list.length > 0) { resolve(list); return; }
        speechSynthesis.onvoiceschanged = finish;
        setTimeout(finish, 1500);
    });
    return voicesReady;
}

async function pickBestVoice(text, preferredLang) {
    const voices = await ensureVoicesLoaded();
    const isBangla = /[\u0980-\u09FF]/.test(text);
    const candidates = isBangla
        ? [preferredLang, 'bn-BD', 'bn-IN', 'hi-IN', 'en-IN', 'en-US', 'en-GB']
        : [preferredLang, 'en-US', 'en-GB', 'en-IN', 'en-AU'];
    for (const lang of candidates) {
        if (!lang) continue;
        let v = voices.find(x => x.lang === lang);
        if (v) return { voice: v, lang: v.lang };
        const prefix = lang.split('-')[0];
        v = voices.find(x => x.lang.toLowerCase().startsWith(prefix.toLowerCase()));
        if (v) return { voice: v, lang: v.lang };
    }
    if (voices.length > 0) return { voice: voices[0], lang: voices[0].lang };
    return { voice: null, lang: preferredLang || 'en-US' };
}

async function speakText(text) {
    if (micMuted) return; // Completely silent when muted
    const sanitizedText = sanitizeForTTS(text);
    if (!sanitizedText.trim()) return;

    return new Promise(async (resolve) => {
        stopAllAudio();
        if (ttsAbortController) { try { ttsAbortController.abort(); } catch(e){} }
        ttsAbortController = new AbortController();
        pendingTtsResolve = resolve;
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; pendingTtsResolve = null; resolve(); } };

        try {
            const res = await fetch(`${BACKEND_URL}/api/tts`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ text: sanitizedText, voice: selectedVoice }),
                signal: ttsAbortController.signal
            });
            if (!res.ok) throw new Error('Backend TTS status ' + res.status);
            const blob = await res.blob();
            if (!blob.type.startsWith('audio/')) throw new Error('Not audio: ' + blob.type);
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = 1;
            window.currentAudio = audio;
            await new Promise((r) => {
                if (audio.readyState >= 2) return r();
                const onReady = () => { cleanup(); r(); };
                const onErr = () => { cleanup(); r(); };
                const cleanup = () => {
                    audio.removeEventListener('canplay', onReady);
                    audio.removeEventListener('error', onErr);
                };
                audio.addEventListener('canplay', onReady);
                audio.addEventListener('error', onErr);
                setTimeout(() => { cleanup(); r(); }, 1500);
            });
            try {
                await playAudioWithFade(audio, { fadeIn: 0.08, fadeOut: 0.12 });
                URL.revokeObjectURL(url);
                window.currentAudio = null;
                done();
                return;
            } catch(e) {
                URL.revokeObjectURL(url);
                window.currentAudio = null;
            }
        } catch (err) {
            if (err.name === 'AbortError') { done(); return; }
        }
        await browserSpeak(sanitizedText);
        done();
    });
}

async function browserSpeak(text) {
    return new Promise(async (resolve) => {
        if (!('speechSynthesis' in window)) { resolve(); return; }
        try { speechSynthesis.cancel(); } catch(e){}
        const cfg = BROWSER_VOICE_MAP[selectedVoice] || BROWSER_VOICE_MAP.emma;
        const best = await pickBestVoice(text, cfg.lang);
        const isBangla = /[\u0980-\u09FF]/.test(text);
        if (isBangla && best.voice && !best.voice.lang.toLowerCase().startsWith('bn')) {
            showToast('⚠️ বাংলা ভয়েস পাওয়া যায়নি — ডিফল্ট ভয়েসে চেষ্টা হচ্ছে।', 5000);
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = best.lang;
        u.pitch = cfg.pitch;
        u.rate = cfg.rate;
        u.volume = 0;
        if (best.voice) u.voice = best.voice;
        const safety = setTimeout(() => resolve(), Math.max(6000, text.length * 180));
        u.onstart = () => {
            let v = 0;
            const step = () => {
                v = Math.min(1, v + 0.15);
                try { u.volume = v; } catch(e){}
                if (v < 1) setTimeout(step, 20);
            };
            step();
        };
        u.onend = () => { clearTimeout(safety); resolve(); };
        u.onerror = () => { clearTimeout(safety); resolve(); };
        try { speechSynthesis.speak(u); } catch(e) { clearTimeout(safety); resolve(); }
    });
}

function stopAllAudio() {
    if (window.currentAudio) {
        const a = window.currentAudio;
        window.currentAudio = null;
        const startVol = a.volume;
        const steps = 5;
        let i = 0;
        const fade = () => {
            i++;
            try { a.volume = Math.max(0, startVol * (1 - i / steps)); } catch(e){}
            if (i < steps) setTimeout(fade, 20);
            else { try { a.pause(); } catch(e){} }
        };
        fade();
    }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch(e){} }
    if (ttsAbortController) { try { ttsAbortController.abort(); } catch(e){} ttsAbortController = null; }
    if (pendingTtsResolve) { const r = pendingTtsResolve; pendingTtsResolve = null; r(); }
}

// ══════════════════════════════════════════════════════════
//  🎙️ VOICE MODAL & DEMO
// ══════════════════════════════════════════════════════════
function renderVoiceGrid() {
    const voiceGrid = document.getElementById('voiceGrid');
    voiceGrid.innerHTML = VOICE_ARTISTS.map(v => `
        <div class="voice-card ${v.id === selectedVoice ? 'selected' : ''}" onclick="selectVoice('${v.id}')">
            <div class="voice-avatar v-${v.id}"><span>${v.name.charAt(0)}</span></div>
            <div class="voice-info">
                <h4>${v.name}</h4>
                <div class="voice-style">${v.style}</div>
                <div class="voice-lang">${v.lang}</div>
            </div>
            <button class="voice-play-btn" onclick="event.stopPropagation(); playDemo('${v.id}', this)">▶</button>
        </div>`).join('');
}

function updateVoicePill() {
    const a = VOICE_ARTISTS.find(v => v.id === selectedVoice) || VOICE_ARTISTS[0];
    document.getElementById('currentVoiceName').textContent = a.name;
    const avatar = document.getElementById('currentVoiceAvatar');
    avatar.innerHTML = '<span>' + a.name.charAt(0) + '</span>';
    avatar.className = 'voice-pill-avatar v-' + a.id;
    if (recognition) {
        const cfg = BROWSER_VOICE_MAP[selectedVoice];
        recognition.lang = cfg ? cfg.lang : 'bn-BD';
    }
}

function openVoiceModal() { renderVoiceGrid(); document.getElementById('voiceModal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeVoiceModal() { document.getElementById('voiceModal').classList.remove('open'); document.body.style.overflow = ''; stopDemo(); }
function selectVoice(id) {
    stopDemo();
    selectedVoice = id;
    localStorage.setItem('voiceArtist', id);
    updateVoicePill();
    renderVoiceGrid();
}

async function playDemo(id, btnEl) {
    stopDemo();
    const artist = VOICE_ARTISTS.find(v => v.id === id);
    if (!artist) return;
    btnEl.classList.add('playing'); btnEl.textContent = '⏸';
    const prev = selectedVoice;
    selectedVoice = id;
    try {
        await speakText(artist.demo);
        resetDemoBtn(btnEl);
    } catch (err) { resetDemoBtn(btnEl); }
    finally { selectedVoice = prev; }
}

function resetDemoBtn(b) { if (!b) return; b.classList.remove('playing'); b.textContent = '▶'; }
function stopDemo() {
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch(e){} }
    document.querySelectorAll('.voice-play-btn').forEach(b => { b.classList.remove('playing'); b.textContent = '▶'; });
}

async function testVoice() {
    const testVoiceBtn = document.getElementById('testVoiceBtn');
    testVoiceBtn.classList.add('playing');
    showToast('🔊 ভয়েস টেস্ট চলছে…', 2500);
    const artist = VOICE_ARTISTS.find(v => v.id === selectedVoice) || VOICE_ARTISTS[0];
    const testText = artist.demo;
    const voices = await ensureVoicesLoaded();
    const hasBangla = voices.some(v => v.lang.toLowerCase().startsWith('bn'));
    try {
        await speakText(testText);
        testVoiceBtn.classList.remove('playing');
        if (!hasBangla && /[\u0980-\u09FF]/.test(testText)) {
            showToast('⚠️ বাংলা ভয়েস নেই — Chrome Settings → Languages → Text-to-speech এ Bengali ইনস্টল করুন।', 6000);
        } else {
            showToast('✅ ভয়েস কাজ করছে!', 2000);
        }
    } catch (e) {
        testVoiceBtn.classList.remove('playing');
        showToast('❌ ভয়েস ব্যর্থ: ' + e.message, 5000);
    }
}

// ══════════════════════════════════════════════════════════
//  🎤 VOICE OVERLAY & RECOGNITION
// ══════════════════════════════════════════════════════════
function setOrbState(state) {
    const voiceOrb = document.getElementById('voiceOrb');
    voiceOrb.classList.remove('listening','speaking','thinking');
    if (state === 'listening') voiceOrb.classList.add('listening');
    else if (state === 'speaking') voiceOrb.classList.add('speaking');
    else if (state === 'thinking') voiceOrb.classList.add('thinking');
}

function safeStartRecognition() {
    if (!recognition || micMuted || isRecognizing || !voiceModeOn) return;
    try {
        finalTranscript = '';
        document.getElementById('userInput').value = '';
        document.getElementById('voiceTextInput').value = '';
        recognition.start();
    } catch (e) {
        setTimeout(() => safeStartRecognition(), 500);
    }
}

async function speakAndListen(text) {
    isSpeaking = true;
    if (isRecognizing) {
        try { recognition.stop(); } catch(e){}
        await new Promise(r => setTimeout(r, 280));
    }
    setOrbState('speaking');
    await new Promise(r => setTimeout(r, 60));
    await speakText(text);
    isSpeaking = false;
    if (micMuted || !voiceModeOn) { setOrbState('idle'); return; }
    setTimeout(() => {
        if (voiceModeOn && !micMuted && !isRecognizing) safeStartRecognition();
    }, 420);
}

function openVoiceMode() {
    const activeView = document.querySelector('.view.active');
    if (activeView) returnToView = activeView.id.replace('view-', '');
    document.getElementById('voiceOverlay').classList.add('open');
    document.body.classList.add('voice-active');
    document.getElementById('voiceMessages').innerHTML = '';
    
    document.querySelectorAll('#chatMessages .message').forEach(m => {
        const isUser = m.classList.contains('user');
        const txt = (m.querySelector('.msg-content') || m).innerText.trim();
        if (txt) addVoiceMsg(txt, isUser ? 'user' : 'bot');
    });
    
    voiceModeOn = true;
    micMuted = false;
    document.getElementById('vibMic').classList.remove('muted');
    setOrbState('thinking');
    
    setTimeout(async () => {
        const greeting = 'আমি আপনাকে কীভাবে সাহায্য করতে পারি?';
        addVoiceMsg(greeting, 'bot');
        await speakAndListen(greeting);
    }, 400);
}

function closeVoiceMode() {
    document.getElementById('voiceOverlay').classList.remove('open');
    document.body.classList.remove('voice-active');
    voiceModeOn = false;
    micMuted = false;
    isSpeaking = false;
    stopAllAudio();
    if (isRecognizing) try { recognition.stop(); } catch(e){}
    isRecognizing = false;
    setOrbState('idle');
    switchView(returnToView);
}

function toggleOrbMic() {
    micMuted = !micMuted;
    document.getElementById('vibMic').classList.toggle('muted', micMuted);
    if (micMuted) {
        if (isRecognizing) { try { recognition.stop(); } catch(e){} }
        if (!isSpeaking) setOrbState('idle');
        showToast('🔇 মাইক বন্ধ — AI কথা বলবে না', 1800);
    } else {
        showToast('🎤 মাইক চালু', 1400);
        if (!isRecognizing && voiceModeOn && !isSpeaking) {
            setTimeout(() => safeStartRecognition(), 150);
        }
    }
}

function shareVoiceMode() {
    const text = 'MedTracker AI — Voice Mode';
    if (navigator.share) navigator.share({ title: 'MedTracker AI', text, url: location.href }).catch(()=>{});
    else navigator.clipboard.writeText(location.href).then(() => showToast('✅ লিংক কপি হয়েছে!', 1800));
}

function addVoiceMsg(text, role) {
    const wrap = document.createElement('div');
    wrap.classList.add('v-msg', role);
    wrap.dataset.msgId = 'vmsg-' + (++msgIdCounter);
    const bubble = document.createElement('div');
    bubble.classList.add('v-bubble');
    bubble.innerText = text;
    wrap.appendChild(bubble);
    
    const actions = document.createElement('div');
    actions.classList.add('v-actions');
    if (role === 'bot') {
        actions.innerHTML = `
            <button class="v-action" title="Copy" onclick="copyVoiceText(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="v-action like-btn" title="Good" onclick="rateMsg(this,'like')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></button>
            <button class="v-action dislike-btn" title="Bad" onclick="openFeedbackModal(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
            <button class="v-action" title="Read aloud" onclick="replayVoice(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>`;
    } else {
        actions.innerHTML = `
            <button class="v-action" title="Copy" onclick="copyVoiceText(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
    }
    wrap.appendChild(actions);
    document.getElementById('voiceMessages').appendChild(wrap);
    document.getElementById('voiceMessages').scrollTop = document.getElementById('voiceMessages').scrollHeight;
}

function copyVoiceText(btn) {
    const txt = btn.closest('.v-msg').querySelector('.v-bubble').innerText;
    navigator.clipboard.writeText(txt).then(() => { btn.style.color = '#10B981'; setTimeout(() => btn.style.color = '', 1200); });
}

async function replayVoice(btn) {
    if (btn.classList.contains('playing')) {
        stopAllAudio();
        btn.classList.remove('playing');
        btn.innerHTML = ICON_SPEAKER;
        return;
    }
    stopAllAudio();
    const txt = btn.closest('.v-msg').querySelector('.v-bubble').innerText.trim();
    if (!txt) return;
    btn.classList.add('playing');
    btn.innerHTML = ICON_STOP;
    try { await speakText(txt); } catch(e) {}
    finally { btn.classList.remove('playing'); btn.innerHTML = ICON_SPEAKER; }
}

function rateMsg(btn, type) {
    const msgEl = btn.closest('.v-msg');
    const likeBtn = msgEl.querySelector('.like-btn');
    const dislikeBtn = msgEl.querySelector('.dislike-btn');
    if (type === 'like') {
        if (likeBtn.classList.contains('active-like')) likeBtn.classList.remove('active-like');
        else { likeBtn.classList.add('active-like'); if(dislikeBtn) dislikeBtn.classList.remove('active-dislike'); }
    } else {
        if (dislikeBtn.classList.contains('active-dislike')) dislikeBtn.classList.remove('active-dislike');
        else { dislikeBtn.classList.add('active-dislike'); if(likeBtn) likeBtn.classList.remove('active-like'); }
    }
}

async function sendFromVoice(text) {
    if (!text || isSending) return;
    isSending = true;
    addVoiceMsg(text, 'user');
    addMessage(text, 'user', null, { silent: true });
    setOrbState('thinking');
    document.getElementById('voiceTextInput').value = '';
    document.getElementById('userInput').value = '';
    
    try {
        const formData = new FormData();
        formData.append('message', text);
        if (deepThinkEnabled) formData.append('deep_thinking', 'true');
        if (smartSearchEnabled) formData.append('smart_search', 'true');
        
        const res = await fetchWithTimeout(`${BACKEND_URL}/api/chat`, { method:'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.reply) {
            addVoiceMsg(data.reply, 'bot');
            addMessage(data.reply, 'bot', null, { silent: true });
            saveToLibrary('AI Response - ' + new Date().toLocaleTimeString(), 'text/plain', data.reply, data.reply.length);
            if (voiceModeOn) await speakAndListen(data.reply);
            else setOrbState('idle');
        } else {
            addVoiceMsg('❌ ' + (data.error || 'উত্তর পাওয়া যায়নি'), 'bot');
            setOrbState('idle');
        }
    } catch (e) {
        const errMsg = e.name === 'AbortError' ? '⏱️ সার্ভার সাড়া দিচ্ছে না। আবার চেষ্টা করুন।' : '❌ নেটওয়ার্ক সমস্যা';
        addVoiceMsg(errMsg, 'bot');
        setOrbState('idle');
    }
    finally { isSending = false; }
}

// ══════════════════════════════════════════════════════════
//  🛠️ UTILITIES & EVENT LISTENERS
// ══════════════════════════════════════════════════════════
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: ctrl.signal });
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

function showToast(msg, ms = 3000) {
    const toast = document.getElementById('voiceToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), ms);
}

document.getElementById('fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf' && f.type !== 'text/plain') {
        alert('শুধু ছবি, PDF বা TXT ফাইল পাঠানো যাবে'); fileInput.value = ''; return;
    }
    if (f.size > 5*1024*1024) { alert('৫ MB এর বেশি নয়'); fileInput.value = ''; return; }
    attachedFile = f;
    const r = new FileReader();
    r.onload = (ev) => {
        document.getElementById('previewImg').src = ev.target.result;
        document.getElementById('previewName').textContent = f.name;
        document.getElementById('filePreview').style.display = 'flex';
    };
    r.readAsDataURL(f);
});

function clearFile() {
    attachedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('previewImg').removeAttribute('src');
}

document.getElementById('userInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
document.getElementById('voiceTextInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        const t = document.getElementById('voiceTextInput').value.trim();
        if (t) sendFromVoice(t);
    }
});

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = (BROWSER_VOICE_MAP[selectedVoice] && BROWSER_VOICE_MAP[selectedVoice].lang) || 'bn-BD';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { isRecognizing = true; finalTranscript = ''; setOrbState('listening'); };
    recognition.onresult = (event) => {
        if (micMuted) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += t + ' ';
            else interim += t;
        }
        const preview = (finalTranscript + interim).trim();
        const inVoice = document.getElementById('voiceOverlay').classList.contains('open');
        if (inVoice) document.getElementById('voiceTextInput').value = preview;
        else document.getElementById('userInput').value = preview;
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => { if (isRecognizing && !micMuted) try { recognition.stop(); } catch(e){} }, 2200);
    };
    recognition.onspeechend = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => { if (isRecognizing && !micMuted) try { recognition.stop(); } catch(e){} }, 2200);
    };
    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            alert('⚠️ মাইক্রোফোনের অনুমতি দিন।');
            micMuted = true;
            document.getElementById('vibMic').classList.add('muted');
            setOrbState('idle');
        }
    };
    recognition.onend = () => {
        isRecognizing = false;
        clearTimeout(silenceTimer);
        if (micMuted) { if (!isSpeaking) setOrbState('idle'); return; }
        if (isSpeaking) return;
        const inVoice = document.getElementById('voiceOverlay').classList.contains('open');
        const text = (inVoice ? document.getElementById('voiceTextInput').value : document.getElementById('userInput').value).trim();
        if (text && !isSending) {
            if (inVoice && voiceModeOn) sendFromVoice(text);
            else if (!inVoice) sendMessage();
        } else if (voiceModeOn && inVoice && !isSending) {
            setTimeout(() => safeStartRecognition(), 400);
        } else {
            setOrbState('idle');
        }
    };

    document.getElementById('micBtn').addEventListener('click', async () => {
        if (!micPermissionRequested) {
            micPermissionRequested = true;
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop());
                }
            } catch (e) { showToast('⚠️ মাইক ছাড়া চলবে — শুধু কথা শুনতে পাবেন না', 2500); }
        }
        if (document.getElementById('voiceOverlay').classList.contains('open')) closeVoiceMode();
        else openVoiceMode();
    });
} else {
    document.getElementById('micBtn').addEventListener('click', () => alert('Chrome বা Edge ব্যবহার করুন — ভয়েস সাপোর্ট নেই।'));
}

// ══════════════════════════════════════════════════════════
//  🚀 INITIALIZATION
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // থিম সেট
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('hljs-theme').href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css';
    }
    
    // লগইন স্টেট চেক
    checkLoginState();
    
    // ভয়েস পিল আপডেট
    updateVoicePill();
    
    // লাইব্রেরি সেটআপ
    const select = document.getElementById('autoDeleteSelect');
    if (select) select.value = currentAutoDelete;
    checkAutoDelete();
    renderLibrary();
    
    // মোড বাটন আপডেট
    updateModeButtons();
    
    // Google API লোড
    loadGoogleDriveApi();
    
    // সাইডবার মোবাইলে ডিফল্ট বন্ধ
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
});
</script>
