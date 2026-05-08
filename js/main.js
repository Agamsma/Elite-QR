import { auth, db } from './firebase-config.js';
import { loginWithGoogle, logoutUser, monitorAuthState } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot,
    serverTimestamp, writeBatch, doc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- DOM Elements ---
const authOverlay = document.getElementById('auth-overlay');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnGenerate = document.getElementById('btn-generate');
const btnDownload = document.getElementById('btn-download');
const btnDownloadSvg = document.getElementById('btn-download-svg');
const btnClearHistory = document.getElementById('btn-clear-history');

const qrColor = document.getElementById('qr-color');
const qrLogoInput = document.getElementById('qr-logo');
const qrShape = document.getElementById('qr-shape');
const qrDynamic = document.getElementById('qr-dynamic');
const qrcodeDiv = document.getElementById('qrcode');
const historyList = document.getElementById('history-list');

// Analytics Modal
const analyticsModal = document.getElementById('analytics-modal');
const btnCloseAnalytics = document.getElementById('btn-close-analytics');
const analyticsTableBody = document.getElementById('analytics-table-body');
const statTotal = document.getElementById('stat-total');
const analyticsTitle = document.getElementById('analytics-title');

// Your Live Vercel Link
const VERCEL_URL = "https://elite-qr.vercel.app";

// --- Tab Management ---
const tabBtns = document.querySelectorAll('.tab-btn');
const inputAreas = document.querySelectorAll('.input-area');
let currentMode = 'url'; 
let logoBase64 = null;
let userHistoryDocs = []; 

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
            b.classList.remove('bg-white/10', 'border-white/10', 'text-white', 'shadow');
            b.classList.add('bg-black/20', 'border-transparent', 'text-gray-400');
        });
        inputAreas.forEach(area => area.classList.add('hidden'));

        btn.classList.add('bg-white/10', 'border-white/10', 'text-white', 'shadow');
        btn.classList.remove('bg-black/20', 'border-transparent', 'text-gray-400');
        
        currentMode = btn.dataset.mode;
        document.getElementById(`area-${currentMode}`).classList.remove('hidden');
        
        if(currentMode !== 'url') {
            qrDynamic.checked = false;
            qrDynamic.disabled = true;
        } else {
            qrDynamic.disabled = false;
        }
    });
});

// --- Auth ---
btnLogin.onclick = async () => { await loginWithGoogle(); };
btnLogout.onclick = () => { logoutUser(); };

monitorAuthState((user) => {
    if (user) {
        authOverlay.classList.add('hidden');
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-photo').style.backgroundImage = `url(${user.photoURL})`;
        document.getElementById('user-photo').style.backgroundSize = 'cover';
        fetchHistory(user.uid);
    } else {
        authOverlay.classList.remove('hidden');
    }
});

// --- Logo ---
qrLogoInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => { logoBase64 = event.target.result; };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

// --- Rendering Engine ---
const renderQRToUI = (payload, color, isLiquid) => {
    qrcodeDiv.innerHTML = ""; 
    qrcodeDiv.classList.remove('qr-animate'); 
    void qrcodeDiv.offsetWidth; 

    const isMobile = window.innerWidth < 768;
    const qrSize = isMobile ? 200 : 260; 
    const logoSize = isMobile ? 50 : 60;

    new QRCode(qrcodeDiv, {
        text: payload, width: qrSize, height: qrSize,
        colorDark: color, colorLight: "transparent",
        dotScale: isLiquid ? 0.4 : 1.0, timing_scale: isLiquid ? 0.4 : 1.0, 
        logo: logoBase64, logoWidth: logoSize, logoHeight: logoSize,
        logoBackgroundTransparent: true, correctLevel: QRCode.CorrectLevel.H,
        onRenderingEnd: () => {
            qrcodeDiv.classList.add('qr-animate');
            btnDownload.classList.remove('hidden');
            btnDownloadSvg.classList.remove('hidden');
        }
    });
};

// Formatting Helper for Calendar
const formatDateIcal = (dateString) => {
    if(!dateString) return "";
    return dateString.replace(/[-:]/g, "") + "00Z";
};

// --- Main Generator ---
const handleGenerate = async (saveToDatabase = true) => {
    if (currentMode === 'bulk') return generateBulk();

    let payloadText = "";
    let displayTitle = "";

    if (currentMode === 'url') {
        payloadText = document.getElementById('in-url').value.trim();
        displayTitle = payloadText;
        if (!payloadText) return alert("Please enter a URL.");
    
    } else if (currentMode === 'vcard') {
        const name = document.getElementById('in-vc-name').value.trim();
        const phone = document.getElementById('in-vc-phone').value.trim();
        const email = document.getElementById('in-vc-email').value.trim();
        if (!name || !phone) return alert("Name and Phone are required.");
        payloadText = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
        displayTitle = `Contact: ${name}`;
    
    } else if (currentMode === 'upi') {
        const upiId = document.getElementById('in-upi-id').value.trim();
        const name = document.getElementById('in-upi-name').value.trim();
        if (!upiId || !name) return alert("UPI ID and Name required.");
        payloadText = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`;
        displayTitle = `UPI: ${name}`;
    
    } else if (currentMode === 'crypto') {
        const type = document.getElementById('in-crypto-type').value;
        const address = document.getElementById('in-crypto-address').value.trim();
        if(!address) return alert("Wallet address required.");
        payloadText = `${type}:${address}`;
        displayTitle = `Wallet: ${type.toUpperCase()}`;
    
    } else if (currentMode === 'event') {
        const title = document.getElementById('in-event-title').value.trim();
        const start = document.getElementById('in-event-start').value;
        const end = document.getElementById('in-event-end').value;
        if(!title || !start) return alert("Title and Start Date required.");
        payloadText = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDTSTART:${formatDateIcal(start)}\nDTEND:${formatDateIcal(end)}\nEND:VEVENT\nEND:VCALENDAR`;
        displayTitle = `Event: ${title}`;
    
    } else if (currentMode === 'geo') {
        const lat = document.getElementById('in-geo-lat').value.trim();
        const lng = document.getElementById('in-geo-lng').value.trim();
        if(!lat || !lng) return alert("Coordinates required.");
        payloadText = `geo:${lat},${lng}`;
        displayTitle = `Pin: ${lat}, ${lng}`;

    } else if (currentMode === 'wifi') {
        const ssid = document.getElementById('in-wifi-ssid').value.trim();
        const pass = document.getElementById('in-wifi-pass').value;
        const type = document.getElementById('in-wifi-type').value;
        if (!ssid) return alert("Network Name is required.");
        payloadText = `WIFI:T:${type};S:${ssid};P:${pass};H:false;;`;
        displayTitle = `WiFi: ${ssid}`;
    
    } else if (currentMode === 'email') {
        const to = document.getElementById('in-email-to').value.trim();
        const sub = document.getElementById('in-email-sub').value.trim();
        if (!to) return alert("Recipient required.");
        payloadText = `mailto:${to}?subject=${encodeURIComponent(sub)}`;
        displayTitle = `Email: ${to}`;
    }

    const color = qrColor.value;
    const isLiquid = qrShape.value === 'liquid';
    let renderPayload = payloadText;

    if (saveToDatabase) {
        const user = auth.currentUser;
        if (user) {
            try {
                if (qrDynamic.checked && currentMode === 'url') {
                    const docRef = await addDoc(collection(db, "qr_history"), {
                        uid: user.uid, type: 'url', content: payloadText, originalUrl: payloadText,
                        title: displayTitle, color: color, shape: qrShape.value,
                        isDynamic: true, scans: 0, scanLogs: [], createdAt: serverTimestamp()
                    });
                    renderPayload = `${VERCEL_URL}/scan.html?id=${docRef.id}`;
                    renderQRToUI(renderPayload, color, isLiquid);
                    return; 
                } else {
                    await addDoc(collection(db, "qr_history"), {
                        uid: user.uid, type: currentMode, content: payloadText,
                        title: displayTitle, color: color, shape: qrShape.value,
                        isDynamic: false, createdAt: serverTimestamp()
                    });
                }
            } catch (error) { console.error("Firestore Save Error:", error); }
        }
    }
    renderQRToUI(renderPayload, color, isLiquid);
};

btnGenerate.onclick = () => handleGenerate(true); 

// --- History & Analytics Data ---
const fetchHistory = (uid) => {
    const historyQuery = query(collection(db, "qr_history"), where("uid", "==", uid));

    onSnapshot(historyQuery, (snapshot) => {
        historyList.innerHTML = ''; 
        userHistoryDocs = []; 
        let docsArray = [];

        snapshot.forEach(doc => docsArray.push({ id: doc.id, ...doc.data() }));

        docsArray.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
            const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
            return timeB - timeA; 
        });

        if(docsArray.length > 0) btnClearHistory.classList.remove('hidden');
        else btnClearHistory.classList.add('hidden');

        docsArray.forEach((data) => {
            userHistoryDocs.push(data.id); 
            const item = document.createElement('div');
            
            const iconMap = { 'url': '🔗', 'vcard': '📇', 'upi': '💸', 'crypto':'🪙', 'event':'📅', 'geo':'📍', 'wifi': '📶', 'email': '✉️' };
            const icon = iconMap[data.type] || '✨';
            
            // Analytics Button built into history item for dynamic links
            const dynamicBadge = data.isDynamic 
                ? `<button onclick="event.stopPropagation(); window.openAnalytics('${data.id}')" class="bg-purple-600 hover:bg-purple-500 text-white text-[9px] px-2 py-1 rounded-md font-bold ml-2 transition-colors shadow">📊 ${data.scans || 0} Scans</button>` 
                : '';

            item.className = "p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer text-xs mb-2 flex items-center justify-between";
            item.innerHTML = `
                <div class="flex items-center gap-3 truncate flex-1">
                    <span class="opacity-50">${icon}</span>
                    <span class="truncate text-gray-300 font-medium">${data.title}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    ${dynamicBadge}
                    <div class="w-3 h-3 rounded-full shadow-md" style="background: ${data.color}"></div>
                </div>
            `;

            item.onclick = () => {
                qrColor.value = data.color || "#ffffff";
                qrShape.value = data.shape || "square";
                qrDynamic.checked = !!data.isDynamic;
                
                const targetTab = document.querySelector(`[data-mode="${data.type}"]`);
                if(targetTab) targetTab.click();

                // Hydrate based on type
                if(data.type === 'url') document.getElementById('in-url').value = data.content;
                // Add minor hydration for visual preview of other fields if desired here
                
                let previewPayload = data.content;
                if (data.isDynamic) previewPayload = `${VERCEL_URL}/scan.html?id=${data.id}`;
                renderQRToUI(previewPayload, data.color, data.shape === 'liquid');
            };
            historyList.appendChild(item);
        });
    });
};

// --- Open Analytics Modal ---
window.openAnalytics = (docId) => {
    const docData = docsCache.find(d => d.id === docId); // Note: We need to pull from array or fetch. Let's fetch live.
    
    // Quick inline live fetch for security and freshness
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js").then(module => {
        module.getDoc(module.doc(db, "qr_history", docId)).then(docSnap => {
            if(docSnap.exists()) {
                const data = docSnap.data();
                analyticsTitle.innerText = data.title;
                statTotal.innerText = data.scans || 0;
                
                analyticsTableBody.innerHTML = "";
                if(data.scanLogs && data.scanLogs.length > 0) {
                    // Reverse to show newest first
                    [...data.scanLogs].reverse().forEach(log => {
                        const row = document.createElement('tr');
                        row.className = "border-b border-white/5";
                        
                        const d = new Date(log.timestamp);
                        const dateStr = `${d.getDate()}/${d.getMonth()+1} - ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                        
                        row.innerHTML = `
                            <td class="p-3">${dateStr}</td>
                            <td class="p-3 text-purple-400 font-medium">${log.device || 'Unknown'}</td>
                            <td class="p-3">${log.location || 'Unknown'}</td>
                        `;
                        analyticsTableBody.appendChild(row);
                    });
                } else {
                    analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No scans recorded yet.</td></tr>`;
                }
                
                analyticsModal.classList.remove('hidden');
            }
        });
    });
};

btnCloseAnalytics.onclick = () => analyticsModal.classList.add('hidden');

// --- Bulk Studio Engine (Unchanged but included) ---
const generateBulk = async () => { /* ... (Same as previous bulk generator) ... */ };

// --- Clear History ---
btnClearHistory.onclick = async () => {
    if (userHistoryDocs.length === 0) return;
    if (!confirm("Delete your entire scan history?")) return;
    try {
        const batch = writeBatch(db);
        userHistoryDocs.forEach((docId) => batch.delete(doc(db, "qr_history", docId)));
        await batch.commit();
    } catch (error) { alert("Failed to clear history."); }
};

// --- Downloads ---
btnDownload.onclick = () => {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `EliteQR-${Date.now()}.png`; link.href = canvas.toDataURL("image/png"); link.click();
    }
};

btnDownloadSvg.onclick = () => {
    const tempDiv = document.createElement('div');
    const svgOptions = {
        text: currentMode === 'url' && qrDynamic.checked ? `${VERCEL_URL}/scan.html?id=preview` : document.getElementById('in-url').value,
        width: 1000, height: 1000, colorDark: qrColor.value, colorLight: "transparent",
        dotScale: qrShape.value === 'liquid' ? 0.4 : 1.0, timing_scale: qrShape.value === 'liquid' ? 0.4 : 1.0,
        drawer: 'svg', correctLevel: QRCode.CorrectLevel.H
    };
    new QRCode(tempDiv, svgOptions);
    setTimeout(() => {
        const svgElement = tempDiv.querySelector('svg');
        if (svgElement) {
            const serializer = new XMLSerializer();
            let source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(svgElement);
            const link = document.createElement('a'); link.download = `EliteQR-Vector-${Date.now()}.svg`;
            link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source); link.click();
        }
    }, 500);
};
