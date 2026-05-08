<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agam's Elite QR</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/gh/ushelp/EasyQRCodeJS@master/dist/easy.qrcode.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="flex flex-col md:flex-row h-screen overflow-hidden text-white relative">

    <div id="analytics-modal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4 hidden transition-opacity">
        <div class="glass p-6 md:p-8 rounded-[32px] w-full max-w-2xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight">Scan <span class="text-purple-500">Analytics</span></h2>
                    <p id="analytics-title" class="text-xs text-gray-400 mt-1">Loading data...</p>
                </div>
                <button id="btn-close-analytics" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">✕</button>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-purple-600/20 border border-purple-500/30 p-4 rounded-2xl text-center">
                    <p class="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-1">Total Scans</p>
                    <p id="stat-total" class="text-3xl font-black">0</p>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto hide-scrollbar border border-white/5 rounded-2xl bg-black/20 p-2">
                <table class="w-full text-left text-xs">
                    <thead class="text-[10px] text-gray-500 uppercase sticky top-0 bg-[#0f0f12]/90 backdrop-blur-md">
                        <tr>
                            <th class="p-3 rounded-tl-xl">Date & Time</th>
                            <th class="p-3">Device</th>
                            <th class="p-3 rounded-tr-xl">Location</th>
                        </tr>
                    </thead>
                    <tbody id="analytics-table-body" class="text-gray-300">
                        </tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="auth-overlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
        <div class="glass p-8 md:p-10 rounded-[32px] text-center max-w-sm w-full border border-white/10">
            <h1 class="text-3xl md:text-4xl font-bold mb-2">Elite <span class="text-purple-500">QR</span></h1>
            <p class="text-gray-400 mb-8 text-xs md:text-sm">Premium Dynamic QR Studio</p>
            <button id="btn-login" class="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Continue with Google
            </button>
        </div>
    </div>

    <aside class="w-full md:w-80 glass flex flex-col z-20 border-b md:border-b-0 md:border-r border-white/5 shrink-0 max-h-[35vh] md:max-h-full">
        <div class="p-4 md:p-8 border-b border-white/5 flex items-center justify-between gap-3 shrink-0 bg-black/20 backdrop-blur-md">
            <div class="flex items-center gap-3">
                <div id="user-photo" class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-600 shadow-lg"></div>
                <div>
                    <h2 id="user-name" class="text-xs md:text-sm font-bold truncate">Loading...</h2>
                    <button id="btn-logout" class="text-[9px] md:text-[10px] text-gray-400 hover:text-white uppercase tracking-tighter transition-colors">Sign Out</button>
                </div>
            </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-2">Scan History</h3>
                <button id="btn-clear-history" class="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-md hidden transition-colors">Clear All</button>
            </div>
            <div id="history-list" class="space-y-2"></div>
        </div>
    </aside>

    <main class="flex-1 flex items-start md:items-center justify-center relative overflow-y-auto p-4 md:p-8">
        <div class="bg-watermark hidden md:block">AGAM</div>
        
        <div class="glass max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10 rounded-[32px] md:rounded-[40px] z-10 relative">
            
            <div class="space-y-5 w-full overflow-hidden">
                <header>
                    <h2 class="text-2xl md:text-3xl font-bold text-white">Create <br class="md:hidden"><span class="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Masterpiece</span></h2>
                </header>

                <div class="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-2 px-2 md:mx-0 md:px-0">
                    <button data-mode="url" class="tab-btn active shrink-0 px-4 py-2 bg-white/10 rounded-xl text-xs font-bold text-white shadow transition-all border border-white/10">🔗 Link</button>
                    <button data-mode="vcard" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">📇 Contact</button>
                    <button data-mode="upi" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">💸 UPI</button>
                    <button data-mode="crypto" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">🪙 Crypto</button>
                    <button data-mode="event" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">📅 Event</button>
                    <button data-mode="geo" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">📍 Location</button>
                    <button data-mode="wifi" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">📶 WiFi</button>
                    <button data-mode="email" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">✉️ Email</button>
                    <button data-mode="bulk" class="tab-btn shrink-0 px-4 py-2 bg-black/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all border border-transparent">📦 Bulk Studio</button>
                </div>

                <div class="relative w-full">
                    <div id="area-url" class="input-area transition-all">
                        <input type="text" id="in-url" placeholder="https://your-link.com" class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                    </div>
                    <div id="area-vcard" class="input-area hidden space-y-3 transition-all">
                        <input type="text" id="in-vc-name" placeholder="Full Name" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <input type="text" id="in-vc-phone" placeholder="Phone Number" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <input type="email" id="in-vc-email" placeholder="Email Address" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                    </div>
                    <div id="area-upi" class="input-area hidden space-y-3 transition-all">
                        <input type="text" id="in-upi-id" placeholder="UPI ID (e.g., agam@okhdfcbank)" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <input type="text" id="in-upi-name" placeholder="Payee Name" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                    </div>
                    <div id="area-crypto" class="input-area hidden space-y-3 transition-all">
                        <select id="in-crypto-type" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors appearance-none">
                            <option value="bitcoin">Bitcoin (BTC)</option>
                            <option value="ethereum">Ethereum (ETH)</option>
                            <option value="solana">Solana (SOL)</option>
                        </select>
                        <input type="text" id="in-crypto-address" placeholder="Wallet Address" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                    </div>
                    <div id="area-event" class="input-area hidden space-y-3 transition-all">
                        <input type="text" id="in-event-title" placeholder="Event Title" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <div class="grid grid-cols-2 gap-2">
                            <input type="datetime-local" id="in-event-start" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none text-white focus:border-purple-500 transition-colors">
                            <input type="datetime-local" id="in-event-end" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none text-white focus:border-purple-500 transition-colors">
                        </div>
                    </div>
                    <div id="area-geo" class="input-area hidden space-y-3 transition-all">
                        <div class="grid grid-cols-2 gap-2">
                            <input type="text" id="in-geo-lat" placeholder="Latitude (e.g. 23.58)" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                            <input type="text" id="in-geo-lng" placeholder="Longitude (e.g. 72.36)" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        </div>
                    </div>
                    <div id="area-wifi" class="input-area hidden space-y-3 transition-all">
                        <input type="text" id="in-wifi-ssid" placeholder="Network Name (SSID)" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <input type="text" id="in-wifi-pass" placeholder="Password" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <select id="in-wifi-type" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors appearance-none">
                            <option value="WPA">WPA/WPA2 (Most Common)</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">No Password</option>
                        </select>
                    </div>
                    <div id="area-email" class="input-area hidden space-y-3 transition-all">
                        <input type="email" id="in-email-to" placeholder="Send to" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                        <input type="text" id="in-email-sub" placeholder="Subject" class="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none text-white focus:border-purple-500 transition-colors">
                    </div>
                    <div id="area-bulk" class="input-area hidden space-y-3 transition-all">
                        <div class="bg-purple-600/10 border border-purple-500/20 p-4 rounded-xl text-xs text-purple-300">
                            <strong>Bulk Generator:</strong> Upload `.csv` (FileName, URL) to get a ZIP file.
                        </div>
                        <input type="file" id="in-bulk-file" accept=".csv" class="w-full text-xs text-gray-500 file:bg-white/10 file:border-0 file:rounded-xl file:text-white file:px-3 file:py-2 file:cursor-pointer hover:file:bg-white/20 transition-all">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-500 mb-2">QR Color</label>
                        <input type="color" id="qr-color" value="#ffffff" class="h-10 w-full bg-black/40 border border-white/10 rounded-xl p-1 cursor-pointer">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-500 mb-2">Center Logo</label>
                        <input type="file" id="qr-logo" accept="image/*" class="w-full text-[10px] text-gray-500 file:bg-white/10 file:border-0 file:rounded-xl file:text-white file:px-2 file:py-1.5 file:cursor-pointer hover:file:bg-white/20 transition-all">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-gray-500 mb-2">Data Shape</label>
                        <select id="qr-shape" class="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-xs outline-none text-white focus:border-purple-500 transition-colors appearance-none">
                            <option value="square">Standard Squares</option>
                            <option value="liquid">Liquid Dots</option>
                        </select>
                    </div>
                    <div class="flex items-center mt-6">
                        <label class="flex items-center cursor-pointer gap-2">
                            <input type="checkbox" id="qr-dynamic" class="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600 bg-black/40 accent-purple-500">
                            <span class="text-[10px] uppercase font-bold text-purple-400 leading-tight">Enable Analytics<br>(Dynamic URL)</span>
                        </label>
                    </div>
                </div>

                <button id="btn-generate" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all text-white text-sm transform active:scale-95">
                    GENERATE & SYNC
                </button>
            </div>

            <div class="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/5 pt-8 md:pt-0 pl-0 md:pl-10">
                <div id="qrcode-container" class="p-4 md:p-6 bg-black/20 backdrop-blur-sm rounded-[24px] md:rounded-[32px] border border-white/10 flex items-center justify-center min-h-[220px] min-w-[220px] md:min-h-[280px] md:min-w-[280px] shadow-2xl relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
                    <div id="qrcode" class="transition-all duration-500 relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-gray-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-6 w-full md:w-auto">
                    <button id="btn-download" class="flex-1 px-4 py-3 md:py-2 bg-white/10 rounded-xl border border-white/10 text-[10px] md:text-xs font-bold text-gray-300 hover:text-white hover:bg-white/20 transition-all text-center hidden">
                        ⏬ PNG
                    </button>
                    <button id="btn-download-svg" class="flex-1 px-4 py-3 md:py-2 bg-purple-600/20 rounded-xl border border-purple-500/30 text-[10px] md:text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-600/40 transition-all text-center hidden">
                        ✨ Vector SVG
                    </button>
                </div>
            </div>
        </div>
    </main>

    <script type="module" src="./js/main.js"></script>
</body>
</html>
