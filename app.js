const state = {
  role: "user",
  users: [],
  currentUser: null,
  isAuthenticated: false,
  previousPage: "entry",
  latestRequest: null,
  requests: [],
  currentPrice: 11,
  statusIndex: -1,
  statuses: ["รอตรวจสอบ", "รอรับซื้อ", "กำลังเดินทาง", "รับซื้อสำเร็จ", "โอนเงินแล้ว"],
  history: [],
  collectorOrders: [
    {
      id: "JOB-001",
      seller: "คุณเมย์",
      address: "สุขุมวิท 101",
      amount: 8.5,
      note: "หน้าบ้าน",
      status: "รอรับงาน",
      lat: 13.6982,
      lng: 100.6028
    },
    {
      id: "JOB-002",
      seller: "คุณต้น",
      address: "ลาดพร้าว 69",
      amount: 12.0,
      note: "โทรก่อนถึง",
      status: "รอรับงาน",
      lat: 13.7975,
      lng: 100.6114
    },
    {
      id: "JOB-003",
      seller: "คุณบี",
      address: "รามคำแหง 24",
      amount: 6.2,
      note: "นัดหน้าปากซอย",
      status: "รอรับงาน",
      lat: 13.7542,
      lng: 100.6209
    }
  ]
};

let mapInstance = null;
let infoWindow = null;
let directionsService = null;
let directionsRenderer = null;
let currentLocationMarker = null;
let currentLatLng = null;
let geocoder = null;
let registerMap = null;
let registerMarker = null;
let registerMapDebounceTimer = null;
let mapsFatal = false;
const DEFAULT_COLLECTOR_LOCATION = { lat: 13.736717, lng: 100.561001 };
const REGISTER_PRESET_LATLNG = { lat: 13.73635, lng: 100.53312 };
const REGISTER_PRESET_ADDRESS = {
  houseNo: "-",
  road: "คณะวิศวกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
  subdistrict: "แขวงปทุมวัน เขตปทุมวัน",
  province: "กรุงเทพมหานคร",
  postcode: "10330"
};
const STORAGE_KEYS = {
  users: "oilive_users",
  session: "oilive_session"
};

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-btn");
const mainNav = document.getElementById("main-nav");
const registerTitle = document.getElementById("register-title");
const loginTitle = document.getElementById("login-title");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerMsg = document.getElementById("register-msg");
const loginMsg = document.getElementById("login-msg");
const registerTabBtn = document.getElementById("register-tab-btn");
const authRegisterPanel = document.getElementById("auth-register");
const loginIdentifierLabel = document.getElementById("login-identifier-label");
const collectorLoginHint = document.getElementById("collector-login-hint");
const menuBtn = document.getElementById("menu-btn");
const navOverlay = document.getElementById("nav-overlay");
const navCloseBtn = document.getElementById("nav-close-btn");
const collectorExtra = document.querySelector(".collector-extra");
const userAddressBlock = document.querySelector(".user-address");
const sellForm = document.getElementById("sell-form");
const sellMsg = document.getElementById("sell-msg");
const latestRequestEl = document.getElementById("latest-request");
const billMsg = document.getElementById("bill-msg");
const adminStats = document.getElementById("admin-stats");
const adminOverviewLatest = document.getElementById("admin-overview-latest");
const adminRequestsList = document.getElementById("admin-requests-list");
const adminMembersList = document.getElementById("admin-members-list");
const adminTransactionsList = document.getElementById("admin-transactions-list");
const adminRequestSearchType = document.getElementById("admin-request-search-type");
const adminRequestSearchValue = document.getElementById("admin-request-search-value");
const adminRequestStatus = document.getElementById("admin-request-status");
const adminRequestZone = document.getElementById("admin-request-zone");
const adminRequestSearchBtn = document.getElementById("admin-request-search-btn");
const adminRequestResetBtn = document.getElementById("admin-request-reset-btn");
const openRegisterBtn = document.getElementById("open-register-btn");
const backLoginBtn = document.getElementById("back-login-btn");
const agreementBackBtn = document.getElementById("agreement-back-btn");
const historyListEl = document.getElementById("history-list");
const profileView = document.getElementById("profile-view");
const collectorOrdersEl = document.getElementById("collector-orders");
const collectorStatusListEl = document.getElementById("collector-status-list");
const editProfileForm = document.getElementById("edit-profile-form");
const cancelEditProfileBtn = document.getElementById("cancel-edit-profile");
const logoutBtn = document.getElementById("logout-btn");
const mapMsg = document.getElementById("map-msg");
const routeInfo = document.getElementById("route-info");
const registerMapMsg = document.getElementById("register-map-msg");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
const useCurrentLocationBtn = document.getElementById("use-current-location");

window.initGoogleMap = initGoogleMap;
window.gm_authFailure = () => {
  mapsFatal = true;
  setMapsFallbackMode("Google Maps ใช้งานไม่ได้ชั่วคราว ระบบสลับเป็นโหมดสำรอง");
};

function showMessage(el, msg, ok = false) {
  el.textContent = msg;
  el.classList.toggle("ok", ok);
}

function setMapsFallbackMode(message) {
  if (mapMsg) mapMsg.textContent = message;
  if (routeInfo) {
    routeInfo.textContent =
      "โหมดสำรอง: ยังอัปเดตงานได้ตามปกติ (หากต้องนำทางให้กดปุ่มนำทางไปจุดรับนี้)";
  }
  if (registerMapMsg) {
    registerMapMsg.textContent =
      "โหมดสำรอง: ใช้ปุ่มปักหมุด/ตำแหน่งปัจจุบันเพื่อกรอกข้อมูล และแก้ไขเองได้";
  }
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadUsersFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) return [];
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function ensureCollectorAccount() {
  const existing = state.users.find((user) => user.role === "collector" && user.username === "2");
  if (existing) {
    existing.password = "2";
    existing.firstName = existing.firstName || "รถเก็บขยะ";
    existing.lastName = existing.lastName || "ประจำระบบ";
    existing.bank = existing.bank || "กสิกรไทย";
    existing.bankAccount = existing.bankAccount || "0000000002";
    existing.workDay = existing.workDay || "ทุกวัน";
    existing.serviceArea = existing.serviceArea || "กรุงเทพมหานคร";
    existing.plate = existing.plate || "ขย-0002";
    existing.plateProvince = existing.plateProvince || "กรุงเทพมหานคร";
    return;
  }

  state.users.push({
    id: "SYS-COLLECTOR-2",
    role: "collector",
    username: "2",
    firstName: "รถเก็บขยะ",
    lastName: "ประจำระบบ",
    phone: "0200000002",
    password: "2",
    bank: "กสิกรไทย",
    bankAccount: "0000000002",
    workDay: "ทุกวัน",
    serviceArea: "กรุงเทพมหานคร",
    plate: "ขย-0002",
    plateProvince: "กรุงเทพมหานคร"
  });
}

function ensureUserDemoAccount() {
  const existing = state.users.find((user) => user.role === "user" && user.username === "1");
  if (existing) {
    existing.password = "1";
    existing.firstName = existing.firstName || "ผู้ใช้";
    existing.lastName = existing.lastName || "เดโม่";
    existing.phone = existing.phone || "0100000001";
    existing.bank = existing.bank || "กสิกรไทย";
    existing.bankAccount = existing.bankAccount || "0000000001";
    existing.houseNo = existing.houseNo || "1/1";
    existing.road = existing.road || "สุขุมวิท";
    existing.subdistrict = existing.subdistrict || "คลองเตย";
    existing.province = existing.province || "กรุงเทพมหานคร";
    existing.postcode = existing.postcode || "10110";
    return;
  }

  state.users.push({
    id: "SYS-USER-1",
    role: "user",
    username: "1",
    firstName: "ผู้ใช้",
    lastName: "เดโม่",
    phone: "0100000001",
    password: "1",
    bank: "กสิกรไทย",
    bankAccount: "0000000001",
    houseNo: "1/1",
    road: "สุขุมวิท",
    subdistrict: "คลองเตย",
    province: "กรุงเทพมหานคร",
    postcode: "10110"
  });
}

function ensureAdminAccount() {
  const existing = state.users.find((user) => user.role === "admin");
  if (existing) {
    existing.username = "3";
    existing.password = "3";
    existing.firstName = existing.firstName || "ผู้ดูแล";
    existing.lastName = existing.lastName || "ระบบ";
    existing.bank = existing.bank || "กสิกรไทย";
    existing.bankAccount = existing.bankAccount || "0000000003";
    existing.phone = existing.phone || "0300000000";
    existing.id = existing.id || "SYS-ADMIN-3";
    return;
  }

  state.users.push({
    id: "SYS-ADMIN-3",
    role: "admin",
    username: "3",
    firstName: "ผู้ดูแล",
    lastName: "ระบบ",
    phone: "0300000000",
    password: "3",
    bank: "กสิกรไทย",
    bankAccount: "0000000003"
  });
}

function saveUsersToStorage() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.users));
}

function saveSessionToStorage() {
  if (!state.currentUser || !state.isAuthenticated) return;
  localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      userId: state.currentUser.id,
      role: state.currentUser.role
    })
  );
}

function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function makeGuestUser(role) {
  const stamp = Date.now().toString().slice(-6);
  if (role === "collector") {
    return {
      id: `G-C-${stamp}`,
      role: "collector",
      username: `garbage${stamp.slice(-2)}`,
      firstName: "Guest",
      lastName: "Garbage",
      phone: `09999${stamp.slice(0, 5)}`.slice(0, 10),
      password: "guest",
      bank: "กสิกรไทย",
      bankAccount: "0000000000",
      workDay: "ทุกวัน",
      serviceArea: "กรุงเทพมหานคร",
      plate: "ขย-9999",
      plateProvince: "กรุงเทพมหานคร"
    };
  }

  return {
    id: `G-U-${stamp}`,
    role: "user",
    firstName: "Guest",
    lastName: "User",
    phone: `08888${stamp.slice(0, 5)}`.slice(0, 10),
    password: "guest",
    bank: "กสิกรไทย",
    bankAccount: "0000000000",
    houseNo: "1/1",
    road: "สุขุมวิท",
    subdistrict: "คลองเตย",
    province: "กรุงเทพมหานคร",
    postcode: "10110"
  };
}

function getUserStats() {
  const currentName = state.currentUser ? `${state.currentUser.firstName} ${state.currentUser.lastName}` : "";
  const rows = state.history.filter((h) => !currentName || h.sellerName === currentName);
  const totalVolume = rows.reduce((sum, h) => sum + Number(h.volume || 0), 0);
  const totalPoints = Math.floor(totalVolume);
  return { totalVolume, totalPoints };
}

function buildAddressDisplay(user) {
  return [user.houseNo, user.road, user.subdistrict, user.province, user.postcode].filter(Boolean).join(" ");
}

function getStoredMapsKey() {
  const configKey = window.OILIVE_CONFIG?.googleMapsApiKey?.trim() || "";
  return configKey;
}

function collectFormData(form) {
  const data = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = typeof value === "string" ? value.trim() : value;
  }
  return data;
}

function setAuthTab(mode) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.auth === mode);
  });
  document.querySelectorAll(".auth-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `auth-${mode}`);
  });
}

function closeNavMenu() {
  mainNav.classList.remove("open");
  mainNav.classList.add("hidden");
  navOverlay.classList.add("hidden");
  menuBtn.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
}

function openNavMenu() {
  if (!state.isAuthenticated) return;
  mainNav.classList.remove("hidden");
  mainNav.classList.add("open");
  navOverlay.classList.remove("hidden");
  menuBtn.classList.add("open");
  menuBtn.setAttribute("aria-expanded", "true");
}

function toggleNavMenu() {
  if (mainNav.classList.contains("open")) {
    closeNavMenu();
    return;
  }
  openNavMenu();
}

function applyRoleVisibility() {
  const showCollector = ["collector", "admin"].includes(state.role);
  const showUser = ["user", "admin"].includes(state.role);
  const showAdmin = state.role === "admin";
  document.querySelectorAll(".collector-only").forEach((el) => {
    el.classList.toggle("hidden", !showCollector);
  });
  document.querySelectorAll(".user-only").forEach((el) => {
    el.classList.toggle("hidden", !showUser);
  });
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !showAdmin);
  });
}

function setRole(role) {
  state.role = role;
  applyRoleVisibility();

  const isCollector = role === "collector";
  const isAdmin = role === "admin";
  const registerAllowed = role === "user";
  collectorExtra.classList.add("hidden");
  userAddressBlock.classList.remove("hidden");
  registerTabBtn.classList.toggle("hidden", !registerAllowed);
  authRegisterPanel.classList.toggle("hidden", !registerAllowed);
  collectorLoginHint.classList.remove("hidden");
  loginIdentifierLabel.firstChild.textContent = "เบอร์โทรศัพท์หรือชื่อผู้ใช้";

  registerTitle.textContent = "สร้างบัญชีใหม่";
  loginTitle.textContent = "เข้าสู่ระบบ";
  if (!registerAllowed) {
    setAuthTab("login");
  }
  setAuthUi();
  renderHistory();
}

function requireAuthOrStay(pageId) {
  if (!state.isAuthenticated && pageId !== "entry") {
    setPage("entry", true);
    showMessage(loginMsg, "กรุณาเข้าสู่ระบบก่อนใช้งาน", false);
    setAuthTab("login");
    return false;
  }

  if (state.isAuthenticated && state.role === "collector" && ["sell", "bill"].includes(pageId)) {
    showMessage(loginMsg, "บัญชีรถเก็บขยะไม่มีสิทธิ์ขายน้ำมัน สามารถเข้าหน้ารับงานได้", false);
    setPage("tracking", true);
    return false;
  }

  if (state.isAuthenticated && state.role === "user" && pageId === "tracking") {
    setPage("home", true);
    return false;
  }

  return true;
}

function setPage(pageId, bypassGuard = false) {
  if (!bypassGuard && !requireAuthOrStay(pageId)) return;
  const activePage = document.querySelector(".page.active")?.id?.replace("page-", "") || "entry";
  if (pageId !== activePage) {
    state.previousPage = activePage;
  }

  pages.forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageId}`);
  });

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  if (pageId === "tracking" && ["collector", "admin"].includes(state.role)) {
    if (window.google?.maps) initTrackingMap();
    maybeLoadGoogleMaps();
  }

  // หน้าเริ่มต้น (สมัครสมาชิก) ต้องมีแผนที่ปักหมุดด้วย
  if (pageId === "entry") {
    if (window.google?.maps) initRegisterMap();
    maybeLoadGoogleMaps();
  }

  if (pageId.startsWith("admin")) {
    renderAdminDashboard();
  }

  if (pageId === "edit-profile") {
    loadEditProfileForm();
  }
}

function validateRegister(data) {
  const required = [
    "firstName",
    "lastName",
    "phone",
    "password",
    "confirmPassword",
    "bankAccount",
    "bank",
    "houseNo",
    "road",
    "subdistrict",
    "province",
    "postcode"
  ];
  const missing = required.filter((k) => !data[k]);

  if (missing.length) return "กรุณากรอกข้อมูลให้ครบถ้วน";
  if (data.password !== data.confirmPassword) return "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน";
  if (!/^0\d{9}$/.test(data.phone)) return "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก";
  if (state.users.some((u) => u.phone === data.phone && u.role === "user")) return "เบอร์โทรนี้มีในระบบแล้ว";
  if (!/^\d{5}$/.test(data.postcode || "")) return "รหัสไปรษณีย์ต้องมี 5 หลัก";
  return "";
}

function randomThaiPhone() {
  const n = Math.floor(Math.random() * 90000000 + 10000000);
  return `0${n.toString().padStart(8, "0")}`.slice(0, 10);
}

function buildDemoRegisterData(data, role) {
  const base = {
    firstName: data.firstName || "เดโม่ผู้ใช้",
    lastName: data.lastName || "OILive",
    phone: data.phone || randomThaiPhone(),
    password: data.password || "demo1234",
    bankAccount: data.bankAccount || "0000000000",
    bank: data.bank || "กสิกรไทย",
    houseNo: data.houseNo || "-",
    road: data.road || "คณะวิศวกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
    subdistrict: data.subdistrict || "แขวงปทุมวัน เขตปทุมวัน",
    province: data.province || "กรุงเทพมหานคร",
    postcode: data.postcode || "10330"
  };

  return base;
}

function formatAddress(user) {
  if (!user || user.role !== "user") return "-";
  return [
    user.houseNo,
    user.road,
    user.subdistrict,
    user.province,
    user.postcode
  ]
    .filter(Boolean)
    .join(" ");
}

function setAuthUi() {
  logoutBtn.classList.toggle("hidden", !state.isAuthenticated);
  menuBtn.classList.toggle("hidden", !state.isAuthenticated);
  if (!state.isAuthenticated) {
    closeNavMenu();
  }
  navButtons.forEach((btn) => {
    const isAdminOnly = btn.classList.contains("admin-only");
    const isAgreement = btn.dataset.page === "agreement";
    const isUserOnly = btn.classList.contains("user-only");
    const isCollectorOnly = btn.classList.contains("collector-only");
    const isTracking = btn.dataset.page === "tracking";
    const isAdmin = state.role === "admin";
    if (isAdmin) {
      btn.classList.toggle("hidden", !state.isAuthenticated || (!isAdminOnly && !isAgreement));
      return;
    }
    const hideForRole = isTracking && !(state.role === "collector" || isAdmin);
    const hideUserMenuForCollector = isUserOnly && state.role === "collector";
    const hideCollectorMenuForUser = isCollectorOnly && state.role === "user";
    btn.classList.toggle(
      "hidden",
      !state.isAuthenticated || hideForRole || hideUserMenuForCollector || hideCollectorMenuForUser || isAdminOnly
    );
  });
}

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.role !== "user") {
    showMessage(registerMsg, "ปิดการสมัครสำหรับรถเก็บขยะ ใช้บัญชีที่ระบบเตรียมไว้ให้ได้เลย", false);
    setAuthTab("login");
    return;
  }
  const data = collectFormData(registerForm);

  // โหมดเดโม่: สมัครได้ทันทีแม้กรอกไม่ครบ โดยระบบเติมค่าเริ่มต้นให้
  let normalized = buildDemoRegisterData(data, state.role);
  const maybeError = validateRegister({
    ...normalized,
    confirmPassword: normalized.password
  });
  if (maybeError || state.users.some((u) => u.phone === normalized.phone && u.role === "user")) {
    normalized.phone = randomThaiPhone();
  }

  const cleanData = normalized;
  const user = { ...cleanData, role: "user", id: `U-${Date.now()}` };
  state.users.push(user);
  saveUsersToStorage();
  showMessage(registerMsg, "สมัครสมาชิกสำเร็จ กดเข้าสู่ระบบต่อได้ทันที", true);
  loginForm.identifier.value = user.phone;
  loginForm.password.value = user.password;
  setAuthTab("login");
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = collectFormData(loginForm);
  const normalizedIdentifier = (data.identifier || "").trim();
  let found = null;
  if (normalizedIdentifier && data.password) {
    found = state.users.find(
      (u) =>
        (u.phone === normalizedIdentifier || u.username === normalizedIdentifier) &&
        u.password === data.password
    );
  }
  if (!found) {
    showMessage(loginMsg, "ไม่พบบัญชีนี้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้หรือรหัสผ่าน", false);
    return;
  }

  setRole(found.role);
  state.currentUser = found;
  state.isAuthenticated = true;
  saveSessionToStorage();
  setAuthUi();
  renderProfile();
  renderAdminDashboard();
  showMessage(loginMsg, "เข้าสู่ระบบสำเร็จ", true);
  setPage(found.role === "admin" ? "admin-overview" : "home", true);

  loginForm.reset();
});

forgotPasswordBtn.addEventListener("click", () => {
  const identifier = window.prompt("กรอกเบอร์โทรหรือชื่อผู้ใช้ของบัญชีที่ต้องการรีเซ็ตรหัสผ่าน");
  if (!identifier) return;

  const lookup = identifier.trim();
  const target = state.users.find((u) => u.phone === lookup || u.username === lookup);
  if (!target) {
    showMessage(loginMsg, "ไม่พบบัญชีจากข้อมูลนี้ในระบบ", false);
    return;
  }

  const nextPwd = window.prompt("ตั้งรหัสผ่านใหม่");
  if (!nextPwd) return;
  const confirmPwd = window.prompt("ยืนยันรหัสผ่านใหม่");
  if (!confirmPwd) return;
  if (nextPwd !== confirmPwd) {
    showMessage(loginMsg, "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน", false);
    return;
  }

  target.password = nextPwd;
  saveUsersToStorage();
  showMessage(loginMsg, "รีเซ็ตรหัสผ่านสำเร็จ ลองเข้าสู่ระบบอีกครั้ง", true);
});

logoutBtn.addEventListener("click", () => {
  state.isAuthenticated = false;
  state.currentUser = null;
  clearSessionStorage();
  closeNavMenu();
  setAuthUi();
  setPage("entry", true);
  setAuthTab("login");
  showMessage(loginMsg, "ออกจากระบบแล้ว", true);
  renderProfile();
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setPage(btn.dataset.page);
    closeNavMenu();
  });
});

menuBtn.addEventListener("click", toggleNavMenu);
navOverlay.addEventListener("click", closeNavMenu);
navCloseBtn.addEventListener("click", closeNavMenu);
adminRequestSearchBtn?.addEventListener("click", renderAdminDashboard);
adminRequestResetBtn?.addEventListener("click", () => {
  if (adminRequestSearchType) adminRequestSearchType.value = "day";
  if (adminRequestSearchValue) adminRequestSearchValue.value = "";
  if (adminRequestStatus) adminRequestStatus.value = "all";
  if (adminRequestZone) adminRequestZone.value = "all";
  renderAdminDashboard();
});

document.querySelectorAll("[data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setPage(btn.dataset.jump);
    closeNavMenu();
  });
});

document.querySelectorAll(".select-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".select-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    setRole(card.dataset.entry);
  });
});

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => setAuthTab(tab.dataset.auth));
});

openRegisterBtn?.addEventListener("click", () => {
  setRole("user");
  setAuthTab("register");
});

backLoginBtn?.addEventListener("click", () => {
  setAuthTab("login");
});

agreementBackBtn?.addEventListener("click", () => {
  const target = state.previousPage && state.previousPage !== "agreement" ? state.previousPage : "entry";
  setPage(target, true);
});

sellForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!state.isAuthenticated) {
    showMessage(sellMsg, "กรุณาเข้าสู่ระบบก่อน", false);
    setPage("entry", true);
    return;
  }

  if (state.role !== "user") {
    showMessage(sellMsg, "บัญชีรถเก็บขยะไม่สามารถขายน้ำมันได้", false);
    setPage("tracking", true);
    return;
  }

  const data = collectFormData(sellForm);
  if (!data.oilType || !data.volume || !data.pickupStreet || !data.pickupDate || !data.pickupTime) {
    showMessage(sellMsg, "กรุณากรอกข้อมูลคำขอรับซื้อให้ครบ", false);
    return;
  }

  const request = {
    ...data,
    sellerName: `${state.currentUser.firstName} ${state.currentUser.lastName}`,
    id: `REQ-${Math.floor(Math.random() * 900000 + 100000)}`,
    createdAt: new Date().toLocaleString("th-TH"),
    status: "รอตรวจสอบ"
  };

  state.latestRequest = request;
  state.requests.push(request);
  state.statusIndex = 0;
  renderLatestRequest();
  updateBillFromRequest(request);
  renderAdminDashboard();
  showMessage(sellMsg, "ส่งคำขอเข้าสู่ระบบรถเก็บขยะ/แอดมินแล้ว", true);
  setPage("bill", true);
});

document.getElementById("use-profile-address").addEventListener("click", () => {
  const u = state.currentUser;
  if (!u || u.role !== "user") {
    showMessage(sellMsg, "ไม่พบที่อยู่จากบัญชีผู้ใช้งาน", false);
    return;
  }

  sellForm.pickupStreet.value = `${u.houseNo || ""} ${u.road || ""}`.trim();
  sellForm.pickupSubdistrict.value = u.subdistrict || "";
  sellForm.pickupDistrict.value = u.subdistrict || "";
  showMessage(sellMsg, "ดึงที่อยู่จากสมาชิกเรียบร้อย (แก้ไขเฉพาะรอบนี้ได้)", true);
});

document.getElementById("use-register-map-pin").addEventListener("click", () => {
  if (!registerMarker || !window.google?.maps) {
    fillRegisterPresetAddress();
    registerMapMsg.textContent = "โหมดเดโม่: ใส่ที่อยู่สำรองให้อัตโนมัติแล้ว";
    return;
  }
  const pos = registerMarker.getPosition();
  if (!pos) return;
  reverseGeocodeForRegister({ lat: pos.lat(), lng: pos.lng() });
});

useCurrentLocationBtn.addEventListener("click", () => {
  if (!registerMap || !registerMarker) {
    fillRegisterPresetAddress();
    registerMapMsg.textContent = "โหมดเดโม่: ใช้ที่อยู่สำรอง (หากต้องการแก้ไข พิมพ์ทับได้เลย)";
    return;
  }
  if (!navigator.geolocation) {
    const c = registerMap.getCenter();
    if (c) {
      const latLng = { lat: c.lat(), lng: c.lng() };
      moveRegisterMarker(latLng, true);
      reverseGeocodeForRegister(latLng);
      registerMapMsg.textContent = "อุปกรณ์ไม่รองรับ GPS ใช้ตำแหน่งกลางแผนที่แทน";
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      moveRegisterMarker(latLng, true);
      reverseGeocodeForRegister(latLng);
      registerMapMsg.textContent = "รีเซ็ตแผนที่กลับมาตำแหน่งปัจจุบันแล้ว";
    },
    () => {
      const c = registerMap.getCenter();
      if (c) {
        const latLng = { lat: c.lat(), lng: c.lng() };
        moveRegisterMarker(latLng, true);
        reverseGeocodeForRegister(latLng);
        registerMapMsg.textContent = "อ่าน GPS ไม่ได้ ใช้ตำแหน่งกลางแผนที่แทน (แก้ต่อได้)";
      } else {
        registerMapMsg.textContent = "ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้ โปรดลองอีกครั้ง";
      }
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
  );
});

function updateBillFromRequest(req) {
  const volume = Number(req.volume || 0);
  const total = volume * state.currentPrice;
  const points = Math.floor(volume);

  document.getElementById("bill-oil-type").textContent = req.oilType;
  document.getElementById("bill-weight").textContent = `${volume.toFixed(1)} ลิตร`;
  document.getElementById("bill-price").textContent = `${state.currentPrice.toFixed(2)} ฿/ลิตร`;
  document.getElementById("bill-note").textContent = req.pickupNote || "-";
  document.getElementById("bill-total").textContent = `${total.toLocaleString("th-TH", {
    minimumFractionDigits: 2
  })} ฿`;
  document.getElementById("bill-points").textContent = `${points.toLocaleString("th-TH")} แต้ม`;

  const u = state.currentUser;
  document.getElementById("bill-bank").textContent = u ? `${u.bank} • ${u.bankAccount}` : "-";
}

function renderLatestRequest() {
  const req = state.latestRequest;
  if (!req) {
    latestRequestEl.innerHTML = "<p>ยังไม่มีคำขอ</p>";
    return;
  }

  latestRequestEl.innerHTML = `
    <div class="profile-box">
      <p><strong>เลขคำขอ:</strong> ${req.id}</p>
      <p><strong>ประเภทน้ำมัน:</strong> ${req.oilType}</p>
      <p><strong>ปริมาณ:</strong> ${req.volume} ลิตร</p>
      <p><strong>จุดรับ:</strong> ${req.pickupStreet}, ${req.pickupSubdistrict}, ${req.pickupDistrict}</p>
      <p><strong>วันเวลา:</strong> ${req.pickupDate} ${req.pickupTime}</p>
    </div>
  `;
}

function roleLabel(role) {
  if (role === "collector") return "รถเก็บขยะ";
  if (role === "admin") return "แอดมิน";
  return "ผู้ใช้งาน";
}

function memberCode(member) {
  if (member.role === "collector") return member.username === "2" ? "DEMO-C-2" : member.id || "-";
  if (member.role === "admin") return member.username === "3" ? "ADMIN-3" : member.id || "-";
  return member.username === "1" ? "DEMO-U-1" : member.id || "-";
}

function memberCaseStats(member) {
  if (member.role === "collector") {
    const rows = state.collectorOrders.filter((order) => order.status === "รับสำเร็จ");
    const volume = rows.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    return { count: rows.length, volume };
  }

  if (member.role === "user") {
    const name = `${member.firstName} ${member.lastName}`;
    const rows = state.history.filter((item) => item.sellerName === name);
    const volume = rows.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    return { count: rows.length, volume };
  }

  return { count: 0, volume: 0 };
}

function statusBadge(status) {
  return `<span class="admin-badge">${status || "-"}</span>`;
}

function filterAdminRequests() {
  const requests = state.requests.slice().reverse();
  const searchType = adminRequestSearchType?.value || "day";
  const query = (adminRequestSearchValue?.value || "").trim().toLowerCase();
  const status = adminRequestStatus?.value || "all";
  const zone = adminRequestZone?.value || "all";

  return requests.filter((req) => {
    const matchStatus = status === "all" || (req.status || "รอตรวจสอบ") === status;
    const pickupText = `${req.pickupStreet || ""} ${req.pickupSubdistrict || ""} ${req.pickupDistrict || ""}`;
    const matchZone = zone === "all" || pickupText.includes(zone);
    if (!matchStatus || !matchZone) return false;
    if (!query) return true;

    if (searchType === "id") return (req.id || "").toLowerCase().includes(query);
    if (searchType === "seller") return (req.sellerName || "").toLowerCase().includes(query);
    return (req.createdAt || req.pickupDate || "").toLowerCase().includes(query);
  });
}

function renderAdminDashboard() {
  if (!adminStats || !adminOverviewLatest || !adminRequestsList || !adminMembersList || !adminTransactionsList) return;

  const members = state.users.filter((u) => u.role !== "admin");
  const pendingReview = state.requests.filter((req) => (req.status || "รอตรวจสอบ") === "รอตรวจสอบ").length;
  const approvedRequests = state.requests.filter((req) =>
    ["รอรับซื้อ", "กำลังเดินทาง", "รับซื้อสำเร็จ", "โอนเงินแล้ว"].includes(req.status || "")
  ).length;
  const collectingNow = state.requests.filter((req) => req.status === "กำลังเดินทาง").length;
  const cancelledRequests = state.requests.filter((req) => req.status === "ไม่พบผู้ใช้").length;
  const completedJobs = state.collectorOrders.filter((order) => order.status === "รับสำเร็จ").length;
  const startedCollectors = state.collectorOrders.filter((order) => order.status !== "รอรับงาน").length;
  const collectorCount = state.users.filter((u) => u.role === "collector").length;
  const userCount = state.users.filter((u) => u.role === "user").length;
  const adminCount = state.users.filter((u) => u.role === "admin").length;
  const totalOilReceived = state.history.reduce((sum, item) => sum + Number(item.volume || 0), 0);
  const salesTotal = state.history.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalPaid = salesTotal;
  const latestItems = state.collectorOrders.slice().reverse().slice(0, 4);

  adminStats.innerHTML = `
    <div class="admin-stat"><span>ผู้ใช้งาน</span><strong>${userCount}</strong></div>
    <div class="admin-stat"><span>รถเก็บขยะ</span><strong>${collectorCount}</strong></div>
    <div class="admin-stat"><span>แอดมิน</span><strong>${adminCount}</strong></div>
    <div class="admin-stat"><span>คำขอตรวจสอบ</span><strong>${pendingReview}</strong></div>
    <div class="admin-stat"><span>คำขอผ่านตรวจสอบ</span><strong>${approvedRequests}</strong></div>
    <div class="admin-stat"><span>กำลังรับของ</span><strong>${collectingNow}</strong></div>
    <div class="admin-stat"><span>งานรับสำเร็จ</span><strong>${completedJobs}</strong></div>
    <div class="admin-stat"><span>ยกเลิก</span><strong>${cancelledRequests}</strong></div>
    <div class="admin-stat"><span>น้ำมันที่รับเข้ารวม</span><strong>${totalOilReceived.toFixed(1)} ลิตร</strong></div>
    <div class="admin-stat"><span>สต็อกพร้อมขาย</span><strong>0.0 ลิตร</strong></div>
    <div class="admin-stat"><span>ยอดขายสะสม</span><strong>${salesTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></div>
    <div class="admin-stat"><span>รถที่เริ่มรับงานแล้ว</span><strong>${startedCollectors}</strong></div>
    <div class="admin-stat"><span>ยอดรอจ่าย</span><strong>0.00 ฿</strong></div>
    <div class="admin-stat"><span>ยอดที่จ่ายแล้ว</span><strong>${totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></div>
  `;

  adminOverviewLatest.innerHTML = "";
  if (!latestItems.length) {
    adminOverviewLatest.innerHTML = `<div class="admin-overview-card">ยังไม่มีคำขอในระบบ</div>`;
  } else {
    latestItems.forEach((req) => {
      const card = document.createElement("div");
      card.className = "admin-overview-card";
      card.innerHTML = `
        <div class="admin-card-head">
          <strong>${req.id}</strong>
          ${statusBadge(req.status === "รอรับงาน" ? "รอตรวจสอบ" : req.status || "รอตรวจสอบ")}
        </div>
        <div class="admin-card-meta">
          <div>${req.seller} • ${Number(req.amount || 0).toFixed(1)} ลิตร</div>
          <div>${req.address}</div>
        </div>
      `;
      adminOverviewLatest.appendChild(card);
    });
  }

  adminRequestsList.innerHTML = "";
  const filteredRequests = filterAdminRequests();
  if (!filteredRequests.length) {
    adminRequestsList.innerHTML = `<div class="admin-request-card">ไม่พบคำขอตามตัวกรองที่เลือก</div>`;
  } else {
    filteredRequests.forEach((req) => {
      const card = document.createElement("div");
      card.className = "admin-request-card";
      card.innerHTML = `
        <div class="admin-card-head">
          <strong>${req.id}</strong>
          ${statusBadge(req.status || "รอตรวจสอบ")}
        </div>
        <div class="admin-card-meta">
          <div><strong>ผู้ขาย:</strong> ${req.sellerName}</div>
          <div><strong>จุดรับ:</strong> ${req.pickupStreet || "-"} ${req.pickupSubdistrict || ""}</div>
          <div><strong>ปริมาณ:</strong> ${Number(req.volume || 0).toFixed(1)} ลิตร • <strong>เวลา:</strong> ${req.pickupDate || "-"} ${req.pickupTime || ""}</div>
          <div><strong>สร้างเมื่อ:</strong> ${req.createdAt || "-"}</div>
        </div>
        <div class="admin-card-action"><button class="ghost" type="button">กำลังติดตามคำขอนี้</button></div>
      `;
      adminRequestsList.appendChild(card);
    });
  }

  adminMembersList.innerHTML = "";
  if (!members.length) {
    adminMembersList.innerHTML = `<div class="admin-member-card">ยังไม่มีสมาชิก</div>`;
  } else {
    members.forEach((member) => {
      const stats = memberCaseStats(member);
      const card = document.createElement("div");
      card.className = "admin-member-card";
      card.innerHTML = `
        <div class="admin-card-head">
          <strong>${member.firstName} ${member.lastName}</strong>
          ${statusBadge(roleLabel(member.role))}
        </div>
        <div class="admin-card-meta">
          <div><strong>รหัสบัญชี:</strong> ${memberCode(member)}</div>
          <div><strong>เบอร์โทร:</strong> ${member.username || member.phone || "-"}</div>
          <div><strong>รหัสผ่าน:</strong> ${member.password || "-"}</div>
          <div><strong>จำนวนเคส:</strong> ${stats.count} • <strong>ปริมาณสะสม:</strong> ${stats.volume.toFixed(1)} ลิตร</div>
          <div><strong>สถานะบัญชี:</strong> active</div>
        </div>
        <div class="admin-member-actions">
          <button class="ghost admin-suspend-btn" type="button">ระงับบัญชี</button>
          <button class="ghost admin-delete-btn" type="button">ลบบัญชี</button>
        </div>
      `;
      adminMembersList.appendChild(card);
    });
  }

  adminTransactionsList.innerHTML = "";
  if (!state.history.length) {
    adminTransactionsList.innerHTML = `<div class="admin-transaction-card">ยังไม่มีธุรกรรม</div>`;
  } else {
    state.history
      .slice()
      .reverse()
      .forEach((item) => {
        const card = document.createElement("div");
        card.className = "admin-transaction-card";
        card.innerHTML = `
          <div class="admin-card-head">
            <strong>${item.ref}</strong>
            ${statusBadge(item.status || "pending")}
          </div>
          <div class="admin-card-meta">
            <div><strong>วันที่:</strong> ${item.date}</div>
            <div><strong>ผู้ขาย:</strong> ${item.sellerName || "-"}</div>
            <div><strong>ปริมาณ:</strong> ${item.volume} ลิตร • <strong>ยอด:</strong> ${item.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</div>
          </div>
          <div class="admin-card-action"><button class="ghost" type="button">ดำเนินการกับรายการนี้</button></div>
        `;
        adminTransactionsList.appendChild(card);
      });
  }
}

function renderProfile() {
  if (!state.currentUser) {
    profileView.innerHTML = "<p>ยังไม่มีข้อมูลผู้ใช้งาน</p>";
    return;
  }

  const u = state.currentUser;
  const stats = getUserStats();
  profileView.innerHTML = `
    <section class="profile-social-card">
      <div class="profile-cover"></div>
      <div class="profile-header-row">
        <div class="profile-avatar" aria-hidden="true"></div>
        <button class="ghost" id="goto-edit-profile" type="button">แก้ไขโปรไฟล์</button>
      </div>
      <h3>${u.firstName || "-"} ${u.lastName || ""}</h3>
      <p class="history-caption">@${u.username || u.phone || "-"}</p>
      <div class="admin-headline">
        <div class="admin-kpi"><div>ประเภทบัญชี</div><strong>${roleLabel(u.role)}</strong></div>
        <div class="admin-kpi"><div>คะแนนสะสม</div><strong>${stats.totalPoints.toLocaleString("th-TH")}</strong></div>
        <div class="admin-kpi"><div>ปริมาณสะสม</div><strong>${stats.totalVolume.toFixed(1)} ลิตร</strong></div>
        <div class="admin-kpi"><div>บัญชีรับเงิน</div><strong>${u.bank || "-"} ${u.bankAccount || ""}</strong></div>
      </div>
      <div class="profile-box">ที่อยู่หลัก: ${u.addressDisplay || buildAddressDisplay(u) || "-"}</div>
      ${
        u.role === "collector"
          ? `<div class="profile-box">รถ: ${u.plate || "-"} (${u.plateProvince || "-"}) • เขตบริการ: ${u.serviceArea || "-"}</div>`
          : ""
      }
      ${
        u.role === "admin"
          ? `<div class="profile-box">สิทธิ์: ดูข้อมูลทั้งฝั่งผู้ใช้งานและรถเก็บขยะ</div>`
          : ""
      }
    </section>
  `;
  document.getElementById("goto-edit-profile")?.addEventListener("click", () => setPage("edit-profile"));
}

function renderHistory() {
  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  if (!state.currentUser) return;

  if (state.currentUser.role === "user") {
    const rows = state.history
      .filter((item) => item.sellerName === `${state.currentUser.firstName} ${state.currentUser.lastName}`)
      .slice()
      .reverse();
    if (!rows.length) {
      historyListEl.innerHTML = '<div class="history-card">ยังไม่มีประวัติการขาย</div>';
      return;
    }
    const totalVolume = rows.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    const totalAmount = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const grouped = rows.reduce((acc, item) => {
      const key = item.status || "ไม่ระบุสถานะ";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const sections = Object.entries(grouped)
      .map(
        ([status, group]) => `
          <section class="history-section">
            <div class="history-headline">
              <h4>เคส: ${status}</h4>
              <p class="history-caption">${group.length} รายการ</p>
            </div>
            <div class="history-table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>อ้างอิง</th>
                    <th>วันเวลา</th>
                    <th>ปริมาณ</th>
                    <th>ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  ${group
                    .map(
                      (item) => `
                        <tr>
                          <td><strong>${item.ref}</strong></td>
                          <td>${item.date}</td>
                          <td>${Number(item.volume).toFixed(1)} ลิตร</td>
                          <td>${item.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>
        `
      )
      .join("");

    historyListEl.innerHTML = `
      <div class="admin-headline">
        <div class="admin-kpi"><div>ยอดเงินสะสม</div><strong class="money-kpi">${totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</strong></div>
        <div class="admin-kpi"><div>ปริมาณสะสม</div><strong>${totalVolume.toFixed(1)} ลิตร</strong></div>
        <div class="admin-kpi"><div>รายการขายทั้งหมด</div><strong>${rows.length}</strong></div>
        <div class="admin-kpi"><div>สถานะที่มี</div><strong>${Object.keys(grouped).length}</strong></div>
      </div>
      ${sections}
    `;
    return;
  }

  if (state.currentUser.role === "collector") {
    const doneRows = state.collectorOrders.filter((o) => getLifecycleFromOrder(o) === "completed").slice().reverse();
    const missedRows = state.collectorOrders.filter((o) => getLifecycleFromOrder(o) === "cancelled").slice().reverse();
    if (!doneRows.length && !missedRows.length) {
      historyListEl.innerHTML = '<div class="history-card">ยังไม่มีประวัติงานของรถเก็บขยะ</div>';
      return;
    }
    const doneVolume = doneRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const renderCollectorTable = (rows, emptyText, title) => `
      <section class="history-section">
        <div class="history-headline">
          <h4>${title}</h4>
          <p class="history-caption">${rows.length} รายการ</p>
        </div>
        ${
          rows.length
            ? `
            <div class="history-table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>รหัสงาน</th>
                    <th>ผู้ขาย</th>
                    <th>ปริมาณ</th>
                    <th>เวลาบันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (item) => `
                        <tr>
                          <td><strong>${item.id}</strong></td>
                          <td>${item.seller}</td>
                          <td>${Number(item.amount).toFixed(1)} ลิตร</td>
                          <td>${item.completedAt || "-"}</td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
            : `<div class="history-card">${emptyText}</div>`
        }
      </section>
    `;

    historyListEl.innerHTML = `
      <div class="admin-headline">
        <div class="admin-kpi"><div>งานรับสำเร็จ</div><strong>${doneRows.length}</strong></div>
        <div class="admin-kpi"><div>รวมปริมาณที่รับ</div><strong>${doneVolume.toFixed(1)} ลิตร</strong></div>
        <div class="admin-kpi"><div>เคสไม่พบผู้ใช้</div><strong>${missedRows.length}</strong></div>
        <div class="admin-kpi"><div>งานทั้งหมดของฉัน</div><strong>${doneRows.length + missedRows.length}</strong></div>
      </div>
      ${renderCollectorTable(doneRows, "ยังไม่มีงานรับสำเร็จ", "เคส: รับสำเร็จ")}
      ${renderCollectorTable(missedRows, "ยังไม่มีเคสไม่พบผู้ใช้", "เคส: ไม่พบผู้ใช้")}
    `;
    return;
  }

  const rows = state.history.slice().reverse();
  historyListEl.innerHTML = `
    <section class="history-section">
      <div class="history-headline">
        <h4>ประวัติรวมล่าสุด (มุมมองแอดมิน)</h4>
        <p class="history-caption">${rows.length} รายการล่าสุด</p>
      </div>
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>อ้างอิง</th>
              <th>ผู้ขาย</th>
              <th>ปริมาณ</th>
              <th>ยอดเงิน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (item) => `
                  <tr>
                    <td>${item.ref}</td>
                    <td>${item.sellerName}</td>
                    <td>${Number(item.volume).toFixed(1)} ลิตร</td>
                    <td>${item.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</td>
                    <td><span class="history-tag">${item.status}</span></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function updateTimeline() {
  const nodes = document.querySelectorAll("#timeline li");
  nodes.forEach((li, idx) => li.classList.toggle("active", idx <= state.statusIndex));
}

function generateRef() {
  return `OI-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

document.getElementById("confirm-bill").addEventListener("click", () => {
  if (!state.isAuthenticated || state.role !== "user") {
    showMessage(billMsg, "ต้องล็อกอินด้วยบัญชีผู้ใช้งานก่อน", false);
    setPage("entry", true);
    return;
  }

  if (!state.latestRequest) {
    showMessage(billMsg, "ยังไม่มีคำขอที่พร้อมยืนยัน", false);
    return;
  }

  const ref = generateRef();
  document.getElementById("ref-code").textContent = ref;
  state.statusIndex = 0;
  updateTimeline();

  const volume = Number(state.latestRequest.volume || 0);
  const total = volume * state.currentPrice;
  state.history.push({
    date: new Date().toLocaleDateString("th-TH"),
    ref,
    volume: volume.toFixed(1),
    sellerName: `${state.currentUser.firstName} ${state.currentUser.lastName}`,
    total,
    status: state.statuses[state.statuses.length - 1]
  });

  if (state.latestRequest) {
    state.latestRequest.status = "โอนเงินแล้ว";
  }

  renderHistory();
  renderProfile();
  renderAdminDashboard();
  showMessage(billMsg, "บันทึกธุรกรรมเรียบร้อย กำลังรอรถเข้ารับซื้อ", true);
});

function renderCollectorOrders() {
  collectorOrdersEl.innerHTML = "";
  state.collectorOrders.forEach((order, idx) => {
    const lifecycle = getLifecycleFromOrder(order);
    const box = document.createElement("div");
    box.className = "order-item";
    box.innerHTML = `
      <div class="order-head"><strong class="order-code">${order.id}</strong><span class="status-badge status-${lifecycle}">${order.status}</span></div>
      <div>ชื่อ: ${order.seller}</div>
      <div>ปริมาณ: ${Number(order.amount).toFixed(1)} ลิตร | หมายเหตุ: ${order.note || "-"}</div>
      <div class="order-actions">
        <button class="ghost route-btn" data-route="${idx}">นำทางไปจุดรับนี้</button>
        <button class="ghost" data-order="${idx}" data-status="รับงานแล้ว">รับงานแล้ว</button>
      </div>
    `;
    collectorOrdersEl.appendChild(box);
  });
}

function renderCollectorStatusPage() {
  if (!collectorStatusListEl) return;
  collectorStatusListEl.innerHTML = "";
  state.collectorOrders.forEach((order, idx) => {
    const lifecycle = getLifecycleFromOrder(order);
    const box = document.createElement("div");
    box.className = "order-item";
    box.innerHTML = `
      <div class="order-head">
        <strong class="order-code">${order.id}</strong>
        <div class="order-head-right">
          <button class="call-icon-btn" data-call="${idx}" type="button" aria-label="โทรหาลูกค้า">📞</button>
          <span class="status-badge status-${lifecycle}">${order.status}</span>
        </div>
      </div>
      <div class="order-detail">${order.seller} • ${Number(order.amount).toFixed(1)} ลิตร</div>
      <div class="order-actions">
        <button class="ghost status-btn status-going" data-order="${idx}" data-status="กำลังไปรับ">กำลังไปรับ</button>
        <button class="ghost status-btn status-done" data-order="${idx}" data-status="รับสำเร็จ">รับสำเร็จ</button>
        <button class="ghost status-btn status-miss" data-order="${idx}" data-status="ไม่พบผู้ใช้">ไม่พบผู้ใช้</button>
      </div>
    `;
    collectorStatusListEl.appendChild(box);
  });
}

function getLifecycleFromOrder(order) {
  const map = {
    "รอรับงาน": "pending",
    "รับงานแล้ว": "assigned",
    "กำลังไปรับ": "in_progress",
    "รับสำเร็จ": "completed",
    "ไม่พบผู้ใช้": "cancelled"
  };
  return map[order.status] || "pending";
}

function syncRequestStatusFromCollector(order) {
  if (!order) return;
  const matched = state.requests.find((req) => req.sellerName === order.seller || req.pickupStreet === order.address);
  if (!matched) return;

  const statusMap = {
    "รอรับงาน": "รอรับซื้อ",
    "รับงานแล้ว": "รอรับซื้อ",
    "กำลังไปรับ": "กำลังเดินทาง",
    "รับสำเร็จ": "รับซื้อสำเร็จ",
    "ไม่พบผู้ใช้": "ไม่พบผู้ใช้"
  };
  matched.status = statusMap[order.status] || matched.status;
}

collectorOrdersEl.addEventListener("click", (e) => {
  const routeBtn = e.target.closest("button[data-route]");
  if (routeBtn) {
    if (!state.isAuthenticated || !["collector", "admin"].includes(state.role)) {
      showMessage(loginMsg, "ต้องล็อกอินด้วยบัญชีรถเก็บขยะหรือแอดมินก่อน", false);
      setPage("entry", true);
      return;
    }
    const index = Number(routeBtn.dataset.route);
    routeToOrder(index);
    return;
  }

  const btn = e.target.closest("button[data-order]");
  if (!btn) return;

  if (!state.isAuthenticated || !["collector", "admin"].includes(state.role)) {
    showMessage(loginMsg, "ต้องล็อกอินด้วยบัญชีรถเก็บขยะหรือแอดมินก่อน", false);
    setPage("entry", true);
    return;
  }

  const index = Number(btn.dataset.order);
  const nextStatus = btn.dataset.status;
  state.collectorOrders[index].status = nextStatus;
  if (nextStatus === "รับสำเร็จ") {
    state.collectorOrders[index].completedAt = new Date().toLocaleString("th-TH");
  } else if (state.collectorOrders[index].completedAt) {
    state.collectorOrders[index].completedAt = "";
  }
  syncRequestStatusFromCollector(state.collectorOrders[index]);
  renderCollectorOrders();
  renderCollectorStatusPage();
  renderHistory();
  renderAdminDashboard();
  initGoogleMap();
});

collectorStatusListEl?.addEventListener("click", (e) => {
  const callBtn = e.target.closest("button[data-call]");
  if (callBtn) {
    const index = Number(callBtn.dataset.call);
    const order = state.collectorOrders[index];
    if (!order) return;
    window.alert(`ติดต่อผู้ขาย ${order.seller} ได้ที่บัญชีเดโม่ในระบบ`);
    return;
  }

  const btn = e.target.closest("button[data-order]");
  if (!btn) return;
  const index = Number(btn.dataset.order);
  const nextStatus = btn.dataset.status;
  state.collectorOrders[index].status = nextStatus;
  if (nextStatus === "รับสำเร็จ") {
    state.collectorOrders[index].completedAt = new Date().toLocaleString("th-TH");
  } else if (state.collectorOrders[index].completedAt) {
    state.collectorOrders[index].completedAt = "";
  }
  syncRequestStatusFromCollector(state.collectorOrders[index]);
  renderCollectorOrders();
  renderCollectorStatusPage();
  renderHistory();
  renderAdminDashboard();
  initGoogleMap();
});

function loadEditProfileForm() {
  if (!editProfileForm || !state.currentUser) return;
  editProfileForm.firstName.value = state.currentUser.firstName || "";
  editProfileForm.lastName.value = state.currentUser.lastName || "";
  editProfileForm.phone.value = state.currentUser.phone || state.currentUser.username || "";
  editProfileForm.bank.value = state.currentUser.bank || "";
  editProfileForm.bankAccount.value = state.currentUser.bankAccount || "";
  editProfileForm.houseNo.value = state.currentUser.houseNo || "";
  editProfileForm.road.value = state.currentUser.road || "";
  editProfileForm.subdistrict.value = state.currentUser.subdistrict || "";
  editProfileForm.province.value = state.currentUser.province || "";
  editProfileForm.postcode.value = state.currentUser.postcode || "";
  editProfileForm.serviceArea.value = state.currentUser.serviceArea || "";
  editProfileForm.plate.value = state.currentUser.plate || "";
  editProfileForm.plateProvince.value = state.currentUser.plateProvince || "";
  editProfileForm.workDay.value = state.currentUser.workDay || "";
}

editProfileForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.currentUser) return;
  const data = collectFormData(editProfileForm);
  Object.assign(state.currentUser, {
    firstName: data.firstName || state.currentUser.firstName,
    lastName: data.lastName || state.currentUser.lastName,
    phone: data.phone || state.currentUser.phone,
    bank: data.bank || state.currentUser.bank,
    bankAccount: data.bankAccount || state.currentUser.bankAccount,
    houseNo: data.houseNo || "",
    road: data.road || "",
    subdistrict: data.subdistrict || "",
    province: data.province || "",
    postcode: data.postcode || "",
    serviceArea: data.serviceArea || "",
    plate: data.plate || "",
    plateProvince: data.plateProvince || "",
    workDay: data.workDay || ""
  });
  state.currentUser.addressDisplay = buildAddressDisplay(state.currentUser);
  const index = state.users.findIndex((user) => user.id === state.currentUser.id);
  if (index >= 0) state.users[index] = { ...state.currentUser };
  saveUsersToStorage();
  renderProfile();
  renderHistory();
  setPage("profile", true);
});

cancelEditProfileBtn?.addEventListener("click", () => setPage("profile", true));

function loadGoogleMaps(key) {
  if (!key || mapsFatal) return;
  if (window.google && window.google.maps) {
    initGoogleMap();
    return;
  }

  if (document.getElementById("google-maps-script")) return;

  const script = document.createElement("script");
  script.id = "google-maps-script";
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initGoogleMap`;
  script.onerror = () => {
    mapsFatal = true;
    setMapsFallbackMode("โหลด Google Maps ไม่สำเร็จ (ตรวจสอบ API key / internet)");
  };
  document.head.appendChild(script);
}

function maybeLoadGoogleMaps() {
  if (mapsFatal) {
    setMapsFallbackMode("Google Maps ใช้งานไม่ได้ชั่วคราว ระบบสลับเป็นโหมดสำรอง");
    return;
  }
  const key = getStoredMapsKey();
  if (!key) {
    mapMsg.textContent = "ยังไม่ตั้งค่า API key แผนที่จะใช้โหมดตัวอย่าง";
    routeInfo.textContent = "เพิ่ม Google Maps API key เพื่อเปิดการนำทางแบบเรียลไทม์";
    return;
  }

  mapMsg.textContent = "กำลังโหลด Google Maps API อัตโนมัติ...";
  loadGoogleMaps(key);
}

function initGoogleMap() {
  const activePage = document.querySelector(".page.active")?.id || "";
  if (activePage === "page-tracking") {
    initTrackingMap();
    return;
  }
  if (activePage === "page-entry") {
    initRegisterMap();
  }
}

function initTrackingMap() {
  const mapEl = document.getElementById("google-map");
  if (!mapEl || !window.google || !window.google.maps || mapsFatal) return;
  if (mapInstance) return;

  mapInstance = new google.maps.Map(mapEl, {
    center: { lat: 13.7563, lng: 100.5018 },
    zoom: 11,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false
  });

  infoWindow = new google.maps.InfoWindow();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: mapInstance,
    suppressMarkers: false
  });

  state.collectorOrders.forEach((order) => {
    const marker = new google.maps.Marker({
      position: { lat: order.lat, lng: order.lng },
      map: mapInstance,
      title: `${order.id} - ${order.seller}`
    });

    marker.addListener("click", () => {
      infoWindow.setContent(`<strong>${order.id}</strong><br>${order.seller}<br>${order.address}<br>สถานะ: ${order.status}`);
      infoWindow.open({ anchor: marker, map: mapInstance });
    });
  });

  mapMsg.textContent = "โหลด Google Maps สำเร็จ";
  routeInfo.textContent = "เลือกงานแล้วกด 'นำทางไปจุดรับนี้' ระบบจะคำนวณเส้นทางให้ทันที";
  locateCollector();
}

function getAddressPart(components, type) {
  return components.find((c) => c.types.includes(type))?.long_name || "";
}

function setRegisterAddressValues(values) {
  if (values.houseNo !== undefined) registerForm.houseNo.value = values.houseNo;
  if (values.road !== undefined) registerForm.road.value = values.road;
  if (values.subdistrict !== undefined) registerForm.subdistrict.value = values.subdistrict;
  if (values.province !== undefined) registerForm.province.value = values.province;
  if (values.postcode !== undefined) registerForm.postcode.value = values.postcode;
}

function fillRegisterPresetAddress() {
  setRegisterAddressValues({ ...REGISTER_PRESET_ADDRESS });
  // ให้ข้อมูลกับหมุดอยู่ตำแหน่งเดียวกันเสมอ
  if (registerMap && registerMarker) {
    moveRegisterMarker(REGISTER_PRESET_LATLNG, true);
  }
}

function parseFirstNominatimResult(data) {
  const first = Array.isArray(data) ? data[0] : data;
  if (!first) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeByNominatimQuery(text) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    text
  )}`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!resp.ok) throw new Error(`nominatim_search_http_${resp.status}`);
  const data = await resp.json();
  return parseFirstNominatimResult(data);
}

function moveRegisterMarker(latLng, recenter = true) {
  if (!registerMap || !registerMarker || !latLng) return;
  const next = {
    lat: Number(latLng.lat),
    lng: Number(latLng.lng)
  };
  registerMarker.setPosition(next);
  if (recenter) {
    registerMap.setCenter(next);
    registerMap.setZoom(16);
  }
}

function composeRegisterAddressText() {
  return [
    registerForm.houseNo.value,
    registerForm.road.value,
    registerForm.subdistrict.value,
    registerForm.province.value,
    registerForm.postcode.value,
    "ประเทศไทย"
  ]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join(" ");
}

function syncRegisterMapFromForm() {
  if (!registerMap || !registerMarker) return;
  const text = composeRegisterAddressText();
  if (text.length < 8) return;

  if (geocoder) {
    geocoder.geocode({ address: text }, async (results, status) => {
      if (status === "OK" && results && results.length) {
        const loc = results[0].geometry?.location;
        if (!loc) return;
        moveRegisterMarker({ lat: loc.lat(), lng: loc.lng() }, true);
        registerMapMsg.textContent = "อัปเดตหมุดตามที่อยู่ที่แก้ไขแล้ว";
        return;
      }
      try {
        const point = await geocodeByNominatimQuery(text);
        if (!point) return;
        moveRegisterMarker(point, true);
        registerMapMsg.textContent = "อัปเดตหมุดจากข้อมูลที่อยู่ (บริการสำรอง)";
      } catch {
        // ถ้าไม่สำเร็จปล่อยให้ผู้ใช้ลากหมุดเอง
      }
    });
    return;
  }

  geocodeByNominatimQuery(text)
    .then((point) => {
      if (!point) return;
      moveRegisterMarker(point, true);
      registerMapMsg.textContent = "อัปเดตหมุดจากข้อมูลที่อยู่ (บริการสำรอง)";
    })
    .catch(() => {});
}

function bindRegisterAddressSyncEvents() {
  const fields = ["houseNo", "road", "subdistrict", "province", "postcode"];
  fields.forEach((name) => {
    const el = registerForm[name];
    if (!el) return;
    el.addEventListener("input", () => {
      clearTimeout(registerMapDebounceTimer);
      registerMapDebounceTimer = setTimeout(syncRegisterMapFromForm, 650);
    });
  });
}

function fillRegisterAddressFieldsFromGoogle(result, latLng) {
  const c = result.address_components || [];
  const streetNo = getAddressPart(c, "street_number");
  const route = getAddressPart(c, "route");

  // ไทยมักกระจายข้อมูลเขต/อำเภอ ต่างกันตามพื้นที่ จึงเช็กหลาย type
  const subdistrict =
    getAddressPart(c, "sublocality_level_2") ||
    getAddressPart(c, "sublocality_level_1") ||
    getAddressPart(c, "sublocality") ||
    getAddressPart(c, "neighborhood") ||
    getAddressPart(c, "locality");
  const province = getAddressPart(c, "administrative_area_level_1");
  const postcode = getAddressPart(c, "postal_code");

  const lat = Number(latLng.lat).toFixed(6);
  const lng = Number(latLng.lng).toFixed(6);
  const coordinateText = `พิกัด ${lat}, ${lng}`;

  setRegisterAddressValues({
    houseNo: streetNo || registerForm.houseNo.value || REGISTER_PRESET_ADDRESS.houseNo,
    road: route || registerForm.road.value || coordinateText || REGISTER_PRESET_ADDRESS.road,
    subdistrict:
      subdistrict || registerForm.subdistrict.value || REGISTER_PRESET_ADDRESS.subdistrict,
    province: province || registerForm.province.value || REGISTER_PRESET_ADDRESS.province,
    postcode: postcode || registerForm.postcode.value || REGISTER_PRESET_ADDRESS.postcode
  });
}

async function fillRegisterAddressFieldsFromFallback(latLng) {
  // ผู้ใช้ต้องการให้ fallback ใช้ชุดที่อยู่ที่กำหนดล่าสุดแบบตายตัว
  fillRegisterPresetAddress();
  return Promise.resolve(latLng);
}

function reverseGeocodeForRegister(latLng) {
  if (!geocoder || mapsFatal) {
    fillRegisterPresetAddress();
    return;
  }
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === "OK" && results && results.length) {
      fillRegisterAddressFieldsFromGoogle(results[0], latLng);
      registerMapMsg.textContent = "ดึงที่อยู่จากหมุดเรียบร้อย (แก้ไขเองต่อได้)";
    } else {
      fillRegisterAddressFieldsFromFallback(latLng)
        .then(() => {
          registerMapMsg.textContent =
            "ดึงที่อยู่สำเร็จจากบริการสำรอง (แก้ไขเองต่อได้)";
        })
        .catch(() => {
          // อย่างน้อยต้องมีค่าที่ใช้งานได้เสมอ
          fillRegisterPresetAddress();
          if (status === "REQUEST_DENIED") {
            registerMapMsg.textContent =
              "Google ปฏิเสธการอ่านที่อยู่: ระบบใส่ที่อยู่สำรองให้แล้ว สามารถแก้ไขต่อได้";
          } else {
            registerMapMsg.textContent =
              `อ่านที่อยู่อัตโนมัติไม่สำเร็จ (status: ${status}) ระบบใส่ที่อยู่สำรองให้แล้ว`;
          }
        });
    }
  });
}

function initRegisterMap() {
  const mapEl = document.getElementById("register-map");
  if (!mapEl || !window.google || !window.google.maps || mapsFatal) return;
  if (registerMap) return;

  const center = { lat: 13.7563, lng: 100.5018 };
  geocoder = new google.maps.Geocoder();
  registerMap = new google.maps.Map(mapEl, {
    center,
    zoom: 13,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false
  });
  registerMarker = new google.maps.Marker({
    position: center,
    map: registerMap,
    draggable: true,
    title: "หมุดที่อยู่สำหรับสมัครสมาชิก"
  });

  registerMarker.addListener("dragend", () => {
    const pos = registerMarker.getPosition();
    if (!pos) return;
    reverseGeocodeForRegister({ lat: pos.lat(), lng: pos.lng() });
  });

  registerMap.addListener("click", (e) => {
    if (!e.latLng) return;
    moveRegisterMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() }, false);
    reverseGeocodeForRegister({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  });

  bindRegisterAddressSyncEvents();
}

function locateCollector() {
  if (!navigator.geolocation || !mapInstance || !window.google?.maps) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      updateCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    },
    () => {
      // ถ้าไม่อนุญาต location ใช้จุดตั้งต้นจริงในกรุงเทพแทน เพื่อคำนวณเส้นทางได้เสมอ
      updateCurrentLocation(DEFAULT_COLLECTOR_LOCATION);
      routeInfo.textContent = "ใช้ตำแหน่งตั้งต้นเริ่มต้น (BTS พร้อมพงษ์) สำหรับการนำทาง";
    },
    { enableHighAccuracy: true, timeout: 7000 }
  );
}

function updateCurrentLocation(latlng) {
  currentLatLng = { lat: Number(latlng.lat), lng: Number(latlng.lng) };
  mapInstance.setCenter(currentLatLng);
  mapInstance.setZoom(12);

  if (currentLocationMarker) currentLocationMarker.setMap(null);
  currentLocationMarker = new google.maps.Marker({
    position: currentLatLng,
    map: mapInstance,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#1f75ff",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3
    },
    title: "ตำแหน่งปัจจุบันของรถ"
  });
}

function asLatLngLiteral(latlng) {
  if (!latlng) return DEFAULT_COLLECTOR_LOCATION;
  if (typeof latlng.lat === "function" && typeof latlng.lng === "function") {
    return { lat: latlng.lat(), lng: latlng.lng() };
  }
  return { lat: Number(latlng.lat), lng: Number(latlng.lng) };
}

function openGoogleMapsExternalRoute(origin, destination) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function routeToOrder(index) {
  const order = state.collectorOrders[index];
  if (!order) return;
  if (mapsFatal) {
    const destination = { lat: order.lat, lng: order.lng };
    const origin = currentLatLng || DEFAULT_COLLECTOR_LOCATION;
    openGoogleMapsExternalRoute(origin, destination);
    routeInfo.textContent = "เปิดนำทางผ่าน Google Maps ภายนอกแล้ว (โหมดสำรอง)";
    return;
  }

  if (!window.google?.maps || !mapInstance || !directionsService || !directionsRenderer) {
    routeInfo.textContent = "ยังไม่พร้อมใช้งาน Google Maps (ตรวจสอบ API key และ internet)";
    return;
  }

  const destination = { lat: order.lat, lng: order.lng };
  const origin = asLatLngLiteral(currentLatLng || mapInstance.getCenter());

  directionsService.route(
    {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true
    },
    (result, status) => {
      if (status !== "OK" || !result) {
        routeInfo.textContent =
          "ไม่สามารถแสดงเส้นทางถนนจริงในแอปได้ (ตรวจสอบว่าเปิด Directions API แล้ว) กำลังเปิด Google Maps ภายนอก...";
        openGoogleMapsExternalRoute(origin, destination);
        return;
      }

      directionsRenderer.setDirections(result);
      const leg = result.routes[0]?.legs?.[0];
      const distance = leg?.distance?.text || "-";
      const duration = leg?.duration?.text || "-";
      routeInfo.textContent = `กำลังนำทางไป ${order.seller} • ระยะทาง ${distance} • เวลา ${duration}`;
    }
  );
}

const slides = document.querySelectorAll(".hero-slide");
let slideIndex = 0;
if (slides.length > 1) {
  setInterval(() => {
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
  }, 4000);
}

setRole("user");
state.users = loadUsersFromStorage();
ensureUserDemoAccount();
ensureCollectorAccount();
ensureAdminAccount();
saveUsersToStorage();
localStorage.removeItem("oilive_google_maps_key");
state.currentUser = null;
state.isAuthenticated = false;
clearSessionStorage();
setAuthTab("login");
setAuthUi();
renderCollectorOrders();
renderCollectorStatusPage();
renderHistory();
renderProfile();
renderAdminDashboard();
updateTimeline();
setPage("entry", true);
