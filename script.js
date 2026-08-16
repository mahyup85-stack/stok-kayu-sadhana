// HELPER: Menghilangkan -0.00 dan memformat angka ke 2 desimal
const formatSaldo = (val) => {
    if (val === null || val === undefined || isNaN(val)) return "0.00";
    // Trik aritmatika (+ 0) mengubah -0 menjadi 0 positif sebelum dibulatkan
    const rounded = Math.round(Number(val) * 100) / 100 + 0;
    return rounded.toFixed(2);
};

let api;

// 2. State Management
let state = {
    isLoggedIn: localStorage.getItem("sadhana_auth") === "true",
    view: 'dashboard',
    // KONFIGURASI INI HARUS ADA:
    config: {
        user: "Admin",
        pass: "sadhana-234"
    },
    data: [],
    mutasi: [],
    master: {
        "jenis_kayu": [],
        "tpk": []
    },
    tempMasterType: null
    ,
    currentPage: 1,
    rowsPerPage: 50, // Tampilkan 50 data per halaman agar ringan
    filteredData: [] // Untuk menyimpan hasil pencarian/filter
};

// 1. Fungsi Buka Modal Master Data & Update Header
window.openMasterModal = async function (type) {
    state.currentMasterType = type;
    
    const modal = document.getElementById('master-modal');
    const title = document.getElementById('modal-title');
    const listEl = document.getElementById('master-list-body');
    const konversiInput = document.getElementById('master-input-konversi');

    // 🔴 Ubah Judul Header Utama di Atas (KARTU STOK -> MASTER DATA)
    const titleHeader = document.querySelector('.main-header h2, #current-view-title');
    if (titleHeader) {
        titleHeader.innerText = (type === 'tpk') ? 'MASTER TPK' : 'MASTER JENIS KAYU';
    }

    if (!modal || !listEl) return;

    const isTPK = (type === 'tpk');

    // Ubah Judul di dalam Modal Popup
    if (title) {
        title.innerText = isTPK ? 'Kelola Master TPK' : 'Kelola Master Jenis Kayu';
    }

    // Sembunyikan Input Konversi jika TPK
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

// 2. Alias agar dipanggil 'showMasterModal' tetap jalan
window.showMasterModal = function (type) {
    window.openMasterModal(type);
};

// 3. Fungsi Tutup Modal & Kembalikan Judul Header ke Halaman Sebelumnya
window.closeMasterModal = function () {
    const modal = document.getElementById('master-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // 🔴 Kembalikan Judul Header Utama saat modal ditutup
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

    const type = state.currentMasterType; // 'tpk' atau 'jenis_kayu'
    const nameInput = document.getElementById('master-input-nama');
    const konversiInput = document.getElementById('master-input-konversi');

    const nameVal = nameInput ? nameInput.value.trim() : '';
    // Jika type adalah TPK, set nilai konversi ke null
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

        // Reset form
        nameInput.value = '';
        if (konversiInput) konversiInput.value = '1';

        // Refresh list master
        await window.openMasterModal(type);
        alert("Data berhasil disimpan!");

    } catch (err) {
        console.error("Gagal menyimpan master data:", err);
        alert("Gagal menyimpan data: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};

// ==========================================
// 2. RENDER LIST MASTER
// ==========================================
window.renderMasterList = function () {
    const listEl = document.getElementById('master-list-body') || document.getElementById('master-list');
    const type = state.currentMasterType;
    const thFaktor = document.getElementById('th-faktor');
    const isTPK = (type === 'tpk');

    if (!listEl) return;

    // Sembunyikan Header Kolom "Faktor" jika yang dibuka adalah TPK
    if (thFaktor) {
        thFaktor.style.display = isTPK ? 'none' : 'table-cell';
    }

    const masterData = (state.master && state.master[type]) ? state.master[type] : [];

    // Jika data kosong, sesuaikan jumlah kolom (3 kolom untuk TPK, 4 kolom untuk Jenis Kayu)
    if (masterData.length === 0) {
        listEl.innerHTML = `<tr><td colspan="${isTPK ? 3 : 4}" class="text-center" style="padding:10px; color:#888;">Tidak ada data</td></tr>`;
        return;
    }

    // Render baris tabel (Kolom Faktor hanya tampil jika BUKAN TPK)
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

// 5. Delete Item
window.deleteMasterItem = async function (id) {
    const type = state.currentMasterType;
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

    // Ambil data: Prioritas dataToRender -> filteredData -> data asli
    const data = dataToRender || (state.filteredData && state.filteredData.length > 0 ? state.filteredData : state.data);
    state.filteredData = data;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada data ditemukan</td></tr>';
        renderPaginationControls();
        return;
    }

    // --- LOGIKA CEK VIEW SAAT INI ---
    const isNoPagination = (state.view === 'kelola-sandi' || state.view === 'backup-setting');

    let paginatedData;
    if (isNoPagination) {
        paginatedData = data; // Tampilkan semua data
    } else {
        const startIndex = (state.currentPage - 1) * state.rowsPerPage;
        const endIndex = startIndex + state.rowsPerPage;
        paginatedData = data.slice(startIndex, endIndex); // Tetap pakai pagination
    }

    // Render baris tabel (Tombol Aksi Diperbarui)
    tableBody.innerHTML = paginatedData.map(d => `
        <tr>
            <td class="text-center">
                <input type="checkbox" class="row-checkbox" value="${d.id}">
            </td>
            <td>${d.tanggal}</td>
            <td>${d.keterangan || '-'}</td>
            <td>${d.jenis_kayu}</td>
            <td>${d.tpk}</td>
            <td>${d.petak || '-'}</td>
            <td class="text-right">${formatSaldo(d.masuk_m3)}</td>
            <td class="text-right">${formatSaldo(d.keluar_m3)}</td>
            <td>
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                    <button type="button" onclick="event.stopPropagation(); window.editData('${d.id}')" class="btn-action" title="Edit">✏️</button>
                    <button type="button" onclick="event.stopPropagation(); window.deleteData('${d.id}')" class="btn-action btn-danger" title="Hapus">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Sembunyikan/Tampilkan kontrol pagination
    const container = document.getElementById("pagination-container");
    if (container) {
        container.style.display = isNoPagination ? "none" : "block";
    }

    if (!isNoPagination) {
        renderPaginationControls();
    }
}

// Fungsi untuk membuat tombol navigasi halaman
window.renderPaginationControls = function () {
    const container = document.getElementById("pagination-container");
    if (!container) return;

    // 1. Tentukan sumber data secara dinamis (Rincian Mutasi vs Dashboard Utama)
    let totalRows = 0;
    if (typeof getProcessedRincianData === 'function' && state.hasAppliedFilter) {
        const processed = getProcessedRincianData();
        totalRows = processed?.filtered?.length || 0;
    } else {
        totalRows = state.filteredData?.length || state.data?.length || 0;
    }

    const rowsPerPage = state.rowsPerPage || 10;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    const currentPage = state.currentPage || 1;

    // 2. Render tombol HTML dengan status disabled yang presisi
    let html = `
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; padding:12px 0;">
            <button class="btn-page" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
            <button class="btn-page" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
            
            <span style="font-size: 0.9rem; font-weight: 500; margin: 0 8px;">
                Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong>
            </span>
            
            <button class="btn-page" onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
            <button class="btn-page" onclick="changePage(${totalPages})" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>
        </div>
    `;
    
    container.innerHTML = html;
};

// Fungsi pindah halaman (Aman untuk semua modul)
window.changePage = function (page) {
    // Hitung total halaman sesuai modul aktif
    let totalRows = 0;
    if (typeof getProcessedRincianData === 'function' && state.hasAppliedFilter) {
        const processed = getProcessedRincianData();
        totalRows = processed?.filtered?.length || 0;
    } else {
        totalRows = state.filteredData?.length || state.data?.length || 0;
    }

    const rowsPerPage = state.rowsPerPage || 10;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

    // Validasi batas halaman
    if (page < 1 || page > totalPages) return;

    // Set halaman baru
    state.currentPage = page;

    // Render ulang tampilan yang sesuai
    if (typeof renderRincian === 'function') {
        renderRincian();
    }
    if (typeof renderDashboardTable === 'function') {
        renderDashboardTable();
    }

    // Scroll halus ke atas tabel
    const wrapper = document.querySelector('.tabel-wrapper') || document.querySelector('.table-responsive');
    if (wrapper) {
        wrapper.scrollTop = 0;
    }
};

// Pasang ke window agar aman jika dipanggil dengan window.state
// 1. Ekspos state ke window (kode kamu yang sudah ada)
window.state = state;

// 2. SISIPKAN/PASTIKAN konversiKayu ada di dalam objek state
if (window.state) {
    window.state.konversiKayu = {}; // Menyiapkan wadah untuk data konversi
}

// 3. Helper loader (kode kamu yang sudah ada)
function showLoading(isLoading) {
    const loader = document.getElementById('loading-overlay');
    if (loader) isLoading ? loader.classList.remove('hidden') : loader.classList.add('hidden');
}

// 4. SISIPKAN helper fungsi hitung konversi di sini
function hitungKonversi(jenisKayu, volumeM3) {
    // Ambil faktor konversi dari state (jika tidak ada/belum diisi, default = 1)
    const faktor = (window.state && window.state.konversiKayu) ? (window.state.konversiKayu[jenisKayu] || 1) : 1;
    return volumeM3 * faktor;
}

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
    // Pastikan data master diambil langsung dari state yang sudah terisi
    const masterData = state.master;
    const sumberData = state.data || [];

    // Render tabel-tabel Anda seperti biasa menggunakan masterData...
    // Contoh:
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

    // Panggil fungsi pengisi dropdown
    populateAllDropdowns(sumberData, masterData);
}

function loadMasterToSelect() {
    try {
        // Ambil data dengan proteksi jika localStorage kosong
        const rawData = localStorage.getItem('masterData');
        const masterData = rawData ? JSON.parse(rawData) : { jenis: [], tpk: [] };

        const elJenis = document.getElementById('jenis');
        const elTPK = document.getElementById('tpk');

        // Isi Jenis Kayu secara aman
        if (elJenis && masterData.jenis) {
            let html = '<option value="">Pilih...</option>';
            masterData.jenis.forEach(item => {
                html += `<option value="${item}">${item}</option>`;
            });
            elJenis.innerHTML = html;
        }

        // Isi TPK secara aman
        if (elTPK && masterData.tpk) {
            let html = '<option value="">Pilih...</option>';
            masterData.tpk.forEach(item => {
                const nama = typeof item === 'object' ? item.nama : item;
                html += `<option value="${nama}">${nama}</option>`;
            });
            elTPK.innerHTML = html;

            // Tambahkan listener otomatis untuk update petak
            elTPK.onchange = updatePetak;
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

        // Filter data
        const filtered = state.data.filter(d => {
            const matchKet = (d.keterangan || "").toLowerCase().includes(searchTerm);
            const matchJenis = (d.jenis_kayu || "").toLowerCase().includes(searchTerm);
            const matchTPK = (d.tpk || "").toLowerCase().includes(searchTerm);
            const matchPetak = (d.petak || "").toLowerCase().includes(searchTerm);
            return matchKet || matchJenis || matchTPK || matchPetak;
        });

        // PENTING: Reset ke halaman 1 setiap kali filter berubah
        state.currentPage = 1;

        // Render ulang dengan data hasil filter
        renderDashboardTable(filtered);
    });
};

window.initSemuaFilter = function () {
    console.log("Memulai Sinkronisasi Filter...");

    if (!state.data || state.data.length === 0) {
        console.error("Data masih kosong di state.data!");
        return;
    }

    // 1. Ambil TPK Unik
    const daftarTPK = [...new Set(state.data.map(d => d.tpk ? String(d.tpk).trim() : null).filter(Boolean))].sort();

    // 2. Isi Dropdown TPK Ringkasan & Rincian
    const idsTPK = [
        { tpkId: 'filter-tpk', petakId: 'filter-petak' },
        { tpkId: 'filter-rincian-tpk', petakId: 'filter-rincian-petak' }
    ];

    idsTPK.forEach(item => {
        const el = document.getElementById(item.tpkId);
        if (el) {
            el.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                daftarTPK.map(t => `<option value="${t}">${t}</option>`).join('');

            // PERBAIKAN PENTING: Panggil fungsi dengan meneruskan ID TPK & Petak yang sesuai
            el.onchange = function () {
                window.updatePetakByTPK(item.tpkId, item.petakId);
            };
        }
    });

    // 3. Ambil Tahun Unik
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

    console.log("✅ Filter Sinkron. TPK:", daftarTPK.length, "Tahun:", daftarTahun);
};

window.updatePetakByTPK = function (tpkSelectId = 'filter-tpk', petakSelectId = 'filter-petak') {
    const tpkEl = document.getElementById(tpkSelectId);
    const petakEl = document.getElementById(petakSelectId);

    if (!petakEl) return;

    // Helper untuk membersihkan & merapikan teks
    const cleanString = (str) => String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();

    // Ambil value DAN text dari TPK yang dipilih (bersihkan spasinya)
    const rawVal = tpkEl ? tpkEl.value : '';
    const rawText = (tpkEl && tpkEl.selectedIndex >= 0) ? tpkEl.options[tpkEl.selectedIndex].text : '';

    const selectedVal = cleanString(rawVal);
    const selectedText = cleanString(rawText);

    // Reset isi dropdown petak
    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';

    // Gunakan state.data atau tentukan fallback ke array data utama kamu
    const dataSource = state.data || state.rekapData || state.mutasiData || [];

    // Jika TPK belum dipilih atau data kosong
    if (!selectedVal || dataSource.length === 0) {
        petakEl.disabled = true;
        return;
    }

    // Filter data dengan penanganan spasi yang identik
    const matchingData = dataSource.filter(d => {
        if (!d.tpk) return false;
        const dbTPK = cleanString(d.tpk);
        return dbTPK === selectedVal || (selectedText !== '' && dbTPK === selectedText);
    });

    console.log(`[${tpkSelectId}] Match TPK Ditemukan:`, matchingData.length);

    // Ambil daftar petak unik dari hasil match
    const uniquePetaks = [...new Set(
        matchingData
            .map(d => d.petak ? String(d.petak).trim() : '')
            .filter(p => p !== '' && p !== '-' && p !== 'undefined' && p !== 'null')
    )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    console.log(`[${petakSelectId}] Daftar Petak Unik:`, uniquePetaks);

    // Render & Buka kuncian Petak
    if (uniquePetaks.length > 0) {
        uniquePetaks.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            petakEl.appendChild(opt);
        });
        
        petakEl.disabled = false;
        petakEl.removeAttribute('disabled'); // Memastikan kuncian HTML benar-benar dilepas
    } else {
        petakEl.disabled = true;
    }
};

// --- FUNGSI SPESIFIK UNTUK TABEL RINCIAN ---
window.updatePetakRincianByTPK = function () {
    window.updatePetakByTPK('filter-rincian-tpk', 'filter-rincian-petak');
};

// 2. UNTUK BAGIAN RINCIAN MUTASI
// Fungsi khusus untuk filter di bagian Rincian Mutasi

// Variable flag untuk mencegah startApp dijalankan bersamaan
let isAppInitializing = false;

async function startApp() {
    // 1. CEK FLAG: Jika sedang dalam proses inisialisasi, hentikan eksekusi ganda
    if (isAppInitializing) {
        console.warn("⚠️ startApp() sedang berjalan, mengabaikan panggilan duplikat.");
        return;
    }

    try {
        isAppInitializing = true; // Tandai bahwa aplikasi mulai loading
        showLoading(true);

        const URL = 'https://fcccuqnyxuwsrddlookt.supabase.co';
        const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjY2N1cW55eHV3c3JkZGxvb2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDU2NzQsImV4cCI6MjA4NTQyMTY3NH0.w9p0yxWW1CtLm3Gj3uD1z3P1eWQxW_hB288iUwkfCd8';

        if (!api && window.supabase) {
            api = window.supabase.createClient(URL, KEY);
        }

        // 2. Tarik Data Transaksi & Master secara paralel
        await Promise.all([
            fetchData(),
            loadDataMaster()
        ]);

        // 3. Inisialisasi Pencarian Live
        if (typeof window.initLiveSearchDashboard === 'function') {
            window.initLiveSearchDashboard();
        }

        console.log("✅ Aplikasi Siap: Data Transaksi & Master sinkron.");

    } catch (err) {
        console.error("❌ Gagal memulai aplikasi:", err.message);
    } finally {
        showLoading(false);
        isAppInitializing = false; // Reset flag setelah selesai
    }
}

function renderFilterSaldo() {
    // Definisikan variabelnya di sini agar tidak 'not defined'
    const elFilterJenisSaldo = document.getElementById('filter-jenis');

    if (elFilterJenisSaldo) {
        const masterJenis = state.master.jenis_kayu || [];

        elFilterJenisSaldo.innerHTML = '<option value="">-- Semua Jenis --</option>' +
            masterJenis.map(m => `<option value="${m.name}">${m.name}</option>`).join('');

        console.log("✅ Dropdown Saldo terisi.");
    }
}

async function loadDataMaster() {
    try {
        const { data, error } = await api.from('master_data').select('*');
        if (error) throw error;

        // 1. Pisahkan data ke state (Kode Lama Kamu)
        state.master.jenis_kayu = data.filter(d => d.type === 'jenis_kayu' || d.type === 'jenis-kayu');
        state.master.tpk = data.filter(d => d.type === 'tpk');

        // 2. TAMBAHAN BARU: Simpan Mapping Konversi Kayu
        state.konversiKayu = {};
        state.master.jenis_kayu.forEach(item => {
            // Ambil nama jenis kayu (misal item.nama atau item.nilai)
            const namaJenis = item.nama || item.nilai || item.jenis_kayu;
            // Ambil faktor konversi (default 1 jika kolom di Supabase belum diisi)
            const faktor = parseFloat(item.faktor_konversi || item.konversi || 1);

            if (namaJenis) {
                state.konversiKayu[namaJenis] = faktor;
            }
        });

        console.log("✅ Data Master Berhasil Dimuat:", {
            jenis_kayu: state.master.jenis_kayu.length,
            tpk: state.master.tpk.length
        });
        console.log("📊 Mapping Konversi Kayu:", state.konversiKayu);

        // 3. PANGGIL FUNGSI RENDER (Kode Lama Kamu)
        renderAllDropdowns();   // Untuk Form Input
        renderFilterSaldo();    // Untuk Ringkasan Saldo

        if (window.sinkronisasiFilterRincian) window.sinkronisasiFilterRincian();

    } catch (err) {
        // Jangan biarkan error render menghentikan proses load data
        console.error("❌ Gagal render dropdown master:", err.message);
    }
}

// 2. Definisi fungsi render (Harus ADA di dalam file yang sama)
function renderTPKDropdown() {
    const select = document.getElementById("input-tpk");
    const filterRincianTPK = document.getElementById("filter-rincian-tpk");
    if (!select) return;

    const listTPK = state.master["tpk"] || [];
    const options = listTPK.map(item => `<option value="${item.name}">${item.name}</option>`).join("");

    // Update Dropdown di Form
    select.innerHTML = '<option value="">-- Pilih TPK --</option>' + options;

    // Update Dropdown di Filter Rincian (jika ada)
    if (filterRincianTPK) {
        filterRincianTPK.innerHTML = '<option value="">-- Semua TPK --</option>' + options;
    }
}

function renderAllDropdowns() {
    renderTPKDropdown();
    renderJenisKayuDropdown();

    // Tambahan untuk dropdown filter dashboard jika ID-nya berbeda
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

    // Update Dropdown di Form
    select.innerHTML = '<option value="">-- Pilih Jenis --</option>' + options;

    // Update Dropdown di Filter Rincian (jika ada)
    if (filterRincianJenis) {
        filterRincianJenis.innerHTML = '<option value="">-- Semua Jenis --</option>' + options;
    }
}

function save() {
    localStorage.setItem("sadhana_data_lokal", JSON.stringify(state.data));
    localStorage.setItem("sadhana_master", JSON.stringify(state.master)); // Samakan dengan key load
}

async function saveData() {
    // 1. Ambil nilai input dari HTML
    const rawDate = document.getElementById('input-date')?.value;
    const tanggalInput = rawDate ? formatTanggalDB(rawDate) : new Date().toISOString().split('T')[0];
    const ket = document.getElementById('input-ket')?.value?.trim() || "";
    const jenis = document.getElementById('input-jenis')?.value || "";
    const tpk = document.getElementById("input-tpk")?.value || "";
    const petak = document.getElementById('input-petak')?.value?.trim() || "-";
    
    // 2. Ambil nilai SM (Stack Meter) dari input Masuk & Keluar
    const masukSM = parseFloat(document.getElementById('input-in-sm')?.value || document.getElementById('input-in')?.value) || 0;
    const keluarSM = parseFloat(document.getElementById('input-out-sm')?.value || document.getElementById('input-out')?.value) || 0;

    // Validasi sederhana
    if (!ket || !jenis || !tpk) {
        alert("Harap lengkapi Keterangan, Jenis Kayu, dan TPK!");
        return;
    }

    if (masukSM === 0 && keluarSM === 0) {
        alert("Harap isi jumlah Masuk (SM) atau Keluar (SM)!");
        return;
    }

    // 3. Cari Faktor Konversi berdasarkan Jenis Kayu dari state/master data
    let faktorKonversi = 0.67; // Default faktor konversi
    if (state.master && state.master.jenis_kayu) {
        const itemKayu = state.master.jenis_kayu.find(k => k.name === jenis || k.jenis_kayu === jenis);
        if (itemKayu && itemKayu.faktor_konversi) {
            faktorKonversi = parseFloat(itemKayu.faktor_konversi);
        }
    }

    // 4. Hitung konversi SM ke M3
    const masukM3 = masukSM * faktorKonversi;
    const keluarM3 = keluarSM * faktorKonversi;

    // Tentukan SM aktif & M3 aktif untuk keperluan Notifikasi Alert
    const smAktif = masukSM > 0 ? masukSM : keluarSM;
    const m3Aktif = masukM3 > 0 ? masukM3 : keluarM3;

    const payload = {
        tanggal: tanggalInput,
        keterangan: ket,
        jenis_kayu: jenis, 
        tpk: tpk,      
        petak: petak,
        masuk_m3: masukM3,   // Nilai M3 yang sudah dikonversi
        keluar_m3: keluarM3   // Nilai M3 yang sudah dikonversi
    };

    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { data, error } = await api.from('stok_kayu').insert([payload]);

        if (error) {
            // Tangkap khusus Error 23505 (Data Duplikat Persis)
            if (error.code === '23505') {
                alert("⚠️ GAGAL SIMPAN: Data transaksi dengan Rincian, Tanggal, Jenis, TPK, dan Volume yang sama persis sudah ada di database!");
                return;
            }
            throw error;
        }

        // 5. Notifikasi Alert dengan perhitungan yang benar
        alert(`Data berhasil disimpan!\n${smAktif} SM x ${faktorKonversi} = ${m3Aktif.toFixed(2)} M³`);

        // Reset Form setelah simpan
        const form = document.getElementById('stock-form');
        if (form) form.reset();

        // Refresh Data Tabel
        if (typeof fetchData === 'function') await fetchData();
        if (typeof loadMutasiData === 'function') await loadMutasiData();

    } catch (err) {
        console.error("Gagal simpan via saveData:", err);
        alert("Gagal menyimpan data: " + (err.message || err));
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

// Fungsi untuk memastikan tanggal selalu YYYY-MM-DD (Aman dari Bug Timezone)
function formatTanggalDB(dateString) {
    if (!dateString) return null;
    
    // Jika format input sudah YYYY-MM-DD dari <input type="date">, langsung kembalikan
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }

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
        console.log("🔄 Mengambil data terbaru dari Supabase...");
        showLoading(true);

        // 1. Matikan filter sementara proses loading
        if (document.getElementById(idDari)) document.getElementById(idDari).disabled = true;
        if (document.getElementById(idSampai)) document.getElementById(idSampai).disabled = true;

        // 2. Ambil data dari Supabase
        const { data, error } = await api
            .from('stok_kayu')
            .select('*')
            .order('tanggal', { ascending: false });

        if (error) throw error;

        // 3. Update State Global
        state.data = data || [];
        state.filteredData = [...state.data]; // Sinkronkan data filter awal
        state.currentPage = 1; // Reset ke halaman pertama setiap kali refresh data

        // 4. Cukup panggil initSemuaFilter di sini (ia akan mengatur semua filter dropdown secara terpusat)
        if (typeof window.initSemuaFilter === 'function') {
            window.initSemuaFilter();
        }

        // 5. Render Tabel Utama
        renderDashboardTable();

        console.log("✅ Data berhasil dimuat. Total:", state.data.length, "baris.");

    } catch (err) {
        console.error("Kesalahan Fetch:", err.message);
        alert("Gagal mengambil data: " + err.message);
    } finally {
        // 6. Nyalakan kembali filter & tutup loading
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

    if (!confirm("Hapus data lama dan ganti dengan data dari file backup ini?")) {
        return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            if (typeof showLoading === 'function') showLoading(true);

            // 1. Baca isi file JSON
            const importedData = JSON.parse(e.target.result);

            // Tentukan letak array data (bisa langsung berupa array atau di dalam properti .data)
            const rowsToInsert = Array.isArray(importedData) 
                ? importedData 
                : (importedData.data || importedData.stok_kayu || []);

            if (!rowsToInsert || rowsToInsert.length === 0) {
                throw new Error("File backup kosong atau format data tidak sesuai.");
            }

            // Bersihkan properti ID jika ada agar tidak bentrok dengan auto-increment Supabase
            const cleanPayload = rowsToInsert.map(item => {
                const { id, created_at, ...rest } = item;
                return rest;
            });

            // 2. Kosongkan Tabel di Supabase (Mencegah Duplikat)
            const { error: delError } = await api
                .from('stok_kayu')
                .delete()
                .neq('id', 0); // Hapus semua baris

            if (delError) throw delError;

            // 3. Masukkan Data Baru ke Supabase
            const { error: insError } = await api
                .from('stok_kayu')
                .insert(cleanPayload);

            if (insError) throw insError;

            // 4. Perbarui State Lokal jika fungsi save tersedia
            if (typeof state !== 'undefined') {
                if (importedData.master) state.master = importedData.master;
                if (typeof save === 'function') save();
            }

            alert("✅ Database berhasil dipulihkan total!");
            location.reload(); // Segarkan halaman untuk menampilkan data baru

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
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.innerText = "👁️‍🗨️"; // Ikon mata terbuka/coret
    } else {
        passwordInput.type = "password";
        iconElement.innerText = "👁️"; // Ikon mata normal
    }
}

if (state.isLoggedIn) {
    const loginScr = document.getElementById("login-screen");
    const appCont = document.getElementById("app-container");
    if (loginScr) loginScr.classList.add("hidden");
    if (appCont) appCont.classList.remove("hidden");
    renderUI();
    
}


// NAVIGATION LOGIC
function toggleMenu(id) {
    const menu = document.getElementById(id + "-submenu");
    if (menu) menu.classList.toggle("open");
}

window.switchView = function (v) {
    state.view = v;

    // 1. Ambil elemen Modal Master
    const modal = document.getElementById('master-modal');

    // 2. Cek apakah menu yang dipilih adalah bagian dari Master Data
    const isMasterData = (v === 'jenis-kayu' || v === 'tpk');

    if (isMasterData) {
        // Tampilkan Modal Master jika menu jenis-kayu / tpk dipilih
        if (modal) modal.classList.remove('hidden');
    } else {
        // Sembunyikan Modal Master jika pindah ke menu lain
        if (modal) modal.classList.add('hidden');
    }

    // 3. Update Judul di Header
    const titleHeader = document.querySelector('.main-header h2, .main-header h1, .main-header h3, #page-title');
    if (titleHeader) {
        const names = {
            'dashboard': 'KARTU STOK',
            'rekap': 'REKAPITULASI',       // Disesuaikan dengan parameter 'rekap' dari HTML
            'rekap-saldo': 'REKAPITULASI SALDO',
            'rekap-rincian': 'RINCIAN MUTASI KAYU',
            'kelola-sandi': 'PENGATURAN',
            'backup-setting': 'PENGATURAN',
            'jenis-kayu': 'MASTER DATA',
            'tpk': 'MASTER DATA'
        };
        titleHeader.innerText = names[v] || v.toUpperCase();
    }

    // 4 & 5. Tampilkan section utama (Jika bukan Master Data Modal)
    if (!isMasterData) {
        // Sembunyikan semua section konten
        document.querySelectorAll('.view-section, [id^="view-"]').forEach(el => el.classList.add('hidden'));

        // Tampilkan section utama yang dipilih
        const target = document.getElementById('view-' + v);
        if (target) {
            target.classList.remove('hidden');
        }
    }

    // 6. Reset pagination
    state.currentPage = 1;

    // 7. Jalankan render data sesuai menu yang aktif
    if (v === 'dashboard' || v === 'kelola-sandi' || v === 'backup-setting') {
        if (typeof renderDashboardTable === 'function') renderDashboardTable();
    } else if (v === 'rekap' || v === 'rekap-saldo' || v === 'ringkasan') {
        if (typeof renderRekapSaldo === 'function') renderRekapSaldo();
    } else if (v === 'rekap-rincian') {
        if (typeof renderRekapRincian === 'function') renderRekapRincian();
    } else if (v === 'jenis-kayu') {
        if (typeof showMasterModal === 'function') showMasterModal('jenis_kayu');
        else if (typeof renderMasterJenisKayu === 'function') renderMasterJenisKayu();
    } else if (v === 'tpk') {
        if (typeof showMasterModal === 'function') showMasterModal('tpk');
        else if (typeof renderMasterTPK === 'function') renderMasterTPK();
    }
};



function showView(viewId) {
    // ... kode sembunyi/tampil Anda ...
    document.querySelectorAll('.view-section, [id^="view-"]').forEach(s => s.classList.add('hidden'));

    const target = document.getElementById('view-' + viewId) || document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');

        // JIKA MEMBUKA RINCIAN, PAKSA ISI
        if (viewId === 'rekap-rincian' || viewId === 'view-rekap-rincian') {
            window.sinkronisasiFilterRincian();
        }
    }
}


function applyRincianFilters() {
    const selectedTPK = document.getElementById("filter-rincian-tpk").value;
    const selectedJenis = document.getElementById("filter-rincian-jenis").value;

    // Filter data yang ada di memori (state.data)
    const hasilFilter = state.data.filter(d => {
        const matchTPK = selectedTPK === "" || d.tpk === selectedTPK;
        const matchJenis = selectedJenis === "" || d.jenis_kayu === selectedJenis;
        return matchTPK && matchJenis;
    });

    // Render ulang tabel dengan hasil filter saja
    renderFilteredTable(hasilFilter);
}

// Pasang listener agar saat dropdown diganti, tabel langsung berubah
document.getElementById("filter-rincian-tpk").addEventListener("change", applyRincianFilters);
document.getElementById("filter-rincian-jenis").addEventListener("change", applyRincianFilters);
// JALUR DARURAT: Tidak peduli fungsi lain error atau tidak
document.addEventListener('click', function (e) {
    // Jika yang diklik adalah menu Rincian (sesuaikan ID tombol menu Anda)
    // Atau kita cek saja keberadaan dropdown-nya secara rutin
    const tpkSelect = document.getElementById("filter-rincian-tpk");

    if (tpkSelect && tpkSelect.options.length <= 1) {
        if (state.data && state.data.length > 0) {
            console.log("Jalur Darurat: Mengisi dropdown...");

            const daftarTPK = [...new Set(state.data.map(d => d.tpk))].filter(Boolean).sort();
            const daftarJenis = [...new Set(state.data.map(d => d.jenis_kayu))].filter(Boolean).sort();

            let optTPK = '<option value="">-- Semua TPK --</option>';
            daftarTPK.forEach(t => optTPK += `<option value="${t}">${t}</option>`);
            tpkSelect.innerHTML = optTPK;

            const jenisSelect = document.getElementById("filter-rincian-jenis");
            if (jenisSelect) {
                let optJenis = '<option value="">-- Semua Jenis --</option>';
                daftarJenis.forEach(j => optJenis += `<option value="${j}">${j}</option>`);
                jenisSelect.innerHTML = optJenis;
            }
        }
    }
});



// Tambahkan juga fungsi hapusnya agar tombol sampah berfungsi
window.deleteMasterItem = async function (id) { // Cukup terima ID
    const type = state.currentMasterType; // Ambil type yang sedang aktif di modal
    if (!type) return;

    if (!confirm(`Hapus item ini dari master ${type.replace('_', ' ')}?`)) return;

    try {
        if (typeof showLoading === "function") showLoading(true);

        const { error } = await api
            .from('master_data')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 1. Update state lokal
        state.master[type] = state.master[type].filter(item => item.id != id);

        // 2. Refresh tampilan list di modal
        renderMasterList();

        // 3. Refresh semua dropdown di aplikasi agar sinkron
        if (typeof fetchAndPopulateMaster === "function") {
            await fetchAndPopulateMaster();
        }

        alert("Data berhasil dihapus!");
    } catch (err) {
        console.error(err);
        alert("Gagal menghapus: " + err.message);
    } finally {
        if (typeof showLoading === "function") showLoading(false);
    }
};

// SANDI & USER LOGIC
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

// MUTASI CRUD
// Fungsi untuk mendapatkan ID berikutnya
function getNextId() {
    if (state.data.length === 0) return 1;
    const maxId = Math.max(...state.data.map(d => parseInt(d.id) || 0));
    return maxId + 1;
}

function initLiveSearch() {
    const searchInput = document.getElementById("filter-rincian-ket");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();

        // Filter langsung dari state.data (memori) tanpa panggil Supabase lagi
        const filtered = state.data.filter(d => {
            const matchKet = (d.keterangan || "").toLowerCase().includes(searchTerm);
            const matchPetak = (d.petak || "").toLowerCase().includes(searchTerm);

            return matchKet || matchPetak;
        });

        // Kirim hasil filter ke fungsi render
        renderFilteredTable(filtered);
    });
}
function initLoginHandler() {
    const form = document.getElementById("login-form");
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        // Safety check: Pastikan state.config ada
        if (!state.config) {
            console.error("State config hilang! Memuat ulang config...");
            state.config = { user: "Admin", pass: "12345" };
        }

        const u = document.getElementById("login-user").value;
        const p = document.getElementById("login-pass").value;

        if (u === state.config.user && p === state.config.pass) {
            state.isLoggedIn = true;
            localStorage.setItem("sadhana_auth", "true");
            location.reload(); // Refresh untuk masuk ke aplikasi
        } else {
            alert("Username atau Password Salah!");
        }
    };
}

function logout() {
    localStorage.removeItem("sadhana_auth");
    location.reload();
}


// Contoh penyesuaian fungsi edit:
window.editData = function(id) {
    // 🛡️ Ambil data mutasi dari state
    const listMutasi = (state.filteredData && state.filteredData.length > 0) 
        ? state.filteredData 
        : (state.data || []);

    // 🛡️ Cari item berdasarkan ID
    const data = listMutasi.find(item => String(item.id) === String(id));

    if (!data) {
        console.error("Gagal menemukan ID:", id, "di dalam listMutasi.");
        alert("Data tidak ditemukan!");
        return;
    }

    // 🎯 PERCABANGAN KHUSUS LHP vs FORM BIASA
    const ketUpper = (data.keterangan || '').toUpperCase();

    if (ketUpper.includes("LHP")) {
        // Jika data LHP, buka Modal Melayang LHP (Panggil fungsi yang kita buat sebelumnya)
        if (typeof editLhpItem === 'function') {
            editLhpItem(data);
        } else {
            console.error("Fungsi editLhpItem belum terpasang!");
        }
    } else {
        // Jika data mutasi BIASA, isi ke Form Utama seperti biasa
        document.getElementById('edit-id').value = data.id;
        document.getElementById('input-date').value = data.tanggal || '';
        document.getElementById('input-ket').value = data.keterangan || '';
        document.getElementById('input-jenis').value = data.jenis_kayu || '';
        document.getElementById('input-tpk').value = data.tpk || '';
        document.getElementById('input-petak').value = data.petak || '';

        // AMBIL NILAI SM
        const inSM = data.masuk_sm ?? (data.masuk_m3 ? Math.round((data.masuk_m3 / 0.67) * 100) / 100 : 0);
        const outSM = data.keluar_sm ?? (data.keluar_m3 ? Math.round((data.keluar_m3 / 0.67) * 100) / 100 : 0);

        document.getElementById('input-in-sm').value = inSM;
        document.getElementById('input-out-sm').value = outSM;

        // Ubah UI Form Utama ke mode Edit
        document.getElementById('form-mode-title').innerText = 'Edit Data Mutasi';
        document.getElementById('btn-submit').innerText = 'Update Data';
        
        const btnCancel = document.getElementById('btn-cancel-edit');
        if (btnCancel) btnCancel.classList.remove('hidden');

        // Scroll halus ke form utama
        document.getElementById('form-mode-title')?.scrollIntoView({ behavior: 'smooth' });
    }
};

window.deleteData = function(rawId) {
    const cleanId = parseInt(rawId, 10);
    if (isNaN(cleanId)) return alert("ID data tidak valid!");

    // Konfirmasi menggunakan SweetAlert2 (Tidak bisa diblokir browser)
    Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Apakah Anda yakin ingin menghapus data dengan ID ${cleanId}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        // Eksekusi hanya jika tombol "Ya, Hapus!" diklik
        if (result.isConfirmed) {
            try {
                if (typeof showLoading === 'function') showLoading(true);

                // 1. Eksekusi Hapus ke Supabase
                const response = await api
                    .from('stok_kayu')
                    .delete()
                    .eq('id', cleanId);

                if (response && response.error) throw response.error;

                // 2. Update State Lokal (UI Instan)
                if (typeof state !== 'undefined') {
                    if (Array.isArray(state.data)) {
                        state.data = state.data.filter(item => Number(item.id) !== cleanId);
                    }
                    if (Array.isArray(state.filteredData)) {
                        state.filteredData = state.filteredData.filter(item => Number(item.id) !== cleanId);
                    }
                }

                // 3. Fetch Ulang & Re-render
                if (typeof fetchData === 'function') await fetchData();
                if (typeof applyFilter === 'function') applyFilter();
                if (typeof filterData === 'function') filterData();
                
                if (typeof renderDashboardTable === 'function') renderDashboardTable();
                if (typeof renderRekapRincian === 'function') renderRekapRincian();
                if (typeof renderRincian === 'function') renderRincian();

                // Notifikasi Sukses
                Swal.fire('Terhapus!', 'Data berhasil dihapus dari database.', 'success');

            } catch (err) {
                console.error("Error saat menghapus:", err);
                Swal.fire('Gagal!', 'Gagal menghapus data: ' + (err.message || err), 'error');
            } finally {
                if (typeof showLoading === 'function') showLoading(false);
            }
        }
    });
};

// ==========================================
// 2. FUNGSI BATAL EDIT (Kembali ke Mode Simpan)
// ==========================================
window.cancelEdit = function() {
    const stockForm = document.getElementById('stock-form');
    if (stockForm) stockForm.reset();

    const setVal = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.value = value;
    };

    // Reset ID dan Nilai Input
    setVal('edit-id', '');
    setVal('input-in-sm', 0);
    setVal('input-out-sm', 0);

    // 🔄 KEMBALIKAN TOMBOL & JUDUL KE MODE INPUT BARU
    const titleEl = document.getElementById('form-mode-title');
    if (titleEl) titleEl.innerText = "Input Mutasi";

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.innerText = "Simpan"; // Mengembalikan teks ke Simpan

    const btnCancel = document.getElementById('btn-cancel-edit');
    if (btnCancel) btnCancel.classList.add('hidden'); // Sembunyikan tombol Batal
};

// ==========================================
// 1. FUNGSI HAPUS MASSAL (deleteSelected)
// ==========================================
window.deleteSelected = async function () {
    // 💡 Diperbaiki: Mengambil checkbox dengan class '.row-checkbox' yang dicentang
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    
    // 💡 Diperbaiki: Mengambil value id (bisa via cb.value atau cb.getAttribute('data-id'))
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
            .in('id', idsToDelete); // Menghapus massal berdasarkan array ID

        if (error) throw error;

        alert(`${idsToDelete.length} data terpilih berhasil dihapus!`);
        
        // Uncheck header 'Select All' jika ada
        const selectAllHeader = document.getElementById('select-all-header');
        if (selectAllHeader) selectAllHeader.checked = false;

        // Refresh data tabel
        if (typeof fetchData === 'function') await fetchData();
        if (typeof loadMutasiData === 'function') await loadMutasiData();

    } catch (err) {
        console.error("Gagal Hapus Massal:", err);
        alert("Gagal menghapus massal: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};


window.toggleSelectAll = function(source) {
    // Ambil semua checkbox baris yang punya class 'row-checkbox'
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
};

// RENDER UI & TABLES
function renderUI() {
    // 1. Definisikan variabel dengan benar
    const elInputJenis = document.getElementById('input-jenis');
    const elInputTPK = document.getElementById('input-tpk');

    // 2. Gunakan pengecekan 'if' agar tidak error jika elemen tidak ada di HTML
    if (elInputJenis) {
        if (state.master && state.master["jenis_kayu"]) {
            elInputJenis.innerHTML = '<option value="">-- Pilih Jenis --</option>' +
                state.master["jenis_kayu"].map(m => `<option value="${m.name}">${m.name}</option>`).join("");
        }
    } else {
        console.warn("Elemen 'input-jenis' tidak ditemukan di HTML.");
    }

    if (elInputTPK) {
        if (state.master && state.master["tpk"]) {
            elInputTPK.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                state.master["tpk"].map(m => `<option value="${m.name}">${m.name}</option>`).join("");
        }
    }
}


// Fungsi yang sama untuk bagian Rincian (Sesuaikan ID-nya)
window.updateRincianPetakByTPK = function () {
    const tpkVal = document.getElementById('filter-rincian-tpk')?.value;
    const petakEl = document.getElementById('filter-rincian-petak');

    if (!petakEl) return;

    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';

    if (!tpkVal || !state.data) {
        petakEl.disabled = true;
        return;
    }

    // Ambil petak unik berdasarkan TPK yang dipilih
    const daftarPetak = [...new Set(state.data
        .filter(d => String(d.tpk || "").trim().toLowerCase() === String(tpkVal || "").trim().toLowerCase())
        .map(d => d.petak))]
        .filter(p => p && p !== '-')
        .sort();

    if (daftarPetak.length > 0) {
        daftarPetak.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            petakEl.appendChild(opt);
        });
        petakEl.disabled = false;
    } else {
        petakEl.disabled = true;
    }
};

function terapkanFilter() {
    const bulan = document.getElementById('filter-rekap-bulan').value; // Pastikan ID sesuai HTML
    const tahun = document.getElementById('filter-rekap-tahun').value;

    let filtered = [...state.data];

    if (bulan) {
        filtered = filtered.filter(d => d.tanggal.split('-')[1] === bulan);
    }
    if (tahun) {
        filtered = filtered.filter(d => d.tanggal.split('-')[0] === tahun);
    }

    // PANGGIL ULANG TABEL DENGAN DATA HASIL FILTER
    renderDashboardTable(filtered);
}
function applyRincianFilter() {
    const dariBulan = document.getElementById('filter-rincian-bulan-dari').value;
    const dariTahun = document.getElementById('filter-rincian-tahun-dari').value;
    const sampaiBulan = document.getElementById('filter-rincian-bulan-sampai').value;
    const sampaiTahun = document.getElementById('filter-rincian-tahun-sampai').value;
    const tpk = document.getElementById('filter-rincian-tpk').value;

    const tglMulai = `${dariTahun}-${dariBulan || '01'}-01`;
    const tglSelesai = `${sampaiTahun}-${sampaiBulan || '12'}-31`;

    // Filter data berdasarkan rentang dan kriteria
    let filtered = state.data.filter(d => {
        const matchTanggal = d.tanggal >= tglMulai && d.tanggal <= tglSelesai;
        const matchTPK = tpk ? d.tpk === tpk : true;
        return matchTanggal && matchTPK;
    });

    // Urutkan berdasarkan tanggal tertua ke terbaru untuk rincian
    filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    // Render ke tabel rincian
    const body = document.getElementById('rincian-table-body');
    let runningSaldo = 0;

    body.innerHTML = filtered.map(d => {
        const masuk = parseFloat(d.masuk_m3 || 0);
        const keluar = parseFloat(d.keluar_m3 || 0);
        runningSaldo += (masuk - keluar);

        return `
            <tr>
                <td>${d.tanggal}</td>
                <td>${d.keterangan}</td>
                <td>${d.jenis_kayu}</td>
                <td>${d.tpk}</td>
                <td>${d.petak}</td>
                <td class="text-right">${masuk.toFixed(2)}</td>
                <td class="text-right">${keluar.toFixed(2)}</td>
                <td class="text-right"><strong>${runningSaldo.toFixed(2)}</strong></td>
            </tr>
        `;
    }).join('');
}
function applyRekapFilter() {
    const dariBulan = parseInt(document.getElementById('filter-dari-bulan').value);
    const dariTahun = parseInt(document.getElementById('filter-dari-tahun').value);
    const sampaiBulan = parseInt(document.getElementById('filter-sampai-bulan').value);
    const sampaiTahun = parseInt(document.getElementById('filter-sampai-tahun').value);

    const tpk = document.getElementById('filter-tpk').value;
    const jenis = document.getElementById('filter-jenis').value;
    const petak = document.getElementById('filter-petak').value;

    if (!dariBulan || !dariTahun || !sampaiBulan || !sampaiTahun) {
        alert("Mohon lengkapi rentang Bulan dan Tahun filter.");
        return;
    }

    const tglAwalFilter = new Date(dariTahun, dariBulan - 1, 1);
    const tglAkhirFilter = new Date(sampaiTahun, sampaiBulan, 0); // Akhir bulan

    // Penampung hasil grouping
    const rekapData = {};

    state.data.forEach(d => {
        // Filter Dasar (TPK, Jenis, Petak)
        if (tpk && d.tpk !== tpk) return;
        if (jenis && d.jenis_kayu !== jenis) return;
        if (petak && d.petak !== petak) return;

        const tglData = new Date(d.tanggal);
        const key = `${d.jenis_kayu}-${d.tpk}-${d.petak}`;

        if (!rekapData[key]) {
            rekapData[key] = { jenis: d.jenis_kayu, tpk: d.tpk, petak: d.petak, awal: 0, bap: 0, lhp: 0, keluar: 0 };
        }

        const volMasuk = parseFloat(d.masuk_m3) || 0;
        const volKeluar = parseFloat(d.keluar_m3) || 0;

        if (tglData < tglAwalFilter) {
            // Masuk ke Saldo Awal jika tanggal sebelum filter dimulai
            rekapData[key].awal += (volMasuk - volKeluar);
        } else if (tglData >= tglAwalFilter && tglData <= tglAkhirFilter) {
            // Masuk ke Mutasi Periode Ini
            if (d.keterangan === 'BAP') rekapData[key].bap += volMasuk;
            else if (d.keterangan === 'LHP') rekapData[key].lhp += volMasuk;
            else rekapData[key].awal += volMasuk; // Jika keterangan lain tapi masuk periode

            rekapData[key].keluar += volKeluar;
        }
    });

    renderRekapTable(Object.values(rekapData));
}

function renderFilteredTable(filteredData) {
    const tbody = document.getElementById("rincian-table-body");
    if (!tbody) return;

    // Bersihkan tabel
    tbody.innerHTML = "";

    // Jika data terlalu banyak, ambil 500 saja untuk performa scrolling
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

    // Update info jumlah data ditemukan
    console.log(`Ditemukan: ${filteredData.length} baris`);
}

function renderMutasiTable(data) {
    const tbody = document.getElementById('main-table-body');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 15px; color: #888;">Tidak ada data mutasi</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => {
        // Konversi angka masuk & keluar M3
        const masuk = parseFloat(item.masuk_m3 || 0);
        const keluar = parseFloat(item.keluar_m3 || 0);

        return `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="row-checkbox" value="${item.id}">
                </td>
                <td>${item.tanggal || '-'}</td>
                <td>${item.keterangan || '-'}</td>
                <td>${item.jenis_kayu || '-'}</td>
                <td>${item.tpk || '-'}</td>
                <td>${item.petak || '-'}</td>
                <td style="text-align: right;">${masuk > 0 ? masuk.toFixed(2) : '-'}</td>
                <td style="text-align: right;">${keluar > 0 ? keluar.toFixed(2) : '-'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <!-- ✏️ TOMBOL EDIT (Dipanggil lewat window.editData) -->
                    <button type="button" 
                            onclick="window.editData ? window.editData('${item.id}') : editData('${item.id}')" 
                            style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;" 
                            title="Edit Data">
                        ✏️
                    </button>
                    
                    <!-- 🗑️ TOMBOL HAPUS (Dipanggil lewat window.deleteData) -->
                    <button type="button" 
                            onclick="window.deleteData ? window.deleteData('${item.id}') : deleteData('${item.id}')" 
                            style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;" 
                            title="Hapus Data">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 💡 Helper fungsi untuk menghitung hasil konversi (Bisa ditaruh di atas fungsi ini)
function hitungKonversi(jenisKayu, volumeM3) {
    if (!window.state || !window.state.konversiKayu) return volumeM3;
    const faktor = window.state.konversiKayu[jenisKayu] || 1;
    return volumeM3 * faktor;
}

function getProcessedRekapData() {
    const allData = (typeof state !== 'undefined' && Array.isArray(state.data)) ? state.data : [];

    // 1. Pembacaan ID yang PRESISI sesuai HTML view-rekap (Hanya Bulan, Tahun, TPK, & Jenis)
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
    
    const fBFrom = getVal("filter-dari-bulan");
    const fTFrom = getVal("filter-dari-tahun");
    const fBTo = getVal("filter-sampai-bulan");
    const fTTo = getVal("filter-sampai-tahun");

    const fTPK = getVal("filter-tpk");
    const fJenis = getVal("filter-jenis");

    // 2. Konversi Rentang Tanggal Filter ke Angka Integer (YYYYMM)
    const numTFrom = parseInt(fTFrom, 10);
    const numBFrom = parseInt(fBFrom, 10);
    const numTTo = parseInt(fTTo, 10);
    const numBTo = parseInt(fBTo, 10);

    const fromVal = (!isNaN(numTFrom) && !isNaN(numBFrom)) ? (numTFrom * 100 + numBFrom) : 0;
    const toVal = (!isNaN(numTTo) && !isNaN(numBTo)) ? (numTTo * 100 + numBTo) : 999999;

    const grouped = {};

    allData.forEach(d => {
        if (!d.tanggal) return;

        // Parsing Tanggal Data Transaksi (Format expected: YYYY-MM-DD)
        const parts = d.tanggal.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const dVal = (isNaN(y) || isNaN(m)) ? 0 : (y * 100 + m);

        // --- FILTER STRICT TANGGAL (HANYA PERIODE PILIHAN) ---
        if (fromVal > 0 && dVal < fromVal) return; // Buang data sebelum bulan/tahun 'dari'
        if (toVal < 999999 && dVal > toVal) return; // Buang data setelah bulan/tahun 'sampai'

        // --- FILTER PROPERTIES (HANYA TPK & JENIS) ---
        const itemJenis = String(d.jenis_kayu || d.jenis || '').trim();
        const itemTPK = String(d.tpk || '').trim();
        const itemPetak = String(d.petak || '').trim(); // Tetap diambil untuk ditampilkan di tabel

        if (fTPK && itemTPK.toLowerCase() !== fTPK.toLowerCase()) return;
        if (fJenis && itemJenis.toLowerCase() !== fJenis.toLowerCase()) return;

        // --- GROUPING DATA PER (JENIS + TPK + PETAK) ---
        const key = `${itemJenis || '-'}_${itemTPK || '-'}_${itemPetak || '-'}`;

        if (!grouped[key]) {
            grouped[key] = {
                jenis: itemJenis || '-',
                tpk: itemTPK || '-',
                petak: itemPetak || '-', // Cukup di-select / ditampilkan di sini
                sAwalBAP: 0,
                sAwalLHP: 0,
                bapBerjalan: 0,
                lhpBerjalan: 0,
                kirimBerjalan: 0,
                sBAP: 0,
                sLHP: 0
            };
        }

        const item = grouped[key];
        const valMasuk = parseFloat(d.masuk_m3 || d.p || 0);
        const valKeluar = parseFloat(d.keluar_m3 || d.m || 0);
        const ket = (d.keterangan || "").toUpperCase();

        // Hitung Transaksi Berjalan di Periode Terpilih
        if (ket.includes("KIRIM")) {
            item.kirimBerjalan += valKeluar;
        } else if (ket.includes("LHP")) {
            item.lhpBerjalan += valMasuk;
        } else {
            item.bapBerjalan += valMasuk;
        }
    });

    // 3. Kalkulasi Akhir Saldo BAP & LHP serta Grand Total
    const rows = [];
    const totals = {
        totalSAwalBAP: 0, totalSAwalLHP: 0,
        totalBapBerjalan: 0, totalLhpBerjalan: 0, totalKirimBerjalan: 0,
        totalGrandBAP: 0, totalGrandLHP: 0
    };

    Object.values(grouped).forEach(item => {
        item.sBAP = item.bapBerjalan - item.lhpBerjalan;
        item.sLHP = item.lhpBerjalan - item.kirimBerjalan;

        totals.totalSAwalBAP += item.sAwalBAP;
        totals.totalSAwalLHP += item.sAwalLHP;
        totals.totalBapBerjalan += item.bapBerjalan;
        totals.totalLhpBerjalan += item.lhpBerjalan;
        totals.totalKirimBerjalan += item.kirimBerjalan;
        totals.totalGrandBAP += item.sBAP;
        totals.totalGrandLHP += item.sLHP;

        rows.push(item);
    });

    return { rows, totals };
}

// =========================================================
// 2. FUNGSI RENDER TABEL REKAP SALDO
// =========================================================
window.renderRekapSaldo = function () {
    const tableBody = document.getElementById("rekap-table-body");
    if (!tableBody) return;

    const dataProcessed = getProcessedRekapData();
    if (!dataProcessed || dataProcessed.rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 20px; color: #dc2626;">Tidak ada data mutasi rekap untuk periode ini</td></tr>';
        return;
    }

    const formatSaldo = (val) => {
        let num = parseFloat(val) || 0;
        if (Math.abs(num) < 0.0001) num = 0;
        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const { rows, totals } = dataProcessed;

    let html = rows.map((r) => `
        <tr>
            <td>${r.jenis}</td>
            <td>${r.tpk}</td>
            <td class="text-center">${r.petak}</td>
            <td class="text-right">${formatSaldo(r.sAwalBAP)}</td>
            <td class="text-right">${formatSaldo(r.sAwalLHP)}</td>
            <td class="text-right">${formatSaldo(r.bapBerjalan)}</td>
            <td class="text-right">${formatSaldo(r.lhpBerjalan)}</td>
            <td class="text-right">${formatSaldo(r.kirimBerjalan)}</td>
            <td class="text-right" style="font-weight:bold">${formatSaldo(r.sBAP)}</td>
            <td class="text-right" style="font-weight:bold">${formatSaldo(r.sLHP)}</td>
        </tr>
    `).join('');

    // Baris Grand Total
    html += `
        <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #374151;">
            <td colspan="3" class="text-center">TOTAL KESELURUHAN</td>
            <td class="text-right">${formatSaldo(totals.totalSAwalBAP)}</td>
            <td class="text-right">${formatSaldo(totals.totalSAwalLHP)}</td>
            <td class="text-right">${formatSaldo(totals.totalBapBerjalan)}</td>
            <td class="text-right">${formatSaldo(totals.totalLhpBerjalan)}</td>
            <td class="text-right">${formatSaldo(totals.totalKirimBerjalan)}</td>
            <td class="text-right">${formatSaldo(totals.totalGrandBAP)}</td>
            <td class="text-right">${formatSaldo(totals.totalGrandLHP)}</td>
        </tr>
    `;

    tableBody.innerHTML = html;
};

function renderHistoriMutasi() {
    const tableBody = document.getElementById("dashboard-table-body");
    if (!tableBody) return;

    // WAJIB: Urutkan Terlama ke Terbaru untuk Saldo Berjalan
    let filteredData = [...state.data].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    let sisaBAPSebelumnya = 0;
    let sisaLHPSebelumnya = 0;

    tableBody.innerHTML = filteredData.map(d => {
        const bapBerjalan = parseFloat(d.masuk_m3 || 0);
        const lhpBerjalan = parseFloat(d.keluar_m3 || 0); // Inilah LHP
        const kirimBerjalan = parseFloat(d.kirim_m3 || 0);

        const saldoBAP = (sisaBAPSebelumnya + bapBerjalan) - lhpBerjalan;
        const saldoLHP = (sisaLHPSebelumnya + lhpBerjalan) - kirimBerjalan;

        sisaBAPSebelumnya = saldoBAP;
        sisaLHPSebelumnya = saldoLHP;

        return `
            <tr>
                <td>${d.tanggal}</td>
                <td>${d.keterangan || '-'}</td>
                <td class="text-right">${bapBerjalan.toFixed(2)}</td>
                <td class="text-right" style="color:blue; font-weight:bold;">${lhpBerjalan.toFixed(2)}</td>
                <td class="text-right" style="background:#e6fffa;">${saldoBAP.toFixed(2)}</td>
                <td class="text-right" style="background:#fffaf0;">${saldoLHP.toFixed(2)}</td>
            </tr>`;
    }).join('');
}


// Helper untuk memproses data rincian (filter + hitung saldo awal)
function getProcessedRincianData() {
    const allData = (typeof state !== 'undefined' && Array.isArray(state.data)) ? state.data : [];

    // Helper aman dari null / undefined
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
    
    // 1. Ambil Filter dari HTML
    const fTFrom = getVal("filter-rincian-tahun-dari");
    const fBFrom = getVal("filter-rincian-bulan-dari");
    const fTTo = getVal("filter-rincian-tahun-sampai");
    const fBTo = getVal("filter-rincian-bulan-sampai");

    const fTPK = getVal("filter-rincian-tpk").toLowerCase();
    const fJenis = getVal("filter-rincian-jenis").toLowerCase();
    const fPetak = getVal("filter-rincian-petak").toLowerCase();
    const fKet = getVal("filter-rincian-ket").toLowerCase();

    const numTFrom = parseInt(fTFrom, 10);
    const numBFrom = parseInt(fBFrom, 10);
    const numTTo = parseInt(fTTo, 10);
    const numBTo = parseInt(fBTo, 10);

    const fromVal = (!isNaN(numTFrom) && !isNaN(numBFrom)) ? (numTFrom * 100 + numBFrom) : 0;
    const toVal = (!isNaN(numTTo) && !isNaN(numBTo)) ? (numTTo * 100 + numBTo) : 999999;

    let saldoAwal = 0;

    // -------------------------------------------------------------
    // STEP 1: HITUNG SALDO AWAL (Hanyahitung BAP/Fisik Sebelum Periode)
    // -------------------------------------------------------------
    allData.forEach(d => {
        if (!d.tanggal) return;
        const parts = d.tanggal.split("-");
        if (parts.length < 2) return;
        
        const dVal = parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);
        const ket = (d.keterangan || d.ket || "").toUpperCase();

        if (fromVal > 0 && dVal < fromVal) {
            const itemJenis = String(d.jenis_kayu || d.jenis || '').trim().toLowerCase();
            const itemTPK = String(d.tpk || '').trim().toLowerCase();
            const itemPetak = String(d.petak || '').trim().toLowerCase();

            // PENTING: Hanya filter jika inputan user TIDAK KOSONG
            if (fTPK !== "" && itemTPK !== fTPK) return;
            if (fJenis !== "" && itemJenis !== fJenis) return;
            if (fPetak !== "" && itemPetak !== fPetak) return;

            // KONSISTENSI LOGIKA: Abaikan LHP di Saldo Awal (Karena sudah terwakili BAP)
            if (ket.includes("LHP")) return;

            const masuk = parseFloat(d.masuk_m3 || d.p || 0) || 0;
            const keluar = parseFloat(d.keluar_m3 || d.m || 0) || 0;
            saldoAwal += (masuk - keluar);
        }
    });

    // -------------------------------------------------------------
    // STEP 2: FILTER DATA PERIODE BERJALAN & SORTING
    // -------------------------------------------------------------
    let filtered = allData.filter(d => {
        if (!d.tanggal) return false;
        const parts = d.tanggal.split("-");
        if (parts.length < 2) return false;
        
        const dVal = parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);

        if (fromVal > 0 && dVal < fromVal) return false;
        if (toVal < 999999 && dVal > toVal) return false;

        const itemJenis = String(d.jenis_kayu || d.jenis || '').trim().toLowerCase();
        const itemTPK = String(d.tpk || '').trim().toLowerCase();
        const itemPetak = String(d.petak || '').trim().toLowerCase();
        const itemKet = String(d.keterangan || d.ket || '').toLowerCase();

        // PENTING: Cek keabsahan filter opsional
        if (fTPK !== "" && itemTPK !== fTPK) return false;
        if (fJenis !== "" && itemJenis !== fJenis) return false;
        if (fPetak !== "" && itemPetak !== fPetak) return false;
        if (fKet !== "" && !itemKet.includes(fKet)) return false;

        return true;
    }).sort((a, b) => {
        const dateDiff = new Date(a.tanggal) - new Date(b.tanggal);
        if (dateDiff !== 0) return dateDiff;

        const getPriority = (k) => {
            const txt = (k || "").toUpperCase();
            if (txt.includes("SALDO AWAL")) return 0;
            if (txt.includes("BAP")) return 1;
            if (txt.includes("LHP")) return 2;
            if (txt.includes("KIRIM")) return 3;
            return 4;
        };
        return getPriority(a.keterangan || a.ket) - getPriority(b.keterangan || b.ket);
    });

    // -------------------------------------------------------------
    // STEP 3: MAPPING DATA
    // -------------------------------------------------------------
    const mappedFiltered = filtered.map(d => {
        const rawMasuk = parseFloat(d.masuk_m3 ?? d.p ?? 0) || 0;
        const rawKeluar = parseFloat(d.keluar_m3 ?? d.m ?? 0) || 0;

        return {
            ...d,
            p: rawMasuk,
            m: rawKeluar,
            ket: d.keterangan || d.ket || "",
            jenis: d.jenis_kayu || d.jenis || ""
        };
    });

    return { filtered: mappedFiltered, saldoAwal };
}

// Aliasing
const getFilteredRincianData = getProcessedRincianData;

function renderRincian() {
    const body = document.getElementById("rincian-table-body");
    const pageInfo = document.getElementById("page-info");
    if (!body) return;

    if (!state.hasAppliedFilter) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #64748b;">Silakan terapkan filter untuk menampilkan data</td></tr>';
        return;
    }

    const processed = getProcessedRincianData();
    if (!processed || !processed.filtered) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #ef4444;">Gagal memproses data mutasi.</td></tr>';
        return;
    }

    const { filtered } = processed;
    const totalRows = filtered.length;

    if (totalRows === 0) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #64748b;">Tidak ada data mutasi yang sesuai dengan filter.</td></tr>';
        if (pageInfo) pageInfo.innerText = "Halaman 0 dari 0";
        return;
    }

    // --- 1. PAGINATION CHECK ---
    const rowsPerPage = state.rowsPerPage || 10;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

    if (!state.currentPage || state.currentPage < 1) state.currentPage = 1;
    if (state.currentPage > totalPages) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    // --- 2. AKUMULASI SALDO DARI 0 (HANYA MENGHITUNG TRANSAKSI PERIODE TERFILTER) ---
    let runningSaldo = 0; // Saldo awal di-set 0 agar murni menghitung filter bulan/tahun aktif
    let totalMasukUtama = 0;
    let totalKeluarUtama = 0;

    const processedDataWithSaldo = filtered.map((d) => {
        const valP = parseFloat(d.p || 0); 
        const valM = parseFloat(d.m || 0);
        const ketUpper = String(d.ket || "").toUpperCase();

        let mskTampil = 0, klrTampil = 0;
        let mskHitung = 0, klrHitung = 0;

        if (ketUpper.includes("KIRIM")) {
            mskTampil = 0; 
            klrTampil = valM;
            mskHitung = 0; 
            klrHitung = valM;
        } else if (ketUpper.includes("BAP")) {
            // BAP SEKARANG JADI ADM (Tampil di tabel, TAPI TIDAK DIHITUNG ke saldo)
            mskTampil = valP; 
            klrTampil = 0;
            mskHitung = 0; 
            klrHitung = 0;
        } else if (ketUpper.includes("LHP")) {
            // LHP SEKARANG JADI MASUK UTAMA (Tampil dan DIHITUNG ke saldo)
            mskTampil = valP; 
            klrTampil = 0;
            mskHitung = valP; 
            klrHitung = 0;
        } else {
            mskTampil = valP; 
            klrTampil = valM;
            mskHitung = valP; 
            klrHitung = valM;
        }

        // Hitung Saldo Murni Periode Terfilter
        runningSaldo += (mskHitung - klrHitung);
        totalMasukUtama += mskHitung;
        totalKeluarUtama += klrHitung;

        return {
            tanggal: d.tanggal || '-',
            ketTampil: d.ket || '-',
            jenisTampil: d.jenis || '-',
            tpk: d.tpk || '-',
            petak: d.petak || '-',
            mskTampil,
            klrTampil,
            currentRunningSaldo: runningSaldo
        };
    });

    const paginatedData = processedDataWithSaldo.slice(startIndex, endIndex);
    let htmlContent = "";

    // --- 3. BARIS SALDO AWAL DIHAPUS / DIESEKUSI LANGSUNG KE TRANSAKSI ---

    // --- 4. RENDER ROWS ---
    paginatedData.forEach(d => {
        const isBAP = d.ketTampil.toUpperCase().includes('BAP');
        const rowStyle = isBAP ? 'background-color: #fffbeb; color: #92400e;' : '';

        htmlContent += `
            <tr style="${rowStyle}">
                <td>${d.tanggal}</td>
                <td>${isBAP ? `<em>(Adm)</em> ${d.ketTampil}` : d.ketTampil}</td>
                <td>${d.jenisTampil}</td>
                <td>${d.tpk}</td>
                <td class="text-center">${d.petak}</td>
                <td class="text-right">${d.mskTampil > 0 ? d.mskTampil.toFixed(2) : '-'}</td>
                <td class="text-right">${d.klrTampil > 0 ? d.klrTampil.toFixed(2) : '-'}</td>
                <td class="text-right" style="font-weight:bold">${d.currentRunningSaldo.toFixed(2)}</td>
            </tr>`;
    });

    // --- 5. GRAND TOTAL MUTASI PERIODE TERFILTER ---
    if (state.currentPage === totalPages) {
        htmlContent += `
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #334155;">
                <td colspan="5" class="text-center">GRAND TOTAL MUTASI PERIODE INI</td>
                <td class="text-right">${totalMasukUtama.toFixed(2)}</td>
                <td class="text-right">${totalKeluarUtama.toFixed(2)}</td>
                <td class="text-right">${runningSaldo.toFixed(2)}</td>
            </tr>`;
    }

    body.innerHTML = htmlContent;

    if (pageInfo) {
        pageInfo.innerText = `Halaman ${state.currentPage} dari ${totalPages}`;
    }
}

// Global Binding
window.renderRincian = renderRincian;
window.renderRekapRincian = renderRincian;

// BACKUP & EXPORT
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

// ===== EXPORT REKAP SALDO TO XLS (WITH KOP SURAT) =====
function exportRekapExcel() {
    const table = document.querySelector("#view-rekap table");
    if (!table || table.rows.length <= 1) {
        alert("Tidak ada data rekap untuk diekspor. Silakan terapkan filter terlebih dahulu.");
        return;
    }

    const filterBulan = state?.filter?.dariBulan || "Semua";
    const filterTahun = state?.filter?.dariTahun || new Date().getFullYear();
    const tglCetak = new Date().toLocaleDateString('id-ID');

    // CSS Style khusus Excel (Border, Alignments, Font, & Formatting)
    const style = `
        <style>
            table { border-collapse: collapse; font-family: Calibri, sans-serif; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11pt; }
            th { background-color: #1e293b; color: #ffffff; text-align: center; font-weight: bold; }
            .kop-title { font-size: 16pt; font-weight: bold; color: #1e293b; }
            .kop-sub { font-size: 10pt; color: #64748b; italic: true; }
            .report-title { font-size: 14pt; font-weight: bold; color: #0f172a; text-align: center; }
            .report-sub { font-size: 10pt; color: #475569; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
        </style>
    `;

    // HTML Kop Perusahaan & Judul Laporan (Menggunakan Merge Colspan 11)
    const kopHeaderHtml = `
        <table>
            <tr><td colspan="11" class="kop-title">PT. SADHANA ARIFNUSA</td></tr>
            <tr><td colspan="11" class="kop-sub">Kawasan Pengelolaan Hutan & TPK Terpadu</td></tr>
            <tr><td colspan="11" class="kop-sub" style="border-bottom: 2px solid #1e293b;">Jl. Raya Labuhan Lombok - Sambelia | Telp: -</td></tr>
            <tr><td colspan="11"></td></tr> <!-- Baris Kosong -->
            <tr><td colspan="11" class="report-title">LAPORAN REKAPITULASI SALDO STOK KAYU</td></tr>
            <tr><td colspan="11" class="report-sub">Periode: ${filterBulan} ${filterTahun} | Dicetak: ${tglCetak}</td></tr>
            <tr><td colspan="11"></td></tr> <!-- Baris Kosong -->
        </table>
    `;

    // Tanda Tangan / Pengesahan di Bagian Bawah
    const ttdFooterHtml = `
        <br/>
        <table>
            <tr>
                <td colspan="8"></td>
                <td colspan="3" class="text-center">Disetujui Oleh,</td>
            </tr>
            <tr style="height: 50px;">
                <td colspan="8"></td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td colspan="8"></td>
                <td colspan="3" class="text-center bold">( GANISPH )</td>
            </tr>
        </table>
    `;

    // Gabungkan Semua Elemen HTML
    const fullHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8"/>
            ${style}
        </head>
        <body>
            ${kopHeaderHtml}
            ${table.outerHTML}
            ${ttdFooterHtml}
        </body>
        </html>
    `;

    const fileName = `Rekap_Stok_Kayu_${new Date().getTime()}.xls`;
    const url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(fullHtml);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}


// ===== EXPORT RINCIAN MUTASI TO XLS (WITH KOP SURAT) =====
function exportRincianExcel() {
    const table = document.querySelector("#view-rekap-rincian table");
    if (!table || table.rows.length <= 1) {
        alert("Tidak ada data rincian untuk diekspor. Silakan terapkan filter terlebih dahulu.");
        return;
    }

    const filterBulan = state?.filter?.dariBulan || "Semua";
    const filterTahun = state?.filter?.dariTahun || new Date().getFullYear();
    const tglCetak = new Date().toLocaleDateString('id-ID');

    // Hitung jumlah kolom tabel rincian secara dinamis agar colspan Kop Surat pas
    const totalCols = table.rows[0]?.cells?.length || 10;

    // CSS Style khusus Excel (Border, Font, Alignment)
    const style = `
        <style>
            table { border-collapse: collapse; font-family: Calibri, sans-serif; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11pt; }
            th { background-color: #1e293b; color: #ffffff; text-align: center; font-weight: bold; }
            .kop-title { font-size: 16pt; font-weight: bold; color: #1e293b; }
            .kop-sub { font-size: 10pt; color: #64748b; font-style: italic; }
            .report-title { font-size: 14pt; font-weight: bold; color: #0f172a; text-align: center; }
            .report-sub { font-size: 10pt; color: #475569; text-align: center; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
        </style>
    `;

    // Header Kop Perusahaan & Judul Laporan Rincian
    const kopHeaderHtml = `
        <table>
            <tr><td colspan="${totalCols}" class="kop-title">PT. SADHANA ARIFNUSA</td></tr>
            <tr><td colspan="${totalCols}" class="kop-sub">Kawasan Pengelolaan Hutan & TPK Terpadu</td></tr>
            <tr><td colspan="${totalCols}" class="kop-sub" style="border-bottom: 2px solid #1e293b;">Jl. Raya Labuhan Lombok - Sambelia | Telp: -</td></tr>
            <tr><td colspan="${totalCols}"></td></tr> <!-- Baris Kosong -->
            <tr><td colspan="${totalCols}" class="report-title">LAPORAN RINCIAN MUTASI STOK KAYU</td></tr>
            <tr><td colspan="${totalCols}" class="report-sub">Periode: ${filterBulan} ${filterTahun} | Dicetak: ${tglCetak}</td></tr>
            <tr><td colspan="${totalCols}"></td></tr> <!-- Baris Kosong -->
        </table>
    `;

    // Tanda Tangan / Pengesahan
    const ttdFooterHtml = `
        <br/>
        <table>
            <tr>
                <td colspan="${totalCols - 3}"></td>
                <td colspan="3" class="text-center">Disetujui Oleh,</td>
            </tr>
            <tr style="height: 50px;">
                <td colspan="${totalCols - 3}"></td>
                <td colspan="3"></td>
            </tr>
            <tr>
                <td colspan="${totalCols - 3}"></td>
                <td colspan="3" class="text-center bold">( GANISPH )</td>
            </tr>
        </table>
    `;

    // Penggabungan Dokumen HTML
    const fullHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8"/>
            ${style}
        </head>
        <body>
            ${kopHeaderHtml}
            ${table.outerHTML}
            ${ttdFooterHtml}
        </body>
        </html>
    `;

    const fileName = `Rincian_Mutasi_${new Date().getTime()}.xls`;
    const url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(fullHtml);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

// Helper untuk membuat QR Code dalam format Base64 Image
function generateQRCodeBase64(text) {
    return new Promise((resolve) => {
        // Buat elemen div sementara di memori
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        document.body.appendChild(tempDiv);

        const qrcode = new QRCode(tempDiv, {
            text: text,
            width: 100,
            height: 100,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Berikan delay singkat agar QR Code selesai dirender
        setTimeout(() => {
            const img = tempDiv.querySelector("img") || tempDiv.querySelector("canvas");
            let dataUrl = "";
            if (img) {
                dataUrl = img.src || img.toDataURL("image/png");
            }
            document.body.removeChild(tempDiv);
            resolve(dataUrl);
        }, 100);
    });
}

async function exportRekapSaldoPDF() {
    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            alert("Library jsPDF belum dimuat.");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;

        // =========================================================
        // 1. KOP SURAT PERUSAHAAN (HEADER)
        // =========================================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("PT. SADHANA ARIFNUSA", marginX, 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Kawasan Pengelolaan Hutan & TPK Terpadu", marginX, 20);
        
        doc.setLineWidth(0.6);
        doc.setDrawColor(30, 41, 59);
        doc.line(marginX, 23, pageWidth - marginX, 23);

        doc.setFontSize(8);
        doc.text("Jl. Raya Labuhan Lombok - Sambelia | Telp: -", marginX, 27);

        // =========================================================
        // 2. JUDUL LAPORAN REKAP SALDO
        // =========================================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text("LAPORAN REKAPITULASI SALDO STOK KAYU", pageWidth / 2, 33, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        
        const filterBulan = (typeof state !== 'undefined' && state?.filter?.dariBulan) ? state.filter.dariBulan : "Semua";
        const filterTahun = (typeof state !== 'undefined' && state?.filter?.dariTahun) ? state.filter.dariTahun : new Date().getFullYear();
        doc.text(`Periode: ${filterBulan} ${filterTahun} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 38, { align: "center" });

        // =========================================================
        // 3. CARI TABEL REKAP DI LAYAR SECARA OTOMATIS
        // =========================================================
        const tableBody = [];
        let gTotalAwalBap = 0, gTotalAwalLhp = 0, gTotalBap = 0, gTotalLhp = 0, gTotalKirim = 0, gTotalSaldoBap = 0, gTotalSaldoLhp = 0;

        const parseDomNum = (text) => {
            if (!text) return 0;
            let str = text.trim().replace(/\./g, '').replace(',', '.');
            let num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        };

        // Ambil semua tabel yang ada di halaman
        const allTables = document.querySelectorAll("table");
        let targetTable = null;

        // Cari tabel yang header-nya memuat kata 'Jenis Kayu' atau 'Saldo BAP'
        allTables.forEach((tbl) => {
            if (tbl.offsetParent !== null && (tbl.innerText.includes("Jenis Kayu") || tbl.innerText.includes("Saldo BAP"))) {
                targetTable = tbl;
            }
        });

        if (!targetTable) {
            alert("Tabel Rekap Saldo tidak ditemukan di layar!");
            return;
        }

        const rows = targetTable.querySelectorAll("tbody tr");
        let rowCount = 0;

        rows.forEach((row) => {
            const cols = row.querySelectorAll("td");
            const rowText = row.innerText.toUpperCase();

            // Abaikan baris total, kosong, atau pesan 'tidak ada data'
            if (cols.length < 5 || rowText.includes("TOTAL") || rowText.includes("TIDAK ADA")) return;

            rowCount++;

            // Jika tabel layar memiliki 10 kolom (Jenis Kayu, TPK, Petak, dst.)
            // atau 11 kolom (termasuk kolom 'No' di paling awal)
            const hasNoCol = cols.length >= 11;
            const offset = hasNoCol ? 1 : 0;

            const jenisKayu    = cols[0 + offset]?.innerText.trim() || '-';
            const tpk          = cols[1 + offset]?.innerText.trim() || '-';
            const petak        = cols[2 + offset]?.innerText.trim() || '-';
            const saldoAwalBap = parseDomNum(cols[3 + offset]?.innerText);
            const saldoAwalLhp = parseDomNum(cols[4 + offset]?.innerText);
            const bap          = parseDomNum(cols[5 + offset]?.innerText);
            const lhp          = parseDomNum(cols[6 + offset]?.innerText);
            const kirim        = parseDomNum(cols[7 + offset]?.innerText);
            const saldoBap     = parseDomNum(cols[8 + offset]?.innerText);
            const saldoLhp     = parseDomNum(cols[9 + offset]?.innerText);

            // Akumulasi Total
            gTotalAwalBap += saldoAwalBap;
            gTotalAwalLhp += saldoAwalLhp;
            gTotalBap += bap;
            gTotalLhp += lhp;
            gTotalKirim += kirim;
            gTotalSaldoBap += saldoBap;
            gTotalSaldoLhp += saldoLhp;

            tableBody.push([
                rowCount,
                jenisKayu,
                tpk,
                petak,
                saldoAwalBap.toFixed(2),
                saldoAwalLhp.toFixed(2),
                bap.toFixed(2),
                lhp.toFixed(2),
                kirim.toFixed(2),
                saldoBap.toFixed(2),
                saldoLhp.toFixed(2)
            ]);
        });

        if (tableBody.length === 0) {
            alert("Tidak ada baris data yang bisa di-export.");
            return;
        }

        // Baris Grand Total Rekap (11 Kolom)
        tableBody.push([
            { content: 'TOTAL KESELURUHAN', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalAwalBap.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalAwalLhp.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalBap.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalLhp.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalKirim.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalSaldoBap.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: gTotalSaldoLhp.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
        ]);

        // =========================================================
        // 4. GENERATE TABEL PDF AUTO-TABLE
        // =========================================================
        doc.autoTable({
            startY: 44,
            head: [[
                'No', 
                'Jenis Kayu', 
                'TPK', 
                'Petak', 
                'Saldo Awal BAP (m³)', 
                'Saldo Awal LHP (m³)', 
                'BAP (m³)', 
                'LHP (m³)', 
                'Kirim (m³)', 
                'Saldo BAP (m³)', 
                'Saldo LHP (m³)'
            ]],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 8.5
            },
            bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left' },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 25 },
                5: { halign: 'right', cellWidth: 25 },
                6: { halign: 'right', cellWidth: 22 },
                7: { halign: 'right', cellWidth: 22 },
                8: { halign: 'right', cellWidth: 22 },
                9: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
                10: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
            },
            margin: { left: marginX, right: marginX }
        });

        // =========================================================
        // 5. FOOTER & TANDA TANGAN
        // =========================================================
        let finalY = doc.lastAutoTable.finalY + 10;
        if (finalY > 160) {
            doc.addPage();
            finalY = 20;
        }

        const docID = `REKAP-SADHANA-${Date.now().toString(36).toUpperCase()}`;
        const verifyUrl = `https://stok-kayu-sadhana.vercel.app/verify?id=${docID}`;
        
        if (typeof generateQRCodeBase64 === 'function') {
            const qrBase64 = await generateQRCodeBase64(verifyUrl);
            if (qrBase64) {
                doc.addImage(qrBase64, 'PNG', marginX, finalY, 18, 18);
            }
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("DOKUMEN REKAPITULASI RESMI", marginX + 22, finalY + 4);
        doc.setFont("helvetica", "normal");
        doc.text(`ID Dokumen: ${docID}`, marginX + 22, finalY + 8);
        doc.text("Pindai QR Code untuk verifikasi keaslian saldo.", marginX + 22, finalY + 12);

        const rightAlignX = pageWidth - marginX - 45;
        doc.text("Disetujui Oleh,", rightAlignX, finalY + 4);
        doc.setFont("helvetica", "bold");
        doc.text("( GANISPH )", rightAlignX, finalY + 20);

        doc.save(`Rekap_Saldo_Stok_Kayu_${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (err) {
        console.error("Gagal export PDF rekap:", err);
        alert("Gagal membuat PDF Rekap: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

// Global Binding
window.exportRekapSaldoPdf = exportRekapSaldoPDF;
window.exportRekapSaldoPDF = exportRekapSaldoPDF;

async function exportRincianPDF() {
    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            alert("Library jsPDF belum dimuat. Pastikan script jsPDF sudah terpasang.");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;

        // =========================================================
        // 1. KOP SURAT PERUSAHAAN (HEADER)
        // =========================================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("PT. SADHANA ARIFNUSA", marginX, 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Kawasan Pengelolaan Hutan & TPK Terpadu", marginX, 20);
        
        doc.setLineWidth(0.6);
        doc.setDrawColor(30, 41, 59);
        doc.line(marginX, 22, pageWidth - marginX, 22);
        
        doc.setFontSize(8);
        doc.text("Jl. Raya Labuhan Lombok - Sambelia | Telp: -", marginX, 26);

        // =========================================================
        // 2. JUDUL LAPORAN RINCIAN MUTASI
        // =========================================================
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text("LAPORAN RINCIAN MUTASI STOK KAYU", pageWidth / 2, 33, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        
        // Membaca state filter dengan aman
        const currentFilter = (typeof state !== 'undefined' && state?.filter) ? state.filter : {};
        const filterBulan = currentFilter.dariBulan || "Semua";
        const filterTahun = currentFilter.dariTahun || new Date().getFullYear();
        const filterTPK = currentFilter.tpk || "Semua TPK";
        
        doc.text(`Periode: ${filterBulan} ${filterTahun} | TPK: ${filterTPK} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 38, { align: "center" });

        // =========================================================
        // 3. AMBIL & OLAH DATA DARI getProcessedRincianData()
        // =========================================================
        const processed = getProcessedRincianData();
        if (!processed) {
            alert("Tidak dapat memuat data rincian!");
            return;
        }

        const { filtered: dataMutasi } = processed;

        if (!dataMutasi || dataMutasi.length === 0) {
            alert("Tidak ada data mutasi untuk diexport!");
            return;
        }

        const tableBody = [];
        let runningSaldo = 0; // SALDO DIMOULAI DARI 0 (SAMA DENGAN RENDER WEB)
        let totalMasukUtama = 0;
        let totalKeluarUtama = 0;
        let rowCount = 0;

        // Iterasi Data Transaksi Mutasi
        dataMutasi.forEach((d) => {
            const valP = parseFloat(d.p || d.masuk_m3 || 0); 
            const valM = parseFloat(d.m || d.keluar_m3 || 0);
            const rawKet = String(d.ket || d.keterangan || "-");
            const ketUpper = rawKet.toUpperCase();

            let mskTampil = 0, klrTampil = 0;
            let mskHitung = 0, klrHitung = 0;

            if (ketUpper.includes("KIRIM")) {
                mskTampil = 0; klrTampil = valM;
                mskHitung = 0; klrHitung = valM;
            } else if (ketUpper.includes("BAP")) {
                // BAP JADI ADM (Tampil di PDF, tapi TIDAK DIHITUNG ke saldo)
                mskTampil = valP; klrTampil = 0;
                mskHitung = 0; klrHitung = 0;
            } else if (ketUpper.includes("LHP")) {
                // LHP JADI MASUK UTAMA (Tampil dan DIHITUNG ke saldo)
                mskTampil = valP; klrTampil = 0;
                mskHitung = valP; klrHitung = 0;
            } else {
                mskTampil = valP; klrTampil = valM;
                mskHitung = valP; klrHitung = valM;
            }

            runningSaldo += (mskHitung - klrHitung);
            totalMasukUtama += mskHitung;
            totalKeluarUtama += klrHitung;
            rowCount++;

            const isBAP = ketUpper.includes("BAP");
            const ketFormatted = isBAP ? `(Adm) ${rawKet}` : rawKet;

            tableBody.push([
                rowCount,
                d.tanggal || '-',
                ketFormatted,
                d.jenis || d.jenis_kayu || '-',
                d.tpk || '-',
                d.petak || '-',
                mskTampil > 0 ? mskTampil.toFixed(2) : '-',
                klrTampil > 0 ? klrTampil.toFixed(2) : '-',
                runningSaldo.toFixed(2)
            ]);
        });

        // Baris Grand Total Mutasi Periode
        tableBody.push([
            { content: 'GRAND TOTAL MUTASI PERIODE INI', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: totalMasukUtama.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: totalKeluarUtama.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: runningSaldo.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
        ]);

        // =========================================================
        // 4. GENERATE TABEL PDF (jsPDF AutoTable)
        // =========================================================
        doc.autoTable({
            startY: 42,
            head: [[
                'No', 
                'Tanggal', 
                'Keterangan / No. Dokumen', 
                'Jenis Kayu', 
                'TPK', 
                'Petak', 
                'Masuk (m³)', 
                'Keluar (m³)', 
                'Saldo (m³)'
            ]],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 8.5
            },
            bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 24 },
                2: { halign: 'left' },
                3: { halign: 'left', cellWidth: 35 },
                4: { halign: 'center', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 20 },
                6: { halign: 'right', cellWidth: 25 },
                7: { halign: 'right', cellWidth: 25 },
                8: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
            },
            margin: { left: marginX, right: marginX }
        });

        // =========================================================
        // 5. QR CODE VERIFIKASI & TANDA TANGAN (STAMP & FOOTER)
        // =========================================================
        let finalY = doc.lastAutoTable.finalY + 10;
        
        if (finalY > 160) {
            doc.addPage();
            finalY = 20;
        }

        const docID = `RINCIAN-SADHANA-${Date.now().toString(36).toUpperCase()}`;
        const verifyUrl = `https://stok-kayu-sadhana.vercel.app/verify?id=${docID}`;
        
        if (typeof generateQRCodeBase64 === 'function') {
            const qrBase64 = await generateQRCodeBase64(verifyUrl);
            if (qrBase64) {
                doc.addImage(qrBase64, 'PNG', marginX, finalY, 18, 18);
            }
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("DOKUMEN RINCIAN MUTASI RESMI", marginX + 22, finalY + 4);
        doc.setFont("helvetica", "normal");
        doc.text(`ID Dokumen: ${docID}`, marginX + 22, finalY + 8);
        doc.text("Pindai QR Code untuk verifikasi keaslian rincian mutasi.", marginX + 22, finalY + 12);

        const rightAlignX = pageWidth - marginX - 45;
        doc.text("Disetujui Oleh,", rightAlignX, finalY + 4);
        doc.setFont("helvetica", "bold");
        doc.text("( GANISPH )", rightAlignX, finalY + 20);

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, 200, { align: 'right' });
        }

        doc.save(`Rincian_Mutasi_Stok_Kayu_${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (err) {
        console.error("Gagal export PDF rincian:", err);
        alert("Gagal membuat PDF Rincian: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

// Global Exposure & Aliasing
window.exportRincianPDF = exportRincianPDF;
window.exportRincianMutasiPDF = exportRincianPDF;

window.sinkronisasiFilterRincian = function () {
    console.log("🔄 Sinkronisasi Filter Rincian dimulai...");

    // 1. Sinkronisasi JENIS KAYU
    const elJenis = document.getElementById('filter-rincian-jenis');
    if (elJenis) {
        // Ambil data dari state.master.jenis_kayu
        const masterJenis = state.master.jenis_kayu || [];
        let html = '<option value="">-- Semua Jenis --</option>';

        masterJenis.forEach(item => {
            // Jika item adalah objek {name: "..."}, ambil .name. Jika string, pakai langsung.
            const nama = (typeof item === 'object') ? (item.name || item.nama) : item;
            html += `<option value="${nama}">${nama}</option>`;
        });
        elJenis.innerHTML = html;
    }

    // 2. Sinkronisasi TPK
    const elTPK = document.getElementById('filter-rincian-tpk');
    if (elTPK) {
        const masterTPK = state.master.tpk || [];
        let html = '<option value="">-- Pilih TPK --</option>';

        masterTPK.forEach(item => {
            const nama = (typeof item === 'object') ? (item.name || item.nama) : item;
            html += `<option value="${nama}">${nama}</option>`;
        });
        elTPK.innerHTML = html;
    }

    // 3. Sinkronisasi TAHUN (Otomatis 2016 - 2026)
    const currentYear = 2026;
    const yearIDs = ['filter-rincian-tahun-dari', 'filter-rincian-tahun-sampai'];
    let yearOptions = '<option value="">Tahun</option>';

    for (let y = currentYear; y >= 2016; y--) {
        yearOptions += `<option value="${y}">${y}</option>`;
    }

    yearIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = yearOptions;
    });

    console.log("✅ Filter Rincian (TPK, Jenis, Tahun) berhasil diperbarui.");
};

function paksaAktifkanFilter() {
    ['filter-dari-tahun', 'filter-sampai-tahun'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = false;
            el.removeAttribute('readonly');
            console.log(`Elemen ${id} diaktifkan secara paksa.`);
        }
    });
}

function populateAllDropdowns(sumberData = [], masterData = {}) {
    console.log("🔄 Sinkronisasi Dropdown...");

    // A. Dropdown Input di Form (Master Data)
    const elJenisInput = document.getElementById('input-jenis');
    const elTPKInput = document.getElementById('input-tpk');

    if (elJenisInput) {
        const listJenis = masterData["jenis_kayu"] || [];
        elJenisInput.innerHTML = '<option value="">-- Pilih Jenis --</option>' +
            listJenis.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
    }

    if (elTPKInput) {
        const listTPK = masterData["tpk"] || [];
        elTPKInput.innerHTML = '<option value="">-- Pilih TPK --</option>' +
            listTPK.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
    }

    // B. Dropdown Filter di Rekap Saldo
    const elFilterJenis = document.getElementById('filter-jenis');
    const elFilterTPK = document.getElementById('filter-tpk');

    if (elFilterJenis) {
        const listJenis = masterData["jenis_kayu"] || [];
        elFilterJenis.innerHTML = '<option value="">-- Semua Jenis --</option>' +
            listJenis.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
    }

    if (elFilterTPK) {
        const listTPK = masterData["tpk"] || [];
        elFilterTPK.innerHTML = '<option value="">-- Semua TPK --</option>' +
            listTPK.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
    }

    // C. Dropdown Filter di Rincian Mutasi/Saldo
    const elRincianJenis = document.getElementById('filter-rincian-jenis');
    if (elRincianJenis) {
        const listJenis = (state.master && state.master["jenis_kayu"]) || masterData["jenis_kayu"] || [];
        elRincianJenis.innerHTML = '<option value="">-- Semua Jenis --</option>' +
            listJenis.map(j => `<option value="${j.name}">${j.name}</option>`).join('');
    }

    const elRincianTPK = document.getElementById('filter-rincian-tpk');
    if (elRincianTPK) {
        const listTPK = (state.master && state.master["tpk"]) || masterData["tpk"] || [];
        elRincianTPK.innerHTML = '<option value="">-- Semua TPK --</option>' +
            listTPK.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    }

    // 🟢 D. TAMBAHAN BARU: ISI DROPDOWN PETAK (REKAP & RINCIAN)
    // Ambil data sumber (bisa dari parameter sumberData atau state.data)
    const dataSource = (sumberData && sumberData.length > 0) ? sumberData : (state.data || []);

    // Filter daftar petak unik & bersihkan nilai kosong/null
    const listPetakUnik = [...new Set(dataSource.map(item => item.petak).filter(Boolean))].sort();

    // 1. Dropdown Petak di Rekap Saldo
    const elFilterPetak = document.getElementById('filter-petak'); // ID filter petak Rekap
    if (elFilterPetak) {
        elFilterPetak.innerHTML = '<option value="">-- Semua Petak --</option>' +
            listPetakUnik.map(p => `<option value="${p}">${p}</option>`).join('');
        elFilterPetak.disabled = false; // Buka proteksi klik
    }

    // 2. Dropdown Petak di Rincian Saldo / Mutasi
    const elRincianPetak = document.getElementById('filter-rincian-petak'); // ID filter petak Rincian
    if (elRincianPetak) {
        elRincianPetak.innerHTML = '<option value="">-- Semua Petak --</option>' +
            listPetakUnik.map(p => `<option value="${p}">${p}</option>`).join('');
        elRincianPetak.disabled = false; // Buka proteksi klik
    }

    // Panggil fungsi tahun di akhir agar tahun muncul
    if (typeof updateYearDropdowns === 'function') {
        updateYearDropdowns();
    }
}

function hitungKonversiForm() {
    // 1. Ambil nilai jenis kayu yang dipilih
    const jenis = document.getElementById('select-jenis-kayu')?.value;
    if (!jenis) return;

    // 2. Ambil nilai input SM (Masuk atau Keluar)
    const smMasuk = parseFloat(document.getElementById('input-masuk-sm')?.value || 0);
    const smKeluar = parseFloat(document.getElementById('input-keluar-sm')?.value || 0);
    const totalSM = smMasuk || smKeluar; // Ambil nilai yang diisi

    // 3. Ambil faktor konversi SM -> M3 dari state (default 1 jika belum diisi)
    const faktor = (window.state && window.state.konversiKayu) ? (window.state.konversiKayu[jenis] || 1) : 1;

    // 4. Hitung konversi dari SM ke M3
    const hasilM3 = totalSM * faktor;

    // 5. Isi hasil ke kolom M3 (Masuk/Keluar/Readonly Display)
    const inputM3Masuk = document.getElementById('input-masuk-m3');
    const inputM3Keluar = document.getElementById('input-keluar-m3');
    const displayKonversi = document.getElementById('input-hasil-konversi');

    if (smMasuk > 0 && inputM3Masuk) {
        inputM3Masuk.value = hasilM3.toFixed(2);
    }
    if (smKeluar > 0 && inputM3Keluar) {
        inputM3Keluar.value = hasilM3.toFixed(2);
    }
    if (displayKonversi) {
        displayKonversi.value = hasilM3.toFixed(2);
    }
}

// FITUR MODAL LHP (INPUT & EDIT MULTI-ROW)

// 1. Generate 5 Baris Input (Petak di Paling Kiri)
window.renderLhpInputRows = function(defaultPetak = '') {
    const container = document.getElementById("lhp-rows-container");
    if (!container) return;

    let optionsHtml = '<option value="">-- Pilih Jenis --</option>';
    if (window.state && window.state.master && window.state.master["jenis_kayu"]) {
        optionsHtml += window.state.master["jenis_kayu"].map(item => {
            const valFaktor = item.konversi ?? item.faktor_konversi ?? item.faktor ?? 0.67;
            const namaJenis = item.name || item.jenis_kayu || item.nama || '';
            return `<option value="${namaJenis}" data-faktor="${valFaktor}">${namaJenis}</option>`;
        }).join("");
    }

    let rowsHtml = '';
    for (let i = 0; i < 5; i++) {
        rowsHtml += `
            <tr>
                <td style="padding: 6px; border: 1px solid #ddd;">
                    <input type="text" class="form-control lhp-petak-row" placeholder="Petak" value="${defaultPetak}" style="width:100%; padding:6px;">
                </td>
                <td style="padding: 6px; border: 1px solid #ddd;">
                    <select class="form-control lhp-jenis-kayu" onchange="calculateLhpRow(${i})" style="width:100%; padding:6px;">
                        ${optionsHtml}
                    </select>
                </td>
                <td style="padding: 6px; border: 1px solid #ddd;">
                    <input type="number" step="0.01" class="form-control lhp-in-sm" oninput="calculateLhpRow(${i})" value="0" style="width:100%; padding:6px;">
                </td>
                <td style="padding: 6px; border: 1px solid #ddd;">
                    <input type="number" step="0.001" class="form-control lhp-faktor" oninput="calculateLhpRow(${i})" value="0.00" style="width:100%; padding:6px; background:#fff;">
                </td>
                <td style="padding: 6px; border: 1px solid #ddd;">
                    <input type="number" step="0.01" class="form-control lhp-in-m3" value="0.00" readonly style="width:100%; padding:6px; background:#eee; font-weight:bold;">
                </td>
            </tr>
        `;
    }
    container.innerHTML = rowsHtml;
};

// 2. Kalkulasi Otomatis per Baris
window.calculateLhpRow = function(index) {
    const rows = document.querySelectorAll("#lhp-rows-container tr");
    if (!rows[index]) return;

    const row = rows[index];
    const selJenis = row.querySelector(".lhp-jenis-kayu");
    const inputFaktor = row.querySelector(".lhp-faktor");
    const inSM = parseFloat(row.querySelector(".lhp-in-sm").value) || 0;

    const selectedOption = selJenis.options[selJenis.selectedIndex];
    
    if (selectedOption && selectedOption.value !== "") {
        const faktorMaster = parseFloat(selectedOption.dataset.faktor) || 0;
        if (!row.dataset.editedByHand) {
            inputFaktor.value = faktorMaster;
        }
    } else {
        if (!row.dataset.editedByHand) {
            inputFaktor.value = "0.00";
        }
    }

    inputFaktor.oninput = () => {
        row.dataset.editedByHand = "true";
        calculateLhpRow(index);
    };

    const faktor = parseFloat(inputFaktor.value) || 0;
    row.querySelector(".lhp-in-m3").value = (inSM * faktor).toFixed(2);
};

// 3. Membuka Modal LHP (Form Baru)
window.openLhpModal = function (initialData = {}) {
    const modal = document.getElementById('modal-lhp');
    if (!modal) return;

    // Populate Dropdown TPK
    const selTPK = document.getElementById("modal-lhp-tpk");
    if (selTPK && window.state && window.state.master && window.state.master["tpk"]) {
        selTPK.innerHTML = '<option value="">-- Pilih TPK --</option>' +
            window.state.master["tpk"].map(item => `<option value="${item.name}">${item.name}</option>`).join("");
    }

    // Render 5 Baris baru
    renderLhpInputRows(initialData.petak || '');

    // Reset Header Form
    document.getElementById('modal-lhp-id').value = initialData.id || '';
    document.getElementById('modal-lhp-date').value = initialData.tanggal || new Date().toISOString().split('T')[0];
    document.getElementById('modal-lhp-ket').value = initialData.keterangan || 'LHP';
    document.getElementById('modal-lhp-tpk').value = initialData.tpk || '';

    // Pastikan teks tombol adalah "Simpan Data LHP"
    const submitBtn = modal.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.textContent = "Simpan Data LHP";

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};

// 4. Membuka Modal LHP (Mode Edit)
window.editLhpItem = function(data) {
    if (!data) return;

    const modal = document.getElementById('modal-lhp');
    if (!modal) return;

    // Populate Dropdown TPK
    const selTPK = document.getElementById("modal-lhp-tpk");
    if (selTPK && window.state && window.state.master && window.state.master["tpk"]) {
        selTPK.innerHTML = '<option value="">-- Pilih TPK --</option>' +
            window.state.master["tpk"].map(item => `<option value="${item.name}">${item.name}</option>`).join("");
    }

    // Render 5 Baris kosong
    renderLhpInputRows();

    // Isi Header Form
    document.getElementById('modal-lhp-id').value = data.id || '';
    document.getElementById('modal-lhp-date').value = data.tanggal || '';
    document.getElementById('modal-lhp-ket').value = data.keterangan || 'LHP';
    document.getElementById('modal-lhp-tpk').value = data.tpk || '';

    // Masukkan data ke Baris Pertama (Row 0)
    const firstRow = document.querySelector("#lhp-rows-container tr");
    if (firstRow) {
        const inputPetak = firstRow.querySelector(".lhp-petak-row");
        if (inputPetak) inputPetak.value = data.petak || '';

        const selectJenis = firstRow.querySelector(".lhp-jenis-kayu");
        if (selectJenis) selectJenis.value = data.jenis_kayu || '';

        const inputSM = firstRow.querySelector(".lhp-in-sm");
        if (inputSM) inputSM.value = data.masuk_sm || 0;

        const inputFaktor = firstRow.querySelector(".lhp-faktor");
        const inM3 = parseFloat(data.masuk_m3) || 0;
        const inSM = parseFloat(data.masuk_sm) || 0;

        let faktor = 0.67;
        if (inSM > 0 && inM3 > 0) {
            faktor = (inM3 / inSM).toFixed(3);
        } else if (selectJenis && selectJenis.selectedIndex >= 0) {
            const opt = selectJenis.options[selectJenis.selectedIndex];
            if (opt && opt.dataset.faktor) faktor = opt.dataset.faktor;
        }

        if (inputFaktor) inputFaktor.value = faktor;
        calculateLhpRow(0);
    }

    // Ubah teks tombol menjadi "Update Data LHP"
    const submitBtn = modal.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.textContent = "Update Data LHP";

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};

// 5. Menutup Modal LHP (Sudah Diperbaiki Dari Infinite Loop)
window.closeLhpModal = function () {
    const modal = document.getElementById('modal-lhp');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        
        // Reset teks tombol simpan ke default
        const submitBtn = modal.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.textContent = "Simpan Data LHP";
    }
    
    // Reset Form Modal
    const form = document.getElementById('form-modal-lhp');
    if (form) form.reset();

    // Reset ID Edit
    const inputId = document.getElementById('modal-lhp-id');
    if (inputId) inputId.value = '';

    // Reset input keterangan di form utama
    const inputKetUtama = document.getElementById("input-ket") || document.getElementById("input-keterangan");
    if (inputKetUtama) inputKetUtama.value = '';
};

// 6. Simpan / Update Data LHP ke Database
window.saveLhpFromModal = async function (e) {
    if (e) e.preventDefault();

    const editId = document.getElementById('modal-lhp-id').value;
    const tanggal = document.getElementById('modal-lhp-date').value;
    const keterangan = document.getElementById('modal-lhp-ket').value;
    const tpk = document.getElementById('modal-lhp-tpk').value;

    if (!tanggal || !tpk) {
        alert("Harap pilih TPK dan Tanggal terlebih dahulu!");
        return;
    }

    const payloadList = [];
    const rows = document.querySelectorAll("#lhp-rows-container tr");

    rows.forEach(row => {
        const petakRow = row.querySelector(".lhp-petak-row").value.trim() || '-';
        const jenis = row.querySelector(".lhp-jenis-kayu").value;
        const inSM = parseFloat(row.querySelector(".lhp-in-sm").value) || 0;
        const inM3 = parseFloat(row.querySelector(".lhp-in-m3").value) || 0;

        if (jenis && inSM > 0) {
            payloadList.push({
                tanggal: tanggal,
                keterangan: keterangan,
                tpk: tpk,
                petak: petakRow,
                jenis_kayu: jenis,
                masuk_sm: inSM,
                masuk_m3: inM3,
                keluar_sm: 0,
                keluar_m3: 0
            });
        }
    });

    if (payloadList.length === 0) {
        alert("Pilih minimal 1 Jenis Kayu dan isi jumlah Stapel Meter (SM)!");
        return;
    }

    try {
        if (typeof showLoading === 'function') showLoading(true);

        // Jika Mode Edit (Update Data Lama)
        if (editId) {
            const { error } = await api
                .from('stok_kayu')
                .update(payloadList[0])
                .eq('id', editId);
                
            if (error) throw error;
            alert("Data LHP berhasil diperbarui!");
        } 
        // Jika Mode Input Baru (Insert Data Baru)
        else {
            const { error } = await api
                .from('stok_kayu')
                .insert(payloadList);
                
            if (error) throw error;
            alert(`Berhasil menyimpan ${payloadList.length} data LHP!`);
        }

        closeLhpModal();
        if (typeof fetchData === 'function') await fetchData();

    } catch (err) {
        console.error("Gagal simpan/update LHP:", err);
        alert("Gagal memproses data LHP: " + (err.message || err));
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
};


// Expose fungsi ke window jika dipanggil dari HTML
window.updatePetakByTPK = updatePetakByTPK;
window.applyRekapFilter = applyRekapFilter;
window.switchView = switchView;

// Flag pengunci agar tombol simpan tidak bisa diklik ganda
let isSubmittingStock = false;

// SINGLE EVENT LISTENER UNTUK INITIALISASI DAN FORM SUBMIT
document.addEventListener('DOMContentLoaded', () => {
    const stockForm = document.getElementById('stock-form');

    if (stockForm) {
        // Reset atribut onsubmit agar tidak ada pemicu ganda
        stockForm.onsubmit = null;

        stockForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (typeof isSubmittingStock !== 'undefined' && isSubmittingStock) return;

            const submitBtn = stockForm.querySelector('button[type="submit"]');

            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value : '';
            };

            const editId = getVal('edit-id');
            const date = getVal('input-date');
            const ket = getVal('input-ket')?.trim();
            const jenis = getVal('input-jenis');
            const tpk = getVal('input-tpk');
            const petak = getVal('input-petak')?.trim() || '-';

            // Ambil input SM dari Form (Masuk & Keluar)
            const inSM = parseFloat(getVal('input-in-sm')) || 0;
            const outSM = parseFloat(getVal('input-out-sm')) || 0;

            if (!ket || !jenis || !tpk) {
                alert("Harap lengkapi Keterangan, Jenis Kayu, dan TPK!");
                return;
            }

            if (inSM === 0 && outSM === 0) {
                alert("Harap isi jumlah Masuk (SM) atau Keluar (SM)!");
                return;
            }

            // 1. Cari faktor konversi dari master jenis kayu
            let faktorKonversi = 0.67; // Default jika master data tidak ketemu
            if (state.master && state.master['jenis_kayu']) {
                const itemKayu = state.master['jenis_kayu'].find(
                    k => (k.name && k.name.trim().toLowerCase() === jenis.trim().toLowerCase()) ||
                         (k.jenis_kayu && k.jenis_kayu.trim().toLowerCase() === jenis.trim().toLowerCase())
                );
                if (itemKayu) {
                    faktorKonversi = parseFloat(itemKayu.konversi || itemKayu.faktor_konversi || itemKayu.faktor || 0.67);
                }
            }

            // 2. Hitung hasil konversi ke M³
            const inM3 = inSM * faktorKonversi;
            const outM3 = outSM * faktorKonversi;

            // 3. Tentukan mana SM & M3 yang aktif digunakan untuk Notifikasi Alert
            const activeSM = inSM > 0 ? inSM : outSM;
            const activeM3 = inM3 > 0 ? inM3 : outM3;

            // =========================================================
            // 📍 PAYLOAD TERUPDATE (Menambahkan masuk_sm & keluar_sm)
            // =========================================================
            const payload = {
                tanggal: date,
                keterangan: ket,
                jenis_kayu: jenis,
                tpk: tpk,
                petak: petak,
                
                // ✅ SIMPAN SM MURNI KE DATABASE
                masuk_sm: inSM,
                keluar_sm: outSM,
                
                // Simpan M3 hasil konversi
                masuk_m3: inM3,
                keluar_m3: outM3
            };
            // =========================================================

            try {
                if (typeof isSubmittingStock !== 'undefined') isSubmittingStock = true;
                if (submitBtn) submitBtn.disabled = true;
                if (typeof showLoading === 'function') showLoading(true);

                if (editId) {
                    // MODE UPDATE DATA
                    const { error } = await api.from('stok_kayu').update(payload).eq('id', editId);
                    if (error) throw error;
                    alert("Data berhasil diperbarui!");
                } else {
                    // MODE INSERT DATA BARU
                    const { error } = await api.from('stok_kayu').insert([payload]);
                    if (error) throw error;
                    
                    // Notifikasi Alert menggunakan SM & M3 yang aktif
                    alert(`Data berhasil disimpan!\n${activeSM} SM x ${faktorKonversi} = ${activeM3.toFixed(2)} M³`);
                }

                // Reset Form & Refresh Data
                stockForm.reset();
                if (typeof cancelEdit === 'function') cancelEdit();
                if (typeof loadMutasiData === 'function') loadMutasiData();
                if (typeof fetchData === 'function') await fetchData();

            } catch (err) {
                console.error("Database Error:", err);
                alert("Gagal menyimpan data: " + (err.message || err));
            } finally {
                if (typeof isSubmittingStock !== 'undefined') isSubmittingStock = false;
                if (submitBtn) submitBtn.disabled = false;
                if (typeof showLoading === 'function') showLoading(false);
            }
        });
    }

    
// 💡 DETEKSI KETIKAN "LHP" DI FORM UTAMA (TERPERBARUI)
// =========================================================
const inputKetUtama = document.getElementById("input-ket") || document.getElementById("input-keterangan");

if (inputKetUtama) {
    // Menggunakan event 'change' atau 'blur' agar pengguna selesai mengetik dulu
    inputKetUtama.addEventListener("change", function (e) {
        const val = e.target.value.toUpperCase().trim();
        
        // Jika kata "LHP" terdeteksi
        if (val.includes("LHP")) {
            if (typeof openLhpModal === 'function') {
                openLhpModal({
                    tanggal: document.getElementById("input-date")?.value || document.getElementById("input-tanggal")?.value || '',
                    keterangan: e.target.value,
                    jenis: document.getElementById("input-jenis")?.value || '',
                    tpk: document.getElementById("input-tpk")?.value || '',
                    petak: document.getElementById("input-petak")?.value || ''
                });
            } else {
                alert("Fungsi openLhpModal belum terdefinisi!");
            }
        }
    });
}

    // Inisialisasi status Login
    if (state.isLoggedIn) {
        if (typeof startApp === 'function') startApp();
    } else {
        if (typeof initLoginHandler === 'function') initLoginHandler();
    }

    // ==========================================
    // EVENT LISTENER PAGINATION RINCIAN MUTASI
    // ==========================================
    document.getElementById("btn-next")?.addEventListener("click", () => {
        state.currentPage = (state.currentPage || 1) + 1;
        if (typeof renderRincian === 'function') renderRincian();
    });

    document.getElementById("btn-prev")?.addEventListener("click", () => {
        if ((state.currentPage || 1) > 1) {
            state.currentPage--;
            if (typeof renderRincian === 'function') renderRincian();
        }
    });

    // Navigasi ke Halaman Pertama (<<)
    document.getElementById("btn-first")?.addEventListener("click", () => {
        state.currentPage = 1;
        if (typeof renderRincian === 'function') renderRincian();
    });

    // Navigasi ke Halaman Terakhir (>>)
    document.getElementById("btn-last")?.addEventListener("click", () => {
        if (typeof getProcessedRincianData === 'function') {
            const processed = getProcessedRincianData();
            if (processed && processed.filtered) {
                const rowsPerPage = state.rowsPerPage || 10;
                state.currentPage = Math.ceil(processed.filtered.length / rowsPerPage) || 1;
                if (typeof renderRincian === 'function') renderRincian();
            }
        }
    });
});

