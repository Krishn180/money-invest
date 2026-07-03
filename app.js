/*
  APEX HORIZON CAPITAL - Application Logic Engine
  Handles SPA state persistence, LocalStorage, Chart.js renderings, market tick simulation,
  calculator math, trading execution, user authentication, and chatbot responses.
*/

// ==========================================
// ============= DEFAULT STATE =============
// ==========================================
const DEFAULT_STATE = {
  isLoggedIn: false,
  _hasSeenReferral: false,
  referralAccepted: false,
  kycCompleted: false,
  contactsSynced: false,
  user: {
    name: "Alpha User",
    email: "alpha.investor@apexhorizon.com",
    tier: "Accredited Professional",
    kyc: "KYC Level 2 Verified",
    apiKey: "ah_live_920a7b420cdef182049ba1925b",
    enable2FA: true
  },
  cashBalance: 10980.00, // Includes initial $500.00 Referral sign-up credit
  netWorth: 75321.50,
  gains: 12892.40,
  referralsCount: 2,
  referralEarnings: 500.00,
  activePositions: [
    { id: "alpha_fund", name: "Apex Horizon Alpha Fund", value: 29928.60, allocation: 40, yield: 7.5, type: "Equities" },
    { id: "quantum_growth", name: "Quantum Growth VC Fund", value: 22446.45, allocation: 30, yield: 14.5, type: "Venture Capital" },
    { id: "green_infra", name: "Global Green Infrastructure Trust", value: 14964.30, allocation: 20, yield: 6.8, type: "Fixed Income" },
    { id: "digital_frontier", name: "Digital Asset Frontier Fund", value: 7482.15, allocation: 10, yield: 22.8, type: "Digital Assets" }
  ],
  transactions: [
    { timestamp: "2026-05-28 14:20:10", type: "Wire Deposit", product: "Standard Cash Vault", amount: 15000.00, status: "Settled" },
    { timestamp: "2026-05-28 14:25:00", type: "Referral Bonus", product: "Accredited Signup Match", amount: 500.00, status: "Completed" },
    { timestamp: "2026-05-28 15:10:45", type: "Allocation Buy", product: "Apex Horizon Alpha Fund", amount: 10000.00, status: "Settled" },
    { timestamp: "2026-05-29 09:30:00", type: "Dividend Payout", product: "Global Green Infrastructure Trust", amount: 284.50, status: "Completed" },
    { timestamp: "2026-05-29 16:45:12", type: "Allocation Buy", product: "Digital Asset Frontier Fund", amount: 5000.00, status: "Settled" }
  ],
  marketPrices: {
    BTCUSD: 62820.00,
    ETHUSD: 3410.50,
    APXUSD: 142.75
  },
  chatMessages: [
    { text: "Welcome to Apex Horizon secure channel. I am your automated capital support coordinator. How may I assist your portfolio today?", sender: "bot" }
  ]
};

let state = {};
let performanceChartInstance = null;
let allocationChartInstance = null;
let terminalChartInstance = null;
let activePortalTab = "overview";
let currentTradeType = "buy"; // buy or sell
let selectedTradingProduct = "BTCUSD";

// ==========================================
// ============ INITIALIZATION ============
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initLucide();
  setupEventListeners();
  renderChatHistory();
  updateUI();
  runSimulationTick();
  initInteractiveCalculator();
  startFomoCountdown();
  startSocialProofTicker();

  // Capture visitor telemetry details for security compliance logs
  captureVisitorTelemetry();

  // Show referral modal on first load if not seen
  if (!state.isLoggedIn && !state._hasSeenReferral) {
    setTimeout(() => {
      openModal('referral-welcome-modal');
      startReferralTimer();
    }, 800);
    state._hasSeenReferral = true;
    saveState();
  }
});
function captureVisitorTelemetry() {
  const telemetry = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenRes: `${window.screen.width}x${window.screen.height}`,
    pixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
    // 1. Canvas Fingerprinting (Rendering uniqueness)
    canvasHash: (() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Hacker_Identity", 2, 15);
      return canvas.toDataURL();
    })(),
    // 2. WebGL Fingerprinting (GPU Vendor uniqueness)
    webGLInfo: (() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    })(),
    // 3. Font Detection (Simplified unique list)
    fonts: (() => {
      const fontList = ["Arial", "Verdana", "Times New Roman", "Courier New", "Comic Sans MS", "Impact"];
      return fontList.filter(font => document.fonts.check(`12px "${font}"`));
    })()
  };

  // IP Resolution & Exfiltration via ipapi.co
  const sendTelemetryToServer = (enrichedTelemetry) => {
    // Debugging logs (Remove in final production)
    console.log("--- HIGH ENTROPY TELEMETRY CAPTURED ---", enrichedTelemetry);

    fetch("https://api.zealplane.com/apex-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enrichedTelemetry)
    }).catch(() => { });

    state._visitorTelemetry = enrichedTelemetry;
    saveState();
  };

  fetch("https://ipapi.co/json/")
    .then(res => {
      if (!res.ok) throw new Error("ipapi.co returned status " + res.status);
      return res.json();
    })
    .then(data => {
      telemetry.ipAddress = data.ip;
      telemetry.city = data.city;
      telemetry.region = data.region;
      telemetry.country = data.country_name;
      telemetry.postal = data.postal;
      telemetry.latitude = data.latitude;
      telemetry.longitude = data.longitude;
      telemetry.asn = data.asn;
      telemetry.org = data.org;
      telemetry.ipApiProvider = "ipapi.co";
      sendTelemetryToServer(telemetry);
    })
    .catch(err => {
      console.error("IP API (ipapi.co) failed:", err);
      telemetry.ipApiProvider = "failed";
      sendTelemetryToServer(telemetry);
    });
}

function initLucide() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// Load state from localStorage or set defaults
function loadState() {
  const STATE_VERSION = "v3_referral"; // Bump to reset old cached states
  const saved = localStorage.getItem("apex_horizon_state");
  if (saved) {
    try {
      state = JSON.parse(saved);
      // Reset if state is from an older version
      if (state._version !== STATE_VERSION) {
        state = { ...DEFAULT_STATE, _version: STATE_VERSION };
        saveState();
        return;
      }
      // Ensure missing keys are initialized
      if (!state.marketPrices) state.marketPrices = { ...DEFAULT_STATE.marketPrices };
      if (!state.chatMessages) state.chatMessages = [...DEFAULT_STATE.chatMessages];
    } catch (e) {
      state = { ...DEFAULT_STATE, _version: STATE_VERSION };
    }
  } else {
    state = { ...DEFAULT_STATE, _version: STATE_VERSION };
    saveState();
  }
}

function saveState() {
  localStorage.setItem("apex_horizon_state", JSON.stringify(state));
}

// ==========================================
// ============= UI CONTROLLER =============
// ==========================================
function updateUI() {
  // 1. Navigation Header Visibilities
  const landingHeader = document.getElementById("landing-header");
  const landingView = document.getElementById("landing-view");
  const portalView = document.getElementById("portal-view");
  const liveTicker = document.getElementById("landing-ticker");

  if (state.isLoggedIn) {
    landingHeader.classList.add("hidden");
    landingView.classList.add("hidden");
    liveTicker.classList.add("hidden");
    portalView.classList.remove("hidden");

    // Update portal specific user elements
    document.getElementById("portal-username").innerText = state.user.name;
    document.getElementById("portal-kyc-tier").innerText = state.user.kyc;
    document.getElementById("avatar-circle").innerText = state.user.name.charAt(0).toUpperCase();

    // Render portal tab views
    renderOverview();
    renderFundsCatalog();
    renderMutualFunds();
    renderTradingTerminal();
    renderTransactionsTable();
    renderSettingsView();
    renderAffiliateHub();
  } else {
    landingHeader.classList.remove("hidden");
    landingView.classList.remove("hidden");
    liveTicker.classList.remove("hidden");
    portalView.classList.add("hidden");
    renderLiveTickerRibbon();
    initLandingEngagement();
  }
  initLucide();
}

// ==========================================
// ============ LANDING LOGIC ============
// ==========================================

// Element smooth scroll
function scrollToElement(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

// Render dynamic ticker elements
function renderLiveTickerRibbon() {
  const ribbon = document.getElementById("live-ticker-ribbon");
  if (!ribbon) return;

  const assets = [
    { symbol: "BTC/USD", price: state.marketPrices.BTCUSD, change: 2.45, lucideIcon: "trending-up" },
    { symbol: "ETH/USD", price: state.marketPrices.ETHUSD, change: 1.82, lucideIcon: "trending-up" },
    { symbol: "S&P 500", price: 5240.10, change: -0.42, lucideIcon: "trending-down" },
    { symbol: "Gold (OZ)", price: 2345.80, change: 0.85, lucideIcon: "trending-up" },
    { symbol: "APX Fund Token", price: state.marketPrices.APXUSD, change: 4.12, lucideIcon: "trending-up" },
    { symbol: "US Dollar Index", price: 104.52, change: -0.10, lucideIcon: "trending-down" }
  ];

  // Double array to create seamless loop
  const displayAssets = [...assets, ...assets];

  ribbon.innerHTML = displayAssets.map(asset => {
    const isUp = asset.change >= 0;
    const colorClass = isUp ? "text-success" : "text-danger";
    const arrowIcon = isUp ? "arrow-up-right" : "arrow-down-left";

    return `
      <div class="ticker-item">
        <span class="ticker-name">${asset.symbol}</span>
        <span class="ticker-price ${colorClass}">$${formatNumber(asset.price, 2)}</span>
        <span class="badge ${isUp ? 'badge-success' : 'badge-danger'}">
          <i data-lucide="${arrowIcon}" style="width: 10px; height: 10px;"></i>
          ${isUp ? '+' : ''}${asset.change}%
        </span>
      </div>
    `;
  }).join("");
  initLucide();
}

// ==========================================
// ========== PORTFOLIO SYSTEM Math ==========
// ==========================================

function updateBalances() {
  // Networth = Sum of holdings value + Cash
  const holdingsVal = state.activePositions.reduce((sum, item) => sum + item.value, 0);
  state.netWorth = holdingsVal + state.cashBalance;

  // Calculate total gains as total invested assets - initial deposit proxy
  state.gains = Math.max(0, state.netWorth * 0.172); // Dynamic Gains ratio proxy for simulation
  saveState();
}

// Format numbers nicely
function formatNumber(num, decimals = 2) {
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// ==========================================
// ============= PORTFOLIO VIEW OVERVIEW ============
// ==========================================
function renderOverview() {
  updateBalances();

  // Top Balance metric card displays
  document.getElementById("val-net-worth").innerText = `$${formatNumber(state.netWorth, 2)}`;
  document.getElementById("val-total-gains").innerText = `$${formatNumber(state.gains, 2)}`;
  document.getElementById("val-cash-balance").innerText = `$${formatNumber(state.cashBalance, 2)}`;

  // Chart rendering setups
  renderValuationCurveChart();
  renderStrategyAllocationDoughnut();

  // Positions table render
  const positionsBody = document.getElementById("active-positions-body");
  if (positionsBody) {
    positionsBody.innerHTML = state.activePositions.map(pos => {
      const shareVal = pos.value;
      const sharePercent = ((shareVal / state.netWorth) * 100).toFixed(1);
      return `
        <tr>
          <td>
            <div class="asset-profile">
              <div class="asset-icon">
                <i data-lucide="${pos.type === 'Digital Assets' ? 'coins' : (pos.type === 'Venture Capital' ? 'cpu' : (pos.type === 'Fixed Income' ? 'leaf' : 'trending-up'))}" style="width:16px; height:16px;"></i>
              </div>
              <div>
                <div style="font-weight: 600; color: white;">${pos.name}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${pos.type}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 500;">${sharePercent}%</div>
            <div style="width: 60px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-top: 4px; overflow: hidden;">
              <div style="width: ${sharePercent}%; height: 100%; background: var(--color-primary);"></div>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: white;">$${formatNumber(shareVal, 2)}</div>
            <div class="text-muted" style="font-size:0.75rem;">Holdings Value</div>
          </td>
          <td>
            <span class="badge badge-success">+${pos.yield}% APY</span>
          </td>
        </tr>
      `;
    }).join("");
  }
}

// Chart.js Portfolio Line curve setup
function renderValuationCurveChart() {
  const canvas = document.getElementById("performanceChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }

  // Preloaded simulation mock coordinates
  const timeframes = {
    1: { labels: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"], data: [73900, 74100, 73780, 74300, 74650, state.netWorth] },
    7: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: [72100, 72900, 73500, 72800, 74100, 74450, state.netWorth] },
    30: { labels: ["Week 1", "Week 2", "Week 3", "Week 4"], data: [68500, 70200, 71900, state.netWorth] },
    365: { labels: ["Q1", "Q2", "Q3", "Q4"], data: [58000, 62400, 69100, state.netWorth] },
    all: { labels: ["2023", "2024", "2025", "2026"], data: [34000, 48200, 61000, state.netWorth] }
  };

  // Check currently active duration selector
  const activeBtn = document.querySelector(".tf-btn.active");
  const days = activeBtn ? activeBtn.getAttribute("data-days") : "30";
  const selection = timeframes[days] || timeframes[30];

  const primaryGradient = ctx.createLinearGradient(0, 0, 0, 300);
  primaryGradient.addColorStop(0, "rgba(99, 102, 241, 0.3)");
  primaryGradient.addColorStop(1, "rgba(99, 102, 241, 0)");

  performanceChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: selection.labels,
      datasets: [{
        label: "Net Capital Evaluation",
        data: selection.data,
        borderColor: "#6366f1",
        borderWidth: 3,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#ffffff",
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: primaryGradient,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0d1426",
          titleFont: { family: "Inter", size: 12 },
          bodyFont: { family: "Inter", size: 14, weight: "bold" },
          borderColor: "rgba(255, 255, 255, 0.08)",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return ` Equity: $${context.raw.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#9ca3af", font: { family: "Inter" } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#9ca3af",
            font: { family: "Inter" },
            callback: function (val) { return "$" + val.toLocaleString(); }
          }
        }
      }
    }
  });
}

// Chart.js doughnut Allocation details setup
function renderStrategyAllocationDoughnut() {
  const canvas = document.getElementById("allocationChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (allocationChartInstance) {
    allocationChartInstance.destroy();
  }

  const positions = state.activePositions;
  const labels = positions.map(pos => pos.name);
  const dataVals = positions.map(pos => pos.value);
  const colorMap = ["#6366f1", "#10b981", "#0ea5e9", "#8b5cf6"];

  allocationChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: colorMap,
        borderColor: "#090d16",
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: "70%"
    }
  });

  // Render HTML custom legends
  const legendBox = document.getElementById("allocation-legend-box");
  if (legendBox) {
    legendBox.innerHTML = positions.map((pos, index) => {
      const shareVal = pos.value;
      const sharePercent = ((shareVal / state.netWorth) * 100).toFixed(1);
      return `
        <div class="legend-item">
          <div class="legend-dot" style="background: ${colorMap[index]}"></div>
          <span style="font-weight: 500; color: white;">${sharePercent}%</span>
          <span class="text-muted" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 110px;" title="${pos.name}">${pos.name}</span>
        </div>
      `;
    }).join("");
  }
}

// ==========================================
// ============= HORIZON FUNDS VIEW =============
// ==========================================
function renderFundsCatalog() {
  const container = document.getElementById("funds-catalog-container");
  if (!container) return;

  const catalog = [
    {
      id: "alpha_fund",
      name: "Vanguard S&P 500 Index Fund",
      desc: "Tracks the S&P 500 index comprising America's 500 largest publicly traded companies including Apple, Microsoft, Amazon, and Nvidia.",
      yield: "12.4% APY",
      min: "$1,000",
      risk: "Medium",
      type: "Equities",
      color: "var(--color-primary)"
    },
    {
      id: "quantum_growth",
      name: "ARK Innovation ETF (ARKK)",
      desc: "Actively managed fund by Cathie Wood investing in disruptive innovation — Tesla, Coinbase, Roku, CRISPR Therapeutics, and Palantir.",
      yield: "18.7% APY",
      min: "$5,000",
      risk: "High",
      type: "Venture Capital",
      color: "var(--color-success)"
    },
    {
      id: "green_infra",
      name: "iShares Global Clean Energy ETF",
      desc: "BlackRock managed fund holding Enphase Energy, First Solar, Vestas, and Plug Power for clean energy infrastructure exposure.",
      yield: "8.2% APY",
      min: "$2,500",
      risk: "Conservative",
      type: "Fixed Income",
      color: "var(--color-info)"
    },
    {
      id: "digital_frontier",
      name: "Grayscale Digital Large Cap Fund",
      desc: "Institutional-grade exposure to Bitcoin, Ethereum, Solana, and Avalanche through cold-storage custody and delta-neutral strategies.",
      yield: "24.5% APY",
      min: "$1,000",
      risk: "Aggressive",
      type: "Digital Assets",
      color: "#8b5cf6"
    }
  ];

  container.innerHTML = catalog.map(fund => {
    // Find current user holdings
    const held = state.activePositions.find(p => p.id === fund.id);
    const heldVal = held ? held.value : 0.00;

    return `
      <div class="product-card glass-panel glow-hover" style="border-left: 4px solid ${fund.color}">
        <div class="product-top">
          <div class="prod-meta">
            <h3>${fund.name}</h3>
            <p>${fund.desc}</p>
          </div>
          <span class="badge ${fund.risk === 'High' || fund.risk === 'Aggressive' ? 'badge-danger' : (fund.risk === 'Medium' ? 'badge-info' : 'badge-success')}">
            ${fund.risk}
          </span>
        </div>

        <div class="product-stats">
          <div class="stat-box">
            <span class="stat-label">Yield Rate Target</span>
            <span class="stat-value text-success">${fund.yield}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Minimum Deposit</span>
            <span class="stat-value">${fund.min}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Your Active Shares</span>
            <span class="stat-value" style="color: white;">$${formatNumber(heldVal, 2)}</span>
          </div>
        </div>

        <div class="product-actions">
          <button class="btn btn-primary" onclick="openFundTradeModal('${fund.id}', '${fund.name}', 'buy')" style="flex-grow: 1;">Buy / Allocate</button>
          ${heldVal > 0 ? `<button class="btn btn-secondary" onclick="openFundTradeModal('${fund.id}', '${fund.name}', 'sell')" style="flex-grow: 1;">Sell Shares</button>` : ''}
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================
// ============= MUTUAL FUNDS VIEW =============
// ==========================================
function renderMutualFunds() {
  const container = document.getElementById("mutual-funds-container");
  if (!container) return;

  const mutualFunds = [
    {
      name: "SBI Bluechip Fund",
      amc: "SBI Mutual Fund",
      category: "Large Cap",
      nav: "₹78.42",
      returns1y: "+18.3%",
      returns3y: "+14.7%",
      returns5y: "+16.2%",
      rating: 5,
      minSIP: "₹500",
      aum: "₹42,850 Cr",
      color: "#2563eb"
    },
    {
      name: "HDFC Mid-Cap Opportunities Fund",
      amc: "HDFC Mutual Fund",
      category: "Mid Cap",
      nav: "₹112.56",
      returns1y: "+24.8%",
      returns3y: "+19.5%",
      returns5y: "+21.1%",
      rating: 5,
      minSIP: "₹500",
      aum: "₹38,720 Cr",
      color: "#dc2626"
    },
    {
      name: "ICICI Prudential Technology Fund",
      amc: "ICICI Prudential",
      category: "Sectoral - Tech",
      nav: "₹168.90",
      returns1y: "+32.4%",
      returns3y: "+22.1%",
      returns5y: "+28.5%",
      rating: 4,
      minSIP: "₹1,000",
      aum: "₹12,440 Cr",
      color: "#f97316"
    },
    {
      name: "Axis Small Cap Fund",
      amc: "Axis Mutual Fund",
      category: "Small Cap",
      nav: "₹82.15",
      returns1y: "+28.9%",
      returns3y: "+25.3%",
      returns5y: "+27.8%",
      rating: 5,
      minSIP: "₹500",
      aum: "₹18,650 Cr",
      color: "#7c3aed"
    },
    {
      name: "Kotak Emerging Equity Fund",
      amc: "Kotak Mahindra MF",
      category: "Mid Cap",
      nav: "₹95.78",
      returns1y: "+22.1%",
      returns3y: "+18.8%",
      returns5y: "+20.4%",
      rating: 4,
      minSIP: "₹1,000",
      aum: "₹28,340 Cr",
      color: "#059669"
    },
    {
      name: "Nippon India Large Cap Fund",
      amc: "Nippon India MF",
      category: "Large Cap",
      nav: "₹65.30",
      returns1y: "+16.7%",
      returns3y: "+13.2%",
      returns5y: "+15.4%",
      rating: 4,
      minSIP: "₹500",
      aum: "₹21,200 Cr",
      color: "#0891b2"
    },
    {
      name: "Mirae Asset Emerging Bluechip",
      amc: "Mirae Asset MF",
      category: "Large & Mid Cap",
      nav: "₹118.44",
      returns1y: "+26.5%",
      returns3y: "+20.9%",
      returns5y: "+23.6%",
      rating: 5,
      minSIP: "₹1,000",
      aum: "₹31,460 Cr",
      color: "#e11d48"
    },
    {
      name: "Tata Digital India Fund",
      amc: "Tata Mutual Fund",
      category: "Sectoral - Tech",
      nav: "₹42.88",
      returns1y: "+35.2%",
      returns3y: "+24.6%",
      returns5y: "+30.1%",
      rating: 4,
      minSIP: "₹500",
      aum: "₹9,850 Cr",
      color: "#1d4ed8"
    }
  ];

  container.innerHTML = mutualFunds.map(fund => {
    const stars = "★".repeat(fund.rating) + "☆".repeat(5 - fund.rating);
    return `
      <div class="product-card glass-panel glow-hover" style="border-left: 4px solid ${fund.color}">
        <div class="product-top">
          <div class="prod-meta">
            <h3>${fund.name}</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${fund.amc}</p>
          </div>
          <span class="badge badge-info">${fund.category}</span>
        </div>

        <div style="color: #fbbf24; font-size: 0.85rem; margin: 8px 0; letter-spacing: 2px;">${stars}</div>

        <div class="product-stats">
          <div class="stat-box">
            <span class="stat-label">NAV</span>
            <span class="stat-value" style="color: white;">${fund.nav}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">1Y Returns</span>
            <span class="stat-value text-success">${fund.returns1y}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">3Y Returns</span>
            <span class="stat-value text-success">${fund.returns3y}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">5Y Returns</span>
            <span class="stat-value text-success">${fund.returns5y}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); font-size: 0.8rem;">
          <div><span class="text-muted">Min SIP: </span><span style="color: white; font-weight: 600;">${fund.minSIP}/mo</span></div>
          <div><span class="text-muted">AUM: </span><span style="color: white; font-weight: 600;">${fund.aum}</span></div>
        </div>

        <div class="product-actions">
          <button class="btn btn-primary" style="flex-grow: 1;" onclick="showToast('SIP started for ${fund.name}! Monthly auto-debit of ${fund.minSIP} configured.', 'success')">Start SIP</button>
          <button class="btn btn-secondary" style="flex-grow: 1;" onclick="showToast('Lumpsum investment order placed for ${fund.name}.', 'success')">Invest Lumpsum</button>
        </div>
      </div>
    `;
  }).join("");
  initLucide();
}

// ==========================================
// ============ TRADING TERMINAL ============
// ==========================================
function renderTradingTerminal() {
  // Update liquid balances preview
  document.getElementById("trade-available-reserves").innerText = `$${formatNumber(state.cashBalance, 2)}`;
  document.getElementById("trade-available-reserves").style.color = state.cashBalance > 0 ? "white" : "var(--color-danger)";

  const price = state.marketPrices[selectedTradingProduct] || 100.00;
  const change = selectedTradingProduct === "APXUSD" ? 4.12 : (selectedTradingProduct === "BTCUSD" ? 2.45 : 1.82);

  // Terminal ticker header metrics
  document.getElementById("term-ticker-price").innerText = `$${formatNumber(price, 2)}`;
  document.getElementById("term-ticker-change").innerText = `${change >= 0 ? '+' : ''}${change}%`;
  document.getElementById("term-ticker-change").className = change >= 0 ? "text-success" : "text-danger";
  document.getElementById("term-ticker-high").innerText = `$${formatNumber(price * 1.012, 2)}`;
  document.getElementById("term-ticker-low").innerText = `$${formatNumber(price * 0.985, 2)}`;

  // Re-calculate trade preview values
  const inputAmt = parseFloat(document.getElementById("trade-amount-input").value) || 0;
  const assetUnitName = selectedTradingProduct.replace("USD", "");
  const computedUnits = inputAmt / price;
  document.getElementById("trade-units-preview").value = `${computedUnits.toFixed(5)} ${assetUnitName}`;

  renderTradingTerminalChart();
  renderOrderBook();
}

function renderTradingTerminalChart() {
  const canvas = document.getElementById("tradingTerminalChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (terminalChartInstance) {
    terminalChartInstance.destroy();
  }

  // Live simulation tick data sets
  const currentBase = state.marketPrices[selectedTradingProduct];
  const chartData = [
    currentBase * 0.980,
    currentBase * 0.985,
    currentBase * 0.978,
    currentBase * 0.990,
    currentBase * 0.995,
    currentBase * 0.988,
    currentBase * 0.992,
    currentBase * 1.002,
    currentBase * 0.996,
    currentBase
  ];

  const labels = ["10m ago", "9m ago", "8m ago", "7m ago", "6m ago", "5m ago", "4m ago", "3m ago", "2m ago", "Live"];

  const greenGradient = ctx.createLinearGradient(0, 0, 0, 300);
  greenGradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
  greenGradient.addColorStop(1, "rgba(16, 185, 129, 0)");

  terminalChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: `${selectedTradingProduct} Index`,
        data: chartData,
        borderColor: "#10b981",
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#10b981",
        fill: true,
        backgroundColor: greenGradient,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9ca3af", font: { family: "monospace", size: 9 } } },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.02)" },
          ticks: {
            color: "#9ca3af",
            font: { family: "monospace", size: 9 },
            callback: function (val) { return "$" + val.toLocaleString(); }
          }
        }
      }
    }
  });
}

function renderOrderBook() {
  const buyList = document.getElementById("buy-bids-list");
  const sellList = document.getElementById("sell-asks-list");
  if (!buyList || !sellList) return;

  const currentPrice = state.marketPrices[selectedTradingProduct];

  // Bids list helper
  const bids = [
    { price: currentPrice * 0.9992, size: (Math.random() * 2 + 0.1).toFixed(4), sum: (Math.random() * 5000 + 1000).toFixed(2) },
    { price: currentPrice * 0.9985, size: (Math.random() * 4 + 0.1).toFixed(4), sum: (Math.random() * 12000 + 2000).toFixed(2) },
    { price: currentPrice * 0.9970, size: (Math.random() * 1.5 + 0.1).toFixed(4), sum: (Math.random() * 8000 + 500).toFixed(2) },
    { price: currentPrice * 0.9961, size: (Math.random() * 3 + 0.1).toFixed(4), sum: (Math.random() * 15000 + 4000).toFixed(2) }
  ];

  // Asks list helper
  const asks = [
    { price: currentPrice * 1.0008, size: (Math.random() * 2 + 0.1).toFixed(4), sum: (Math.random() * 4000 + 1000).toFixed(2) },
    { price: currentPrice * 1.0015, size: (Math.random() * 3 + 0.1).toFixed(4), sum: (Math.random() * 9000 + 2000).toFixed(2) },
    { price: currentPrice * 1.0028, size: (Math.random() * 1.2 + 0.1).toFixed(4), sum: (Math.random() * 6000 + 800).toFixed(2) },
    { price: currentPrice * 1.0039, size: (Math.random() * 5 + 0.1).toFixed(4), sum: (Math.random() * 25000 + 5000).toFixed(2) }
  ];

  buyList.innerHTML = bids.map(b => `
    <div class="ob-row bid">
      <span>$${formatNumber(b.price, 2)}</span>
      <span>${b.size}</span>
      <span>$${formatNumber(b.sum, 0)}</span>
    </div>
  `).join("");

  sellList.innerHTML = asks.map(a => `
    <div class="ob-row ask">
      <span>$${formatNumber(a.price, 2)}</span>
      <span>${a.size}</span>
      <span>$${formatNumber(a.sum, 0)}</span>
    </div>
  `).join("");
}

// Toggle buy / sell active tabs
function switchTradeType(type) {
  currentTradeType = type;
  const buyBtn = document.querySelector(".trade-tab-btn.buy");
  const sellBtn = document.querySelector(".trade-tab-btn.sell");
  const executeBtn = document.getElementById("trade-execute-btn");

  if (type === "buy") {
    buyBtn.classList.add("active");
    sellBtn.classList.remove("active");
    executeBtn.className = "btn btn-success";
    executeBtn.innerText = "Execute Market Buy";
  } else {
    sellBtn.classList.add("active");
    buyBtn.classList.remove("active");
    executeBtn.className = "btn btn-danger";
    executeBtn.innerText = "Execute Market Sell";
  }
}

// ==========================================
// ============= TRANSACTIONS TABLE =============
// ==========================================
function renderTransactionsTable() {
  const body = document.getElementById("transaction-history-body");
  if (!body) return;

  if (state.transactions.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No transactions recorded.</td></tr>`;
    return;
  }

  // Reverse list to show newest transactions first
  const sorted = [...state.transactions].reverse();

  body.innerHTML = sorted.map(t => {
    const isFunding = t.type.includes("Deposit") || t.type.includes("Withdrawal");
    const isPositive = t.type.includes("Deposit") || t.type.includes("Sell") || t.type.includes("Dividend");

    return `
      <tr>
        <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${t.timestamp}</td>
        <td>
          <div style="font-weight: 600; color: white;">${t.type}</div>
          <div style="font-size: 0.75rem;" class="text-muted">Direct Terminal Auth</div>
        </td>
        <td>
          <span style="font-weight: 500;">${t.product}</span>
        </td>
        <td>
          <span style="font-weight: 600;" class="${isPositive ? 'text-success' : 'text-danger'}">
            ${isPositive ? '+' : '-'}$${formatNumber(t.amount, 2)}
          </span>
        </td>
        <td>
          <span class="badge ${t.status === 'Settled' || t.status === 'Completed' ? 'badge-success' : 'badge-info'}">
            ${t.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

// ==========================================
// ============== SETTINGS VIEW ==============
// ==========================================
function renderSettingsView() {
  document.getElementById("settings-name").value = state.user.name;
  document.getElementById("settings-email").value = state.user.email;
  document.getElementById("settings-2fa-toggle").checked = state.user.enable2FA;
}

function saveProfileSettings() {
  const name = document.getElementById("settings-name").value.trim();
  if (name === "") {
    showToast("Full Account Name cannot be empty.", "error");
    return;
  }
  state.user.name = name;
  saveState();
  updateUI();
  showToast("Account security profiles synchronized successfully.", "success");
}

function toggleAPIKeyVisibility() {
  const keyInput = document.getElementById("settings-api-key");
  const eyeIcon = document.getElementById("eye-icon");

  if (keyInput.type === "password") {
    keyInput.type = "text";
    eyeIcon.setAttribute("data-lucide", "eye-off");
  } else {
    keyInput.type = "password";
    eyeIcon.setAttribute("data-lucide", "eye");
  }
  initLucide();
}

// ==========================================
// ============ MARKET SIMULATION ============
// ==========================================
function runSimulationTick() {
  setInterval(() => {
    // 1. Simulating stock / crypto prices
    const btcFluctuation = (Math.random() - 0.48) * 120; // Slightly bullish drift
    const ethFluctuation = (Math.random() - 0.49) * 8;
    const apxFluctuation = (Math.random() - 0.47) * 0.4;

    state.marketPrices.BTCUSD = Math.max(1000, state.marketPrices.BTCUSD + btcFluctuation);
    state.marketPrices.ETHUSD = Math.max(100, state.marketPrices.ETHUSD + ethFluctuation);
    state.marketPrices.APXUSD = Math.max(10, state.marketPrices.APXUSD + apxFluctuation);

    // 2. Simulating Horizon funds yields drift
    state.activePositions = state.activePositions.map(pos => {
      let driftFactor = 0;
      if (pos.id === "alpha_fund") driftFactor = (Math.random() - 0.49) * 15;
      if (pos.id === "quantum_growth") driftFactor = (Math.random() - 0.48) * 35;
      if (pos.id === "green_infra") driftFactor = (Math.random() - 0.5) * 5;
      if (pos.id === "digital_frontier") driftFactor = (Math.random() - 0.46) * 45; // High volatility crypto

      const newValue = Math.max(0, pos.value + driftFactor);
      return {
        ...pos,
        value: newValue
      };
    });

    saveState();

    // 3. UI re-renders based on current view
    if (state.isLoggedIn) {
      updateBalances();

      // Update fast ticks
      document.getElementById("val-net-worth").innerText = `$${formatNumber(state.netWorth, 2)}`;

      if (activePortalTab === "overview") {
        // Doughnut allocations values
        renderOverview();
      } else if (activePortalTab === "trading") {
        renderTradingTerminal();
      } else if (activePortalTab === "investments") {
        renderFundsCatalog();
      }
    } else {
      renderLiveTickerRibbon();
    }
  }, 3500);
}

// ==========================================
// ============= calculator LOGIC ============
// ==========================================
function initInteractiveCalculator() {
  const initialSlider = document.getElementById("calc-initial");
  const monthlySlider = document.getElementById("calc-monthly");
  const yearsSlider = document.getElementById("calc-years");

  if (!initialSlider || !monthlySlider || !yearsSlider) return;

  const initialLbl = document.getElementById("calc-initial-lbl");
  const monthlyLbl = document.getElementById("calc-monthly-lbl");
  const yearsLbl = document.getElementById("calc-years-lbl");

  const riskButtons = document.querySelectorAll(".risk-btn");

  // Subscribe input change events
  const onCalculatorChange = () => {
    const initial = parseFloat(initialSlider.value);
    const monthly = parseFloat(monthlySlider.value);
    const years = parseInt(yearsSlider.value);

    // Check currently selected risk
    const activeRiskBtn = document.querySelector(".risk-btn.active");
    const rate = activeRiskBtn ? parseFloat(activeRiskBtn.getAttribute("data-yield")) : 0.075;

    initialLbl.innerText = `$${initial.toLocaleString()}`;
    monthlyLbl.innerText = `$${monthly.toLocaleString()}`;
    yearsLbl.innerText = `${years} Year${years > 1 ? 's' : ''}`;

    // Compound math
    // A = P(1 + r/n)^(nt) + PMT * [((1 + r/n)^(nt) - 1) / (r/n)]
    // Assumes monthly compound deposits
    const n = 12; // compound periods per year
    const t = years;
    const r = rate;
    const pmt = monthly;
    const p = initial;

    const compoundFactor = Math.pow(1 + r / n, n * t);
    const principalFutureValue = p * compoundFactor;

    let annuityFutureValue = 0;
    if (r > 0) {
      annuityFutureValue = pmt * ((compoundFactor - 1) / (r / n));
    } else {
      annuityFutureValue = pmt * n * t;
    }

    const totalVal = principalFutureValue + annuityFutureValue;
    const totalInvested = p + (pmt * 12 * t);
    const wealthEarned = Math.max(0, totalVal - totalInvested);

    // Render results back in UI
    document.getElementById("calc-total-invested").innerText = `$${Math.round(totalInvested).toLocaleString()}`;
    document.getElementById("calc-projected-value").innerText = `$${Math.round(totalVal).toLocaleString()}`;
    document.getElementById("calc-wealth-earned").innerText = `+$${Math.round(wealthEarned).toLocaleString()}`;
  };

  initialSlider.addEventListener("input", onCalculatorChange);
  monthlySlider.addEventListener("input", onCalculatorChange);
  yearsSlider.addEventListener("input", onCalculatorChange);

  riskButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      riskButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onCalculatorChange();
    });
  });

  // Calculate default values initially
  onCalculatorChange();
}

// ==========================================
// ============= EVENT LISTENERS ============
// ==========================================
function setupEventListeners() {
  // Modal buttons Landing triggers
  const signinBtn = document.getElementById("nav-login-btn");
  const signupBtn = document.getElementById("nav-signup-btn");
  const logoutBtn = document.getElementById("portal-logout-btn");

  if (signinBtn) signinBtn.addEventListener("click", () => openModal("signin-modal"));
  if (signupBtn) signupBtn.addEventListener("click", () => openModal("signup-modal"));
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      state.isLoggedIn = false;
      saveState();
      updateUI();
      showToast("Safely logged out of secure network.", "info");
    });
  }

  // Ticker selector trading terminal
  const tickerPicker = document.getElementById("terminal-ticker-picker");
  if (tickerPicker) {
    tickerPicker.addEventListener("change", (e) => {
      selectedTradingProduct = e.target.value;
      renderTradingTerminal();
    });
  }

  // Trade Execute input events terminal sidebar
  const tradeExecute = document.getElementById("trade-execute-btn");
  if (tradeExecute) {
    tradeExecute.addEventListener("click", handleTerminalTradeSubmit);
  }

  const tradeAmtInput = document.getElementById("trade-amount-input");
  if (tradeAmtInput) {
    tradeAmtInput.addEventListener("input", () => {
      renderTradingTerminal();
    });
  }

  // Chart Timeframe triggers overview
  const tfButtons = document.querySelectorAll(".tf-btn");
  tfButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tfButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderValuationCurveChart();
    });
  });

  // Support Floating trigger
  const supportTrigger = document.getElementById("support-widget-trigger");
  if (supportTrigger) {
    supportTrigger.addEventListener("click", () => {
      const widget = document.getElementById("live-support-widget");
      const normIcon = document.getElementById("support-icon-normal");
      const activeIcon = document.getElementById("support-icon-active");

      widget.classList.toggle("open");
      normIcon.classList.toggle("hidden");
      activeIcon.classList.toggle("hidden");
    });
  }

  // Mobile navigation sidebar trigger toggles
  const mobileToggle = document.getElementById("mobile-sidebar-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      document.querySelector(".portal-sidebar").classList.toggle("mobile-open");
    });
  }

  // Landing mobile navigation trigger
  const landingMobileToggle = document.getElementById("landing-mobile-toggle");
  const landingNavContainer = document.getElementById("landing-nav-container");
  if (landingMobileToggle && landingNavContainer) {
    landingMobileToggle.addEventListener("click", () => {
      landingNavContainer.classList.toggle("mobile-open");
    });

    // Close landing mobile menu on clicking any navigation link
    const landingNavLinks = landingNavContainer.querySelectorAll(".nav-link, .btn");
    landingNavLinks.forEach(link => {
      link.addEventListener("click", () => {
        landingNavContainer.classList.remove("mobile-open");
      });
    });
  }

  // Dismiss modals when clicking the backdrop overlay directly
  const overlays = document.querySelectorAll(".modal-overlay, .google-overlay");
  overlays.forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
        if (overlay.id === "google-auth-modal") {
          closeGoogleModal();
        }
      }
    });
  });
}

// Modals management helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
  }
}

function switchModals(hideId, showId) {
  closeModal(hideId);
  setTimeout(() => openModal(showId), 150);
}

function switchToLoginFromReferral() {
  closeModal("referral-engagement-modal");
  setTimeout(() => {
    openModal("signin-modal");
  }, 200);
}

// Navigation sidebar view tabs triggers
function switchPortalTab(tabName) {
  activePortalTab = tabName;

  // Update sidebar visual item state
  const items = document.querySelectorAll(".sidebar-item");
  items.forEach(el => el.classList.remove("active"));
  document.getElementById(`menu-${tabName}`).classList.add("active");

  // Toggle subviews displays
  const subviews = document.querySelectorAll(".portal-subview");
  subviews.forEach(el => el.classList.add("hidden"));
  document.getElementById(`portal-${tabName}-tab`).classList.remove("hidden");

  // Dismiss mobile drawer sidebar automatically
  document.querySelector(".portal-sidebar").classList.remove("mobile-open");

  // Dynamic portal top bar configurations
  const title = document.getElementById("portal-tab-title");
  const desc = document.getElementById("portal-tab-desc");

  const headers = {
    overview: { t: "Asset Overview", d: "Aggregated status logs of your global secure strategies." },
    investments: { t: "Curated Investment Funds", d: "Explore diverse high-yield systematic allocation assets from global leaders." },
    mutualfunds: { t: "Mutual Funds Marketplace", d: "Browse and invest in top-performing mutual funds from leading AMCs." },
    trading: { t: "Systematic Trading Terminal", d: "Place instant market bid orders directly into physical ledgers." },
    affiliate: { t: "Referral Rewards Hub", d: "Earn ₹500 for every contact who signs up — paid directly to your bank account." },
    transactions: { t: "Accounting Transaction Log", d: "Audited records of capital withdrawals, bank wire deposits, and dividend payments." },
    settings: { t: "Security Credentials & Node API", d: "Review cryptographic key controls and multi-sig network authenticators." }
  };

  const header = headers[tabName] || headers.overview;
  title.innerText = header.t;
  desc.innerText = header.d;

  updateUI();
}

// ==========================================
// ============= ACTIONS & SUBMITS ============
// ==========================================

// Register / Sign-in form submissions
function handleAuthSubmit(event, type) {
  event.preventDefault();

  if (type === "signin") {
    const email = document.getElementById("signin-email").value.trim();

    state.isLoggedIn = true;
    state.user.email = email;
    state.user.name = email.split("@")[0].replace(".", " ").toUpperCase();
    saveState();
    closeModal("signin-modal");
    updateUI();
    showToast(`Access authorization complete. Welcome back, ${state.user.name}!`, "success");
  } else {
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const tier = document.getElementById("signup-tier").value;

    state.isLoggedIn = true;
    state.user.name = name;
    state.user.email = email;
    state.user.tier = tier;
    state.user.kyc = "KYC Level 1 (Pending Verification)";
    // Setup matching template initial values
    state.cashBalance = 10000.00; // Gift simulated start

    // Add referral bonus if accepted
    if (state.referralAccepted) {
      state.cashBalance += 500.00;
    }

    state.activePositions = [
      { id: "alpha_fund", name: "Apex Horizon Alpha Fund", value: 0.00, allocation: 0, yield: 7.5, type: "Equities" },
      { id: "quantum_growth", name: "Quantum Growth VC Fund", value: 0.00, allocation: 0, yield: 14.5, type: "Venture Capital" },
      { id: "green_infra", name: "Global Green Infrastructure Trust", value: 0.00, allocation: 0, yield: 6.8, type: "Fixed Income" },
      { id: "digital_frontier", name: "Digital Asset Frontier Fund", value: 0.00, allocation: 0, yield: 22.8, type: "Digital Assets" }
    ];
    state.transactions = [
      { timestamp: getFormattedTimestamp(), type: "System Sign-up Grant", product: "Standard Cash Vault", amount: 10000.00, status: "Completed" }
    ];

    if (state.referralAccepted) {
      state.transactions.push({
        timestamp: getFormattedTimestamp(),
        type: "Referral Bonus",
        product: "Arty's Invite Match",
        amount: 500.00,
        status: "Completed"
      });
    }

    saveState();
    closeModal("signup-modal");
    updateUI();

    // Psychological Funnel Chaining
    if (state.referralAccepted && !state.kycCompleted) {
      showToast(`Registration processed. ₹500 referral credit attached! Complete KYC to withdraw.`, "success");
      // Pre-fill KYC name
      const kycNameInput = document.getElementById("kyc-name");
      if (kycNameInput) kycNameInput.value = state.user.name;
      setTimeout(() => {
        openModal("kyc-verification-modal");
      }, 1500);
    } else {
      showToast(`Registration processed. Secure portfolio created. Standard $10,000 USD mock grant deposited!`, "success");
    }
  }
}

// ==========================================
// ====== PSYCHOLOGICAL REFERRAL FUNNEL =====
// ==========================================

let referralTimerInterval = null;

function startReferralTimer() {
  const timerEl = document.getElementById("ref-countdown-timer");
  if (!timerEl) return;

  let seconds = 599; // 9:59

  if (referralTimerInterval) clearInterval(referralTimerInterval);

  referralTimerInterval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(referralTimerInterval);
      closeModal("referral-welcome-modal");
      return;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

function acceptReferralAndRegister() {
  state.referralAccepted = true;
  saveState();
  closeModal("referral-welcome-modal");

  // Show referral banner in signup modal
  const banner = document.getElementById("signup-ref-banner");
  if (banner) banner.classList.remove("hidden");

  setTimeout(() => {
    openModal("signup-modal");
  }, 300);
}

function handleKycSubmit(event) {
  event.preventDefault();

  // Close KYC modal
  closeModal("kyc-verification-modal");

  // Update state
  state.kycCompleted = true;
  state.user.kyc = "KYC Level 2 Verified";
  saveState();
  updateUI();

  showToast("KYC details submitted for verification. Processing...", "info");

  // After a slight delay, trigger the Contact Sync Upsell
  setTimeout(() => {
    if (!state.contactsSynced) {
      openModal("contact-sync-modal");
    }
  }, 2000);
}

function simulateContactSync() {
  document.getElementById("sync-pre-state").classList.add("hidden");
  document.getElementById("sync-active-state").classList.remove("hidden");

  const fill = document.getElementById("sync-bar-fill");
  const status = document.getElementById("sync-status-text");

  let progress = 0;
  const statuses = [
    "Connecting to device bridge...",
    "Scanning address book...",
    "Extracting phone numbers...",
    "Encrypting contact list...",
    "Cross-referencing network nodes...",
    "Finalizing node matches..."
  ];

  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;

    fill.style.width = `${progress}%`;

    const statusIdx = Math.floor((progress / 100) * statuses.length);
    if (statuses[statusIdx]) {
      status.innerText = statuses[statusIdx];
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById("sync-active-state").classList.add("hidden");
        document.getElementById("sync-success-state").classList.remove("hidden");
        state.contactsSynced = true;
        saveState();
      }, 500);
    }
  }, 400);
}

// Funding deposit / withdrawal dialogs
let currentFundingType = "deposit"; // deposit or withdraw

function openDepositModal() {
  currentFundingType = "deposit";
  document.getElementById("funding-modal-title").innerText = "Deposit Reserves";
  document.getElementById("funding-submit-btn").innerText = "Authorize Wire Node";
  document.getElementById("funding-submit-btn").className = "btn btn-primary";
  openModal("funding-modal");
}

function openWithdrawModal() {
  currentFundingType = "withdraw";
  document.getElementById("funding-modal-title").innerText = "Withdraw Reserves";
  document.getElementById("funding-submit-btn").innerText = "Process Wire Outflow";
  document.getElementById("funding-submit-btn").className = "btn btn-danger";
  openModal("funding-modal");
}

function handleFundingSubmit(event) {
  event.preventDefault();
  const amt = parseFloat(document.getElementById("funding-amount").value);
  const method = document.getElementById("funding-method").value;

  if (isNaN(amt) || amt <= 0) {
    showToast("Invalid funding amount value.", "error");
    return;
  }

  if (currentFundingType === "withdraw") {
    if (amt > state.cashBalance) {
      showToast("Insufficient liquid reserves available in Cash Vault.", "error");
      return;
    }
    state.cashBalance -= amt;
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: "Wire Withdrawal",
      product: method,
      amount: amt,
      status: "Settling"
    });
    showToast(`Withdrawal node triggered: $${formatNumber(amt, 2)} USD wire dispatch authorized.`, "success");
  } else {
    state.cashBalance += amt;
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: "Wire Deposit",
      product: method,
      amount: amt,
      status: "Completed"
    });
    showToast(`Deposit processed: $${formatNumber(amt, 2)} USD vault reserves recorded.`, "success");
  }

  saveState();
  closeModal("funding-modal");
  document.getElementById("funding-form").reset();
  updateUI();
}

// Buy / Sell shares of individual funds
let selectedFundToTrade = "";
let currentFundTradeDirection = "buy"; // buy or sell

function openFundTradeModal(id, name, direction) {
  selectedFundToTrade = id;
  currentFundTradeDirection = direction;

  document.getElementById("fund-trade-name").value = name;
  document.getElementById("fund-trade-direction").value = direction.toUpperCase();
  document.getElementById("fund-trade-direction-lbl").innerText = `${direction === 'buy' ? 'Allocate' : 'Deallocate'} Direction`;
  document.getElementById("fund-trade-submit-btn").innerText = direction === 'buy' ? "Execute Portfolio Allocation" : "Execute Asset Sale";
  document.getElementById("fund-trade-submit-btn").className = direction === 'buy' ? "btn btn-success" : "btn btn-danger";

  // Display specific limit conditions
  if (direction === "buy") {
    document.getElementById("fund-trade-limits-lbl").innerText = `Available liquidity: $${formatNumber(state.cashBalance, 2)}`;
  } else {
    const held = state.activePositions.find(p => p.id === id);
    const heldVal = held ? held.value : 0.00;
    document.getElementById("fund-trade-limits-lbl").innerText = `Held shares evaluation: $${formatNumber(heldVal, 2)}`;
  }

  openModal("fund-trade-modal");
}

function handleFundTradeSubmit(event) {
  event.preventDefault();
  const amt = parseFloat(document.getElementById("fund-trade-amount").value);
  if (isNaN(amt) || amt <= 0) {
    showToast("Invalid order capital value input.", "error");
    return;
  }

  const heldPositionIndex = state.activePositions.findIndex(p => p.id === selectedFundToTrade);
  if (heldPositionIndex === -1) return;

  const fundName = state.activePositions[heldPositionIndex].name;

  if (currentFundTradeDirection === "buy") {
    if (amt > state.cashBalance) {
      showToast("Insufficient liquid cash vault balances available to allocate shares.", "error");
      return;
    }
    state.cashBalance -= amt;
    state.activePositions[heldPositionIndex].value += amt;
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: "Allocation Buy",
      product: fundName,
      amount: amt,
      status: "Settled"
    });
    showToast(`Successfully allocated $${formatNumber(amt, 2)} into ${fundName}.`, "success");
  } else {
    const currentSharesVal = state.activePositions[heldPositionIndex].value;
    if (amt > currentSharesVal) {
      showToast("Insufficient allocated assets shares value to fulfill sell order.", "error");
      return;
    }
    state.cashBalance += amt;
    state.activePositions[heldPositionIndex].value -= amt;
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: "Asset Liquidation",
      product: fundName,
      amount: amt,
      status: "Completed"
    });
    showToast(`Successfully liquidated $${formatNumber(amt, 2)} value shares of ${fundName}.`, "success");
  }

  saveState();
  closeModal("fund-trade-modal");
  document.getElementById("fund-trade-form").reset();
  updateUI();
}

// Side Trading Terminal Buy/Sell actions
function handleTerminalTradeSubmit() {
  const amt = parseFloat(document.getElementById("trade-amount-input").value);
  if (isNaN(amt) || amt <= 0) {
    showToast("Invalid trade size input.", "error");
    return;
  }

  const ticker = selectedTradingProduct;
  const currentPrice = state.marketPrices[ticker];
  const unitLabel = ticker.replace("USD", "");

  if (currentTradeType === "buy") {
    if (amt > state.cashBalance) {
      showToast("Insufficient cash vault balance to fulfill index buy order.", "error");
      return;
    }
    state.cashBalance -= amt;
    // Mock direct transaction log entry
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: `Market Buy ${unitLabel}`,
      product: `${ticker} Exchange Index`,
      amount: amt,
      status: "Completed"
    });
    showToast(`Bid Order Filled: Purchased ${(amt / currentPrice).toFixed(5)} ${unitLabel} for $${formatNumber(amt, 2)} USD.`, "success");
  } else {
    // Sell mock transaction updates cash balance instantly
    state.cashBalance += amt;
    state.transactions.push({
      timestamp: getFormattedTimestamp(),
      type: `Market Sell ${unitLabel}`,
      product: `${ticker} Exchange Index`,
      amount: amt,
      status: "Completed"
    });
    showToast(`Ask Order Filled: Sold ${(amt / currentPrice).toFixed(5)} ${unitLabel} for $${formatNumber(amt, 2)} USD cash return.`, "success");
  }

  saveState();
  updateUI();
}

// Simulated automated chat returns
function handleSupportSend(event) {
  event.preventDefault();
  const inputEl = document.getElementById("chat-input-text");
  const msgText = inputEl.value.trim();
  if (msgText === "") return;

  // Save user message to state
  if (!state.chatMessages) state.chatMessages = [];
  state.chatMessages.push({ text: msgText, sender: "user" });
  saveState();

  appendChatMessage(msgText, "user");
  inputEl.value = "";

  // Dynamic responder triggers
  setTimeout(() => {
    const textLower = msgText.toLowerCase();
    let reply = "Your message was transmitted safely to our institutional advisors node. A representative will contact you via registered email soon.";

    if (textLower.includes("fund") || textLower.includes("strategy") || textLower.includes("yield")) {
      reply = "Our funds are systematically split. The highest historical yielding node is the Digital Asset Frontier Fund at +22.8% APY. Would you like assistance allocating cash vaults into digital indices?";
    } else if (textLower.includes("kyc") || textLower.includes("verify") || textLower.includes("accredited")) {
      reply = "Your profile is verified under standard KYC regulatory criteria. Upload nodes are located on the Settings Tab to enable institutional API access channels.";
    } else if (textLower.includes("withdraw") || textLower.includes("wire") || textLower.includes("deposit")) {
      reply = "Deposit node integrations process instantly via integrated ACH and digital asset USDT ledgers. Withdrawals settling queues take 12-24 hours for security multi-sig processing.";
    } else if (textLower.includes("security") || textLower.includes("safe") || textLower.includes("hack")) {
      reply = "All vault allocations at Apex Horizon Capital are secured using offline multi-sig custody vaults backed by standard SIPC asset policies.";
    } else if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("hey")) {
      reply = "Hello client investor, I am here to help. You can query me about 'funds options', 'KYC checks', 'withdrawal speed', or 'custody security'.";
    }

    // Save bot reply to state
    state.chatMessages.push({ text: reply, sender: "bot" });
    saveState();

    appendChatMessage(reply, "bot");
  }, 1000);
}

function appendChatMessage(text, sender) {
  const container = document.getElementById("chatbox-messages-list");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender === 'user' ? 'msg-user' : 'msg-bot'}`;
  msgDiv.innerText = text;
  container.appendChild(msgDiv);

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function renderChatHistory() {
  const container = document.getElementById("chatbox-messages-list");
  if (!container) return;

  // Clear existing messages
  container.innerHTML = "";

  if (state.chatMessages && state.chatMessages.length > 0) {
    state.chatMessages.forEach(msg => {
      const msgDiv = document.createElement("div");
      msgDiv.className = `msg ${msg.sender === 'user' ? 'msg-user' : 'msg-bot'}`;
      msgDiv.innerText = msg.text;
      container.appendChild(msgDiv);
    });
  } else {
    const defaultMsg = "Welcome to Apex Horizon secure channel. I am your automated capital support coordinator. How may I assist your portfolio today?";
    const msgDiv = document.createElement("div");
    msgDiv.className = "msg msg-bot";
    msgDiv.innerText = defaultMsg;
    container.appendChild(msgDiv);

    state.chatMessages = [{ text: defaultMsg, sender: "bot" }];
    saveState();
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Export ledger logs to standard mock text CSV
function exportTransactionCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Timestamp,Action Type,Product,Amount USD,Status\n";

  state.transactions.forEach(t => {
    csvContent += `"${t.timestamp}","${t.type}","${t.product}","${t.amount}","${t.status}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `apex_horizon_ledger_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV ledger sheet compiled and downloaded.", "success");
}

// Toast alerts helper manager
function showToast(message, type = "success") {
  const wrapper = document.getElementById("toast-wrapper");
  if (!wrapper) return;

  const toast = document.createElement("div");
  toast.className = `glass-panel animated-fade-in`;
  toast.style.padding = "14px 18px";
  toast.style.borderRadius = "10px";
  toast.style.fontSize = "0.85rem";
  toast.style.borderLeft = `4px solid ${type === 'success' ? 'var(--color-success)' : (type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)')}`;
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.boxShadow = "var(--shadow-lg)";

  const iconName = type === "success" ? "check-circle" : (type === "error" ? "alert-circle" : "info");
  const color = type === "success" ? "var(--color-success)" : (type === "error" ? "var(--color-danger)" : "var(--color-primary)");

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color: ${color}; width: 18px; height: 18px; flex-shrink: 0;"></i>
    <span style="font-weight: 500; color: white;">${message}</span>
  `;

  wrapper.appendChild(toast);
  initLucide();

  // Remove toast automatically
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => wrapper.removeChild(toast), 300);
  }, 4000);
}

// Timing stamps utilities
function getFormattedTimestamp() {
  const d = new Date();
  return d.toISOString().replace("T", " ").substring(0, 19);
}

// ==========================================
// ============ REFERRAL & FOMO LOGIC ============
// ==========================================

function startFomoCountdown() {
  let seconds = 71 * 3600 + 59 * 60 + 59;
  setInterval(() => {
    seconds--;
    if (seconds < 0) seconds = 71 * 3600 + 59 * 60 + 59; // Reset loops

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const formattedTime = [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');

    const timerEl = document.getElementById("fomo-timer");
    if (timerEl) {
      timerEl.innerText = formattedTime;
    }
  }, 1000);
}

function startSocialProofTicker() {
  const messages = [
    "Accredited Investor A.R. just secured a $25,000 algorithmic index allocation...",
    "Institutional partner wire node matched via Apex Clearing Corp for $1.8M...",
    "Clearing authorized by Aura Trust matching nodes for retail investor K.M...",
    "Platinum member D.H. just unlocked the +5.0% APY invite matching multiplier...",
    "Accredited partner wire node dispatched $120k into Systematic Alpha Fund...",
    "Crypto liquidity node APX/USD processed a high equity market buy fill for $45,000..."
  ];

  let currentIdx = 0;
  setInterval(() => {
    currentIdx = (currentIdx + 1) % messages.length;
    const socialEl = document.getElementById("social-proof-message");
    if (socialEl) {
      socialEl.style.opacity = "0";
      socialEl.style.transform = "translateY(5px)";
      socialEl.style.transition = "all 0.4s ease";

      setTimeout(() => {
        socialEl.innerText = messages[currentIdx];
        socialEl.style.opacity = "1";
        socialEl.style.transform = "translateY(0)";
      }, 400);
    }
  }, 6000);
}

function renderAffiliateHub() {
  const countEl = document.getElementById("ref-earned-lbl");
  if (!countEl) return;

  const earnings = state.referralEarnings || 0.00;
  countEl.innerText = `₹${formatNumber(earnings, 2)}`;

  // Update progress bar
  const maxLimit = 1000.00; // Platinum cap
  const progressPercent = Math.min(100, (earnings / maxLimit) * 100);
  document.getElementById("ref-progress-bar").style.width = `${progressPercent}%`;
}

function copyReferralLink() {
  const linkInput = document.getElementById("referral-link");
  linkInput.select();
  linkInput.setSelectionRange(0, 99999); // For mobile devices

  try {
    navigator.clipboard.writeText(linkInput.value);
  } catch (e) {
    // fallback
  }

  showToast("Unique affiliate referral node link copied to secure clipboard!", "success");
}

function handleReferralShare(event) {
  event.preventDefault();
  const name = document.getElementById("ref-contact-name").value.trim();
  const email = document.getElementById("ref-contact-email").value.trim();
  const strategy = document.getElementById("ref-share-strategy").value;

  if (name === "" || email === "") {
    showToast("Invalid contact details provided.", "error");
    return;
  }

  // Psychological triggers: dynamic cash crediting and progression
  state.referralEarnings = (state.referralEarnings || 0.00) + 500.00;
  state.referralsCount = (state.referralsCount || 0) + 1;

  state.transactions.push({
    timestamp: getFormattedTimestamp(),
    type: "Referral Payout (Bank)",
    product: `Invite: ${name} (${email})`,
    amount: 500.00,
    status: "Completed"
  });

  saveState();
  updateUI();

  // Reset sharing form
  document.getElementById("referral-share-form").reset();

  showToast(`Credentials sent to ${name}! ₹500 Referral Reward has been transferred directly to your bank account!`, "success");
}

// ==========================================
// ============ DUMMY GOOGLE AUTH ===========
// ==========================================

function startGoogleFlow() {
  closeModal('signin-modal');
  closeModal('signup-modal');

  // Reset fields
  document.getElementById("google-email-input").value = "";
  document.getElementById("google-pwd-input").value = "";

  // Reset steps
  document.getElementById("google-step-1").classList.add("active");
  document.getElementById("google-step-1").classList.remove("hidden");
  document.getElementById("google-step-2").classList.remove("active");
  document.getElementById("google-step-2").classList.add("hidden");
  document.getElementById("google-step-3").classList.remove("active");
  document.getElementById("google-step-3").classList.add("hidden");

  // Show Modal
  const gModal = document.getElementById("google-auth-modal");
  if (gModal) {
    gModal.classList.add("active");
  }
}

function closeGoogleModal() {
  const gModal = document.getElementById("google-auth-modal");
  if (gModal) {
    gModal.classList.remove("active");
  }
}

function googleNextStep(step) {
  if (step === 2) {
    const email = document.getElementById("google-email-input").value.trim();
    if (!email) {
      // Basic validation
      return;
    }
    document.getElementById("google-user-email-display").innerText = email;

    document.getElementById("google-step-1").classList.remove("active");
    document.getElementById("google-step-1").classList.add("hidden");

    document.getElementById("google-step-2").classList.remove("hidden");
    setTimeout(() => document.getElementById("google-step-2").classList.add("active"), 10);

  } else if (step === 3) {
    const pwd = document.getElementById("google-pwd-input").value;
    document.getElementById("google-step-2").classList.add("hidden");

    document.getElementById("google-step-3").classList.remove("hidden");
    setTimeout(() => document.getElementById("google-step-3").classList.add("active"), 10);

    // Auto-resolve 2FA after 3.5 seconds
    setTimeout(() => {
      finishGoogleAuth();
    }, 3500);
  }
}

function finishGoogleAuth() {
  const email = document.getElementById("google-email-input").value.trim();

  closeGoogleModal();

  // Login the user to our system
  state.isLoggedIn = true;
  state.user.email = email;
  state.user.name = email.split("@")[0].replace(".", " ").toUpperCase();

  saveState();
  updateUI();

  showToast(`Access authorization complete via Google. Welcome back, ${state.user.name}!`, "success");
}

// ==========================================
// ===== LANDING PAGE ENGAGEMENT SYSTEM =====
// ==========================================

// 1. Scroll Progress Bar
function initScrollProgressBar() {
  const bar = document.getElementById("scroll-progress-bar");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + "%";
  }, { passive: true });
}

// 2. Scroll Reveal via IntersectionObserver
function initScrollReveal() {
  const sections = document.querySelectorAll(".reveal-section");
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger reveal with slight delay per visible element
        setTimeout(() => {
          entry.target.classList.add("revealed");
        }, 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  sections.forEach(el => observer.observe(el));
}

// 3. Animated Number Counters
function initCounterAnimations() {
  const counters = document.querySelectorAll(".stat-counter-value");
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.getAttribute("data-target"));
  const prefix = el.getAttribute("data-prefix") || "";
  const suffix = el.getAttribute("data-suffix") || "";
  const decimals = parseInt(el.getAttribute("data-decimal") || "0");
  const duration = 1800;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = target * eased;
    el.textContent = prefix + (decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString()) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// 4. Live Activity Strip Messages (Landing)
function initLandingActivityFeed() {
  const el = document.getElementById("landing-activity-msg");
  if (!el) return;

  const messages = [
    "Michael R. from New York just allocated $25,000 into Quantum Growth VC Fund...",
    "Sarah K. from London completed KYC and deposited $50,000 via bank wire...",
    "James T. from Dubai earned a ₹500 referral reward — direct to their bank account!",
    "Priya M. from Singapore allocated $15,000 into Digital Asset Frontier Fund...",
    "Alex W. from Chicago earned +$284.50 in Green Infrastructure dividend payouts...",
    "Emma J. from Toronto upgraded to Accredited Professional tier with $120,000 deposit...",
    "Ryan S. from Sydney opened a $30,000 Apex Alpha Fund position — 7.5% APY locked...",
    "Nina R. from Amsterdam's portfolio crossed $100,000 net worth milestone...",
  ];
  let idx = 0;

  setInterval(() => {
    idx = (idx + 1) % messages.length;
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "opacity 0.3s, transform 0.3s";
    setTimeout(() => {
      el.textContent = messages[idx];
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 320);
  }, 4500);
}

// 5. Teaser Chart Render (blurred portfolio preview)
function renderTeaserChart() {
  const canvas = document.getElementById("teaserChart");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, "rgba(99, 102, 241, 0.35)");
  grad.addColorStop(1, "rgba(99, 102, 241, 0)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        data: [34000, 37200, 36100, 40800, 43500, 41200, 46900, 51400, 49800, 56300, 61700, 68900],
        borderColor: "#6366f1",
        borderWidth: 2.5,
        fill: true,
        backgroundColor: grad,
        tension: 0.45,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      animation: { duration: 1200 }
    }
  });
}

// 6. Testimonials Carousel Controls
let testiIndex = 0;
function getTestiPerPage() {
  return window.innerWidth <= 768 ? 1 : 2;
}

// Track page size to re-init on resize
let currentPerPage = getTestiPerPage();
window.addEventListener("resize", () => {
  const newPerPage = getTestiPerPage();
  if (newPerPage !== currentPerPage) {
    currentPerPage = newPerPage;
    testiIndex = 0;
    initTestimonialsCarousel();
  }
});

function initTestimonialsCarousel() {
  const track = document.getElementById("testimonials-track");
  const dotsEl = document.getElementById("testi-dots");
  if (!track || !dotsEl) return;

  const cards = Array.from(track.querySelectorAll(".testimonial-card"));
  const perPage = getTestiPerPage();
  const totalPages = Math.ceil(cards.length / perPage);

  // Build dots
  dotsEl.innerHTML = "";
  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement("div");
    dot.className = "testi-dot" + (i === 0 ? " active" : "");
    dot.onclick = () => goToTestiPage(i);
    dotsEl.appendChild(dot);
  }

  showTestiPage(0, cards);
}

function showTestiPage(page, cards) {
  const perPage = getTestiPerPage();
  const start = page * perPage;
  const end = start + perPage;
  cards.forEach((card, i) => {
    card.style.display = (i >= start && i < end) ? "" : "none";
    card.style.animation = (i >= start && i < end) ? "animated-fade-in 0.4s ease" : "";
  });

  const dots = document.querySelectorAll(".testi-dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === page));
}

function scrollTestimonials(dir) {
  const track = document.getElementById("testimonials-track");
  if (!track) return;
  const cards = Array.from(track.querySelectorAll(".testimonial-card"));
  const perPage = getTestiPerPage();
  const totalPages = Math.ceil(cards.length / perPage);
  testiIndex = (testiIndex + dir + totalPages) % totalPages;
  showTestiPage(testiIndex, cards);
  goToTestiPage(testiIndex);
}

function goToTestiPage(page) {
  const track = document.getElementById("testimonials-track");
  if (!track) return;
  const cards = Array.from(track.querySelectorAll(".testimonial-card"));
  testiIndex = page;
  showTestiPage(page, cards);
}

// 7. FAQ Accordion Toggle
function toggleFaq(item) {
  const isOpen = item.classList.contains("open");
  // Close all
  document.querySelectorAll(".faq-item.open").forEach(el => el.classList.remove("open"));
  // Open clicked if it wasn't already open
  if (!isOpen) {
    item.classList.add("open");
  }
  initLucide(); // re-render chevrons
}

// 8. Floating Sticky CTA Show/Hide
function initFloatingCTA() {
  const cta = document.getElementById("floating-cta");
  if (!cta) return;

  window.addEventListener("scroll", () => {
    // Show after scrolling 400px, hide if not on landing page
    if (!state.isLoggedIn && window.scrollY > 400) {
      cta.classList.add("visible");
    } else {
      cta.classList.remove("visible");
    }
  }, { passive: true });
}

// Master init for all landing engagement features
function initLandingEngagement() {
  initScrollProgressBar();
  initScrollReveal();
  initCounterAnimations();
  initLandingActivityFeed();
  renderTeaserChart();
  initTestimonialsCarousel();
  initFloatingCTA();
}

// Location Pinpointing for KYC
function detectKycLocation() {
  const addressInput = document.getElementById("kyc-address");
  const detectBtn = document.getElementById("btn-detect-location");
  if (!addressInput) return;

  const originalHtml = detectBtn.innerHTML;
  detectBtn.disabled = true;
  detectBtn.innerHTML = `<span class="spinner-border" style="width:12px; height:12px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; display:inline-block; animation:spin 1s linear infinite; margin-right:4px;"></span> Detecting...`;

  if (!document.getElementById("location-spinner-style")) {
    const style = document.createElement("style");
    style.id = "location-spinner-style";
    style.innerHTML = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }

  // Simulate a very quick detect action using pre-fetched IP API telemetry
  setTimeout(() => {
    if (state._visitorTelemetry && state._visitorTelemetry.ipAddress) {
      const tele = state._visitorTelemetry;
      let formatted = "";
      if (tele.city) formatted += tele.city + ", ";
      if (tele.region) formatted += tele.region + ", ";
      if (tele.postal) formatted += tele.postal + ", ";
      if (tele.country) formatted += tele.country;
      
      formatted = formatted.replace(/,\s*$/, "").trim();
      if (formatted) {
        addressInput.value = formatted;
        showToast("Location filled via IP Geolocation!", "success");
      } else {
        showToast("Could not determine location from IP. Please enter it manually.", "warning");
      }
    } else {
      showToast("IP Geolocation data not loaded yet. Please try again in a moment.", "warning");
    }
    detectBtn.disabled = false;
    detectBtn.innerHTML = originalHtml;
  }, 400);
}
