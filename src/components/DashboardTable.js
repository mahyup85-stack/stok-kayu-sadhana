import { state } from "../state/store.js";
import { formatSaldo } from "../utils/helpers.js";
import { initSupabase, fetchData } from "../services/api.js";


window.renderDashboardTable = function () {
    const activeState = window.state || {};

    // 🌟 Pastikan jika filteredData ada isinya, itu yang dipakai. 
    // Tapi jika input pencarian kosong, pastikan kembali ke activeState.data
    const dataToRender = (activeState.filteredData !== undefined && activeState.filteredData !== null)
        ? activeState.filteredData
        : (activeState.data || []);

    const dataArray = Array.isArray(dataToRender) ? dataToRender : [];

    const currentPage = activeState.currentPage || 1;
    const rowsPerPage = activeState.rowsPerPage || 50;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = dataArray.slice(startIndex, endIndex);

    const tableBody = document.getElementById("dashboard-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #888; padding: 20px;">
                    Tidak ada data mutasi
                </td>
            </tr>
        `;
        return;
    }
    paginatedData.forEach((item) => {
        const itemId = String(item.id || '');
        const isChecked = (activeState.selectedIds || []).includes(itemId) ? 'checked' : '';

        const valMasuk = Number(item.masuk_m3 ?? item.masuk_sm ?? 0).toFixed(2);
        const valKeluar = Number(item.keluar_m3 ?? item.keluar_sm ?? 0).toFixed(2);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 40px;">
                <input type="checkbox" class="row-checkbox" value="${itemId}" ${isChecked} onchange="window.handleRowCheckboxChange(this)">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.tanggal || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.keterangan || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.jenis_kayu || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.tpk || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.petak || '-'}</td>
            
            <!-- Kolom Masuk: Rata Kanan -->
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">${valMasuk}</td>
            
            <!-- Kolom Keluar: Rata Kanan -->
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">${valKeluar}</td>
            
            <!-- Kolom Aksi: Hanya Icon -->
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 80px;">
                <div style="display: flex; gap: 12px; justify-content: center; align-items: center;">
                    <button type="button" onclick="editData('${itemId}')" title="Edit Data" style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button type="button" onclick="deleteData('${itemId}')" title="Hapus Data" style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Sinkronisasi status master "Select All" checkbox setelah tabel selesai dirender di halaman ini
    const selectAllCheckbox = document.getElementById("select-all");
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (selectAllCheckbox && rowCheckboxes.length > 0) {
        const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }

    // Perbarui kontrol navigasi pagination di bawah tabel
    if (typeof window.initPermanentPaginationFooter === "function") {
        window.initPermanentPaginationFooter();
    }
};

const safeFormatSaldo =
    typeof formatSaldo === "function"
        ? formatSaldo
        : function (value) {
            const num = parseFloat(value);

            if (Number.isNaN(num)) {
                return value || "0.00";
            }

            return num.toLocaleString(
                "id-ID",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
        };

// ================================================================
// PAGINATION
// ================================================================

window.changePage = function (newPage) {
    // 🌟 Gunakan activeState yang aman
    const activeState = window.state || state;
    if (!activeState) return;

    const totalRows = activeState.hasAppliedFilter
        ? (activeState.filteredData?.length || 0)
        : (activeState.data?.length || 0);

    const rowsPerPage = activeState.rowsPerPage || 50;

    const totalPages = Math.max(
        1,
        Math.ceil(totalRows / rowsPerPage)
    );

    let page = parseInt(newPage, 10) || 1;
    page = Math.max(1, Math.min(page, totalPages));

    activeState.currentPage = page;

    if (typeof window.renderDashboardTable === 'function') window.renderDashboardTable();
    if (typeof window.renderPaginationControls === 'function') window.renderPaginationControls();
};

window.initPermanentPaginationFooter = function () {
    // 1. Deteksi view/halaman mana yang sedang aktif dan terlihat saat ini
    const activeViews = ["view-dashboard", "view-rekapsaldo", "view-rincianmutasi", "view-masterdata", "view-kartustok"];
    let currentActiveView = null;

    for (const viewId of activeViews) {
        const el = document.getElementById(viewId);
        if (el && window.getComputedStyle(el).display !== "none" && !el.classList.contains("hidden")) {
            currentActiveView = el;
            break;
        }
    }

    if (!currentActiveView) {
        currentActiveView = document.getElementById("view-dashboard") || document.querySelector(".card");
    }
    if (!currentActiveView) return;

    // 2. Cek apakah footer paginasi global sudah ada. Jika belum, buat!
    let footer = document.getElementById("permanent-pagination-footer");
    if (!footer) {
        footer = document.createElement("div");
        footer.id = "permanent-pagination-footer";
        currentActiveView.appendChild(footer);
    } else {
        if (footer.parentNode !== currentActiveView) {
            currentActiveView.appendChild(footer);
        }
    }

    // 3. Styling Modern & Minimalis di Tengah
    footer.style.cssText = `
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 8px !important;
        background: transparent !important;
        padding: 20px 0 !important;
        margin-top: 15px !important;
        margin-bottom: 15px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        z-index: 9999 !important;
    `;

    // 4. Hitung State dan Total Data Berdasarkan Menu yang Sedang Aktif
    const viewDashboard = document.getElementById("view-dashboard");
    const viewRekapSaldo = document.getElementById("view-rekapsaldo");
    const viewRincianMutasi = document.getElementById("view-rincianmutasi");

    let activeState = window.state || {};

    // Sesuaikan variabel data/state khusus untuk Rekap Saldo atau Rincian Mutasi jika menggunakan variabel terpisah
    if (viewRekapSaldo && window.getComputedStyle(viewRekapSaldo).display !== "none") {
        // Ganti 'rekapState' atau variabel yang dipakai di Rekap Saldo jika ada (misal: window.rekapState)
        activeState = window.rekapState || window.state || {};
    } else if (viewRincianMutasi && window.getComputedStyle(viewRincianMutasi).display !== "none") {
        // Ganti 'rincianState' atau variabel yang dipakai di Rincian Mutasi jika ada (misal: window.rincianState)
        activeState = window.rincianState || window.state || {};
    }

    // Ambil jumlah data dari filteredData / data, atau hitung langsung dari baris tabel HTML yang ada jika variabel state terpisah
    let totalData = 0;
    if (activeState.filteredData && Array.isArray(activeState.filteredData)) {
        totalData = activeState.filteredData.length;
    } else if (activeState.data && Array.isArray(activeState.data)) {
        totalData = activeState.data.length;
    } else {
        // Fallback pengaman: Hitung jumlah baris langsung dari tabel aktif di layar
        const activeTable = document.querySelector(".view-section:not(.hidden) table tbody, div[id^='view-']:not([style*='display: none']) table tbody");
        if (activeTable) {
            totalData = activeTable.querySelectorAll("tr").length;
        }
    }

    const rowsPerPage = activeState.rowsPerPage || 25;
    const totalPages = Math.max(1, Math.ceil(totalData / rowsPerPage));
    let currentPage = activeState.currentPage || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // 5. Render Desain Tombol Modern Tanpa Info Jumlah Data
    footer.innerHTML = `
        <button id="perm-btn-first" title="Halaman Pertama" style="min-width: 38px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #e5e7eb; background: #ffffff; color: #374151; font-weight: 600; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); ${currentPage <= 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${currentPage <= 1 ? 'disabled' : ''}>«</button>
        
        <button id="perm-btn-prev" style="height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid #e5e7eb; background: #ffffff; color: #374151; font-weight: 500; font-size: 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); ${currentPage <= 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${currentPage <= 1 ? 'disabled' : ''}>Prev</button>
        
        <div style="height: 38px; padding: 0 16px; display: flex; align-items: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-weight: 600; font-size: 14px; color: #1f2937; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            ${currentPage} <span style="color: #9ca3af; margin: 0 6px; font-weight: 400;">/</span> ${totalPages}
        </div>
        
        <button id="perm-btn-next" style="height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid #e5e7eb; background: #ffffff; color: #374151; font-weight: 500; font-size: 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); ${currentPage >= totalPages ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        
        <button id="perm-btn-last" title="Halaman Terakhir" style="min-width: 38px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #e5e7eb; background: #ffffff; color: #374151; font-weight: 600; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); ${currentPage >= totalPages ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${currentPage >= totalPages ? 'disabled' : ''}>»</button>
    `;

    // 6. Event Listener Tombol-tombol Navigasi
    document.getElementById("perm-btn-first").onclick = () => {
        if (activeState && activeState.currentPage > 1) {
            activeState.currentPage = 1;
            triggerTableRender();
        }
    };

    document.getElementById("perm-btn-prev").onclick = () => {
        if (activeState && activeState.currentPage > 1) {
            activeState.currentPage--;
            triggerTableRender();
        }
    };

    document.getElementById("perm-btn-next").onclick = () => {
        if (activeState && activeState.currentPage < totalPages) {
            activeState.currentPage++;
            triggerTableRender();
        }
    };

    document.getElementById("perm-btn-last").onclick = () => {
        if (activeState && activeState.currentPage < totalPages) {
            activeState.currentPage = totalPages;
            triggerTableRender();
        }
    };

    function triggerTableRender() {
        // Eksekusi fungsi render berdasarkan halaman aktif yang sedang dibuka
        const viewDashboard = document.getElementById("view-dashboard");
        const viewRekapSaldo = document.getElementById("view-rekapsaldo");
        const viewRincianMutasi = document.getElementById("view-rincianmutasi");

        if (viewDashboard && window.getComputedStyle(viewDashboard).display !== "none") {
            if (typeof window.renderDashboardTable === "function") window.renderDashboardTable();
        }
        else if (viewRekapSaldo && window.getComputedStyle(viewRekapSaldo).display !== "none") {
            if (typeof window.renderRekapSaldo === "function") window.renderRekapSaldo();
        }
        else if (viewRincianMutasi && window.getComputedStyle(viewRincianMutasi).display !== "none") {
            if (typeof window.renderRincian === "function") window.renderRincian();
        }

        // Segarkan tampilan footer paginasi
        window.initPermanentPaginationFooter();
    }
};

// Pastikan changePage juga terdaftar global
if (typeof window.changePage !== "function") {
    window.changePage = function (newPage) {
        const activeState = window.state || (typeof state !== 'undefined' ? state : null);
        if (!activeState) return;

        const totalRows = activeState.hasAppliedFilter ? activeState.filteredData.length : activeState.data.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / (activeState.rowsPerPage || 50)));

        let page = parseInt(newPage, 10) || 1;
        activeState.currentPage = Math.max(1, Math.min(page, totalPages));

        if (typeof window.renderDashboardTable === 'function') window.renderDashboardTable();
        if (typeof window.renderPaginationControls === 'function') window.renderPaginationControls();
    };
}

document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "select-all") {
        const selectAllCheckbox = event.target;

        window.state = window.state || {};
        window.state.selectedIds = window.state.selectedIds || [];

        const activeState = window.state;
        const dataSource = activeState.filteredData || activeState.data || [];
        const dataToRender = Array.isArray(dataSource) ? dataSource : [];

        const rowsPerPage = activeState.rowsPerPage || 50;
        const currentPage = activeState.currentPage || 1;

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        const pageIds = paginatedData
            .map(item => String(item.id || ''))
            .filter(Boolean);

        if (selectAllCheckbox.checked) {
            pageIds.forEach(id => {
                if (!window.state.selectedIds.includes(id)) {
                    window.state.selectedIds.push(id);
                }
            });
        } else {
            window.state.selectedIds = window.state.selectedIds.filter(id => !pageIds.includes(id));
        }

        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
    }
});

window.handleRowCheckboxChange = function (checkbox) {
    window.state = window.state || {};
    window.state.selectedIds = window.state.selectedIds || [];

    const id = String(checkbox.value);

    if (checkbox.checked) {
        if (!window.state.selectedIds.includes(id)) {
            window.state.selectedIds.push(id);
        }
    } else {
        window.state.selectedIds = window.state.selectedIds.filter(item => item !== id);
    }

    const selectAllCheckbox = document.getElementById("select-all");
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (selectAllCheckbox && rowCheckboxes.length > 0) {
        const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }
};

// ================================================================
// GET DATA UNTUK RENDER
// ================================================================

function getDataForRender() {
    if (state.hasAppliedFilter) {
        return Array.isArray(state.filteredData)
            ? state.filteredData
            : [];
    }

    return Array.isArray(state.data)
        ? state.data
        : [];
}

function getMasterListFromState(type) {
    if (type === "jenis_kayu") {
        return (
            state.master?.jenis_kayu ||
            []
        );
    }

    if (type === "tpk") {
        return (
            state.master?.tpk ||
            []
        );
    }

    return [];
}

window.addLhpRowModal = async function (item = null) {
    const container = document.getElementById("lhp-rows-container");
    if (!container) return;

    const index = container.children.length;
    const tr = document.createElement("tr");

    const initialKonversi = item ? (item.konversi || 0) : 0;

    tr.innerHTML = `
        <td style="padding:6px;border:1px solid #e2e8f0;">
            <input type="text" class="form-control lhp-petak-row" value="${item ? item.petak || '' : ''}" placeholder="Petak" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
        </td>
        <td style="padding:6px;border:1px solid #e2e8f0;">
            <select class="form-control lhp-jenis-kayu" onchange="window.onJenisKayuChange(this, ${index})" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
                <option value="">-- Pilih Jenis Kayu --</option>
            </select>
        </td>
        <td style="padding:6px;border:1px solid #e2e8f0;">
            <input type="number" step="0.01" class="form-control lhp-in-sm" oninput="window.calculateLhpRow(${index})" value="${item ? item.masuk_sm || 0 : 0}" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
        </td>
        <td style="padding:6px;border:1px solid #e2e8f0;">
            <input type="number" step="0.001" class="form-control lhp-faktor" oninput="window.onFaktorManualInput(${index})" value="${initialKonversi}" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;">
        </td>
        <td style="padding:6px;border:1px solid #e2e8f0;">
            <input type="number" step="0.01" class="form-control lhp-in-m3" value="${item ? item.masuk_m3 || 0 : 0}" readonly style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;background:#f8fafc;font-weight:bold;">
        </td>
        <td style="padding:6px;border:1px solid #e2e8f0; text-align:center;">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()" style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">X</button>
        </td>
    `;

    container.appendChild(tr);
    await window.loadJenisKayuOptionsForIndex(tr, item ? item.jenis_kayu : "", initialKonversi);
};

// ================================================================
// RENDER BARIS INPUT LHP (Hanya 1 Baris Awal)
// ================================================================

window.renderLhpInputRows =
    function (defaultPetak = "") {
        const container =
            document.getElementById(
                "lhp-rows-container"
            );

        if (!container) {
            return;
        }

        container.innerHTML = "";

        // Cukup render 1 baris awal saja saat modal dibuka
        window.addLhpRowModal({ petak: defaultPetak });
    };

// ================================================================
// MANUAL FAKTOR
// ================================================================

window.onFaktorManualInput =
    function (index) {
        const rows =
            document.querySelectorAll(
                "#lhp-rows-container tr"
            );

        if (!rows[index]) {
            return;
        }

        rows[index].dataset.editedByHand =
            "true";

        window.calculateLhpRow(index);
    };

// ================================================================
// HITUNG BARIS LHP
// ================================================================

window.calculateLhpRow =
    function (index) {
        const rows =
            document.querySelectorAll(
                "#lhp-rows-container tr"
            );

        if (!rows[index]) {
            return;
        }

        const row = rows[index];

        const selectJenis =
            row.querySelector(
                ".lhp-jenis-kayu"
            );

        const inputFaktor =
            row.querySelector(
                ".lhp-faktor"
            );

        const inputSM =
            row.querySelector(
                ".lhp-in-sm"
            );

        const inputM3 =
            row.querySelector(
                ".lhp-in-m3"
            );

        const sm =
            parseFloat(
                inputSM?.value
            ) || 0;

        const selectedOption =
            selectJenis?.options[
            selectJenis.selectedIndex
            ];

        if (
            selectedOption &&
            selectedOption.value
        ) {
            const faktorMaster =
                parseFloat(
                    selectedOption.dataset.konversi || selectedOption.dataset.faktor
                ) || 0;

            if (
                !row.dataset.editedByHand
            ) {
                if (inputFaktor) inputFaktor.value = faktorMaster;
            }
        } else {
            if (
                !row.dataset.editedByHand
            ) {
                if (inputFaktor) inputFaktor.value = "0.00";
            }
        }

        const faktor =
            parseFloat(
                inputFaktor?.value
            ) || 0;

        if (inputM3) {
            inputM3.value =
                (sm * faktor)
                    .toFixed(2);
        }
    };

// ================================================================
// OPEN LHP
// ================================================================

window.openLhpModal = function (initialData = {}) {
    const modal = document.getElementById("modal-lhp");
    if (!modal) {
        return;
    }

    const selectTPK = document.getElementById("modal-lhp-tpk");

    try {
        if (typeof getMasterListFromState === "function") {
            const masterTpk = getMasterListFromState("tpk");
            if (selectTPK && Array.isArray(masterTpk)) {
                selectTPK.innerHTML = `
                    <option value="">-- Pilih TPK --</option>
                ` + masterTpk.map(item => {
                    const nama = item.nama_tpk || item.nama || item.name || "";
                    return `<option value="${nama}">${nama}</option>`;
                }).join("");
            }
        }
    } catch (e) {
        console.warn("Gagal memuat master TPK:", e);
    }

    const container = document.getElementById("lhp-rows-container");
    if (container) {
        container.innerHTML = "";
    }

    if (typeof window.renderLhpInputRows === "function") {
        window.renderLhpInputRows(initialData.petak || "");
    }

    const idInput = document.getElementById("modal-lhp-id");
    const dateInput = document.getElementById("modal-lhp-date");
    const ketInput = document.getElementById("modal-lhp-ket");

    if (idInput) {
        idInput.value = initialData.id || "";
    }

    if (dateInput) {
        dateInput.value = initialData.tanggal || new Date().toISOString().split("T")[0];
        dateInput.classList.remove("hidden");
        dateInput.style.setProperty("display", "block", "important");
    }

    if (ketInput) {
        ketInput.value = initialData.keterangan || "LHP";
        ketInput.classList.remove("hidden");
        ketInput.style.setProperty("display", "block", "important");
    }

    if (selectTPK) {
        selectTPK.value = initialData.tpk || "";
        selectTPK.classList.remove("hidden");
        selectTPK.style.setProperty("display", "block", "important");
    }

    const submitBtn = modal.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.textContent = initialData.id ? "Update Data LHP" : "Simpan Data LHP";
    }

    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
};

window.loadJenisKayuOptionsForIndex = async function (rowElement, selectedVal = "", currentKonversi = 0) {
    // 🛡️ Pengaman untuk mencegah error jika baris sudah tidak ada di DOM
    if (!rowElement || !rowElement.parentNode) {
        return;
    }

    const client = initSupabase();
    if (!client) return;

    try {
        const { data, error } = await client
            .from("master_data")
            .select("name, konversi")
            .eq("type", "jenis_kayu")
            .order("name", { ascending: true });

        if (error) throw error;

        // Cek ulang apakah rowElement masih ada di DOM setelah proses async (await) selesai
        if (!rowElement || !rowElement.parentNode) {
            return;
        }

        const select = rowElement.querySelector(".lhp-jenis-kayu");
        const inputKonversi = rowElement.querySelector(".lhp-faktor");
        if (!select) return;

        select.innerHTML = '<option value="">-- Pilih Jenis Kayu --</option>';

        let masterKonversi = 0;
        if (data) {
            data.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item.name;
                opt.textContent = item.name;
                opt.setAttribute("data-konversi", item.konversi || 0);
                opt.setAttribute("data-faktor", item.konversi || 0);

                if (opt.value === selectedVal) {
                    opt.selected = true;
                    masterKonversi = item.konversi || 0;
                }
                select.appendChild(opt);
            });
        }

        if (inputKonversi) {
            const finalKonversi = (currentKonversi && currentKonversi != 0) ? currentKonversi : masterKonversi;
            inputKonversi.value = finalKonversi;
        }

        const index = Array.from(rowElement.parentNode.children).indexOf(rowElement);
        if (typeof window.calculateLhpRow === 'function' && index !== -1) {
            window.calculateLhpRow(index);
        }

    } catch (err) {
        console.error("Gagal memuat opsi jenis kayu untuk baris:", err);
    }
};

window.onJenisKayuChange = function (selectElement, index) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const konversiValue = selectedOption.getAttribute("data-konversi") || selectedOption.getAttribute("data-faktor") || 0;

    const row = selectElement.closest("tr");
    if (row) {
        row.dataset.editedByHand = ""; // Reset manual flag agar mengikuti master baru
        const inputKonversi = row.querySelector(".lhp-faktor");
        if (inputKonversi) {
            inputKonversi.value = konversiValue;
        }
        if (typeof window.calculateLhpRow === 'function') {
            window.calculateLhpRow(index);
        }
    }
};

window.editLhpItem = async function (data) {
    if (!data) return;

    const client = initSupabase();
    if (!client) {
        alert("Koneksi Supabase tidak ditemukan.");
        return;
    }

    try {
        const tanggalLhp = data.tanggal;
        const tpkLhp = data.tpk;
        const ketLhp = data.keterangan || data.ket || "LHP";

        const { data: groupData, error } = await client
            .from("stok_kayu")
            .select("*")
            .eq("tanggal", tanggalLhp)
            .eq("tpk", tpkLhp)
            .eq("keterangan", ketLhp)
            .order("id", { ascending: true });

        if (error) throw error;

        const itemsToEdit = (groupData && groupData.length > 0) ? groupData : [data];

        if (typeof window.openLhpModal === 'function') {
            window.openLhpModal({
                id: data.id,
                tanggal: tanggalLhp,
                keterangan: ketLhp,
                tpk: tpkLhp
            });
        }

        // --- TAMBAHKAN PENANDA DATA ASLI DI SINI ---
        const modalIdEl = document.getElementById("modal-lhp-id");
        if (modalIdEl) {
            modalIdEl.dataset.originalKet = ketLhp;
            modalIdEl.dataset.originalTgl = tanggalLhp;
            modalIdEl.dataset.originalTpk = tpkLhp;
        }
        // -------------------------------------------

        const container = document.getElementById("lhp-rows-container");
        if (container) {
            container.innerHTML = "";
        }

        for (const item of itemsToEdit) {
            await window.addLhpRowModal(item);
            const currentRow = container.lastElementChild;
            if (currentRow) {
                currentRow.setAttribute("data-id", item.id);
            }
        }

    } catch (err) {
        console.error("Gagal memuat detail LHP untuk diedit:", err);
        alert("Gagal membuka data LHP.");
    }
};

// ================================================================
// CLOSE LHP
// ================================================================

window.closeLhpModal =
    function () {
        const modal =
            document.getElementById(
                "modal-lhp"
            );

        if (modal) {
            modal.style.display =
                "none";

            modal.classList.add(
                "hidden"
            );
        }

        const form =
            document.getElementById(
                "form-modal-lhp"
            );

        if (form) {
            form.reset();
        }

        const id =
            document.getElementById(
                "modal-lhp-id"
            );

        if (id) {
            id.value = "";
        }
    };

// ================================================================
// SAVE LHP
// ================================================================
window.saveLhpFromModal = async function (event) {
    if (event) {
        event.preventDefault();
    }

    if (state.isSubmitting) {
        return;
    }

    const id = document.getElementById("modal-lhp-id")?.value || "";

    // Ambil nilai header LHP
    const tanggal = document.getElementById("modal-lhp-date")?.value || "";
    const keterangan = document.getElementById("modal-lhp-ket")?.value || "LHP";
    const tpk = document.getElementById("modal-lhp-tpk")?.value || "";

    if (!tanggal || !tpk) {
        alert("Harap pilih TPK dan tanggal terlebih dahulu.");
        return;
    }

    // Ambil nilai referensi lama sebelum diedit (untuk menghapus bundel LHP lama jika keterangan/tanggal/tpk diubah)
    const originalKet = document.getElementById("modal-lhp-id")?.dataset?.originalKet || keterangan;
    const originalTgl = document.getElementById("modal-lhp-id")?.dataset?.originalTgl || tanggal;
    const originalTpk = document.getElementById("modal-lhp-id")?.dataset?.originalTpk || tpk;

    const rows = document.querySelectorAll("#lhp-rows-container tr");
    const payloadList = [];

    rows.forEach(row => {
        const petak = row.querySelector(".lhp-petak-row")?.value.trim() || "-";
        const jenis = row.querySelector(".lhp-jenis-kayu")?.value || "";
        const masukSM = parseFloat(row.querySelector(".lhp-in-sm")?.value) || 0;
        const masukM3 = parseFloat(row.querySelector(".lhp-in-m3")?.value) || 0;

        if (jenis && masukSM > 0) {
            payloadList.push({
                tanggal,
                keterangan,
                tpk,
                petak,
                jenis_kayu: jenis,
                masuk_sm: masukSM,
                masuk_m3: masukM3,
                keluar_sm: 0,
                keluar_m3: 0
            });
        }
    });

    if (payloadList.length === 0) {
        alert("Pilih minimal 1 jenis kayu dan isi jumlah SM.");
        return;
    }

    const client = initSupabase();
    if (!client) {
        alert("Koneksi Supabase tidak ditemukan.");
        return;
    }

    state.isSubmitting = true;

    try {
        if (id) {
            // MODE EDIT MULTI-BARIS:
            // 1. Hapus semua baris lama yang tergabung dalam LHP tersebut berdasarkan data aslinya
            const { error: deleteError } = await client
                .from("stok_kayu")
                .delete()
                .eq("tanggal", originalTgl)
                .eq("keterangan", originalKet)
                .eq("tpk", originalTpk);

            if (deleteError) throw deleteError;

            // 2. Masukkan seluruh baris baru dari payloadList secara sekaligus (bulk insert)
            const { data, error: insertError } = await client
                .from("stok_kayu")
                .insert(payloadList)
                .select();

            if (insertError) throw insertError;

            alert("Data LHP berhasil diperbarui.");
        } else {
            // MODE TAMBAH BARU: Masukkan semua baris sekaligus
            const { data, error } = await client
                .from("stok_kayu")
                .insert(payloadList)
                .select();

            if (error) throw error;
            alert("Data LHP berhasil disimpan.");
        }

        window.closeLhpModal();

        if (typeof window.renderDashboardTable === 'function') {
            window.renderDashboardTable();
        }

    } catch (error) {
        console.error("Gagal menyimpan LHP:", error);
        alert("Gagal memproses data LHP: " + (error.message || error));
    } finally {
        state.isSubmitting = false;
    }
}