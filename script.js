// HELPER: Menghilangkan -0.00 dan memformat angka ke 2 desimal
const formatSaldo = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "0.00";
    const rounded = Math.round(Number(val) * 100) / 100 + 0;
    return rounded.toFixed(2);
};

// 1. KREDENSIAL SUPABASE
const SUPABASE_URL = "https://fcccuqnyxuwsrddlookt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjY2N1cW55eHV3c3JkZGxvb2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDU2NzQsImV4cCI6MjA4NTQyMTY3NH0.w9p0yxWW1CtLm3Gj3uD1z3P1eWQxW_hB288iUwkfCd8";

let supabase = null;
let api = (typeof window !== 'undefined' && window.supabase) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
    : null;

if (api) window.supabaseApi = api;

// 2. State Management
let state = {
    isLoggedIn: localStorage.getItem("sadhana_auth") === "true",
    view: 'dashboard',
    config: {
        user: "Admin",
        pass: "sadhana-234"
    },
    data: [],
    master: {
        "jenis_kayu": [],
        "tpk": []
    },
    konversiKayu: {},
    tempMasterType: null,
    currentMasterType: null,
    currentPage: 1,
    rowsPerPage: 50,
    filteredData: [],
    totalRows: 0,
    hasAppliedFilter: false
};

window.state = state;

// HELPER LOADING
function showLoading(isLoading) {
    const loader = document.getElementById('loading-overlay');
    if (loader) isLoading ? loader.classList.remove('hidden') : loader.classList.add('hidden');
}

// HELPER KONVERSI
function hitungKonversi(jenisKayu, volumeM3) {
    if (!window.state || !window.state.konversiKayu) return volumeM3;
    const faktor = window.state.konversiKayu[jenisKayu] || 1;
    return volumeM3 * faktor;
}

// --- FUNGSI MASTER DATA ---
window.openMasterModal = async function (type) {
    state.currentMasterType = type;
    
    const modal = document.getElementById('master-modal');
    const title = document.getElementById('modal-title');
    const listEl = document.getElementById('master-list-body');
    const konversiInput = document.getElementById('master-input-konversi');

    const titleHeader = document.querySelector('.main-header h2, #current-view-title');
    if (titleHeader) {
        titleHeader.innerText = (type === 'tpk') ? 'MASTER TPK' : 'MASTER JENIS KAYU';
    }

    if (!modal || !listEl) return;

    const isTPK = (type === 'tpk');

    if (title) {
        title.innerText = isTPK ? 'Kelola Master TPK' : 'Kelola Master Jenis Kayu';
    }

    if (konversiInput) {
        konversiInput.style.display = isTPK ? 'none' : 'block';
    }

    listEl.innerHTML = `<tr><td colspan="${isTPK ? 3 : 4}" class="text-center">Memuat data...</td></tr>`;
    modal.classList.remove('hidden');

    try {
        const { data, error } = await api
            .from('master_data')
            .select('*')
            .eq('type', type)
            .order('name', { ascending: true });

        if (error) throw error;

        if (!state.master) state.master = {};
        state.master[type] = data;

        renderMasterList();
    } catch (err) {
        console.error("Gagal load master:", err.message);
        listEl.innerHTML = `<tr><td colspan="${isTPK ? 3 : 4}" class="text-center" style="color:red;">Gagal memuat data</td></tr>`;
    }
};

window.showMasterModal = function (type) {
    window.openMasterModal(type);
};

window.closeMasterModal = function () {
    const modal = document.getElementById('master-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    const titleHeader = document.querySelector('.main-header h2, #current-view-title');
    if (titleHeader && state.view) {
        const names = {
            'dashboard': 'KARTU STOK',
            'rekap': 'REKAPITULASI SALDO',
            'rekap-saldo': 'REKAPITULASI SALDO',
            'rekap-rincian': 'RINCIAN MUTASI KAYU',
            'kelola-sandi': 'PENGATURAN',
            'backup-setting': 'PENGATURAN'
        };
        titleHeader.innerText = names[state.view] || 'KARTU STOK';
    }
};

window.handleMasterSubmit = async function (event) {
    event.preventDefault();

    const type = state.currentMasterType;
    const nameInput = document.getElementById('master-input-nama');
    const konversiInput = document.getElementById('master-input-konversi');

    const nameVal = nameInput ? nameInput.value.trim() : '';
    const konversiVal = (type === 'tpk') ? null : (parseFloat(konversiInput.value) || 1);

    if (!nameVal) {
        alert("Nama tidak boleh kosong!");
        return;
    }

    try {
        if (typeof showLoading === 'function') showLoading(true);

        const payload = {
            type: type,
            name: nameVal,
            konversi: konversiVal
        };

        const { error } = await api
            .from('master_data')
            .insert([payload]);

        if (error) throw error;

        nameInput.value = '';
        if (konversiInput) konversiInput.value = '1';

        await window.openMasterModal(type);
        alert("Data berhasil disimpan!");

    } catch (err) {
        console.error("Gagal menyimpan master data:", err);
        alert("Gagal menyimpan data: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};

window.renderMasterList = function () {
    const listEl = document.getElementById('master-list-body') || document.getElementById('master-list');
    const type = state.currentMasterType;
    const thFaktor = document.getElementById('th-faktor');
    const isTPK = (type === 'tpk');

    if (!listEl) return;

    if (thFaktor) {
        thFaktor.style.display = isTPK ? 'none' : 'table-cell';
    }

    const masterData = (state.master && state.master[type]) ? state.master[type] : [];

    if (masterData.length === 0) {
        listEl.innerHTML = `<tr><td colspan="${isTPK ? 3 : 4}" class="text-center" style="padding:10px; color:#888;">Tidak ada data</td></tr>`;
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
    const type = state.currentMasterType;
    if (!type) return;
    if (!confirm(`Hapus item ini dari master ${type}?`)) return;

    try {
        if (typeof showLoading === 'function') showLoading(true);
        
        const { error } = await api
            .from('master_data')
            .delete()
            .eq('id', id);

        if (error) throw error;

        state.master[type] = state.master[type].filter(item => item.id != id);

        renderMasterList();

        if (type === 'tpk' && typeof renderTPKDropdown === 'function') renderTPKDropdown();
        if (type !== 'tpk' && typeof renderJenisKayuDropdown === 'function') renderJenisKayuDropdown();

        alert("Data berhasil dihapus!");
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};

function renderDashboardTable(dataToRender = null) {
    const tableBody = document.getElementById("main-table-body");
    if (!tableBody) return;

    const data = dataToRender || (state.filteredData && state.filteredData.length > 0 ? state.filteredData : state.data);
    state.filteredData = data;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada data ditemukan</td></tr>';
        if (typeof renderPaginationControls === 'function') {
            renderPaginationControls();
        }
        return;
    }

    const isNoPagination = (state.view === 'kelola-sandi' || state.view === 'backup-setting');

    let paginatedData;
    if (isNoPagination) {
        paginatedData = data;
    } else {
        const startIndex = (state.currentPage - 1) * state.rowsPerPage;
        const endIndex = startIndex + state.rowsPerPage;
        paginatedData = data.slice(startIndex, endIndex);
    }

    tableBody.innerHTML = paginatedData.map(d => `
        <tr>
            <td class="text-center">
                <input type="checkbox" class="row-checkbox" value="${d.id}">
            </td>
            <td>${d.tanggal || '-'}</td>
            <td>${d.keterangan || '-'}</td>
            <td>${d.jenis_kayu || '-'}</td>
            <td>${d.tpk || '-'}</td>
            <td>${d.petak || '-'}</td>
            <td class="text-right">${typeof formatSaldo === 'function' ? formatSaldo(d.masuk_m3) : (d.masuk_m3 || '0.00')}</td>
            <td class="text-right">${typeof formatSaldo === 'function' ? formatSaldo(d.keluar_m3) : (d.keluar_m3 || '0.00')}</td>
            <td>
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button type="button" onclick="event.stopPropagation(); window.editData('${d.id}')" class="btn-action" title="Edit">✏️</button>
                    <button type="button" onclick="event.stopPropagation(); window.deleteData('${d.id}')" class="btn-action btn-danger" title="Hapus">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    const container = document.getElementById("pagination-container");
    if (container) {
        container.style.display = isNoPagination ? "none" : "block";
    }

    if (!isNoPagination && typeof renderPaginationControls === 'function') {
        renderPaginationControls();
    }
}

window.renderPaginationControls = function () {
    const container = document.getElementById("pagination-container");
    if (!container) return;

    const totalRows = state.totalRows !== undefined && state.totalRows !== 0 ? state.totalRows : (state.data?.length || 0);
    const rowsPerPage = state.rowsPerPage || 25;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    const currentPage = state.currentPage || 1;

    let html = `
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; padding:12px 0;">
            <button class="btn-page" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
            <button class="btn-page" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
            
            <span style="font-size: 0.9rem; font-weight: 500; margin: 0 8px;">
                Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong> (Total <strong>${totalRows}</strong> data)
            </span>
            
            <button class="btn-page" onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
            <button class="btn-page" onclick="changePage(${totalPages})" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>
        </div>
    `;
    
    container.innerHTML = html;
};

window.changePage = async function (page) {
    const totalRows = state.totalRows || state.data?.length || 0;
    const rowsPerPage = state.rowsPerPage || 10;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

    if (page < 1 || (totalPages > 0 && page > totalPages)) return;

    state.currentPage = page;

    if (typeof loadDataRincianMutasi === 'function' && state.view === 'rekap-rincian') {
        await loadDataRincianMutasi();
    } else if (typeof fetchData === 'function') {
        renderDashboardTable();
    }

    const wrapper = document.querySelector('.tabel-wrapper') || document.querySelector('.table-responsive');
    if (wrapper) {
        wrapper.scrollTop = 0;
    }
};

function updateYearDropdowns() {
    const yearSelectIds = ['filter-rekap-tahun', 'filter-dari-tahun', 'filter-sampai-tahun'];
    const currentYear = new Date().getFullYear();
    let options = '<option value="">Pilih Tahun</option>';
    for (let y = currentYear; y >= 2016; y--) options += `<option value="${y}">${y}</option>`;
    yearSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}

function render() {
    const masterData = state.master;
    const sumberData = state.data || [];

    const listEl = document.getElementById("master-list");
    if (listEl && state.tempMasterType) {
        const items = masterData[state.tempMasterType] || [];
        listEl.innerHTML = items.map(item => `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;">${item.name}</td>
                <td style="text-align:right;">
                    <button onclick="deleteMaster('${item.id}', '${state.tempMasterType}')" style="color:red; border:none; background:none; cursor:pointer;">Hapus</button>
                </td>
            </tr>
        `).join('');
    }
}

function loadMasterToSelect() {
    try {
        const rawData = localStorage.getItem('masterData');
        const masterData = rawData ? JSON.parse(rawData) : { jenis: [], tpk: [] };

        const elJenis = document.getElementById('jenis');
        const elTPK = document.getElementById('tpk');

        if (elJenis && masterData.jenis) {
            let html = '<option value="">Pilih...</option>';
            masterData.jenis.forEach(item => {
                html += `<option value="${item}">${item}</option>`;
            });
            elJenis.innerHTML = html;
        }

        if (elTPK && masterData.tpk) {
            let html = '<option value="">Pilih...</option>';
            masterData.tpk.forEach(item => {
                const nama = typeof item === 'object' ? item.nama : item;
                html += `<option value="${nama}">${nama}</option>`;
            });
            elTPK.innerHTML = html;
        }
    } catch (err) {
        console.warn("Gagal memuat Master Data ke Select, tapi aplikasi tetap jalan.", err);
    }
}

function initEventListeners() {
    const filterTPK = document.getElementById("filter-rincian-tpk");
    const filterJenis = document.getElementById("filter-rincian-jenis");
    const searchKet = document.getElementById("filter-rincian-ket");

    if (filterTPK) filterTPK.addEventListener("change", applyRincianFilters);
    if (filterJenis) filterJenis.addEventListener("change", applyRincianFilters);
    if (searchKet) searchKet.addEventListener("input", initLiveSearch);
}

window.initLiveSearchDashboard = function () {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();

        const filtered = state.data.filter(d => {
            const matchKet = (d.keterangan || "").toLowerCase().includes(searchTerm);
            const matchJenis = (d.jenis_kayu || "").toLowerCase().includes(searchTerm);
            const matchTPK = (d.tpk || "").toLowerCase().includes(searchTerm);
            const matchPetak = (d.petak || "").toLowerCase().includes(searchTerm);
            return matchKet || matchJenis || matchTPK || matchPetak;
        });

        state.currentPage = 1;
        renderDashboardTable(filtered);
    });
};

window.initSemuaFilter = function () {
    if (!state.data || state.data.length === 0) return;

    const daftarTPK = [...new Set(state.data.map(d => d.tpk ? String(d.tpk).trim() : null).filter(Boolean))].sort();

    const idsTPK = [
        { tpkId: 'filter-tpk', petakId: 'filter-petak' },
        { tpkId: 'filter-rincian-tpk', petakId: 'filter-rincian-petak' }
    ];

    idsTPK.forEach(item => {
        const el = document.getElementById(item.tpkId);
        if (el) {
            el.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                daftarTPK.map(t => `<option value="${t}">${t}</option>`).join('');

            el.onchange = function () {
                window.updatePetakByTPK(item.tpkId, item.petakId);
            };
        }
    });

    const daftarTahun = [...new Set(state.data.map(d => {
        return d.tanggal ? String(d.tanggal).split('-')[0].trim() : null;
    }).filter(Boolean))].sort((a, b) => b - a);

    const idsTahun = ['filter-dari-tahun', 'filter-sampai-tahun', 'filter-rincian-tahun-dari', 'filter-rincian-tahun-sampai'];
    idsTahun.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = false;
            el.innerHTML = '<option value="">-- Tahun --</option>' +
                daftarTahun.map(th => `<option value="${th}">${th}</option>`).join('');
        }
    });
};

window.updatePetakByTPK = function (tpkSelectId = 'filter-tpk', petakSelectId = 'filter-petak') {
    const tpkEl = document.getElementById(tpkSelectId);
    const petakEl = document.getElementById(petakSelectId);

    if (!petakEl) return;

    const cleanString = (str) => String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();

    const rawVal = tpkEl ? tpkEl.value : '';
    const rawText = (tpkEl && tpkEl.selectedIndex >= 0) ? tpkEl.options[tpkEl.selectedIndex].text : '';

    const selectedVal = cleanString(rawVal);
    const selectedText = cleanString(rawText);

    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';

    const dataSource = state.data || state.rekapData || state.mutasiData || [];

    if (!selectedVal || dataSource.length === 0) {
        petakEl.disabled = true;
        return;
    }

    const matchingData = dataSource.filter(d => {
        if (!d.tpk) return false;
        const dbTPK = cleanString(d.tpk);
        return dbTPK === selectedVal || (selectedText !== '' && dbTPK === selectedText);
    });

    const uniquePetaks = [...new Set(
        matchingData
            .map(d => d.petak ? String(d.petak).trim() : '')
            .filter(p => p !== '' && p !== '-' && p !== 'undefined' && p !== 'null')
    )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (uniquePetaks.length > 0) {
        uniquePetaks.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            petakEl.appendChild(opt);
        });
        
        petakEl.disabled = false;
        petakEl.removeAttribute('disabled');
    } else {
        petakEl.disabled = true;
    }
};

window.updatePetakRincianByTPK = function () {
    window.updatePetakByTPK('filter-rincian-tpk', 'filter-rincian-petak');
};

let isAppInitializing = false;

async function startApp() {
    if (isAppInitializing) return;

    try {
        isAppInitializing = true;
        if (typeof showLoading === 'function') showLoading(true);

        if (!api && window.supabase) {
            api = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            supabase = api;
        }

        if (!api) {
            throw new Error("Gagal menginisialisasi Supabase Client. Periksa koneksi atau library CDN Supabase.");
        }

        await Promise.all([
            typeof loadDataMaster === 'function' ? loadDataMaster() : Promise.resolve(),
            typeof loadDataRincianMutasi === 'function' ? loadDataRincianMutasi() : Promise.resolve()
        ]);

        if (typeof window.initLiveSearchDashboard === 'function') {
            window.initLiveSearchDashboard();
        }

    } catch (err) {
        console.error("❌ Gagal memulai aplikasi:", err.message || err);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
        isAppInitializing = false;
    }
}

function renderFilterSaldo() {
    const elFilterJenisSaldo = document.getElementById('filter-jenis');

    if (elFilterJenisSaldo) {
        const masterJenis = state.master.jenis_kayu || [];

        elFilterJenisSaldo.innerHTML = '<option value="">-- Semua Jenis --</option>' +
            masterJenis.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }
}

async function loadDataMaster() {
    try {
        const { data, error } = await api.from('master_data').select('*');
        if (error) throw error;

        state.master.jenis_kayu = data.filter(d => d.type === 'jenis_kayu' || d.type === 'jenis-kayu');
        state.master.tpk = data.filter(d => d.type === 'tpk');

        state.konversiKayu = {};
        state.master.jenis_kayu.forEach(item => {
            const namaJenis = item.nama || item.nilai || item.name || item.jenis_kayu;
            const faktor = parseFloat(item.faktor_konversi || item.konversi || 1);

            if (namaJenis) {
                state.konversiKayu[namaJenis] = faktor;
            }
        });

        renderAllDropdowns();
        renderFilterSaldo();

        if (window.sinkronisasiFilterRincian) window.sinkronisasiFilterRincian();

    } catch (err) {
        console.error("❌ Gagal render dropdown master:", err.message);
    }
}

function renderTPKDropdown() {
    const select = document.getElementById("input-tpk");
    const filterRincianTPK = document.getElementById("filter-rincian-tpk");
    if (!select) return;

    const listTPK = state.master["tpk"] || [];
    const options = listTPK.map(item => `<option value="${item.name}">${item.name}</option>`).join("");

    select.innerHTML = '<option value="">-- Pilih TPK --</option>' + options;

    if (filterRincianTPK) {
        filterRincianTPK.innerHTML = '<option value="">-- Semua TPK --</option>' + options;
    }
}

function renderAllDropdowns() {
    renderTPKDropdown();
    renderJenisKayuDropdown();

    const filterTPK = document.getElementById("filter-tpk");
    if (filterTPK) {
        const listTPK = state.master["tpk"] || [];
        filterTPK.innerHTML = '<option value="">Semua TPK</option>' +
            listTPK.map(m => `<option value="${m.name}">${m.name}</option>`).join("");
    }
}

function renderJenisKayuDropdown() {
    const select = document.getElementById("input-jenis");
    const filterRincianJenis = document.getElementById("filter-rincian-jenis");
    if (!select) return;

    const listJenis = state.master["jenis_kayu"] || [];
    const options = listJenis.map(item => `<option value="${item.name}">${item.name}</option>`).join("");

    select.innerHTML = '<option value="">-- Pilih Jenis --</option>' + options;

    if (filterRincianJenis) {
        filterRincianJenis.innerHTML = '<option value="">-- Semua Jenis --</option>' + options;
    }
}

function save() {
    localStorage.setItem("sadhana_data_lokal", JSON.stringify(state.data));
    localStorage.setItem("sadhana_master", JSON.stringify(state.master));
}

async function saveData() {
    const rawDate = document.getElementById('input-date')?.value;
    const tanggalInput = rawDate ? formatTanggalDB(rawDate) : new Date().toISOString().split('T')[0];
    const ket = document.getElementById('input-ket')?.value?.trim() || "";
    const jenis = document.getElementById('input-jenis')?.value || "";
    const tpk = document.getElementById("input-tpk")?.value || "";
    const petak = document.getElementById('input-petak')?.value?.trim() || "-";
    
    const masukSM = parseFloat(document.getElementById('input-in-sm')?.value || document.getElementById('input-in')?.value) || 0;
    const keluarSM = parseFloat(document.getElementById('input-out-sm')?.value || document.getElementById('input-out')?.value) || 0;

    if (!ket || !jenis || !tpk) {
        alert("Harap lengkapi Keterangan, Jenis Kayu, dan TPK!");
        return;
    }

    if (masukSM === 0 && keluarSM === 0) {
        alert("Harap isi jumlah Masuk (SM) atau Keluar (SM)!");
        return;
    }

    let faktorKonversi = 0.67;
    if (state.master && state.master.jenis_kayu) {
        const itemKayu = state.master.jenis_kayu.find(k => k.name === jenis || k.jenis_kayu === jenis);
        if (itemKayu && itemKayu.faktor_konversi) {
            faktorKonversi = parseFloat(itemKayu.faktor_konversi);
        }
    }

    const masukM3 = masukSM * faktorKonversi;
    const keluarM3 = keluarSM * faktorKonversi;

    const smAktif = masukSM > 0 ? masukSM : keluarSM;
    const m3Aktif = masukM3 > 0 ? masukM3 : keluarM3;

    const payload = {
        tanggal: tanggalInput,
        keterangan: ket,
        jenis_kayu: jenis, 
        tpk: tpk,      
        petak: petak,
        masuk_m3: masukM3,
        keluar_m3: keluarM3
    };

    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { data, error } = await api.from('stok_kayu').insert([payload]);

        if (error) {
            if (error.code === '23505') {
                alert("⚠️ GAGAL SIMPAN: Data transaksi dengan Rincian, Tanggal, Jenis, TPK, dan Volume yang sama persis sudah ada di database!");
                return;
            }
            throw error;
        }

        alert(`Data berhasil disimpan!\n${smAktif} SM x ${faktorKonversi} = ${m3Aktif.toFixed(2)} M³`);

        const form = document.getElementById('stock-form');
        if (form) form.reset();

        if (typeof fetchData === 'function') await fetchData();

    } catch (err) {
        console.error("Gagal simpan via saveData:", err);
        alert("Gagal menyimpan data: " + (err.message || err));
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

function formatTanggalDB(dateString) {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
}

async function fetchData() {
    const idDari = 'filter-rincian-tahun-dari';
    const idSampai = 'filter-rincian-tahun-sampai';

    try {
        showLoading(true);

        if (document.getElementById(idDari)) document.getElementById(idDari).disabled = true;
        if (document.getElementById(idSampai)) document.getElementById(idSampai).disabled = true;

        const { data, error } = await api
            .from('stok_kayu')
            .select('*')
            .order('tanggal', { ascending: false });

        if (error) throw error;

        state.data = data || [];
        state.filteredData = [...state.data];
        state.currentPage = 1;

        if (typeof window.initSemuaFilter === 'function') {
            window.initSemuaFilter();
        }

        renderDashboardTable();

    } catch (err) {
        console.error("Kesalahan Fetch:", err.message);
        alert("Gagal mengambil data: " + err.message);
    } finally {
        if (document.getElementById(idDari)) document.getElementById(idDari).disabled = false;
        if (document.getElementById(idSampai)) document.getElementById(idSampai).disabled = false;
        showLoading(false);
    }
}

async function restoreData() {
    const fileInput = document.getElementById("restore-file");
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
        alert("Pilih file backup (JSON) terlebih dahulu!");
        return;
    }

    if (!confirm("Hapus data lama dan ganti dengan data dari file backup ini?")) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            if (typeof showLoading === 'function') showLoading(true);

            const importedData = JSON.parse(e.target.result);
            const rowsToInsert = Array.isArray(importedData) 
                ? importedData 
                : (importedData.data || importedData.stok_kayu || []);

            if (!rowsToInsert || rowsToInsert.length === 0) {
                throw new Error("File backup kosong atau format data tidak sesuai.");
            }

            const cleanPayload = rowsToInsert.map(item => {
                const { id, created_at, ...rest } = item;
                return rest;
            });

            const { error: delError } = await api
                .from('stok_kayu')
                .delete()
                .neq('id', 0);

            if (delError) throw delError;

            const { error: insError } = await api
                .from('stok_kayu')
                .insert(cleanPayload);

            if (insError) throw insError;

            if (typeof state !== 'undefined') {
                if (importedData.master) state.master = importedData.master;
                if (typeof save === 'function') save();
            }

            alert("✅ Database berhasil dipulihkan total!");
            location.reload();

        } catch (err) {
            console.error("Restore Error:", err);
            alert("❌ Gagal memulihkan data: " + err.message);
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    };

    reader.readAsText(file);
}

function togglePassword(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) return;
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.innerText = "👁️‍🗨️";
    } else {
        passwordInput.type = "password";
        iconElement.innerText = "👁️";
    }
}

if (state.isLoggedIn) {
    const loginScr = document.getElementById("login-screen");
    const appCont = document.getElementById("app-container");
    if (loginScr) loginScr.classList.add("hidden");
    if (appCont) appCont.classList.remove("hidden");
    renderUI();
}

function toggleMenu(id) {
    const menu = document.getElementById(id + "-submenu");
    if (menu) menu.classList.toggle("open");
}

window.switchView = function (v) {
    state.view = v;

    const modal = document.getElementById('master-modal');
    const isMasterData = (v === 'jenis-kayu' || v === 'tpk');

    if (isMasterData) {
        if (modal) modal.classList.remove('hidden');
    } else {
        if (modal) modal.classList.add('hidden');
    }

    const titleHeader = document.querySelector('.main-header h2, .main-header h1, .main-header h3, #page-title');
    if (titleHeader) {
        const names = {
            'dashboard': 'KARTU STOK',
            'rekap': 'REKAPITULASI',
            'rekap-saldo': 'REKAPITULASI SALDO',
            'rekap-rincian': 'RINCIAN MUTASI KAYU',
            'kelola-sandi': 'PENGATURAN',
            'backup-setting': 'PENGATURAN',
            'jenis-kayu': 'MASTER DATA',
            'tpk': 'MASTER DATA'
        };
        titleHeader.innerText = names[v] || v.toUpperCase();
    }

    if (!isMasterData) {
        document.querySelectorAll('.view-section, [id^="view-"]').forEach(el => el.classList.add('hidden'));

        const target = document.getElementById('view-' + v);
        if (target) {
            target.classList.remove('hidden');
        }
    }

    state.currentPage = 1;

    if (v === 'dashboard' || v === 'kelola-sandi' || v === 'backup-setting') {
        if (typeof renderDashboardTable === 'function') renderDashboardTable();
    } else if (v === 'rekap' || v === 'rekap-saldo' || v === 'ringkasan') {
        if (typeof renderRekapSaldo === 'function') renderRekapSaldo();
    } else if (v === 'rekap-rincian') {
        if (typeof renderRekapRincian === 'function') renderRekapRincian();
    } else if (v === 'jenis-kayu') {
        if (typeof showMasterModal === 'function') showMasterModal('jenis_kayu');
    } else if (v === 'tpk') {
        if (typeof showMasterModal === 'function') showMasterModal('tpk');
    }
};

function showView(viewId) {
    document.querySelectorAll('.view-section, [id^="view-"]').forEach(s => s.classList.add('hidden'));

    const target = document.getElementById('view-' + viewId) || document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');

        if ((viewId === 'rekap-rincian' || viewId === 'view-rekap-rincian') && window.sinkronisasiFilterRincian) {
            window.sinkronisasiFilterRincian();
        }
    }
}

function applyRincianFilters() {
    const selectedTPK = document.getElementById("filter-rincian-tpk")?.value || "";
    const selectedJenis = document.getElementById("filter-rincian-jenis")?.value || "";

    const hasilFilter = state.data.filter(d => {
        const matchTPK = selectedTPK === "" || d.tpk === selectedTPK;
        const matchJenis = selectedJenis === "" || d.jenis_kayu === selectedJenis;
        return matchTPK && matchJenis;
    });

    renderFilteredTable(hasilFilter);
}

const changePassForm = document.getElementById("form-change-pass");
if (changePassForm) {
    changePassForm.onsubmit = (e) => {
        e.preventDefault();
        const newU = document.getElementById("new-user").value;
        const newP = document.getElementById("new-pass").value;
        if (confirm("Yakin ubah data login?")) {
            state.config.user = newU;
            state.config.pass = newP;
            save();
            alert("Data berhasil diubah!");
            document.getElementById("new-user").value = "";
            document.getElementById("new-pass").value = "";
        }
    };
}

function initLiveSearch() {
    const searchInput = document.getElementById("filter-rincian-ket");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();

        const filtered = state.data.filter(d => {
            const matchKet = (d.keterangan || "").toLowerCase().includes(searchTerm);
            const matchPetak = (d.petak || "").toLowerCase().includes(searchTerm);

            return matchKet || matchPetak;
        });

        renderFilteredTable(filtered);
    });
}

function initLoginHandler() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        if (!state.config) {
            state.config = { user: "Admin", pass: "12345" };
        }

        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;

        if (u === state.config.user && p === state.config.pass) {
            state.isLoggedIn = true;
            localStorage.setItem("sadhana_auth", "true");
            location.reload();
        } else {
            alert("Username atau Password Salah!");
        }
    };
}

function logout() {
    localStorage.removeItem("sadhana_auth");
    location.reload();
}

window.editData = function(id) {
    const cleanId = String(id).trim();
    const item = state.data ? state.data.find(d => String(d.id).trim() === cleanId) : null;
    
    if (!item) {
        alert("Data tidak ditemukan!");
        return;
    }

    const setVal = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.value = value || '';
    };

    let faktorKonversi = 1;
    const jenis = (item.jenis_kayu || '').trim().toLowerCase();
    
    if (state.master && state.master['jenis_kayu']) {
        const itemKayu = state.master['jenis_kayu'].find(
            k => k.name && k.name.trim().toLowerCase() === jenis
        );
        if (itemKayu && itemKayu.konversi) {
            faktorKonversi = parseFloat(itemKayu.konversi);
        }
    }

    const valInM3 = parseFloat(item.masuk_m3) || 0;
    const valOutM3 = parseFloat(item.keluar_m3) || 0;

    setVal('edit-id', item.id);
    setVal('input-date', item.tanggal);
    setVal('input-ket', item.keterangan);
    setVal('input-jenis', item.jenis_kayu);
    setVal('input-tpk', item.tpk);
    setVal('input-petak', item.petak);
    setVal('input-in-sm', valInM3 > 0 ? (valInM3 / faktorKonversi) : 0);
    setVal('input-out-sm', valOutM3 > 0 ? (valOutM3 / faktorKonversi) : 0);

    const titleEl = document.getElementById('form-mode-title');
    if (titleEl) titleEl.innerText = "Edit Data Mutasi";

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
        btnSubmit.innerText = "Update Data";
    }

    const btnCancel = document.getElementById('btn-cancel-edit');
    if (btnCancel) btnCancel.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteData = function(rawId) {
    const cleanId = parseInt(rawId, 10);
    if (isNaN(cleanId)) return alert("ID data tidak valid!");

    const executeDelete = async () => {
        try {
            if (typeof showLoading === 'function') showLoading(true);

            const response = await api
                .from('stok_kayu')
                .delete()
                .eq('id', cleanId);

            if (response && response.error) throw response.error;

            if (typeof state !== 'undefined') {
                if (Array.isArray(state.data)) {
                    state.data = state.data.filter(item => Number(item.id) !== cleanId);
                }
                if (Array.isArray(state.filteredData)) {
                    state.filteredData = state.filteredData.filter(item => Number(item.id) !== cleanId);
                }
            }

            if (typeof fetchData === 'function') await fetchData();
            
            if (typeof renderDashboardTable === 'function') renderDashboardTable();

            if (typeof Swal !== 'undefined') {
                Swal.fire('Terhapus!', 'Data berhasil dihapus dari database.', 'success');
            } else {
                alert("Data berhasil dihapus dari database.");
            }

        } catch (err) {
            console.error("Error saat menghapus:", err);
            if (typeof Swal !== 'undefined') {
                Swal.fire('Gagal!', 'Gagal menghapus data: ' + (err.message || err), 'error');
            } else {
                alert('Gagal menghapus data: ' + (err.message || err));
            }
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Konfirmasi Hapus',
            text: `Apakah Anda yakin ingin menghapus data dengan ID ${cleanId}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) executeDelete();
        });
    } else {
        if (confirm(`Apakah Anda yakin ingin menghapus data dengan ID ${cleanId}?`)) {
            executeDelete();
        }
    }
};

window.cancelEdit = function() {
    const stockForm = document.getElementById('stock-form');
    if (stockForm) stockForm.reset();

    const setVal = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.value = value;
    };

    setVal('edit-id', '');
    setVal('input-in-sm', 0);
    setVal('input-out-sm', 0);

    const titleEl = document.getElementById('form-mode-title');
    if (titleEl) titleEl.innerText = "Input Mutasi";

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.innerText = "Simpan";

    const btnCancel = document.getElementById('btn-cancel-edit');
    if (btnCancel) btnCancel.classList.add('hidden');
};

window.deleteSelected = async function () {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.value || cb.getAttribute('data-id'));

    if (idsToDelete.length === 0) {
        alert("Pilih data yang ingin dihapus terlebih dahulu.");
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus ${idsToDelete.length} data terpilih?`)) return;

    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { error } = await api
            .from('stok_kayu')
            .delete()
            .in('id', idsToDelete);

        if (error) throw error;

        alert(`${idsToDelete.length} data terpilih berhasil dihapus!`);
        
        const selectAllHeader = document.getElementById('select-all-header');
        if (selectAllHeader) selectAllHeader.checked = false;

        if (typeof fetchData === 'function') await fetchData();

    } catch (err) {
        console.error("Gagal Hapus Massal:", err);
        alert("Gagal menghapus massal: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};

window.toggleSelectAll = function(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
};

function renderUI() {
    const elInputJenis = document.getElementById('input-jenis');
    const elInputTPK = document.getElementById('input-tpk');

    if (elInputJenis) {
        if (state.master && state.master["jenis_kayu"]) {
            elInputJenis.innerHTML = '<option value="">-- Pilih Jenis --</option>' +
                state.master["jenis_kayu"].map(m => `<option value="${m.name}">${m.name}</option>`).join("");
        }
    }

    if (elInputTPK) {
        if (state.master && state.master["tpk"]) {
            elInputTPK.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                state.master["tpk"].map(m => `<option value="${m.name}">${m.name}</option>`).join("");
        }
    }
}

window.renderRekapSaldo = async function () {
    const tableBody = document.getElementById("rekap-table-body") || document.getElementById("tabel-rekap-body");
    if (!tableBody) return;

    if (typeof showLoading === 'function') showLoading(true);

    const fBulanDari = document.getElementById("filter-dari-bulan")?.value || 1;
    const fTahunDari = parseInt(document.getElementById("filter-dari-tahun")?.value, 10) || new Date().getFullYear();
    const fBulanSampai = document.getElementById("filter-sampai-bulan")?.value || 12;
    const fTahunSampai = parseInt(document.getElementById("filter-sampai-tahun")?.value, 10) || new Date().getFullYear();

    const filterTPK = document.getElementById("filter-tpk")?.value || 'ALL';
    const filterJenis = document.getElementById("filter-jenis")?.value || 'ALL';
    const filterPetak = document.getElementById("filter-petak")?.value || 'ALL';

    const periodeMulai = parseInt(fTahunDari) * 100 + parseInt(fBulanDari);
    const periodeAkhir = parseInt(fTahunSampai) * 100 + parseInt(fBulanSampai);

    try {
        const { data, error } = await api.rpc('get_rekap_saldo_kayu', {
            p_periode_mulai: periodeMulai,
            p_periode_akhir: periodeAkhir,
            p_tpk: filterTPK,
            p_jenis: filterJenis,
            p_petak: filterPetak
        });

        if (error) throw error;

        const rows = (data || []).filter(r => {
            const sBap = parseFloat(r.saldo_awal_bap || 0) + parseFloat(r.bap || 0) - parseFloat(r.lhp || 0);
            const sLhp = parseFloat(r.saldo_awal_lhp || 0) + parseFloat(r.lhp || 0) - parseFloat(r.kirim || 0);
            return (
                (r.saldo_awal_bap && r.saldo_awal_bap != 0) || 
                (r.saldo_awal_lhp && r.saldo_awal_lhp != 0) || 
                (r.bap && r.bap != 0) || 
                (r.lhp && r.lhp != 0) || 
                (r.kirim && r.kirim != 0) || 
                sBap != 0 || 
                sLhp != 0
            );
        });

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center p-4">Tidak ada data rekap untuk periode ini</td></tr>';
            return;
        }

        let gTotalAwalBap = 0, gTotalAwalLhp = 0, gTotalBap = 0, gTotalLhp = 0, gTotalKirim = 0;
        let gTotalSaldoBap = 0, gTotalSaldoLhp = 0;

        let html = rows.map((r) => {
            const sAwalBap = parseFloat(r.saldo_awal_bap || 0);
            const sAwalLhp = parseFloat(r.saldo_awal_lhp || 0);
            const valBap   = parseFloat(r.bap || 0);
            const valLhp   = parseFloat(r.lhp || 0);
            const valKirim = parseFloat(r.kirim || 0);

            const sBap = sAwalBap + valBap - valLhp;
            const sLhp = sAwalLhp + valLhp - valKirim;

            gTotalAwalBap += sAwalBap;
            gTotalAwalLhp += sAwalLhp;
            gTotalBap += valBap;
            gTotalLhp += valLhp;
            gTotalKirim += valKirim;
            gTotalSaldoBap += sBap;
            gTotalSaldoLhp += sLhp;

            return `
                <tr>
                    <td>${r.jenis_kayu}</td>
                    <td>${r.tpk}</td>
                    <td class="text-center">${r.petak}</td>
                    <td class="text-right">${formatSaldo(sAwalBap)}</td>
                    <td class="text-right">${formatSaldo(sAwalLhp)}</td>
                    <td class="text-right">${formatSaldo(valBap)}</td>
                    <td class="text-right">${formatSaldo(valLhp)}</td>
                    <td class="text-right">${formatSaldo(valKirim)}</td>
                    <td class="text-right" style="font-weight:bold">${formatSaldo(sBap)}</td>
                    <td class="text-right" style="font-weight:bold">${formatSaldo(sLhp)}</td>
                </tr>`;
        }).join('');

        html += `
            <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #374151;">
                <td colspan="3" class="text-center">TOTAL KESELURUHAN</td>
                <td class="text-right">${formatSaldo(gTotalAwalBap)}</td>
                <td class="text-right">${formatSaldo(gTotalAwalLhp)}</td>
                <td class="text-right">${formatSaldo(gTotalBap)}</td>
                <td class="text-right">${formatSaldo(gTotalLhp)}</td>
                <td class="text-right">${formatSaldo(gTotalKirim)}</td>
                <td class="text-right">${formatSaldo(gTotalSaldoBap)}</td>
                <td class="text-right">${formatSaldo(gTotalSaldoLhp)}</td>
            </tr>
        `;

        tableBody.innerHTML = html;

    } catch (err) {
        console.error("Gagal memuat rekap saldo:", err);
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-red-500">Gagal memuat rekap saldo: ${err.message || err}</td></tr>`;
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};

window.renderRekapTable = window.renderRekapSaldo;

function renderFilteredTable(filteredData) {
    const tbody = document.getElementById("rincian-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    const dataToShow = filteredData.slice(0, 500);

    const rows = dataToShow.map(d => `
        <tr>
            <td>${d.tanggal}</td>
            <td>${d.jenis_kayu}</td>
            <td>${d.tpk}</td>
            <td>${d.petak}</td>
            <td class="text-right">${Number(d.masuk_m3).toFixed(2)}</td>
            <td class="text-right">${Number(d.keluar_m3).toFixed(2)}</td>
            <td>${d.keterangan}</td>
        </tr>
    `).join("");

    tbody.innerHTML = rows;
}

async function loadDataRincianMutasi() {
    try {
        if (typeof showLoading === 'function') showLoading(true);

        const fTFrom = document.getElementById("filter-rincian-tahun-dari")?.value;
        const fBFrom = document.getElementById("filter-rincian-bulan-dari")?.value;
        const fTTo   = document.getElementById("filter-rincian-tahun-sampai")?.value;
        const fBTo   = document.getElementById("filter-rincian-bulan-sampai")?.value;
        const fTPK   = document.getElementById("filter-rincian-tpk")?.value;
        const fJenis = document.getElementById("filter-rincian-jenis")?.value;
        const fPetak = document.getElementById("filter-rincian-petak")?.value;
        const fKet   = document.getElementById("filter-rincian-ket")?.value;

        const startDate = (fTFrom && fBFrom) ? `${fTFrom}-${String(fBFrom).padStart(2, '0')}-01` : '2000-01-01';
        const lastDay   = (fTTo && fBTo) ? new Date(fTTo, fBTo, 0).getDate() : 31;
        const endDate   = (fTTo && fBTo) ? `${fTTo}-${String(fBTo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` : '2099-12-31';

        state.hasAppliedFilter = true;
        const page = state.currentPage || 1;
        const pageSize = state.rowsPerPage || 10;
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let querySaldoAwal = api
            .from('stok_kayu')
            .select('masuk_m3, keluar_m3, keterangan')
            .lt('tanggal', startDate)
            .not('keterangan', 'ilike', '%LHP%');

        if (fTPK) querySaldoAwal = querySaldoAwal.eq('tpk', fTPK);
        if (fJenis) querySaldoAwal = querySaldoAwal.eq('jenis_kayu', fJenis);
        if (fPetak) querySaldoAwal = querySaldoAwal.eq('petak', fPetak);

        const { data: dataSaldoAwal, error: errSaldo } = await querySaldoAwal;
        if (errSaldo) throw errSaldo;

        let saldoAwal = 0;
        dataSaldoAwal?.forEach(d => {
            saldoAwal += (parseFloat(d.masuk_m3 || 0) - parseFloat(d.keluar_m3 || 0));
        });

        let prevPageMutasiSum = 0;
        if (start > 0) {
            let queryPrevMutasi = api
                .from('stok_kayu')
                .select('masuk_m3, keluar_m3, keterangan')
                .gte('tanggal', startDate)
                .lte('tanggal', endDate)
                .not('keterangan', 'ilike', '%LHP%');

            if (fTPK) queryPrevMutasi = queryPrevMutasi.eq('tpk', fTPK);
            if (fJenis) queryPrevMutasi = queryPrevMutasi.eq('jenis_kayu', fJenis);
            if (fPetak) queryPrevMutasi = queryPrevMutasi.eq('petak', fPetak);
            if (fKet) queryPrevMutasi = queryPrevMutasi.ilike('keterangan', `%${fKet}%`);

            const { data: dataPrevMutasi, error: errPrev } = await queryPrevMutasi
                .order('tanggal', { ascending: true })
                .range(0, start - 1);

            if (errPrev) throw errPrev;

            dataPrevMutasi?.forEach(d => {
                prevPageMutasiSum += (parseFloat(d.masuk_m3 || 0) - parseFloat(d.keluar_m3 || 0));
            });
        }

        state.pageStartSaldo = saldoAwal + prevPageMutasiSum;

        let queryMutasi = api
            .from('stok_kayu')
            .select('*', { count: 'exact' })
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        if (fTPK) queryMutasi = queryMutasi.eq('tpk', fTPK);
        if (fJenis) queryMutasi = queryMutasi.eq('jenis_kayu', fJenis);
        if (fPetak) queryMutasi = queryMutasi.eq('petak', fPetak);
        if (fKet) queryMutasi = queryMutasi.ilike('keterangan', `%${fKet}%`);

        const { data: mutasiData, count, error: errMutasi } = await queryMutasi
            .order('tanggal', { ascending: true })
            .range(start, end);

        if (errMutasi) throw errMutasi;

        state.totalRows = count || 0;
        state.saldoAwal = saldoAwal;
        state.filteredData = (mutasiData || []).map(d => ({
            ...d,
            p: parseFloat(d.masuk_m3 || 0),
            m: parseFloat(d.keluar_m3 || 0),
            ket: d.keterangan || "",
            jenis: d.jenis_kayu
        }));

        if (typeof renderRincian === 'function') renderRincian();
        if (typeof window.renderPaginationControls === 'function') window.renderPaginationControls();

    } catch (err) {
        console.error("Gagal memuat rincian mutasi server-side:", err);
        alert("Gagal memuat data mutasi: " + (err.message || err));
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

function renderRincian() {
    const body = document.getElementById("rincian-table-body");
    const pageInfo = document.getElementById("page-info");
    if (!body) return;

    if (!state.hasAppliedFilter) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #666;">Silakan terapkan filter untuk menampilkan data</td></tr>';
        return;
    }

    const dataHalamanIni = state.filteredData || [];
    const totalRows = state.totalRows || 0;
    const rowsPerPage = state.rowsPerPage || 25;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    const saldoAwal = state.saldoAwal || 0;

    if (!state.currentPage || state.currentPage < 1) state.currentPage = 1;

    let htmlContent = "";

    if (state.currentPage === 1) {
        htmlContent += `
            <tr style="background-color: #f3f4f6; font-style: italic;">
                <td colspan="5" class="text-center font-bold">SALDO AWAL (Sampai Periode Sebelumnya)</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
                <td class="text-right font-bold">${saldoAwal.toFixed(2)}</td>
            </tr>
        `;
    }

    if (dataHalamanIni.length === 0 && state.currentPage === 1) {
        htmlContent += '<tr><td colspan="8" class="text-center" style="padding: 15px;">Tidak ada transaksi pada periode ini</td></tr>';
    } else {
        let runningSaldo = (typeof state.pageStartSaldo !== 'undefined') ? state.pageStartSaldo : saldoAwal;

        dataHalamanIni.forEach(d => {
            const valP = parseFloat(d.p || d.masuk_m3 || 0);
            const valM = parseFloat(d.m || d.keluar_m3 || 0);
            const ket  = (d.ket || d.keterangan || "").toUpperCase();

            let mskTampil = 0;
            let klrTampil = 0;
            let mskHitungFisik = 0;
            let klrHitungFisik = 0;

            if (ket.includes("KIRIM")) {
                klrTampil = valM;
                klrHitungFisik = valM;
            } else if (ket.includes("LHP")) {
                mskTampil = valP;
                mskHitungFisik = 0; 
            } else {
                mskTampil = valP;
                klrTampil = valM;
                mskHitungFisik = valP;
                klrHitungFisik = valM;
            }

            runningSaldo += (mskHitungFisik - klrHitungFisik);

            const rowStyle = ket.includes('LHP') ? 'background-color: #f9fafb; color: #6b7280;' : '';

            htmlContent += `
                <tr style="${rowStyle}">
                    <td>${d.tanggal || '-'}</td>
                    <td>${d.ket || d.keterangan || '-'}</td>
                    <td>${d.jenis || d.jenis_kayu || '-'}</td>
                    <td>${d.tpk || '-'}</td>
                    <td>${d.petak || '-'}</td>
                    <td class="text-right">${mskTampil ? mskTampil.toFixed(2) : '-'}</td>
                    <td class="text-right">${klrTampil ? klrTampil.toFixed(2) : '-'}</td>
                    <td class="text-right font-bold">${runningSaldo.toFixed(2)}</td>
                </tr>`;
        });
    }

    if (state.currentPage === totalPages && totalRows > 0) {
        const totalMasuk = state.totalMasukFisik || 0;
        const totalKeluar = state.totalKeluarFisik || 0;
        const saldoAkhir = saldoAwal + (totalMasuk - totalKeluar);

        htmlContent += `
            <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #374151;">
                <td colspan="5" class="text-center">GRAND TOTAL MUTASI FISIK</td>
                <td class="text-right">${totalMasuk.toFixed(2)}</td>
                <td class="text-right">${totalKeluar.toFixed(2)}</td>
                <td class="text-right">${saldoAkhir.toFixed(2)}</td>
            </tr>`;
    }

    body.innerHTML = htmlContent;

    if (pageInfo) {
        pageInfo.innerText = `Halaman ${state.currentPage} dari ${totalPages}`;
    }
}

function backupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "BACKUP_SADHANA_" + new Date().toISOString().slice(0, 10) + ".json");
    a.click();
}

function exportToCSV() {
    let csv = ["Tanggal,Keterangan,Jenis Kayu,TPK,Petak,Masuk,Keluar"];
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
            const tanggal = cells[1].textContent;
            const ket = cells[2].textContent;
            const jenis = cells[3].textContent;
            const tpk = cells[4].textContent;
            const petak = cells[5].textContent;
            const masuk = cells[6].textContent;
            const keluar = cells[7].textContent;
            csv.push(`${tanggal},${ket},${jenis},${tpk},${petak},${masuk},${keluar}`);
        }
    });
    const blob = new Blob([csv.join("\n")], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Kartu_Stok_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

function exportRekapExcel() {
    const table = document.querySelector("#view-rekap table");
    if (!table || table.rows.length <= 1) {
        alert("Tidak ada data rekap untuk diekspor. Silakan terapkan filter terlebih dahulu.");
        return;
    }

    const fileName = `Rekap_Stok_Kayu_${new Date().getTime()}.xls`;
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(table.outerHTML);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

function exportRincianExcel() {
    const table = document.querySelector("#view-rekap-rincian table");
    if (!table || table.rows.length <= 1) {
        alert("Tidak ada data rincian untuk diekspor. Silakan terapkan filter terlebih dahulu.");
        return;
    }

    const style = "<style>table { border-collapse: collapse; } td, th { border: 1px solid black; }</style>";
    const tableHtml = style + table.outerHTML;

    const fileName = `Rincian_Mutasi_${new Date().getTime()}.xls`;
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(tableHtml);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

window.sinkronisasiFilterRincian = function () {
    const elJenis = document.getElementById('filter-rincian-jenis');
    if (elJenis) {
        const masterJenis = (state.master && state.master.jenis_kayu) || [];
        let html = '<option value="">-- Semua Jenis --</option>';

        masterJenis.forEach(item => {
            const nama = (typeof item === 'object') ? (item.name || item.nama) : item;
            html += `<option value="${nama}">${nama}</option>`;
        });
        elJenis.innerHTML = html;
    }

    const elTPK = document.getElementById('filter-rincian-tpk');
    if (elTPK) {
        const masterTPK = (state.master && state.master.tpk) || [];
        let html = '<option value="">-- Pilih TPK --</option>';

        masterTPK.forEach(item => {
            const nama = (typeof item === 'object') ? (item.name || item.nama) : item;
            html += `<option value="${nama}">${nama}</option>`;
        });
        elTPK.innerHTML = html;
    }
};

// Inisialisasi otomatis setelah DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    initLoginHandler();
    initEventListeners();
    startApp();
});