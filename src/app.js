import { state } from "./state/store.js";

import {
    initSupabase,
    fetchData,
    loadDataMaster,
    insertStokKayu,
    updateStokKayu
} from "./services/api.js";

import {
    showLoading,
    renderCaptcha,
    generateCaptcha, // 🌟 Tambahkan di sini
    smToM3,
    m3ToSm,
    hitungKonversi,
    formatSaldo,
    exportToCSV,
    deleteData,
    deleteAllData,
    handleSearch,
    loadComponent
} from "./utils/helpers.js";
import { round2 } from './utils/helpers.js';
import { switchView } from "./utils/navigation.js";
import "./utils/idleTimer.js";
// ================================================================
// COMPONENTS
// ================================================================

import "./components/DashboardTable.js";
import "./components/MasterModal.js";
import "./components/RekapSaldo.js";
import "./components/FilterControls.js";
import "./components/RincianMutasi.js";
import "./components/Pengaturan.js";
import './components/mutasiController.js';
import './components/tableRenderer.js';


// ================================================================
// GLOBAL HELPERS
// ================================================================

Object.assign(window, {
    hitungKonversi,
    exportToCSV,
    deleteData,
    deleteAllData,
    handleSearch,
    formatSaldo,
    smToM3,
    m3ToSm,
    showLoading,
    renderCaptcha,
    generateCaptcha, // 🌟 Tambahkan juga di sini
    loadComponent
});

window.showMainApp = async function () {
    const loginScreen = document.getElementById("login-screen");
    const appContainer = document.getElementById("app-container");

    if (loginScreen) {
        loginScreen.style.display = "none";
        loginScreen.classList.add("hidden");
    }

    if (appContainer) {
        appContainer.style.display = "flex";
        appContainer.classList.remove("hidden");
    }

    // 1. Tunggu semua komponen HTML views/ selesai dimuat ke DOM
    await Promise.all([
        loadComponent("sidebar-container", "views/sidebar.html"),
        loadComponent("view-dashboard", "views/dashboard.html"),
        loadComponent("view-rekapsaldo", "views/rekapsaldo.html"),
        loadComponent("view-rincianmutasi", "views/rincianmutasi.html"),
        loadComponent("view-masterdata", "views/masterdata.html"),
        loadComponent("view-pengaturan", "views/pengaturan.html")
    ]);

    // 2. Aktifkan view dashboard TERLEBIH DAHULU
    if (typeof window.switchView === "function") {
        window.switchView("dashboard");
    }

    // 3. Tarik data dan inisialisasi filter SETELAH komponen HTML tampil sempurna
    try {
        if (typeof initSupabase === "function") await initSupabase();

        await new Promise(resolve => setTimeout(resolve, 150));

        if (typeof loadDataMaster === "function") await loadDataMaster();

        if (typeof window.fetchData === "function") {
            await window.fetchData();
            console.log("Data selesai dimuat, total:", window.state?.data?.length);

            // 🌟 INI KUNCINYA: Inisialisasi semua filter & dropdown setelah data dan elemen siap!
            if (typeof window.initSemuaFilter === "function") {
                window.initSemuaFilter();
            }

            // Panggil fungsi render utama
            if (typeof window.renderDashboardTable === "function") {
                window.renderDashboardTable();
            } else if (typeof renderTable === "function") {
                renderTable();
            }
            if (typeof window.renderRekapSaldo === "function") {
                window.renderRekapSaldo();
            }
            if (typeof window.renderRincian === "function") {
                window.renderRincian();
            }
        }
    } catch (error) {
        console.error("Gagal memuat data dari Supabase:", error);
    }

    // 4. Pasang event listener untuk form stok
    if (typeof initStockFormListener === "function") {
        initStockFormListener();
    }
};

// Fungsi helper untuk memasang listener form secara aman
function initStockFormListener() {
    const stockForm = document.getElementById("stock-form");
    if (stockForm && !stockForm.dataset.listenerAttached) {
        stockForm.dataset.listenerAttached = "true"; // Mencegah duplikasi listener

        stockForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                const editId = document.getElementById("edit-id")?.value;
                if (editId) {
                    await window.updateData(e);
                } else {
                    await window.addData(e);
                }

                // 1. Reset form terlebih dahulu
                stockForm.reset();
                const editIdEl = document.getElementById("edit-id");
                if (editIdEl) editIdEl.value = "";

                if (typeof window.cancelEdit === "function") {
                    window.cancelEdit();
                }

                // 🌟 2. TAMBAHKAN INI: Paksa render ulang tabel dan reset filter pencarian agar data baru paling atas langsung terlihat
                if (window.state) {
                    window.state.hasAppliedFilter = false; // Lepaskan kunci filter jika ada
                    if (Array.isArray(window.state.data)) {
                        window.state.filteredData = [...window.state.data];
                    }
                }

                if (typeof window.renderDashboardTable === "function") {
                    window.renderDashboardTable();
                }
                if (typeof window.renderPaginationControls === "function") {
                    window.renderPaginationControls();
                }

            } catch (error) {
                console.error("Gagal menyimpan data:", error);
                alert("Gagal menyimpan: " + (error.message || error));
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadSavedCredentials();
    // 1. Muat kerangka HTML komponen terlebih dahulu
    const components = [
        ["sidebar-container", "views/sidebar.html"],
        ["view-dashboard", "views/dashboard.html"],
        ["view-rekapsaldo", "views/rekapsaldo.html"],
        ["view-rincianmutasi", "views/rincianmutasi.html"],
        ["view-masterdata", "views/masterdata.html"],
        ["view-pengaturan", "views/pengaturan.html"]
    ];

    for (const [id, path] of components) {
        await loadComponent(id, path);
    }
    console.log("Kerangka DOM aplikasi selesai dimuat.");

    // 🌟 2. AKTIFKAN SISTEM PENGAMAN PAGINASI DI SINI 
    // (Karena komponen HTML sudah pasti selesai dimuat oleh perulangan di atas)
    const container = document.getElementById("pagination-container");
    if (container) {
        const observer = new MutationObserver(() => {
            const activeState = window.state || (typeof state !== 'undefined' ? state : null);
            const hasData = activeState && ((activeState.data && activeState.data.length > 0) || (activeState.filteredData && activeState.filteredData.length > 0));

            if (container.innerHTML.trim() === "" && hasData) {
                console.warn("Paginasi terdeteksi hilang! Dipaksa render ulang secara otomatis...");
                if (typeof window.renderPaginationControls === 'function') {
                    window.renderPaginationControls();
                }
            }
        });

        observer.observe(container, { childList: true, subtree: true });
        console.log("Sistem pengaman paginasi anti-hilang aktif!");
    } else {
        console.warn("Elemen #pagination-container belum ditemukan saat DOMContentLoaded.");
    }

    // 3. Cek Status Login & Tampilkan Aplikasi Utama jika sudah login
    if (window.state && window.state.isLoggedIn) {
        if (typeof window.showMainApp === "function") {
            window.showMainApp();
        }
    }

    // 4. Inisialisasi Captcha & Tombol Refresh
    if (typeof generateCaptcha === "function") {
        generateCaptcha();
    }

    const refreshBtn = document.getElementById("btn-refresh-captcha");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", generateCaptcha);
    }

    const canvas = document.getElementById("captchaCanvas");
    if (canvas) {
        canvas.addEventListener("click", generateCaptcha);
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault(); // Wajib untuk mencegah reload

            // Panggil fungsi validasi ketat
            const isValid = typeof window.validateCaptcha === "function" ? window.validateCaptcha() : false;

            if (!isValid) {
                alert("Kode Captcha salah atau tidak valid! Silakan masukkan kode dengan benar.");

                // Buat captcha baru
                if (typeof generateCaptcha === "function") {
                    generateCaptcha();
                }

                // Kosongkan input captcha agar user harus ketik ulang
                const inputEl = document.getElementById("captcha-input");
                if (inputEl) {
                    inputEl.value = "";
                    inputEl.focus();
                }

                return; // ⛔ HENTIKAN PROSES TOTAL, JANGAN LANJUT LOGIN!
            }

            // ==========================================
            // JIKA CAPTCHA BENAR, BARU LANJUTKAN CEK LOGIN
            // ==========================================
            const usernameInput = document.getElementById("login-user")?.value || "";
            const passwordInput = document.getElementById("login-pass")?.value || "";

            if (window.state && window.state.login(usernameInput, passwordInput)) {
                if (typeof loadJenisKayuOptions === "function") loadJenisKayuOptions();
                if (typeof loadTpkOptions === "function") loadTpkOptions();

                if (typeof window.showMainApp === "function") {
                    window.showMainApp();
                } else {
                    window.location.reload();
                }
            } else {
                alert("Username atau Password salah!");
                if (typeof generateCaptcha === "function") generateCaptcha();
                const inputEl = document.getElementById("captcha-input");
                if (inputEl) inputEl.value = "";
            }
        });
    }

    const inputKet = document.getElementById("input-ket") ||
        document.getElementById("keterangan") ||
        document.getElementById("ket");

    if (inputKet) {
        inputKet.addEventListener("input", function () {
            const nilaiKet = this.value.toUpperCase();
            const editId = document.getElementById("edit-id")?.value;

            if (nilaiKet.includes("LHP") && !editId) {
                if (typeof window.openLhpModal === "function") {
                    const tanggalUtama = document.getElementById("input-date")?.value || "";
                    const tpkUtama = document.getElementById("input-tpk")?.value || "";

                    window.openLhpModal({
                        tanggal: tanggalUtama,
                        keterangan: "LHP",
                        tpk: tpkUtama
                    });

                    this.value = "";
                } else {
                    console.error("Fungsi window.openLhpModal tidak ditemukan!");
                }
            }
        });
    }
});

// 🌟 Window load tetap di luar dan berdiri sendiri
window.addEventListener("load", () => {
    console.log("Halaman selesai dimuat sepenuhnya (window load).");
});