const AUTH_KEY = "sadhana_auth";

const state = {
    isLoggedIn: localStorage.getItem(AUTH_KEY) === "true",
    view: "dashboard",

    config: {
        user: "Admin",
        pass: "sadhana-234"
    },

    // AKSI AUTENTIKASI
    // Contoh di dalam file store.js atau file manajemen state Anda
    login(username, password) {
        // Ambil kredensial terbaru dari localStorage terlebih dahulu (prioritas utama)
        // Jika tidak ada di localStorage, fallback ke config default
        const validUser = localStorage.getItem("sadhana_custom_user") || this.config.user;
        const validPass = localStorage.getItem("sadhana_custom_pass") || this.config.pass;

        // Lakukan pengecekan ketat
        if (username === validUser && password === validPass) {
            this.isLoggedIn = true;
            localStorage.setItem("sadhana_auth", "true"); // sesuaikan key auth Anda
            return true;
        }

        return false;
    },

    logout() {
        this.isLoggedIn = false;
        localStorage.removeItem(AUTH_KEY);
        this.clearData();

        const loginScreen = document.getElementById("login-screen");
        const appContainer = document.getElementById("app-container");

        if (loginScreen && appContainer) {
            loginScreen.style.display = "flex";
            loginScreen.classList.remove("hidden");
            appContainer.style.display = "none";
            appContainer.classList.add("hidden");
        } else {
            window.location.reload();
        }
    },

    // DATA UTAMA
    data: [],
    filteredData: [],

    // DATA LAIN
    mutasi: [],

    // MASTER DATA
    master: {
        jenis_kayu: [],
        tpk: []
    },

    konversiKayu: {},

    setMasterData(type, newData) {
        const normalizedType = type === 'jenis-kayu' ? 'jenis_kayu' : type;
        if (!this.master) {
            this.master = { jenis_kayu: [], tpk: [] };
        }
        this.master[normalizedType] = Array.isArray(newData) ? newData : [];

        if (normalizedType === 'jenis_kayu') {
            this.konversiKayu = {};
            this.master.jenis_kayu.forEach(item => {
                this.konversiKayu[item.name] = item.konversi || 1;
            });
        }
    },
    currentMasterType: null,
    tempMasterType: null,

    // PAGINATION & TABS
    currentPage: 1,
    rowsPerPage: 50,
    activeTab: 'rincian-mutasi',
    selectedIds: [],

    // FILTER
    hasAppliedFilter: false,

    // EDIT MODE
    editingId: null,

    // FLAG OPERASI
    isLoadingData: false,
    isSubmitting: false,

    // HELPER RENDER DINAMIS (UNIVERSAL)
    triggerActiveRender() {
        if (typeof window.renderDashboardTable === "function" && this.view === "dashboard") {
            window.renderDashboardTable();
        }
        if (typeof window.renderRekapSaldo === "function" && (this.view === "rekap-saldo" || this.activeTab === "rekap-saldo")) {
            window.renderRekapSaldo();
        }
        if (typeof window.renderRincian === "function" && (this.view === "rincian-mutasi" || this.activeTab === "rincian-mutasi")) {
            window.renderRincian();
        }

        if (typeof window.renderPaginationControls === "function") {
            window.renderPaginationControls(this.filteredData.length);
        }
    },

    // SET DATA UTAMA
    setData(newData) {
        const safeData = Array.isArray(newData) ? newData : [];

        this.data = safeData;
        this.filteredData = [...safeData];
        this.currentPage = 1;
        this.hasAppliedFilter = false;

        this.triggerActiveRender();
    },

    // SET FILTERED DATA
    setFilteredData(newData) {
        this.filteredData = Array.isArray(newData) ? [...newData] : [];
        this.currentPage = 1;
        this.hasAppliedFilter = true;

        this.triggerActiveRender();
    },

    // RESET FILTER
    resetFilter() {
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.hasAppliedFilter = false;

        this.triggerActiveRender();
    },

    // ADD DATA KE STATE
    addItem(item) {
        if (!item) return;

        if (!Array.isArray(this.data)) {
            this.data = [];
        }

        this.data.unshift(item);

        if (!this.hasAppliedFilter) {
            this.filteredData = [...this.data];
        }

        this.currentPage = 1;
        this.triggerActiveRender();
    },

    // UPDATE DATA DI STATE
    updateItem(id, updatedItem) {
        const normalizedId = String(id);

        this.data = this.data.map(item => {
            return String(item.id) === normalizedId
                ? { ...item, ...updatedItem }
                : item;
        });

        if (this.hasAppliedFilter) {
            this.filteredData = this.filteredData.map(item => {
                return String(item.id) === normalizedId
                    ? { ...item, ...updatedItem }
                    : item;
            });
        } else {
            this.filteredData = [...this.data];
        }

        this.triggerActiveRender();
    },

    // REMOVE DATA DARI STATE
    removeItem(id) {
        const normalizedId = String(id);

        this.data = this.data.filter(
            item => String(item.id) !== normalizedId
        );

        this.filteredData = this.filteredData.filter(
            item => String(item.id) !== normalizedId
        );

        if (!this.hasAppliedFilter) {
            this.filteredData = [...this.data];
        }

        const totalPages = Math.max(
            1,
            Math.ceil(
                this.filteredData.length /
                (this.rowsPerPage || 25)
            )
        );

        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        this.triggerActiveRender();
    },

    // CLEAR SEMUA DATA
    clearData() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.hasAppliedFilter = false;

        this.triggerActiveRender();
    }
};

if (
    localStorage.getItem(AUTH_KEY) !== "true" &&
    localStorage.getItem("isLoggedIn") === "true"
) {
    localStorage.setItem(AUTH_KEY, "true");
    state.isLoggedIn = true;
}

// GLOBAL EXPOSE & LOGOUT FIX
window.state = state;

window.logout = function () {
    if (window.state && typeof window.state.logout === "function") {
        window.state.logout();
    } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem("isLoggedIn");
        window.location.reload();
    }
};

// 🌟 DUKUNG KEDUANYA (DEFAULT & NAMED EXPORT) AGAR AMAN DARI ERROR
export { state };
export default state;

export function executeActiveTableRender() {
    const activeTab = window.state.activeTab;

    if (activeTab === 'kartu-stok') {
        if (typeof window.renderKartuStokTable === 'function') window.renderKartuStokTable();
    } else if (activeTab === 'rekap-saldo') {
        if (typeof window.renderRekapSaldoTable === 'function') window.renderRekapSaldoTable();
    } else if (activeTab === 'rincian-mutasi') {
        if (typeof window.renderDashboardTable === 'function') window.renderDashboardTable();
    }
}
window.executeActiveTableRender = executeActiveTableRender;
