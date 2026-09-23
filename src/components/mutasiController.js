import { insertStokKayu } from '../services/api.js';
import { state } from '../state/store.js';
window.editData = async function (id) {
    const activeState = window.state || {};
    const dataList = activeState.hasAppliedFilter ? activeState.filteredData : (activeState.data || []);

    // Cari data berdasarkan ID
    const item = dataList.find(data => String(data.id || data.id_mutasi) === String(id));
    if (!item) {
        alert("Data tidak ditemukan.");
        return;
    }

    const ket = String(item.keterangan || item.ket || "").toUpperCase();

    // Jika termasuk LHP, panggil fungsi edit LHP
    if (ket.includes("LHP")) {
        if (typeof window.editLhpItem === "function") {
            window.editLhpItem(item);
        } else {
            console.error("Fungsi window.editLhpItem tidak ditemukan!");
            alert("Fungsi edit LHP belum terdaftar.");
        }
        return;
    }
    console.log("DATA ITEM:", item);

    // Jika bukan LHP, jalankan form mutasi biasa
    if (typeof window.loadMasterDropdowns === "function") {
        await window.loadMasterDropdowns();
    }

    const setElementValue = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.value = value;
    };
    // Ambil faktor konversi jika ada, atau default ke 1
    const faktor = parseFloat(item.konversi || item.faktor || 1) || 1;

    const masukM3 = parseFloat(item.masuk_m3 || item.masuk || 0);
    const keluarM3 = parseFloat(item.keluar_m3 || item.keluar || 0);

    // Hitung kembali ke SM (Meter Kubik / Faktor) jika ingin menampilkan SM
    const masukSm = faktor > 0 ? masukM3 / faktor : masukM3;
    const keluarSm = faktor > 0 ? keluarM3 / faktor : keluarM3;

    setElementValue("edit-id", id);
    setElementValue("input-date", item.tanggal || item.created_at || '');
    setElementValue("input-ket", item.keterangan || item.ket || '');
    setElementValue("input-jenis-kayu", item.jenis_kayu || item.jenis || '');
    setElementValue("input-tpk", item.tpk || '');
    setElementValue("input-petak", item.petak || '');

    // Ambil langsung nilai SM dari database
    setElementValue("input-in-sm", item.masuk_sm ?? item.masuk ?? 0);
    setElementValue("input-out-sm", item.keluar_sm ?? item.keluar ?? 0);

    const btnSubmit = document.getElementById("btn-submit");
    const btnCancel = document.getElementById("btn-cancel-edit");

    if (btnSubmit) {
        btnSubmit.textContent = "Update";
        btnSubmit.style.backgroundColor = "#2563eb";
    }
    if (btnCancel) {
        btnCancel.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 2. Pemantau Input Ket: Otomatis buka popup LHP saat mengetik "LHP" pada input baru


// 3. Fungsi Batal Edit
window.cancelEdit = function () {
    const form = document.getElementById("stock-form");
    if (form) form.reset();

    const editIdEl = document.getElementById("edit-id");
    if (editIdEl) editIdEl.value = "";

    const btnSubmit = document.getElementById("btn-submit");
    const btnCancel = document.getElementById("btn-cancel-edit");

    if (btnSubmit) {
        btnSubmit.textContent = "Simpan";
        btnSubmit.style.backgroundColor = "#065f46"; // Kembali hijau
    }
    if (btnCancel) {
        btnCancel.classList.add("hidden");
    }
};

export async function addData(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const payload = getMainFormPayload();

    if (!payload.tanggal || !payload.keterangan || !payload.jenis_kayu || !payload.tpk) {
        throw new Error("Mohon lengkapi data wajib.");
    }

    // 1. Simpan ke database
    const inserted = await insertStokKayu(payload);

    // 2. Panggil fetch data ulang secara diam-diam di background agar state terupdate mutlak
    if (typeof window.fetchData === "function") {
        await window.fetchData({ forceRefresh: true });
    }

    // 3. Render ulang tabel & perbarui dropdown
    if (typeof window.renderDashboardTable === "function") {
        window.renderDashboardTable();
    }
    if (typeof window.initSemuaFilter === "function") {
        window.initSemuaFilter();
    }
    if (typeof window.renderPaginationControls === "function") {
        window.renderPaginationControls();
    }

    return inserted;
}

// ================================================================
// UPDATE DATA
// ================================================================

export async function updateData(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const id = state.editingId;
    if (!id) {
        throw new Error("ID data edit tidak ditemukan.");
    }

    const payload = getMainFormPayload();
    const updated = await updateStokKayu(id, payload);

    state.updateItem(id, updated);
    state.editingId = null;

    if (typeof window.renderDashboardTable === "function") {
        window.renderDashboardTable();
    }

    // 🌟 TAMBAHKAN INI: Agar dropdown/filter ikut segar setelah data di-update
    if (typeof window.initSemuaFilter === "function") {
        window.initSemuaFilter();
    }

    return updated;
}

window.addData = addData;
window.updateData = updateData;

function getMainFormPayload() {
    const date = document.getElementById("input-date");
    const ket = document.getElementById("input-ket");
    const jenis = document.getElementById("input-jenis-kayu");
    const tpk = document.getElementById("input-tpk");
    const petak = document.getElementById("input-petak");
    const masuk = document.getElementById("input-in-sm");
    const keluar = document.getElementById("input-out-sm");

    const jenisText = jenis?.options[jenis.selectedIndex]?.text || jenis?.value || "";
    const tpkText = tpk?.options[tpk.selectedIndex]?.text || tpk?.value || "";

    const masukSM = parseFloat(masuk?.value || 0) || 0;
    const keluarSM = parseFloat(keluar?.value || 0) || 0;

    const faktor = getFaktorKonversi(jenisText) || getFaktorKonversi(jenis?.value);

    return {
        tanggal: date?.value || "",
        keterangan: ket?.value || "",
        jenis_kayu: jenisText,
        tpk: tpkText,
        petak: petak?.value || "",
        masuk_sm: masukSM,
        masuk_m3: smToM3(masukSM, faktor),
        keluar_sm: keluarSM,
        keluar_m3: smToM3(keluarSM, faktor)
    };
}

// ================================================================
// POPULATE FORM EDIT (Lengkap dan Tersinkronisasi)
// ================================================================

function populateMainForm(item) {
    state.editingId = item.id;

    const editId = document.getElementById("edit-id");
    const date = document.getElementById("input-date");
    const ket = document.getElementById("input-ket");
    const jenis = document.getElementById("input-jenis-kayu");
    const tpk = document.getElementById("input-tpk");
    const petak = document.getElementById("input-petak");
    const masuk = document.getElementById("input-in-sm");
    const keluar = document.getElementById("input-out-sm");

    if (editId) editId.value = item.id || "";
    if (date) date.value = item.tanggal || "";
    if (ket) ket.value = item.keterangan || item.ket || "";
    if (petak) petak.value = item.petak || "";
    if (masuk) masuk.value = item.masuk_sm || 0;
    if (keluar) keluar.value = item.keluar_sm || 0;

    if (jenis) {
        jenis.value = item.jenis_kayu || "";
        if (jenis.selectedIndex === -1 && item.jenis_kayu) {
            for (let opt of jenis.options) {
                if (opt.text.toLowerCase() === item.jenis_kayu.toLowerCase() || opt.value.toLowerCase() === item.jenis_kayu.toLowerCase()) {
                    jenis.value = opt.value;
                    break;
                }
            }
        }
    }

    if (tpk) {
        tpk.value = item.tpk || "";
        if (tpk.selectedIndex === -1 && item.tpk) {
            for (let opt of tpk.options) {
                if (opt.text.toLowerCase() === item.tpk.toLowerCase() || opt.value.toLowerCase() === item.tpk.toLowerCase()) {
                    tpk.value = opt.value;
                    break;
                }
            }
        }
    }

    // Munculkan tombol Update dan Batal saat mode edit aktif
    const btnSubmit = document.getElementById("btn-submit");
    const btnCancel = document.getElementById("btn-cancel-edit");

    if (btnSubmit) {
        btnSubmit.textContent = "Update";
        btnSubmit.style.backgroundColor = "#2563eb";
    }
    if (btnCancel) {
        btnCancel.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

