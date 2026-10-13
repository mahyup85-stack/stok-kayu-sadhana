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
    generateCaptcha,
    smToM3,
    m3ToSm,
    hitungKonversi,
    formatSaldo,
    exportToCSV,
    deleteData,
    deleteAllData,
    handleSearch,
    loadComponent,
    handleRowCheckboxChange,
    handleSmartDelete,         // 🌟 Tambahkan ini
    updateSmartDeleteButtonUI  // 🌟 Tambahkan ini juga agar lengkap

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


// ================================================================
// GLOBAL HELPERS
// ================================================================

Object.assign(window, {
    hitungKonversi,
    exportToCSV,
    deleteData,
    deleteAllData,
    deleteSelectedRows,
    handleSmartDelete,
    updateSmartDeleteButtonUI,
    handleRowCheckboxChange,
    handleSearch,
    formatSaldo,
    smToM3,
    m3ToSm,
    showLoading,
    renderCaptcha,
    generateCaptcha, // 🌟 Tambahkan juga di sini
    loadComponent,
});
// Fungsi untuk memuat pengaturan dinamis ke frontend
async function loadAppSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('app_settings')
            .select('key, value');

        if (error) throw error;

        data.forEach(item => {
            const element = document.getElementById(item.key);
            if (element) {
                if (item.key === 'announcement_text') {
                    element.innerHTML = `
                        <span style="display: inline-block; width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);"></span>
                        <span>${item.value}</span>
                    `;
                } else {
                    element.textContent = item.value;
                }
            }
        });

    } catch (err) {
        console.error('Gagal memuat pengaturan aplikasi:', err.message);
    }
}

// Panggil fungsi saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', loadAppSettings);

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
            if (typeof loadDataMaster === "function") await loadDataMaster();
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
        ["view-pengaturan", "views/pengaturan.html"],
        ["view-lhc", "views/lhc.html"]
    ];

    for (const [id, path] of components) {
        await loadComponent(id, path);
    }
    console.log("Kerangka DOM aplikasi selesai dimuat.");

    // Event listener untuk smart delete
    document.addEventListener("click", function (event) {
        const targetBtn = event.target.closest("#btn-smart-delete");
        if (targetBtn) {
            event.preventDefault();
            if (typeof window.handleSmartDelete === "function") {
                window.handleSmartDelete();
            } else {
                console.error("Fungsi window.handleSmartDelete belum terdefinisi!");
            }
        }
    });

    // 🌟 2. DEFINISIKAN FUNGSI IMPOR CSV LHC DI LEVEL UTAMA (DI LUAR BLOK APAPUN)
    // Fungsi Utama: Memproses Upload CSV dan Menyimpan ke Supabase
    // 1. Fungsi Utama: Memproses Upload CSV dan Menyimpan ke Supabase
    window.processUploadLhcCsv = async function () {
        const fileInput = document.getElementById("lhc-csv-file");
        const tahunSelect = document.getElementById("lhc-upload-tahun");
        const client = typeof initSupabase === "function" ? initSupabase() : null;

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Silakan pilih file CSV LHC terlebih dahulu!");
            return;
        }

        if (!client) {
            alert("Koneksi Supabase tidak ditemukan.");
            return;
        }

        const selectedTahun = tahunSelect ? parseInt(tahunSelect.value, 10) : 2026;
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function (e) {
            const text = e.target.result;
            const rows = text.split(/\r\n|\n/);
            const payloadList = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                const cols = row.split(/,|\t|;/).map(col => col.replace(/^"|"$/g, '').trim());

                const blokVal = cols[0] || "";
                const jenisKayu = cols[1] || "";
                const volumeLhc = parseFloat(String(cols[2] || "0").replace(/\./g, '').replace(',', '.')) || 0;

                if (blokVal) {
                    payloadList.push({
                        tahun: selectedTahun,
                        blok: blokVal, // Diubah dari tpk ke blok
                        jenis_kayu: jenisKayu || "-",
                        volume_lhc: volumeLhc
                    });
                }
            }

            if (payloadList.length === 0) {
                alert("Tidak ada data valid yang terbaca dari file CSV.");
                return;
            }

            const { error } = await client.from("data_lhc").insert(payloadList);

            if (error) {
                alert("Gagal mengimpor ke Supabase: " + error.message);
                console.error("Detail Error:", error);
            } else {
                alert(`Berhasil mengimpor ${payloadList.length} data kuota LHC untuk tahun ${selectedTahun}!`);
                fileInput.value = "";
                if (typeof window.loadLhcTable === "function") {
                    await window.loadLhcTable();
                }
            }
        };

        reader.readAsText(file);
    };

    // Fungsi untuk Memuat dan Merender Daftar Kuota LHC dengan Struktur Folder Bersarang (Tahun -> Blok)
    // Fungsi untuk Memuat dan Merender Daftar Kuota LHC dengan Struktur Folder Bersarang (Tahun -> Blok) dan Total Volume di Bawah
    window.loadLhcTable = async function () {
        const client = typeof initSupabase === "function" ? initSupabase() : null;
        const tableBody = document.getElementById("lhc-table-body");

        if (!tableBody) return;

        if (!client) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Koneksi Supabase tidak ditemukan.</td></tr>`;
            return;
        }

        const { data, error } = await client
            .from("data_lhc")
            .select("*")
            .order("tahun", { ascending: false })
            .order("blok", { ascending: true })
            .order("jenis_kayu", { ascending: true });

        if (error) {
            console.error("Gagal memuat data LHC:", error.message);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Gagal memuat data: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #888; padding: 20px;">Belum ada data kuota LHC</td></tr>`;
            return;
        }

        // 1. Kelompokkan data bertingkat: Tahun -> Prefix Blok
        const nestedData = {};
        data.forEach(item => {
            const tahun = item.tahun ? String(item.tahun).trim() : "Tanpa Tahun";
            const rawBlok = (item.blok || "").trim();
            const prefixMatch = rawBlok.match(/^[A-Za-z]+/);
            const prefixBlok = prefixMatch ? prefixMatch[0].toUpperCase() : "LAINNYA";

            if (!nestedData[tahun]) {
                nestedData[tahun] = {};
            }
            if (!nestedData[tahun][prefixBlok]) {
                nestedData[tahun][prefixBlok] = [];
            }
            nestedData[tahun][prefixBlok].push(item);
        });

        let html = "";
        let tahunIndex = 0;

        // 2. Loop Berdasarkan Tahun (Folder Utama)
        for (const [tahun, blokMap] of Object.entries(nestedData)) {
            tahunIndex++;
            const tahunRowClass = `tahun-folder-${tahunIndex}`;

            let totalVolumeTahun = 0;
            Object.values(blokMap).forEach(items => {
                items.forEach(item => {
                    totalVolumeTahun += Number(item.volume_lhc) || 0;
                });
            });

            // Folder Tahun Utama
            html += `
            <tr style="background: rgb(246, 250, 250); font-weight: bold; cursor: pointer; user-select: none; border-bottom: 2px solid rgba(249, 250, 250, 0.98);" 
                onclick="toggleFolderGroup('${tahunRowClass}')">
                <td colspan="4" style="padding: 14px 15px; color: #0f172a; font-size: 15px;">
                    📂 Tahun ${tahun} &nbsp;<span style="font-weight: normal; font-size: 13px; color: #cdb5e1;"></span>
                </td>
            </tr>
        `;

            // Kontainer di dalam Folder Tahun
            html += `
            <tr class="${tahunRowClass}" style="display: none;">
                <td colspan="4" style="padding: 0; background: #f8fafc; border: none;">
                    <table style="width: 100%; border-collapse: collapse; margin: 0;">
                        <tbody>
        `;

            let blokIndex = 0;
            // Loop Berdasarkan Blok di dalam Tahun tersebut
            for (const [prefixBlok, items] of Object.entries(blokMap)) {
                blokIndex++;
                const blokRowClass = `blok-sub-${tahunIndex}-${blokIndex}`;

                let totalVolumeBlok = 0;
                items.forEach(item => {
                    totalVolumeBlok += Number(item.volume_lhc) || 0;
                });

                // Sub-Folder Blok
                html += `
                <tr style="background: #f1f5f9; font-weight: 600; cursor: pointer; user-select: none; border-bottom: 1px solid #e2e8f0;" 
                    onclick="toggleFolderGroup('${blokRowClass}')">
                    <td colspan="4" style="padding: 12px 15px 12px 35px; color: #1e293b;">
                        📁 Blok ${prefixBlok} &nbsp;
                    </td>
                </tr>
            `;

                // Tabel Rincian Data di dalam Sub-Folder Blok
                html += `
                <tr class="${blokRowClass}" style="display: none;">
                    <td colspan="4" style="padding: 0; background: #ffffff; border: none;">
                        <table style="width: 100%; border-collapse: collapse; margin: 0;">
                            <thead>
                                <tr style="background: #f8fafc; color: #475569; font-size: 13px; border-bottom: 1px solid #e2e8f0;">
                                    <th style="padding: 8px 15px 8px 50px; text-align: left; width: 20%;">Tahun</th>    
                                    <th style="padding: 8px 15px; text-align: left; width: 30%;">Blok</th>
                                    <th style="padding: 8px 15px; text-align: left; width: 30%;">Jenis Kayu</th>
                                    <th style="padding: 8px 15px; text-align: right; width: 20%;">Volume LHC (m³)</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

                items.forEach(item => {
                    const vol = Number(item.volume_lhc) || 0;
                    html += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 15px 8px 50px; color: #475569; font-weight: 500;">${item.tahun}</td>
                        <td style="padding: 8px 15px; color: #1e293b;">${item.blok}</td>
                        <td style="padding: 8px 15px; color: #1e293b;">${item.jenis_kayu}</td>
                        <td style="padding: 8px 15px; color: #0f172a; text-align: right; font-weight: 500;">${vol.toLocaleString('id-ID')}</td>
                    </tr>
                `;
                });

                // Baris Total Volume di bagian bawah tabel rincian blok
                html += `
                                <tr style="background: #f8fafc; font-weight: bold; border-top: 1px solid #cbd5e1;">
                                    <td colspan="3" style="padding: 10px 15px 10px 50px; text-align: right; color: #1e293b;">Total Blok ${prefixBlok}</td>
                                    <td style="padding: 10px 15px; text-align: right; color: #1e293b;">${totalVolumeBlok.toLocaleString('id-ID')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            `;
            }

            html += `
                        </tbody>
                    </table>
                </td>
            </tr>
        `;
        }

        tableBody.innerHTML = html;
    };

    // Fungsi interaksi Buka/Tutup folder bersarang
    window.toggleFolderGroup = function (rowClass) {
        if (typeof event !== 'undefined' && event) {
            event.stopPropagation();
        }
        const row = document.querySelector(`.${rowClass}`);
        if (!row) return;

        if (row.style.display === "none" || row.style.display === "") {
            row.style.display = "table-row";
        } else {
            row.style.display = "none";
        }
    };

    // 🌟 3. SISTEM PENGAMAN PAGINASI
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

    // 4. Cek Status Login & Tampilkan Aplikasi Utama jika sudah login
    if (window.state && window.state.isLoggedIn) {
        if (typeof window.showMainApp === "function") {
            window.showMainApp();
        }
    }

    // 5. Inisialisasi Captcha & Tombol Refresh
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
            e.preventDefault();

            const isValid = typeof window.validateCaptcha === "function" ? window.validateCaptcha() : false;

            if (!isValid) {
                alert("Kode Captcha salah atau tidak valid! Silakan masukkan kode dengan benar.");
                if (typeof generateCaptcha === "function") {
                    generateCaptcha();
                }
                const inputEl = document.getElementById("captcha-input");
                if (inputEl) {
                    inputEl.value = "";
                    inputEl.focus();
                }
                return;
            }

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

    // 6. Listener Input Keterangan LHP
    const inputKet = document.getElementById("input-ket") ||
        document.getElementById("keterangan") ||
        document.getElementById("ket");

    if (inputKet) {
        inputKet.addEventListener("input", function () {
            const nilaiKet = this.value.toUpperCase();
            const editId = document.getElementById("edit-id")?.value;

            if (nilaiKet.includes("LHP") && !nilaiKet.includes("AFKIR") && !editId) {
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

// Window load tetap di luar dan berdiri sendiri
window.addEventListener("load", () => {
    console.log("Halaman selesai dimuat sepenuhnya (window load).");
});
