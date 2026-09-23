import { state } from '../state/store.js';
import { initSupabase } from '../services/api.js';
import { showLoading } from '../utils/helpers.js';

window.openMasterModal = async function (type) {
    console.log("Type yang dipanggil ke Supabase:", type);

    state.currentMasterType = type;

    // Ubah judul form berdasarkan jenis yang aktif
    const titleEl = document.getElementById("modal-title");
    const thFaktor = document.getElementById("th-faktor");

    if (titleEl) {
        titleEl.textContent = type === 'jenis_kayu' ? 'Kelola Master Jenis Kayu' : 'Kelola Master TPK';
    }

    // Sembunyikan atau ubah teks kolom faktor jika sedang membuka TPK
    if (thFaktor) {
        thFaktor.style.display = type === 'tpk' ? 'none' : '';
    }

    try {
        const { data, error } = await supabaseClient
            .from('master_data') 
            .select('*')
            .eq('type', type)    
            .order('name', { ascending: true });

        if (error) throw error;

        // Simpan ke state agar renderMasterList bisa membaca datanya
        if (!state.master) state.master = {};
        state.master[type] = data || [];

        // Panggil render master list
        window.renderMasterList();

    } catch (err) {
        console.error("Gagal memuat master data:", err.message);
    }
};

export function closeMasterModal() {
    // Langsung targetkan elemen utama #view-masterdata
    const overlay = document.getElementById('view-masterdata');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.setProperty('display', 'none', 'important');
    }

    if (typeof window.switchView === "function") {
        window.switchView('dashboard');
    }
}
window.closeMasterModal = closeMasterModal;
// ================================================================
// SIMPAN / TAMBAH ITEM MASTER DATA
// ================================================================

window.saveMasterItem = async function () {
    const type = state.currentMasterType || 'jenis_kayu';
    const nameInput = document.getElementById('master-input-name');
    const konversiInput = document.getElementById('master-input-konversi');

    const nameValue = nameInput ? nameInput.value.trim() : '';
    const konversiValue = konversiInput ? parseFloat(konversiInput.value) || 1 : 1;

    if (!nameValue) {
        alert("Nama tidak boleh kosong!");
        return;
    }

    try {
        showLoading(true);
        const client = initSupabase();
        if (!client) throw new Error("Client Supabase belum siap!");

        const payload = {
            type: type,
            name: nameValue,
            konversi: type === 'tpk' ? 1 : konversiValue
        };

        const { data, error } = await client
            .from('master_data')
            .insert([payload])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            if (!state.master) state.master = {};
            if (!state.master[type]) state.master[type] = [];
            state.master[type].push(data[0]);
            // Urutkan ulang berdasarkan nama
            state.master[type].sort((a, b) => a.name.localeCompare(b.name));
        }

        // Reset Form Input
        if (nameInput) nameInput.value = '';
        if (konversiInput) konversiInput.value = '';

        window.renderMasterList();
        if (typeof window.loadMasterDropdowns === "function") {
            window.loadMasterDropdowns();
        }

        alert("Data master berhasil ditambahkan!");
    } catch (err) {
        console.error("Gagal menyimpan master:", err);
        alert("Gagal menyimpan: " + (err.message || err));
    } finally {
        showLoading(false);
    }
};

// ================================================================
// RENDER & MANIPULASI DATA MASTER
// ================================================================

window.renderMasterList = function () {
    const listEl = document.getElementById('master-list-body') || document.getElementById('master-list');
    const type = state.currentMasterType || 'jenis_kayu';
    const thFaktor = document.getElementById('th-faktor');
    const isTPK = (type === 'tpk');

    if (!listEl) return;
    if (thFaktor) thFaktor.style.display = isTPK ? 'none' : 'table-cell';

    const masterData = (state.master && state.master[type]) ? state.master[type] : [];

    if (masterData.length === 0) {
        listEl.innerHTML = `<tr><td colspan="${isTPK ? 3 : 4}" class="text-center" style="padding:15px; color:#888;">Tidak ada data</td></tr>`;
        return;
    }

    listEl.innerHTML = masterData.map((item, index) => `
        <tr>
            <td style="padding:8px; text-align:center;">${index + 1}</td>
            <td style="padding:8px;">${item.name}</td>
            ${!isTPK ? `<td style="padding:8px; text-align:center;">${item.konversi || 1}</td>` : ''}
            <td style="padding:8px; text-align:center;">
                <button type="button" onclick="deleteMasterItem('${item.id}')" style="background:none; border:none; cursor:pointer;" title="Hapus">🗑️</button>
            </td>
        </tr>
    `).join('');
};

window.deleteMasterItem = async function (id) {
    const type = state.currentMasterType || 'jenis_kayu';
    if (!confirm(`Hapus item ini dari master ${type}?`)) return;

    try {
        showLoading(true);
        const client = initSupabase();
        if (!client) throw new Error("Client Supabase belum siap!");

        const { error } = await client.from('master_data').delete().eq('id', id);
        if (error) throw error;

        if (state.master && state.master[type]) {
            state.master[type] = state.master[type].filter(item => item.id != id);
        }
        window.renderMasterList();
        if (typeof window.loadMasterDropdowns === "function") {
            window.loadMasterDropdowns();
        }
        alert("Data berhasil dihapus!");
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    } finally {
        showLoading(false);
    }
};
window.renderMasterData = function () {
    const stateMaster = window.state?.master || {};

    // Contoh render untuk tabel Jenis Kayu (sesuaikan ID elemen tabel di masterdata.html Anda)
    const tbodyJenis = document.getElementById('table-jenis-kayu-body');
    if (tbodyJenis) {
        tbodyJenis.innerHTML = '';
        const listJenis = stateMaster.jenis_kayu || [];
        if (listJenis.length === 0) {
            tbodyJenis.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Belum ada data jenis kayu.</td></tr>`;
        } else {
            listJenis.forEach((item, index) => {
                tbodyJenis.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.name || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deleteMasterItem('${item.id}', 'jenis_kayu')">Hapus</button>
                        </td>
                    </tr>`;
            });
        }
    }

    // Contoh render untuk tabel TPK (sesuaikan ID elemen tabel di masterdata.html Anda)
    const tbodyTpk = document.getElementById('table-tpk-body');
    if (tbodyTpk) {
        tbodyTpk.innerHTML = '';
        const listTpk = stateMaster.tpk || [];
        if (listTpk.length === 0) {
            tbodyTpk.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Belum ada data TPK.</td></tr>`;
        } else {
            listTpk.forEach((item, index) => {
                tbodyTpk.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.name || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deleteMasterItem('${item.id}', 'tpk')">Hapus</button>
                        </td>
                    </tr>`;
            });
        }
    }

    console.log("Tabel Master Data berhasil dirender.");
};

window.loadDataMaster = async function () {
    try {
        const client = initSupabase();
        if (!client) return;

        // Ambil data master jenis_kayu dari tabel master_data
        const { data: jenisKayuData, error: errJenis } = await client
            .from('master_data')
            .select('*')
            .eq('type', 'jenis_kayu')
            .order('name', { ascending: true });

        if (errJenis) {
            console.error("Gagal memuat jenis kayu:", errJenis.message);
        } else if (typeof window.state?.setMasterData === "function") {
            window.state.setMasterData('jenis_kayu', jenisKayuData || []);
        } else {
            if (!state.master) state.master = {};
            state.master.jenis_kayu = jenisKayuData || [];
        }

        // Ambil data master tpk dari tabel master_data
        const { data: tpkData, error: errTpk } = await client
            .from('master_data')
            .select('*')
            .eq('type', 'tpk')
            .order('name', { ascending: true });

        if (errTpk) {
            console.error("Gagal memuat TPK:", errTpk.message);
        } else if (typeof window.state?.setMasterData === "function") {
            window.state.setMasterData('tpk', tpkData || []);
        } else {
            if (!state.master) state.master = {};
            state.master.tpk = tpkData || [];
        }

        // Perbarui tampilan dropdown di form utama
        if (typeof window.loadMasterDropdowns === "function") {
            window.loadMasterDropdowns();
        }

    } catch (error) {
        console.error("Terjadi kesalahan saat mengambil master data:", error);
    }
};

// Membuka modal master data berdasarkan tipe ('jenis_kayu' atau 'tpk')
export async function openMasterModal(type = 'jenis_kayu') {
    const modal = document.getElementById('view-masterdata');
    if (!modal) {
        console.error("Elemen modal master data tidak ditemukan di DOM!");
        return;
    }

    // Simpan tipe aktif ke state
    if (window.state) {
        window.state.currentMasterType = type;
    }

    // Ubah judul & visibilitas input faktor konversi
    const modalTitle = document.getElementById('modal-title');
    const inputKonversi = document.getElementById('master-input-konversi');
    const thFaktor = document.getElementById('th-faktor');

    if (type === 'jenis_kayu') {
        if (modalTitle) modalTitle.textContent = 'Kelola Master Jenis Kayu';
        if (inputKonversi) inputKonversi.style.display = 'block';
        if (thFaktor) thFaktor.style.display = '';
    } else {
        if (modalTitle) modalTitle.textContent = 'Kelola Master TPK';
        if (inputKonversi) inputKonversi.style.display = 'none';
        if (thFaktor) thFaktor.style.display = 'none';
    }

    // Paksa tampilkan modal dengan menghapus class hidden dan override display flex
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');

    // Ambil data terbaru dari database terlebih dahulu, lalu render tabelnya
    if (typeof window.loadDataMaster === 'function') {
        await window.loadDataMaster();
    }

    // Pastikan render list terpanggil setelah data siap
    if (typeof window.renderMasterList === 'function') {
        window.renderMasterList();
    }
}

window.openMasterModal = openMasterModal;
// Menutup modal master data
window.closeMasterModal = function () {
    const modal = document.getElementById('view-masterdata');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.style.display = 'none';

    // Reset form input
    const inputName = document.getElementById('master-input-name');
    const inputKonversi = document.getElementById('master-input-konversi');
    if (inputName) inputName.value = '';
    if (inputKonversi) inputKonversi.value = '';

    if (window.state) {
        window.state.editingId = null;
    }
};

// Render baris data ke dalam tabel modal
window.renderMasterTable = function () {
    const tbody = document.getElementById('master-list-body');
    if (!tbody) return;

    const currentType = window.state?.currentMasterType || 'jenis_kayu';
    const items = window.state?.master?.[currentType] || [];

    // Ambil referensi elemen header faktor agar bisa disembunyikan/ditampilkan
    const thFaktor = document.getElementById('th-faktor');
    if (thFaktor) {
        thFaktor.style.display = currentType === 'jenis_kayu' ? '' : 'none';
    }

    tbody.innerHTML = '';

    if (items.length === 0) {
        const colSpan = currentType === 'jenis_kayu' ? 4 : 3;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted">Belum ada data master.</td></tr>`;
        return;
    }

    items.forEach((item, index) => {
        const tr = document.createElement('tr');

        let faktorColumn = '';
        if (currentType === 'jenis_kayu') {
            faktorColumn = `<td class="text-center">${item.konversi || 1}</td>`;
        }

        tr.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.name || ''}</td>
            ${faktorColumn}
            <td class="text-center">
                <button type="button" class="btn-sm btn-danger" onclick="deleteMasterItem('${item.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.loadMasterDropdowns = function () {
    const jenisKayuData = window.state?.master?.jenis_kayu || [];
    const tpkData = window.state?.master?.tpk || [];

    // Ambil SEMUA elemen select di halaman
    const allSelects = document.querySelectorAll('select');

    allSelects.forEach(select => {
        const nameAttr = (select.getAttribute('name') || '').toLowerCase();
        const idAttr = (select.id || '').toLowerCase();
        const firstOptText = select.options.length > 0 ? select.options[0].text.toLowerCase() : '';

        // Deteksi apakah select ini adalah Jenis Kayu
        if (nameAttr.includes('kayu') || idAttr.includes('kayu') || firstOptText.includes('kayu')) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih Jenis Kayu --</option>';
            jenisKayuData.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = item.name;
                select.appendChild(opt);
            });
            select.value = currentValue;
        }

        // Deteksi apakah select ini adalah TPK
        if (nameAttr.includes('tpk') || idAttr.includes('tpk') || firstOptText.includes('tpk')) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih TPK --</option>';
            tpkData.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = item.name;
                select.appendChild(opt);
            });
            select.value = currentValue;
        }
    });
};

window.loadMasterDropdowns = loadMasterDropdowns;