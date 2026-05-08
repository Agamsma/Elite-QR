import { auth, db } from './firebase-config.js';
import { loginWithGoogle, logoutUser, monitorAuthState } from './auth.js';
import { 
    collection, addDoc, query, where, onSnapshot, 
    serverTimestamp, writeBatch, doc, getDoc 
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
const qrFrameText = document.getElementById('qr-frame-text');
const qrDynamic = document.getElementById('qr-dynamic');
const scarcityPanel = document.getElementById('scarcity-panel');
const qrcodeDiv = document.getElementById('qrcode');
const historyList = document.getElementById('history-list');

// Analytics Elements
const analyticsModal = document.getElementById('analytics-modal');
const btnCloseAnalytics = document.getElementById('btn-close-analytics');
const analyticsTableBody = document.getElementById('analytics-table-body');
const statTotal = document.getElementById('stat-total');
const statDevices = document.getElementById('stat-devices');
const analyticsTitle = document.getElementById('analytics-title');

const VERCEL_URL = "https://elite-qr.vercel.app";
let currentMode = 'url'; 
let logoBase64 = null;
let userHistoryDocs = []; 
let docsCache = []; 

// Toggle Scarcity UI Visibility
qrDynamic.addEventListener('change', (e) => {
    if(e.target.checked || currentMode === 'hub') scarcityPanel.classList.remove('hidden');
    else scarcityPanel.classList.add('hidden');
});

// --- Tab Management ---
const tabBtns = document.querySelectorAll('.tab-btn');
const inputAreas = document.querySelectorAll('.input-area');

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
        
        // Dynamic & Scarcity Availability Logic
        if(currentMode === 'url') {
            qrDynamic.disabled = false;
        } else if (currentMode === 'hub') {
            qrDynamic.checked = true;
            qrDynamic.disabled = true; // Hub MUST be dynamic
            scarcityPanel.classList.remove('hidden');
        } else {
            qrDynamic.checked = false;
            qrDynamic.disabled = true;
            scarcityPanel.classList.add('hidden');
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

// --- Logo Handling ---
qrLogoInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => { logoBase64 = event.target.result; };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

// --- Helpers ---
const formatDateIcal = (dateString) => {
    if(!dateString) return "";
    return dateString.replace(/[-:]/g, "") + "00Z";
};

// --- Render Engine ---
const renderQRToUI = (payload, color, isLiquid, frameTextStr) => {
    qrcodeDiv.innerHTML = ""; 
    qrcodeDiv.classList.remove('qr-animate'); 
    void qrcodeDiv.offsetWidth; 

    const isMobile = window.innerWidth < 768;
    const qrSize = isMobile ? 200 : 250; 
    const logoSize = isMobile ? 50 : 60;

    let options = {
        text: payload, 
        width: qrSize, 
        height: qrSize,
        colorDark: color, 
        colorLight: "transparent",
        dotScale: isLiquid ? 0.4 : 1.0, 
        timing_scale: isLiquid ? 0.4 : 1.0, 
        logo: logoBase64, 
        logoWidth: logoSize, 
        logoHeight: logoSize,
        logoBackgroundTransparent: true, 
        correctLevel: QRCode.CorrectLevel.H,
        onRenderingEnd: () => {
            qrcodeDiv.classList.add('qr-animate');
            btnDownload.classList.remove('hidden');
            btnDownloadSvg.classList.remove('hidden');
        }
    };

    if (frameTextStr) {
        options.title = frameTextStr;
        options.titleFont = "bold 16px sans-serif";
        options.titleColor = color;
        options.titleBackgroundColor = "transparent";
        options.titleHeight = 40;
        options.titleTop = 15;
    }

    new QRCode(qrcodeDiv, options);
};

// --- Bulk Engine ---
const generateBulk = async () => {
    const fileInput = document.getElementById('in-bulk-file');
    if(!fileInput.files.length) return alert("Upload a CSV file first!");

    btnGenerate.innerText = "GENERATING ZIP...";
    btnGenerate.classList.add('animate-pulse');

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        const zip = new JSZip();

        for(let i=0; i<rows.length; i++) {
            const parts = rows[i].split(',');
            if(parts.length < 2) continue;
            const name = parts[0];
            const url = parts.slice(1).join(',').trim();

            await new Promise(resolve => {
                const tempDiv = document.createElement('div');
                new QRCode(tempDiv, {
                    text: url, width: 800, height: 800,
                    colorDark: qrColor.value, colorLight: "#ffffff", 
                    dotScale: qrShape.value === 'liquid' ? 0.4 : 1.0,
                    timing_scale: qrShape.value === 'liquid' ? 0.4 : 1.0,
                    correctLevel: QRCode.CorrectLevel.H,
                    onRenderingEnd: () => {
                        setTimeout(() => {
                            const canvas = tempDiv.querySelector('canvas');
                            const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
                            zip.file(`${name.trim() || 'QR_'+i}.png`, base64Data, {base64: true});
                            resolve();
                        }, 100);
                    }
                });
            });
        }

        zip.generateAsync({type:"blob"}).then(content => {
            const link = document.createElement('a');
            link.download = `EliteQR_Bulk_Studio_${Date.now()}.zip`;
            link.href = URL.createObjectURL(content);
            link.click();
            btnGenerate.innerText = "GENERATE & SYNC";
            btnGenerate.classList.remove('animate-pulse');
        });
    };
    reader.readAsText(file);
};

// --- Main Generator Controller ---
const handleGenerate = async (saveToDatabase = true) => {
    if (currentMode === 'bulk') return generateBulk();

    let payloadText = "";
    let displayTitle = "";
    let hubData = null;

    if (currentMode === 'url') {
        payloadText = document.getElementById('in-url').value.trim();
        displayTitle = payloadText;
        if (!payloadText) return alert("Please enter a URL.");
    
    } else if (currentMode === 'hub') {
        const name = document.getElementById('in-hub-name').value.trim();
        if(!name) return alert("Hub Name is required.");
        displayTitle = `🌳 Hub: ${name}`;
        hubData = {
            name: name,
            bio: document.getElementById('in-hub-bio').value.trim(),
            links: [
                { title: document.getElementById('in-hub-l1-title').value.trim(), url: document.getElementById('in-hub-l1-url').value.trim() },
                { title: document.getElementById('in-hub-l2-title').value.trim(), url: document.getElementById('in-hub-l2-url').value.trim() },
                { title: document.getElementById('in-hub-l3-title').value.trim(), url: document.getElementById('in-hub-l3-url').value.trim() }
            ]
        };
    
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

    } else if (currentMode === 'prank') {
        const fakeTitle = document.getElementById('in-prank-title').value.trim();
        const prankChoice = document.getElementById('in-prank-type').value;
        if (!fakeTitle) return alert("Provide a fake title!");
        
        // HACKER PRANK ROUTING
        if (prankChoice === 'hacker') {
            payloadText = `${VERCEL_URL}/hacked.html`;
        } else {
            payloadText = prankChoice;
        }
        displayTitle = `🎭 Bait: ${fakeTitle}`;

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
    const frameTxt = qrFrameText.value.trim();
    
    const maxScans = parseInt(document.getElementById('in-expiry-scans').value) || null;
    const expiryDate = document.getElementById('in-expiry-date').value || null;

    let renderPayload = payloadText;

    if (saveToDatabase) {
        const user = auth.currentUser;
        if (user) {
            try {
                if (qrDynamic.checked || currentMode === 'hub') {
                    const dbPayload = {
                        uid: user.uid, type: currentMode, title: displayTitle, color: color, shape: qrShape.value, frameText: frameTxt,
                        isDynamic: true, scans: 0, scanLogs: [], createdAt: serverTimestamp(),
                        maxScans: maxScans, expiryDate: expiryDate
                    };
                    
                    if(currentMode === 'hub') {
                        dbPayload.hubData = hubData;
                        const docRef = await addDoc(collection(db, "qr_history"), dbPayload);
                        renderPayload = `${VERCEL_URL}/hub.html?id=${docRef.id}`;
                    } else {
                        dbPayload.content = payloadText;
                        dbPayload.originalUrl = payloadText;
                        const docRef = await addDoc(collection(db, "qr_history"), dbPayload);
                        renderPayload = `${VERCEL_URL}/scan.html?id=${docRef.id}`;
                    }
                    
                    renderQRToUI(renderPayload, color, isLiquid, frameTxt);
                    return; 
                } else {
                    // Static Codes
                    await addDoc(collection(db, "qr_history"), {
                        uid: user.uid, type: currentMode, content: payloadText, title: displayTitle, 
                        color: color, shape: qrShape.value, frameText: frameTxt, isDynamic: false, createdAt: serverTimestamp()
                    });
                }
            } catch (error) { console.error("Firestore Save Error:", error); }
        }
    }
    renderQRToUI(renderPayload, color, isLiquid, frameTxt);
};

btnGenerate.onclick = () => handleGenerate(true); 

// --- Real-time History & Hydration ---
const fetchHistory = (uid) => {
    const historyQuery = query(collection(db, "qr_history"), where("uid", "==", uid));

    onSnapshot(historyQuery, (snapshot) => {
        historyList.innerHTML = ''; 
        userHistoryDocs = []; 
        docsCache = []; 
        let docsArray = [];

        snapshot.forEach(doc => docsArray.push({ id: doc.id, ...doc.data() }));
        docsArray.sort((a, b) => (b.createdAt?.toMillis() || Date.now()) - (a.createdAt?.toMillis() || Date.now()));

        if(docsArray.length > 0) btnClearHistory.classList.remove('hidden');
        else btnClearHistory.classList.add('hidden');

        docsArray.forEach((data) => {
            userHistoryDocs.push(data.id); 
            docsCache.push(data);
            
            const item = document.createElement('div');
            const iconMap = { 'url': '🔗', 'hub': '🌳', 'prank': '🎭', 'vcard': '📇', 'upi': '💸', 'crypto':'🪙', 'event':'📅', 'geo':'📍', 'wifi': '📶', 'email': '✉️' };
            const icon = iconMap[data.type] || '✨';
            
            const analyticsBtn = data.isDynamic 
                ? `<button onclick="event.stopPropagation(); window.openAnalytics('${data.id}')" class="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[9px] px-2 py-1 rounded-lg font-bold transition-all border border-purple-500/30">📊 Stats</button>` 
                : '';

            item.className = "p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer text-xs mb-2 flex items-center justify-between";
            item.innerHTML = `
                <div class="flex items-center gap-3 truncate">
                    <span class="opacity-40">${icon}</span>
                    <span class="truncate font-medium text-gray-300">${data.title}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${analyticsBtn}
                    <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background: ${data.color}"></div>
                </div>
            `;

            item.onclick = () => {
                // UI Hydration
                qrColor.value = data.color || "#ffffff";
                qrShape.value = data.shape || "square";
                qrFrameText.value = data.frameText || "";
                qrDynamic.checked = !!data.isDynamic;
                
                if(data.maxScans) document.getElementById('in-expiry-scans').value = data.maxScans;
                if(data.expiryDate) document.getElementById('in-expiry-date').value = data.expiryDate;
                
                const targetTab = document.querySelector(`[data-mode="${data.type}"]`);
                if(targetTab) targetTab.click();

                // Form Field Hydration
                if(data.type === 'url') document.getElementById('in-url').value = data.content;
                else if (data.type === 'hub' && data.hubData) {
                    document.getElementById('in-hub-name').value = data.hubData.name || '';
                    document.getElementById('in-hub-bio').value = data.hubData.bio || '';
                } else if (data.type === 'prank') {
                    document.getElementById('in-prank-title').value = data.title.replace('🎭 Bait: ', '');
                }
                
                // Re-render Code
                let previewPayload = data.content;
                if (data.type === 'hub') previewPayload = `${VERCEL_URL}/hub.html?id=${data.id}`;
                else if (data.isDynamic) previewPayload = `${VERCEL_URL}/scan.html?id=${data.id}`;
                
                renderQRToUI(previewPayload, data.color, data.shape === 'liquid', data.frameText);
            };
            historyList.appendChild(item);
        });
    });
};

// --- Analytics Engine ---
window.openAnalytics = async (docId) => {
    analyticsTitle.innerText = "Fetching latest data...";
    statTotal.innerText = "...";
    statDevices.innerText = "...";
    analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-purple-400 animate-pulse">Loading analytics...</td></tr>`;
    analyticsModal.classList.remove('hidden');

    try {
        const docSnap = await getDoc(doc(db, "qr_history", docId));
        if(docSnap.exists()) {
            const data = docSnap.data();
            analyticsTitle.innerText = data.title;
            statTotal.innerText = data.scans || 0;

            const logs = data.scanLogs || [];
            const uniqueDevices = new Set(logs.map(l => l.device)).size;
            statDevices.innerText = uniqueDevices;

            analyticsTableBody.innerHTML = "";
            if (logs.length > 0) {
                [...logs].reverse().forEach(log => {
                    const row = document.createElement('tr');
                    row.className = "border-b border-white/5 hover:bg-white/[0.02] transition-colors";
                    
                    const date = new Date(log.timestamp);
                    const timeStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                    row.innerHTML = `
                        <td class="p-4 whitespace-nowrap opacity-60">${timeStr}</td>
                        <td class="p-4"><span class="px-2 py-1 bg-white/5 rounded-md text-purple-400 font-bold text-[10px]">${log.device || 'Unknown'}</span></td>
                        <td class="p-4 truncate max-w-[150px]">${log.location || 'Unknown Location'}</td>
                    `;
                    analyticsTableBody.appendChild(row);
                });
            } else {
                analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-gray-500 italic">No scan data recorded yet.</td></tr>`;
            }
        }
    } catch(err) {
        analyticsTitle.innerText = "Error loading data.";
        analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-red-400">Could not fetch analytics from database.</td></tr>`;
    }
};

btnCloseAnalytics.onclick = () => analyticsModal.classList.add('hidden');

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
        link.download = `EliteQR-${Date.now()}.png`; 
        link.href = canvas.toDataURL("image/png"); 
        link.click();
    }
};

btnDownloadSvg.onclick = () => {
    const tempDiv = document.createElement('div');
    
    // Construct payload for download
    let payload = document.getElementById('in-url')?.value || "https://agam.com"; // Fallback
    if(currentMode === 'url' && qrDynamic.checked) payload = `${VERCEL_URL}/scan.html?id=preview`;
    else if(currentMode === 'hub') payload = `${VERCEL_URL}/hub.html?id=preview`;
    
    const svgOptions = {
        text: payload,
        width: 1000, height: 1000, 
        colorDark: qrColor.value, colorLight: "transparent",
        dotScale: qrShape.value === 'liquid' ? 0.4 : 1.0, 
        timing_scale: qrShape.value === 'liquid' ? 0.4 : 1.0,
        drawer: 'svg', correctLevel: QRCode.CorrectLevel.H
    };

    if (qrFrameText.value.trim()) {
        svgOptions.title = qrFrameText.value.trim();
        svgOptions.titleFont = "bold 60px sans-serif";
        svgOptions.titleColor = qrColor.value;
        svgOptions.titleHeight = 150;
        svgOptions.titleTop = 50;
    }

    new QRCode(tempDiv, svgOptions);
    setTimeout(() => {
        const svgElement = tempDiv.querySelector('svg');
        if (svgElement) {
            const serializer = new XMLSerializer();
            let source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(svgElement);
            const link = document.createElement('a'); 
            link.download = `EliteQR-Vector-${Date.now()}.svg`;
            link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source); 
            link.click();
        }
    }, 500);
};
