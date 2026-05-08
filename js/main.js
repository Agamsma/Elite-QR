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

        // Disable dynamic toggle for bulk/wifi/contact
        if (currentMode !== 'url') {
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
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
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
    });
};

// --- Bulk Studio Engine ---
const generateBulk = async () => {
    const fileInput = document.getElementById('in-bulk-file');
    if (!fileInput.files.length) return alert("Upload a CSV file first!");

    btnGenerate.innerText = "GENERATING ZIP...";
    btnGenerate.classList.add('animate-pulse');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        const zip = new JSZip();

        for (let i = 0; i < rows.length; i++) {
            const [name, url] = rows[i].split(',');
            if (!url) continue;

            // Generate silently in memory
            await new Promise(resolve => {
                const tempDiv = document.createElement('div');
                new QRCode(tempDiv, {
                    text: url.trim(), width: 800, height: 800,
                    colorDark: qrColor.value, colorLight: "#ffffff", // Solid bg for bulk print
                    dotScale: qrShape.value === 'liquid' ? 0.4 : 1.0,
                    timing_scale: qrShape.value === 'liquid' ? 0.4 : 1.0,
                    correctLevel: QRCode.CorrectLevel.H,
                    onRenderingEnd: () => {
                        setTimeout(() => {
                            const canvas = tempDiv.querySelector('canvas');
                            const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
                            zip.file(`${name.trim() || 'QR_' + i}.png`, base64Data, { base64: true });
                            resolve();
                        }, 100);
                    }
                });
            });
        }

        zip.generateAsync({ type: "blob" }).then(content => {
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
        if (!to) return alert("Recipient email is required.");
        payloadText = `mailto:${to}?subject=${encodeURIComponent(sub)}`;
        displayTitle = `Email: ${to}`;
    }

    const color = qrColor.value;
    const isLiquid = qrShape.value === 'liquid';
    let renderPayload = payloadText;

    // Advanced Dynamic Link DB Routing
    if (saveToDatabase) {
        const user = auth.currentUser;
        if (user) {
            try {
                // If Dynamic, save to DB FIRST to get the ID, then generate the QR
                if (qrDynamic.checked && currentMode === 'url') {
                    const docRef = await addDoc(collection(db, "qr_history"), {
                        uid: user.uid, type: 'url', content: payloadText, originalUrl: payloadText,
                        title: displayTitle, color: color, shape: qrShape.value,
                        isDynamic: true, scans: 0, createdAt: serverTimestamp()
                    });

                    // CHANGE THIS TO YOUR LIVE VERCEL URL BEFORE DEPLOYING!
                    renderPayload = `http://localhost:5500/scan.html?id=${docRef.id}`;
                    renderQRToUI(renderPayload, color, isLiquid);
                    return; // Exit here, DB is already saved
                } else {
                    // Standard Static Save
                    await addDoc(collection(db, "qr_history"), {
                        uid: user.uid, type: currentMode, content: payloadText,
                        title: displayTitle, color: color, shape: qrShape.value,
                        isDynamic: false, createdAt: serverTimestamp()
                    });
                }
            } catch (error) {
                console.error("Firestore Save Error:", error);
            }
        }
    }

    renderQRToUI(renderPayload, color, isLiquid);
};

btnGenerate.onclick = () => handleGenerate(true);

// --- Real-time History ---
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

        if (docsArray.length > 0) {
            btnClearHistory.classList.remove('hidden');
        } else {
            btnClearHistory.classList.add('hidden');
            historyList.innerHTML = '<p class="text-xs text-gray-500 italic mt-4 px-2">No history yet.</p>';
        }

        docsArray.forEach((data) => {
            userHistoryDocs.push(data.id);
            const item = document.createElement('div');

            const iconMap = { 'url': '🔗', 'vcard': '📇', 'wifi': '📶', 'email': '✉️' };
            const icon = iconMap[data.type] || '✨';

            // Show scan count if dynamic
            const scanBadge = data.isDynamic ? `<span class="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-bold ml-1">${data.scans || 0} Scans</span>` : '';

            item.className = "p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer text-xs truncate mb-2 flex items-center gap-3";
            item.innerHTML = `
                <span class="opacity-50">${icon}</span>
                <span class="truncate flex-1 text-gray-300 font-medium">${data.title} ${scanBadge}</span>
                <div class="w-3 h-3 rounded-full shadow-md shrink-0" style="background: ${data.color}"></div>
            `;

            item.onclick = () => {
                qrColor.value = data.color || "#ffffff";
                qrShape.value = data.shape || "square";
                qrDynamic.checked = !!data.isDynamic;

                const targetTab = document.querySelector(`[data-mode="${data.type}"]`);
                if (targetTab) targetTab.click();

                if (data.type === 'url') document.getElementById('in-url').value = data.content;

                // If it's dynamic, reconstruct the tracking URL for the preview, otherwise use content
                let previewPayload = data.content;
                if (data.isDynamic) previewPayload = `http://localhost:5500/scan.html?id=${data.id}`;

                renderQRToUI(previewPayload, data.color, data.shape === 'liquid');
            };
            historyList.appendChild(item);
        });
    });
};

// --- Clear History ---
btnClearHistory.onclick = async () => {
    if (userHistoryDocs.length === 0) return;
    if (!confirm("Delete your entire scan history?")) return;
    try {
        const batch = writeBatch(db);
        userHistoryDocs.forEach((docId) => batch.delete(doc(db, "qr_history", docId)));
        await batch.commit();
    } catch (error) {
        alert("Failed to clear history.");
    }
};

// --- Download ---
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
    const svgOptions = {
        text: currentMode === 'url' && qrDynamic.checked ? `http://localhost:5500/scan.html?id=preview` : document.getElementById('in-url').value,
        width: 1000, height: 1000,
        colorDark: qrColor.value, colorLight: "transparent",
        dotScale: qrShape.value === 'liquid' ? 0.4 : 1.0,
        timing_scale: qrShape.value === 'liquid' ? 0.4 : 1.0,
        drawer: 'svg', correctLevel: QRCode.CorrectLevel.H
    };

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