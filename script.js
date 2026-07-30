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
// --- FUNGSI MASTER DATA (SINKRON DENGAN SUPABASE) ---
// Membuka Modal Master
window.showMasterModal = function(type) {
    state.currentMasterType = type;
    
    const modal = document.getElementById('master-modal');
    const titleHeader = document.querySelector('.main-header h2'); // Target judul di header atas

    // 1. Ubah Judul Header secara dinamis
    if (titleHeader) {
        titleHeader.innerText = (type === 'tpk' ? 'MASTER DATA' : 'MASTER DATA');
    }

    // 2. Munculkan area putih (Modal)
    if (modal) {
        modal.classList.remove('hidden');
    }

    // 3. Render list datanya
    renderMasterList();
};
window.openMasterModal = async function (type) {
    state.currentMasterType = type;
    const modal = document.getElementById('master-modal');
    const title = document.getElementById('master-title');
    const listEl = document.getElementById('master-list');

    title.innerText = (type === 'tpk') ? 'Kelola Master TPK' : 'Kelola Master Jenis Kayu';
    listEl.innerHTML = '<tr><td colspan="2" class="text-center">Memuat data...</td></tr>';

    modal.classList.remove('hidden');

    try {
        // AMBIL DATA DARI SUPABASE
        const { data, error } = await api
            .from('master_data')
            .select('*')
            .eq('type', type)
            .order('name', { ascending: true });

        if (error) throw error;

        // SIMPAN KE STATE agar renderMasterList bisa baca
        state.master[type] = data;

        renderMasterList();
    } catch (err) {
        console.error("Gagal load master:", err.message);
        listEl.innerHTML = '<tr><td colspan="2" class="text-center" style="color:red;">Gagal memuat data</td></tr>';
    }
};

window.handleMasterSubmit = async function (event) {
    event.preventDefault();

    const inputEl = document.getElementById('master-input');
    const type = state.currentMasterType;

    if (!inputEl || !inputEl.value.trim()) {
        alert("Nama tidak boleh kosong!");
        return;
    }

    const name = inputEl.value.trim();

    try {
        showLoading(true);

        // Simpan ke Supabase menggunakan variabel 'api'
        const { data, error } = await api
            .from('master_data')
            .insert([{ name: name, type: type }])
            .select();

        if (error) throw error;

        // Tambahkan ke state agar list langsung terupdate
        if (!state.master[type]) state.master[type] = [];
        state.master[type].push(data[0]);

        // Reset & Refresh
        inputEl.value = "";
        renderMasterList();

        // Update dropdown di form mutasi
        if (type === 'tpk') renderTPKDropdown();
        else renderJenisKayuDropdown();

        alert(`Berhasil menambahkan "${name}"`);
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan: " + err.message);
    } finally {
        showLoading(false);
    }
};

window.renderMasterList = function () {
    const listEl = document.getElementById('master-list');
    const type = state.currentMasterType;

    // PERBAIKAN: Gunakan optional chaining atau cek apakah elemennya ada
    const searchInput = document.getElementById('master-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

    // Filter data (jika searchInput tidak ada, searchTerm kosong "" dan semua data tampil)
    const filteredData = (state.master[type] || []).filter(item =>
        item.name.toLowerCase().includes(searchTerm)
    );

    // Pastikan tidak ada .slice() agar tampil semua
    const dataToShow = filteredData;

    listEl.innerHTML = dataToShow.map((item, index) => `
        <tr>
            <td style="padding:8px; border-bottom:1px solid #eee;">${index + 1}</td>
            <td style="padding:8px; border-bottom:1px solid #eee;">${item.name}</td>
            <td style="padding:8px; border-bottom:1px solid #eee;" class="text-center">
                <button onclick="deleteMasterItem('${item.id}')" class="btn-action btn-danger">🗑️</button>
            </td>
        </tr>
    `).join('');

    // Sembunyikan pagination saat modal terbuka
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
};

async function deleteMasterItem(id) {
    const type = state.currentMasterType;
    if (!confirm(`Hapus item ini dari master ${type}?`)) return;

    try {
        showLoading(true);
        const { error } = await api
            .from('master_data')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Filter state lokal agar yang dihapus hilang dari layar
        state.master[type] = state.master[type].filter(item => item.id != id);

        renderMasterList();

        // Update dropdown UI di form input
        if (type === 'tpk') renderTPKDropdown();
        else renderJenisKayuDropdown();

        alert("Data berhasil dihapus!");
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    } finally {
        showLoading(false);
    }
}
// Modifikasi fungsi renderDashboardTable
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

    // --- LOGIKA BARU: CEK VIEW SAAT INI ---
    // Jika di Kelola Sandi atau Backup, kita tidak memotong data (tanpa slice)
    const isNoPagination = (state.view === 'kelola-sandi' || state.view === 'backup-setting');

    let paginatedData;
    if (isNoPagination) {
        paginatedData = data; // Tampilkan semua data
    } else {
        const startIndex = (state.currentPage - 1) * state.rowsPerPage;
        const endIndex = startIndex + state.rowsPerPage;
        paginatedData = data.slice(startIndex, endIndex); // Tetap pakai pagination
    }

    // Render baris tabel
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
                <div style="display: flex; gap: 2px; justify-content: center; align-items: center;">
                    <button onclick="editData('${d.id}')" class="btn-action" title="Edit">✏️</button>
                    <button onclick="deleteData('${d.id}')" class="btn-action btn-danger" title="Hapus">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Sembunyikan kontrol pagination jika di halaman Kelola Sandi/Backup
    const container = document.getElementById("pagination-container");
    if (container) {
        container.style.display = isNoPagination ? "none" : "block";
    }

    if (!isNoPagination) {
        renderPaginationControls();
    }
}

// Fungsi untuk membuat tombol navigasi halaman
function renderPaginationControls() {
    const container = document.getElementById("pagination-container");
    if (!container) return;

    const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage);

    let html = `
        <div style="display:flex; justify-content:center; align-items:center; gap:10px; padding:10px;">
            <button onclick="changePage(1)" ${state.currentPage === 1 ? 'disabled' : ''}>&laquo;</button>
            <button onclick="changePage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled' : ''}>Prev</button>
            <span>Halaman ${state.currentPage} dari ${totalPages}</span>
            <button onclick="changePage(${state.currentPage + 1})" ${state.currentPage === totalPages ? 'disabled' : ''}>Next</button>
            <button onclick="changePage(${totalPages})" ${state.currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>
        </div>
    `;
    container.innerHTML = html;
};

// Fungsi pindah halaman
window.changePage = function (page) {
    const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage);
    if (page < 1 || page > totalPages) return;

    state.currentPage = page;
    renderDashboardTable(state.filteredData);
    // Scroll ke atas tabel saat pindah halaman
    document.querySelector('.tabel-wrapper').scrollTop = 0;
};

// Pasang ke window agar aman jika dipanggil dengan window.state
window.state = state;
function showLoading(isLoading) {
    const loader = document.getElementById('loading-overlay');
    if (loader) isLoading ? loader.classList.remove('hidden') : loader.classList.add('hidden');
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
    const daftarTPK = [...new Set(state.data.map(d => d.tpk).filter(t => t))].sort();

    // 2. Isi Dropdown TPK Ringkasan & Rincian
    const idsTPK = ['filter-tpk', 'filter-rincian-tpk'];
    idsTPK.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                daftarTPK.map(t => `<option value="${t}">${t}</option>`).join('');

            // Pasang paksa event listener-nya di sini agar tidak lewat HTML saja
            el.onchange = (id === 'filter-tpk') ? updatePetakByTPK : updateRincianPetakByTPK;
        }
    });

    // 3. Ambil Tahun Unik (Solusi Tahun 2026)
    // Ambil tahun unik dari kolom 'tanggal' (format: YYYY-MM-DD)
    const daftarTahun = [...new Set(state.data.map(d => {
        return d.tanggal ? d.tanggal.split('-')[0] : null;
    }).filter(t => t))].sort((a, b) => b - a); // Urutkan dari tahun terbaru

    const idsTahun = ['filter-dari-tahun', 'filter-sampai-tahun', 'filter-rincian-tahun-dari', 'filter-rincian-tahun-sampai'];
    idsTahun.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Aktifkan kembali (jika sebelumnya terkunci)
            el.disabled = false;

            // Isi datanya
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

    // Reset dropdown petak
    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';

    const tpkVal = tpkEl ? tpkEl.value : '';

    if (!tpkVal || !state.data) {
        petakEl.disabled = true;
        return;
    }

    // Filter data tanpa peduli spasi & huruf besar/kecil (Paling Aman)
    const matchingData = state.data.filter(d =>
        String(d.tpk || "").trim().toLowerCase() === String(tpkVal || "").trim().toLowerCase()
    );

    // Ambil daftar petak unik & urutkan
    const uniquePetaks = [...new Set(matchingData.map(d => d.petak).filter(Boolean))].sort();

    if (uniquePetaks.length > 0) {
        uniquePetaks.forEach(p => {
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

// --- FUNGSI SPESIFIK UNTUK TABEL RINCIAN (JIKA DIBUTUHKAN DI HTML) ---
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

        // Pisahkan data ke state
        state.master.jenis_kayu = data.filter(d => d.type === 'jenis_kayu' || d.type === 'jenis-kayu');
        state.master.tpk = data.filter(d => d.type === 'tpk');

        console.log("✅ Data Master Berhasil Dimuat:", {
            jenis_kayu: state.master.jenis_kayu.length,
            tpk: state.master.tpk.length
        });

        // PANGGIL FUNGSI RENDER (Bukan variabelnya)
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
    const tanggalInput = document.getElementById('input-date')?.value || new Date().toISOString().split('T')[0];
    const ket = document.getElementById('input-ket')?.value || "";
    const jenis = document.getElementById('input-jenis')?.value || "";
    const tpk = document.getElementById("input-tpk")?.value || "";
    const petak = document.getElementById('input-petak')?.value || "-";
    const masuk = parseFloat(document.getElementById('input-in')?.value) || 0;
    const keluar = parseFloat(document.getElementById('input-out')?.value) || 0;

    const payload = {
        tanggal: tanggalInput,
        keterangan: ket,
        jenis_kayu: jenis, 
        tpk: tpk,      
        petak: petak,
        masuk_m3: masuk,
        keluar_m3: keluar
    };

    try {
        const { error } = await api.from('stok_kayu').insert([payload]);
        if (error) throw error;
    } catch (err) {
        console.error("Gagal simpan via saveData:", err.message);
    }
}
// Fungsi untuk memastikan tanggal selalu YYYY-MM-DD
function formatTanggalDB(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
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

    if (!confirm("Hapus data lama dan ganti dengan data dari file backup ini?")) return;

    try {
        // 1. Kosongkan Tabel di Supabase dahulu (Mencegah Duplikat)
        const { error: delError } = await api
            .from('stok_kayu')
            .delete()
            .neq('id', 0); // Hapus semua baris

        if (delError) throw delError;

        // 2. Masukkan Data Baru dari JSON
        const { error: insError } = await api
            .from('stok_kayu')
            .insert(importedData.data);

        if (insError) throw insError;

        alert("✅ Database berhasil diperbarui total!");
        location.reload(); // Segarkan halaman untuk melihat hasilnya
    } catch (err) {
        alert("❌ Gagal sinkronisasi ke cloud: " + err.message);
    }
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
    initFormSubmitHandler();
}


// NAVIGATION LOGIC
function toggleMenu(id) {
    const menu = document.getElementById(id + "-submenu");
    if (menu) menu.classList.toggle("open");
}

function switchView(v) {
    state.view = v;
    
    // 1. Sembunyikan Modal Master jika user pindah menu lewat sidebar
    const modal = document.getElementById('master-modal');
    if (modal) modal.classList.add('hidden');

    // 2. Update Judul di Header (Main Header)
    const titleHeader = document.querySelector('.main-header h2');
    if (titleHeader) {
        const names = {
            'dashboard': 'KARTU STOK',
            'rekap-saldo': 'REKAPITULASI SALDO',
            'rekap-rincian': 'RINCIAN MUTASI KAYU', 
            'kelola-sandi': 'PENGATURAN',
            'backup-setting': 'PENGATURAN',
            'jenis-kayu': 'MASTER DATA',
            'tpk': 'MASTER DATA' 
        };
        titleHeader.innerText = names[v] || v.toUpperCase();
    }

    // 3. Sembunyikan semua section konten agar tidak tumpang tindih
    document.querySelectorAll('.view-section, [id^="view-"]').forEach(el => el.classList.add('hidden'));

    // 4. Tampilkan section yang dipilih
    const target = document.getElementById('view-' + v);
    if (target) {
        target.classList.remove('hidden');
    }

    // 5. Reset pagination ke halaman 1
    state.currentPage = 1;

    // 6. Jalankan fungsi render sesuai menu yang dipilih
    if (v === 'dashboard' || v === 'kelola-sandi' || v === 'backup-setting') {
        renderDashboardTable();
    }

    if (v === 'rekap-saldo' || v === 'ringkasan') {
        renderRekapSaldo();
    }
}
let isSubmitting=false;

// 1. FUNGSI HANDLER SUBMIT
async function handleMutasiSubmit(e) {
    if (e) e.preventDefault();

    if (isSubmitting) return false;

    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        isSubmitting = true;
        if (submitBtn) submitBtn.disabled = true;
        if (typeof showLoading === "function") showLoading(true);

        const payload = {
            tanggal: document.getElementById("input-date").value,
            keterangan: document.getElementById("input-ket").value,
            jenis_kayu: document.getElementById("input-jenis").value,
            tpk: document.getElementById("input-tpk").value,
            petak: document.getElementById("input-petak").value || "-",
            masuk_m3: parseFloat(document.getElementById("input-in").value) || 0,
            keluar_m3: parseFloat(document.getElementById("input-out").value) || 0
        };

        const { error } = await api.from('stok_kayu').insert([payload]);
        if (error) throw error;

        alert("Data Berhasil Disimpan!");
        e.target.reset();

        if (typeof fetchData === "function") {
            await fetchData();
        }

    } catch (err) {
        console.error("Gagal memproses data:", err.message);
        alert("Gagal memproses data: " + err.message);
    } finally {
        if (typeof showLoading === "function") showLoading(false);
        isSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

// 2. FUNGSI INISIALISASI FORM (PEMBERSIH EVENT GANDA)
function setupFormMutasi() {
    const formElement = document.getElementById("form-stok"); // Sesuaikan ID form Anda
    if (!formElement) return;

    // TRIK PAMUNGKAS: Clone elemen form untuk MEMBUANG SEMUA event listener ganda yang menempel sebelumnya
    const newForm = formElement.cloneNode(true);
    formElement.parentNode.replaceChild(newForm, formElement);

    // Pasang HANYA 1 event listener bersih ke form baru
    newForm.onsubmit = handleMutasiSubmit;
}

// Jalankan pembersihan & pemasangan event saat halaman siap
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupFormMutasi);
} else {
    setupFormMutasi();
}
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

window.editData = function (id) {
    // Gunakan == agar string "1" cocok dengan angka 1
    const item = state.data.find(d => d.id == id);

    if (!item) {
        alert("Data tidak ditemukan!");
        return;
    }

    // Pastikan ID elemen ini sesuai dengan yang ada di HTML Anda
    document.getElementById('edit-id').value = item.id;
    document.getElementById('input-date').value = item.tanggal;
    document.getElementById('input-ket').value = item.keterangan;
    document.getElementById('input-jenis').value = item.jenis_kayu;
    document.getElementById('input-tpk').value = item.tpk;
    document.getElementById('input-petak').value = item.petak;
    document.getElementById('input-in').value = item.masuk_m3;
    document.getElementById('input-out').value = item.keluar_m3;

    // MUNCIULKAN TOMBOL UPDATE
    document.getElementById('btn-submit').innerText = "Perbarui Data";
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    // Scroll otomatis ke atas (ke form)
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// AGAR BISA DIPANGGIL OLEH TOMBOL DI HTML
window.cancelEdit = function () {
    console.log("Membatalkan edit...");
    const form = document.getElementById('stock-form');
    if (form) form.reset();

    document.getElementById('edit-id').value = "";
    document.getElementById('form-mode-title').innerText = "Input Mutasi";

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "Simpan";
    btnSubmit.style.backgroundColor = "";

    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

// 1. Fungsi Hapus Baris Tunggal
// Gunakan window agar tombol HTML bisa "melihat" fungsi ini
window.deleteData = async function (id) {
    console.log("Proses Hapus ID:", id);

    if (!confirm("Hapus data ini secara permanen?")) return;

    try {
        showLoading(true);

        // Eksekusi hapus ke cloud
        const { error } = await api
            .from('stok_kayu')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Data berhasil dihapus!");

        // Refresh data dan tabel otomatis
        await fetchData();

    } catch (err) {
        console.error("Gagal Hapus:", err.message);
        alert("Gagal menghapus: " + err.message);
    } finally {
        showLoading(false);
    }
};
window.deleteSelected = async function () {
    // Ambil semua checkbox yang dicentang
    const checkboxes = document.querySelectorAll('.data-checkbox:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));

    if (idsToDelete.length === 0) {
        alert("Pilih data yang ingin dihapus terlebih dahulu.");
        return;
    }

    if (!confirm(`Hapus ${idsToDelete.length} data terpilih?`)) return;

    try {
        showLoading(true);
        const { error } = await api
            .from('stok_kayu')
            .delete()
            .in('id', idsToDelete); // Menghapus semua ID yang ada di dalam list

        if (error) throw error;

        alert("Data terpilih berhasil dihapus!");
        await fetchData();
    } catch (err) {
        alert("Gagal menghapus massal: " + err.message);
    } finally {
        showLoading(false);
    }
};
function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}
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
window.updateRincianPetakByTPK = function (isActive) {
    const tpkVal = document.getElementById('filter-rincian-tpk').value;
    const petakEl = document.getElementById('filter-rincian-petak');

    if (!petakEl) return;
    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';

    if (!tpkVal) {
        petakEl.disabled = true;
        return;
    }

    // Ambil daftar petak unik dari transaksi yang sudah ada di database
    const daftarPetak = [...new Set(state.data
        .filter(d => d.tpk === tpkVal)
        .map(d => d.petak))]
        .filter(Boolean)
        .sort();

    if (daftarPetak.length > 0) {
        daftarPetak.forEach(p => {
            petakEl.innerHTML += `<option value="${p}">${p}</option>`;
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
function renderTable() {
    const tbody = document.getElementById("tabel-mutasi-body");
    if (!tbody) return;

    if (state.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" align="center">Belum ada data mutasi</td></tr>';
        return;
    }

    tbody.innerHTML = state.data.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.jenis_kayu}</td>
            <td>${item.tpk}</td>
            <td align="right">${item.masuk_m3.toFixed(2)}</td>
            <td align="right">${item.keluar_m3.toFixed(2)}</td>
        </tr>
    `).join("");
}
window.renderRekapSaldo = function () {
    const tableBody = document.getElementById("rekap-table-body");
    if (!tableBody) return;

    // 1. Ambil Nilai Filter Periode
    const fBulan = document.getElementById("filter-dari-bulan")?.value;
    const fTahun = document.getElementById("filter-dari-tahun")?.value;
    const filterTPK = document.getElementById("filter-tpk")?.value;
    const filterJenis = document.getElementById("filter-jenis")?.value;
    const filterPetak = document.getElementById("filter-petak")?.value;

    // Nilai pembanding periode (YYYYMM)
    const periodeMulai = (fTahun && fBulan) ? parseInt(fTahun) * 100 + parseInt(fBulan) : 0;

    const ringkasan = {};

    // 2. Proses SEMUA data untuk memisahkan Saldo Awal vs Mutasi Berjalan
    state.data.forEach(d => {
        // Filter Kategori (TPK, Jenis, Petak) harus selalu dicek
        if (filterTPK && d.tpk !== filterTPK) return;
        if (filterJenis && d.jenis_kayu !== filterJenis) return;
        if (filterPetak && d.petak !== filterPetak) return;

        const [y, m] = d.tanggal.split("-");
        const periodeData = parseInt(y) * 100 + parseInt(m);
        const key = `${d.jenis_kayu}-${d.tpk}-${d.petak || 'Tanpa Petak'}`;

        if (!ringkasan[key]) {
            ringkasan[key] = {
                jenis: d.jenis_kayu, tpk: d.tpk, petak: d.petak || '-',
                saldoAwal: 0, bap: 0, lhp: 0, kirim: 0
            };
        }

        const m3 = parseFloat(d.masuk_m3 || d.keluar_m3 || 0);

        if (periodeData < periodeMulai) {
            // MASUK KE SALDO AWAL (Data sebelum bulan filter)
            const masuk = parseFloat(d.masuk_m3 || 0);
            const keluar = parseFloat(d.keluar_m3 || 0);
            ringkasan[key].saldoAwal += (masuk - keluar);
        } else {
            // MASUK KE MUTASI BERJALAN (Data dalam/setelah bulan filter)
            if (d.masuk_m3 > 0) {
                if (d.keterangan?.toUpperCase().includes('BAP')) ringkasan[key].bap += m3;
                else ringkasan[key].lhp += m3;
            } else if (d.keluar_m3 > 0) {
                ringkasan[key].kirim += m3;
            }
        }
    });

    // 3. Render dan Hitung Grand Total
    const rows = Object.values(ringkasan);
    let gTotalAwal = 0, gTotalBap = 0, gTotalLhp = 0, gTotalKirim = 0, gTotalSaldoBap = 0, gTotalSaldoLhp = 0;

    if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Tidak ada data</td></tr>';
        return;
    }

    let html = rows.map((r) => {
        const sBap = r.saldoAwal + r.bap - r.lhp;
        const sLhp = r.saldoAwal + r.lhp - r.kirim;

        gTotalAwal += r.saldoAwal;
        gTotalBap += r.bap;
        gTotalLhp += r.lhp;
        gTotalKirim += r.kirim;
        gTotalSaldoBap += sBap;
        gTotalSaldoLhp += sLhp;

        // BUBUHKAN formatSaldo() DI SINI
        return `
            <tr>
                <td>${r.jenis}</td>
                <td>${r.tpk}</td>
                <td class="text-center">${r.petak}</td>
                <td class="text-right">${formatSaldo(r.saldoAwal)}</td>
                <td class="text-right">${formatSaldo(r.bap)}</td>
                <td class="text-right">${formatSaldo(r.lhp)}</td>
                <td class="text-right">${formatSaldo(r.kirim)}</td>
                <td class="text-right" style="font-weight:bold">${formatSaldo(sBap)}</td>
                <td class="text-right" style="font-weight:bold">${formatSaldo(sLhp)}</td>
            </tr>`;
    }).join('');

    // 4. Baris Total Keseluruhan (BUBUHKAN formatSaldo() JUGA DI SINI)
    html += `
        <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #374151;">
            <td colspan="3" class="text-center">TOTAL KESELURUHAN</td>
            <td class="text-right">${formatSaldo(gTotalAwal)}</td>
            <td class="text-right">${formatSaldo(gTotalBap)}</td>
            <td class="text-right">${formatSaldo(gTotalLhp)}</td>
            <td class="text-right">${formatSaldo(gTotalKirim)}</td>
            <td class="text-right">${formatSaldo(gTotalSaldoBap)}</td>
            <td class="text-right">${formatSaldo(gTotalSaldoLhp)}</td>
        </tr>
    `;

    tableBody.innerHTML = html;
};
window.renderRekapTable = function () {
    console.log("Memulai Render Tabel Rekap...");

    // 1. Ambil nilai filter dari UI
    const tahunDari = document.getElementById('filter-rincian-tahun-dari')?.value;
    const tahunSampai = document.getElementById('filter-rincian-tahun-sampai')?.value;
    const jenisKayu = document.getElementById('filter-jenis')?.value;

    // 2. Filter data berdasarkan input
    let dataFiltered = [...state.data];

    if (tahunDari) {
        dataFiltered = dataFiltered.filter(d => d.tanggal.split('-')[0] >= tahunDari);
    }
    if (tahunSampai) {
        dataFiltered = dataFiltered.filter(d => d.tanggal.split('-')[0] <= tahunSampai);
    }
    if (jenisKayu) {
        dataFiltered = dataFiltered.filter(d => d.jenis_kayu === jenisKayu);
    }

    // 3. Logika untuk menampilkan ke HTML Tabel Rekap Anda
    // (Sesuaikan ID 'tabel-rekap-body' dengan ID <tbody> di HTML Anda)
    const tbody = document.getElementById('tabel-rekap-body');
    if (!tbody) return;

    tbody.innerHTML = dataFiltered.map((d, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${d.tanggal}</td>
            <td>${d.jenis_kayu}</td>
            <td>${d.masuk || 0}</td>
            <td>${d.keluar || 0}</td>
        </tr>
    `).join('');
};

// Helper untuk memproses data rekap (filter + grouping)
function getProcessedRekapData() {
    const fDariB = document.getElementById("filter-dari-bulan").value;
    const fDariT = document.getElementById("filter-dari-tahun").value;
    const fSampaiB = document.getElementById("filter-sampai-bulan").value;
    const fSampaiT = document.getElementById("filter-sampai-tahun").value;
    const fH = document.getElementById("filter-tpk").value;
    const fJ = document.getElementById("filter-jenis").value;
    const fP = document.getElementById("filter-petak").value;
    const fK = document.getElementById("filter-ket").value.toLowerCase();

    if (!state.hasAppliedFilter) return null;

    const grouped = {};
    const sorted = [...state.data].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    // Inisialisasi variabel Grand Total
    let totalSAwalLHP = 0;
    let totalBapBerjalan = 0;
    let totalLhpBerjalan = 0;
    let totalKirimBerjalan = 0;
    let totalGrandBAP = 0;
    let totalGrandLHP = 0;

    const startDate = new Date(fDariT, fDariB - 1, 1);
    const endDate = new Date(fSampaiT, fSampaiB, 0);

    sorted.forEach(d => {
        const dataDate = new Date(d.tanggal);
        if (dataDate > endDate) return; // skip data after end

        if (fH && d.he_lotim !== fH) return;
        if (fJ && d.jenis !== fJ) return;
        if (fP && d.petak !== fP) return;
        if (fK) {
            const searchTerms = fK.split(',').map(t => t.trim()).filter(t => t);
            const match = searchTerms.some(term => d.ket.toLowerCase().includes(term));
            if (!match) return;
        }

        const masuk = parseFloat(d.p || 0);
        const keluar = parseFloat(d.m || 0);
        const ket = d.ket.toUpperCase();

        let isBefore = false;
        let isCurrent = false;
        if (dataDate < startDate) {
            isBefore = true;
        } else if (dataDate <= endDate) {
            isCurrent = true;
        }

        const key = `${d.jenis}|${d.he_lotim}|${d.petak}`;
        if (!grouped[key]) {
            grouped[key] = { sAwalLHP: 0, sAwalBAP: 0, bapBerjalan: 0, lhpBerjalan: 0, kirimBerjalan: 0 };
        }

        if (isBefore) {
            if (ket.includes("SALDO AWAL")) {
                grouped[key].sAwalLHP += masuk;
            } else if (ket.includes("LHP")) {
                grouped[key].sAwalBAP -= masuk;
                grouped[key].sAwalLHP += masuk;
            } else if (ket.includes("BAP")) {
                grouped[key].sAwalBAP += masuk;
            } else if (ket.includes("KIRIM")) {
                grouped[key].sAwalLHP -= keluar;
            }
        }
        else if (isCurrent) {
            if (ket.includes("SALDO AWAL")) {
                grouped[key].sAwalLHP += masuk;
            } else if (ket.includes("LHP")) {
                grouped[key].lhpBerjalan += masuk;
            } else if (ket.includes("BAP")) {
                grouped[key].bapBerjalan += masuk;
            } else if (ket.includes("KIRIM")) {
                grouped[key].kirimBerjalan += keluar;
            }
        }
    });

    const rows = [];
    Object.entries(grouped).forEach(([key, v]) => {
        const [jen, tpk, pet] = key.split("|");
        const sBAP = (v.sAwalBAP + v.bapBerjalan) - v.lhpBerjalan;
        const sLHP = (v.sAwalLHP + v.lhpBerjalan) - v.kirimBerjalan;

        // Akumulasi ke Grand Total
        totalSAwalLHP += v.sAwalLHP;
        totalBapBerjalan += v.bapBerjalan;
        totalLhpBerjalan += v.lhpBerjalan;
        totalKirimBerjalan += v.kirimBerjalan;
        totalGrandBAP += sBAP;
        totalGrandLHP += sLHP;

        if (v.sAwalLHP !== 0 || v.bapBerjalan !== 0 || v.lhpBerjalan !== 0 || v.kirimBerjalan !== 0 || sBAP !== 0 || sLHP !== 0) {
            rows.push({
                jenis: jen, tpk, petak: pet,
                sAwalLHP: v.sAwalLHP,
                bapBerjalan: v.bapBerjalan,
                lhpBerjalan: v.lhpBerjalan,
                kirimBerjalan: v.kirimBerjalan,
                sBAP, sLHP
            });
        }
    });

    return {
        rows,
        totals: {
            totalSAwalLHP, totalBapBerjalan, totalLhpBerjalan, totalKirimBerjalan, totalGrandBAP, totalGrandLHP
        },
        fDariB, fDariT, fSampaiB, fSampaiT
    };
}
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

window.renderRingkasanStok = function () {
    const tableBody = document.getElementById("rekap-table-body");
    if (!tableBody) return;

    // 1. Ambil nilai filter dari dropdown
    const filterTPK = document.getElementById("filter-tpk").value;
    const filterJenis = document.getElementById("filter-jenis").value;
    const filterPetak = document.getElementById("filter-petak").value;

    // 2. Filter data mentah berdasarkan pilihan user
    let filtered = state.data.filter(d => {
        const matchTPK = !filterTPK || d.tpk === filterTPK;
        const matchJenis = !filterJenis || d.jenis_kayu === filterJenis;
        const matchPetak = !filterPetak || d.petak === filterPetak;
        return matchTPK && matchJenis && matchPetak;
    });

    // 3. Logika grouping (mengelompokkan data unik)
    const summary = {};
    filtered.forEach(d => {
        const key = `${d.tpk}-${d.jenis_kayu}-${d.petak}`;
        if (!summary[key]) {
            summary[key] = {
                tpk: d.tpk || '-',
                jenis: d.jenis_kayu || '-',
                petak: d.petak || '-',
                masuk: 0,
                keluar: 0,
                // Inisialisasi properti tambahan dengan 0 agar tidak undefined
                saldoAwal: 0,
                bap: 0,
                lhp: 0,
                kirim: 0,
                saldoBAP: 0,
                saldoLHP: 0
            };
        }
        summary[key].masuk += (parseFloat(d.masuk_m3) || 0);
        summary[key].keluar += (parseFloat(d.keluar_m3) || 0);

        // Contoh logika jika Anda punya kategori di database (opsional)
        // if(d.keterangan === 'BAP') summary[key].bap += d.masuk_m3;
    });

    // 4. Render ke tabel
    const results = Object.values(summary);
    if (results.length === 0) {
        // Sesuaikan colspan dengan jumlah kolom di <thead> (misal ada 10 kolom)
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Data tidak ditemukan</td></tr>';
        return;
    }

    tableBody.innerHTML = results.map(r => `
        <tr>
            <td>${r.jenis}</td>
            <td>${r.tpk}</td>
            <td>${r.petak}</td>
            <td class="text-right">${r.saldoAwal.toFixed(2)}</td>
            <td class="text-right">${r.bap.toFixed(2)}</td>
            <td class="text-right">${r.lhp.toFixed(2)}</td>
            <td class="text-right">${r.kirim.toFixed(2)}</td>
            <td class="text-right">${r.saldoBAP.toFixed(2)}</td>
            <td class="text-right">${r.saldoLHP.toFixed(2)}</td>
            </td>
        </tr>
    `).join('');
};
window.renderRekapRincian = function () {
    const body = document.getElementById("rincian-table-body");
    if (!body) return;

    state.hasAppliedFilter = true;
    const processed = getProcessedRincianData();
    if (!processed) return;

    const { filtered, saldoAwal } = processed;
    let runningSaldo = saldoAwal;

    let totalMasukFisik = 0; // Hanya untuk BAP / Masuk Awal
    let totalKeluarFisik = 0; // Untuk Kirim
    let htmlContent = "";

    // 1. Baris Saldo Awal
    htmlContent += `
        <tr style="background-color: #f8fafc; font-style: italic;">
            <td colspan="5" class="text-center"><strong>SALDO AWAL</strong></td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
            <td class="text-right" style="font-weight:bold;">${saldoAwal.toFixed(2)}</td>
        </tr>
    `;

    filtered.forEach(d => {
        const valP = parseFloat(d.p || 0);
        const valM = parseFloat(d.m || 0);
        const ket = (d.ket || "").toUpperCase();

        let mskTampil = 0;
        let klrTampil = 0;
        let isLHP = ket.includes("LHP");

        if (isLHP) {
            // JIKA LHP: Tampilkan angkanya, tapi JANGAN tambahkan ke runningSaldo
            mskTampil = valP;
            klrTampil = 0;
        } else {
            // JIKA BAP/MASUK LAIN: Tambah Saldo
            if (valP > 0) {
                mskTampil = valP;
                runningSaldo += valP;
                totalMasukFisik += valP;
            }
            // JIKA KIRIM: Kurangi Saldo
            if (valM > 0) {
                klrTampil = valM;
                runningSaldo -= valM;
                totalKeluarFisik += valM;
            }
        }

        // Beri warna khusus untuk baris LHP agar terlihat sebagai "Catatan Administrasi"
        const rowStyle = isLHP ? 'background-color: #fffbeb; color: #92400e;' : '';

        htmlContent += `
            <tr style="${rowStyle}">
                <td>${d.tanggal}</td>
                <td>${isLHP ? `<em>(Adm)</em> ${d.ket}` : d.ket}</td>
                <td>${d.jenis}</td>
                <td>${d.tpk}</td>
                <td class="text-center">${d.petak || '-'}</td>
                <td class="text-right">${mskTampil > 0 ? mskTampil.toFixed(2) : '-'}</td>
                <td class="text-right">${klrTampil > 0 ? klrTampil.toFixed(2) : '-'}</td>
                <td class="text-right" style="font-weight:bold">${runningSaldo.toFixed(2)}</td>
            </tr>`;
    });

    // 2. Baris Total
    htmlContent += `
        <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #334155;">
            <td colspan="5" class="text-center">TOTAL MUTASI FISIK (BAP & KIRIM)</td>
            <td class="text-right">${totalMasukFisik.toFixed(2)}</td>
            <td class="text-right">${totalKeluarFisik.toFixed(2)}</td>
            <td class="text-right">${runningSaldo.toFixed(2)}</td>
        </tr>
    `;

    body.innerHTML = htmlContent;
}

// Helper untuk memproses data rincian (filter + hitung saldo awal)
function getProcessedRincianData() {
    // Ambil Filter
    const fTFrom = document.getElementById("filter-rincian-tahun-dari").value;
    const fBFrom = document.getElementById("filter-rincian-bulan-dari").value;
    const fTTo = document.getElementById("filter-rincian-tahun-sampai").value;
    const fBTo = document.getElementById("filter-rincian-bulan-sampai").value;
    const fTPK = document.getElementById("filter-rincian-tpk").value;
    const fJenis = document.getElementById("filter-rincian-jenis").value;
    const fPetak = document.getElementById("filter-rincian-petak").value;
    const fKet = document.getElementById("filter-rincian-ket").value.toLowerCase();

    const fromVal = (fTFrom && fBFrom) ? parseInt(fTFrom) * 100 + parseInt(fBFrom) : 0;
    const toVal = (fTTo && fBTo) ? parseInt(fTTo) * 100 + parseInt(fBTo) : 999999;

    let saldoAwal = 0;

    // 1. Hitung Saldo Awal (Hanya FISIK: Non-LHP)
    state.data.forEach(d => {
        const [y, m] = d.tanggal.split("-");
        const dVal = parseInt(y) * 100 + parseInt(m);
        const ket = (d.keterangan || "").toUpperCase();

        if (dVal < fromVal) {
            // Filter kategori tetap berlaku
            if (fTPK && d.tpk !== fTPK) return;
            if (fJenis && d.jenis_kayu !== fJenis) return;
            if (fPetak && d.petak !== fPetak) return;

            // LOGIKA KRUSIAL: Jika LHP, jangan hitung ke saldo fisik
            if (ket.includes("LHP")) return;

            const masuk = parseFloat(d.masuk_m3 || 0);
            const keluar = parseFloat(d.keluar_m3 || 0);
            saldoAwal += (masuk - keluar);
        }
    });

    // 2. Filter Data Periode Berjalan
    let filtered = state.data.filter(d => {
        const [y, m] = d.tanggal.split("-");
        const dVal = parseInt(y) * 100 + parseInt(m);

        if (dVal < fromVal || dVal > toVal) return false;
        if (fTPK && d.tpk !== fTPK) return false;
        if (fJenis && d.jenis_kayu !== fJenis) return false;
        if (fPetak && d.petak !== fPetak) return false;
        if (fKet && !(d.keterangan || "").toLowerCase().includes(fKet)) return false;

        return true;
    }).sort((a, b) => {
        const dateDiff = new Date(a.tanggal) - new Date(b.tanggal);
        if (dateDiff !== 0) return dateDiff;

        // Prioritas: Saldo Awal > BAP (Fisik) > LHP (Adm) > KIRIM (Keluar)
        const getPriority = (k) => {
            const txt = (k || "").toUpperCase();
            if (txt.includes("SALDO AWAL")) return 0;
            if (txt.includes("BAP")) return 1;
            if (txt.includes("LHP")) return 2;
            if (txt.includes("KIRIM")) return 3;
            return 4;
        };
        return getPriority(a.keterangan) - getPriority(b.keterangan);
    });

    // 3. Mapping Data untuk Render
    const mappedFiltered = filtered.map(d => ({
        ...d,
        p: parseFloat(d.masuk_m3 || 0),
        m: parseFloat(d.keluar_m3 || 0),
        ket: d.keterangan || "",
        jenis: d.jenis_kayu
    }));

    return { filtered: mappedFiltered, saldoAwal };
}

function renderRincian() {
    const body = document.getElementById("rincian-table-body");
    if (!body) return;

    if (!state.hasAppliedFilter) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #666;">Silakan terapkan filter untuk menampilkan data</td></tr>';
        return;
    }

    const processed = getProcessedRincianData();
    if (!processed) return;

    const { filtered, saldoAwal } = processed;
    let runningSaldo = saldoAwal;
    let totalMasukFisik = 0;
    let totalKeluarFisik = 0;
    let totalDokumenLHP = 0;
    let totalKirim = 0;
    let htmlContent = "";

    // 1. Baris Saldo Awal (Total 8 Kolom: 7 gabung + 1 saldo)
    htmlContent += `
        <tr style="background-color: #f3f4f6; font-style: italic;">
            <td colspan="5" class="text-center">SALDO AWAL (Sampai Periode Sebelumnya)</td>
            <td class="text-right">-</td>
            <td class="text-right">-</td>
            <td class="text-right font-bold">${saldoAwal.toFixed(2)}</td>
        </tr>
    `;

    filtered.forEach(d => {
        const valP = parseFloat(d.p || 0); // Masuk
        const valM = parseFloat(d.m || 0); // Keluar
        const ket = (d.ket || "").toUpperCase();

        let mskTampil = 0, klrTampil = 0;
        let mskHitung = 0, klrHitung = 0;

        if (ket.includes("KIRIM")) {
            mskTampil = 0; klrTampil = valM;
            mskHitung = 0; klrHitung = valM;
            totalKirim += valM;
        } else if (ket.includes("LHP")) {
            mskTampil = valP; klrTampil = 0;
            mskHitung = valP; klrHitung = 0;
            totalDokumenLHP += valP;
        } else {
            // Mutasi umum (Fisik)
            mskTampil = valP; klrTampil = valM;
            mskHitung = valP; klrHitung = valM;
        }

        runningSaldo += (mskHitung - klrHitung);
        totalMasukFisik += mskHitung;
        totalKeluarFisik += klrHitung;

        const rowStyle = ket.includes('LHP') ? 'background-color: #f9fafb; color: #6b7280;' : '';

        htmlContent += `
            <tr style="${rowStyle}">
                <td>${d.tanggal}</td>
                <td>${d.ket}</td>
                <td>${d.jenis}</td>
                <td>${d.tpk}</td>
                <td>${d.petak}</td>
                <td class="text-right">${mskTampil.toFixed(2)}</td>
                <td class="text-right">${klrTampil.toFixed(2)}</td>
                <td class="text-right font-bold">${runningSaldo.toFixed(2)}</td>
            </tr>`;
    });

    // 2. Baris Grand Total (Total 8 Kolom: 5 gabung + 3 angka)
    if (filtered.length > 0 || saldoAwal !== 0) {
        // Total Kirim (Opsional)
        if (totalKirim > 0) {
            htmlContent += `
                <tr style="background-color: #fef2f2; color: #dc2626; font-size: 0.85rem;">
                    <td colspan="6" class="text-center">TOTAL PENGIRIMAN</td>
                    <td class="text-right">${totalKirim.toFixed(2)}</td>
                    <td class="text-right">-</td>
                </tr>`;
        }

        // Grand Total Utama
        htmlContent += `
            <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #374151;">
                <td colspan="5" class="text-center">GRAND TOTAL MUTASI FISIK</td>
                <td class="text-right">${totalMasukFisik.toFixed(2)}</td>
                <td class="text-right">${totalKeluarFisik.toFixed(2)}</td>
                <td class="text-right">${runningSaldo.toFixed(2)}</td>
            </tr>`;
    }

    body.innerHTML = htmlContent;
}

// BACKUP & EXPORT
function backupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "BACKUP_SADHANA_" + new Date().toISOString().slice(0, 10) + ".json");
    a.click();
}

function restoreData() {
    const fileInput = document.getElementById("restore-file");
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            state = imported;
            state.isLoggedIn = false;
            save();
            alert("Restore berhasil! Silakan login kembali.");
            location.reload();
        } catch (err) {
            alert("File tidak valid.");
        }
    };
    reader.readAsText(file);
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

// ===== EXPORT REKAP SALDO TO XLS =====
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

// ===== EXPORT RINCIAN MUTASI TO XLS =====
function exportRincianExcel() {
    const table = document.querySelector("#view-rekap-rincian table");
    if (!table || table.rows.length <= 1) {
        alert("Tidak ada data rincian untuk diekspor. Silakan terapkan filter terlebih dahulu.");
        return;
    }

    // Menambahkan style agar border muncul di Excel
    const style = "<style>table { border-collapse: collapse; } td, th { border: 1px solid black; }</style>";
    const tableHtml = style + table.outerHTML;

    const fileName = `Rincian_Mutasi_${new Date().getTime()}.xls`;
    const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(tableHtml);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}
// Daftarkan fungsi ke global window agar onclick di HTML bisa jalan
window.updatePetakByTPK = updatePetakByTPK;
window.applyRekapFilter = applyRekapFilter;
window.switchView = switchView;
document.addEventListener("DOMContentLoaded", () => {
    if (state.isLoggedIn) {
        startApp();
        initFormSubmitHandler();
    } else {
        initLoginHandler();
    }
    // Letakkan di bagian bawah script.js
    document.getElementById('stock-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = document.getElementById('edit-id').value;
        
        // ✅ PERBAIKAN: Ubah 'masuk' -> 'masuk_m3' dan 'keluar' -> 'keluar_m3'
        const formData = {
            tanggal: document.getElementById('input-date').value,
            keterangan: document.getElementById('input-ket').value,
            jenis_kayu: document.getElementById('input-jenis').value,
            tpk: document.getElementById('input-tpk').value,
            petak: document.getElementById('input-petak').value,
            masuk_m3: parseFloat(document.getElementById('input-in').value) || 0,
            keluar_m3: parseFloat(document.getElementById('input-out').value) || 0
        };

        try {
            if (editId) {
                // --- PROSES UPDATE ---
                const { error } = await api
                    .from('stok_kayu')
                    .update(formData)
                    .eq('id', editId);

                if (error) throw error;
                alert("Data berhasil diperbarui!");
                cancelEdit(); // Kembalikan form ke mode simpan
            } else {
                // --- PROSES SIMPAN BARU ---
                const { error } = await api
                    .from('stok_kayu')
                    .insert([formData]);

                if (error) throw error;
                alert("Data berhasil disimpan!");
                if (e.target && typeof e.target.reset === 'function') {
                    e.target.reset(); // Kosongkan form
                }
            }

            // Refresh data di tabel setelah simpan/update
            fetchData();

        } catch (err) {
            console.error("Kesalahan database:", err.message);
            alert("Gagal memproses data: " + err.message);
        }
    });
});

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

    // B. Dropdown Filter di Ringkasan Saldo (Penting!)
    const elFilterJenis = document.getElementById('filter-jenis'); // Pastikan ID ini sesuai di HTML
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
    const elRincianJenis = document.getElementById('filter-rincian-jenis');
    if (elRincianJenis) {
        const listJenis = state.master["jenis_kayu"] || [];
        elRincianJenis.innerHTML = '<option value="">-- Semua Jenis --</option>' +
            listJenis.map(j => `<option value="${j.name}">${j.name}</option>`).join('');
    }

    const elRincianTPK = document.getElementById('filter-rincian-tpk');
    if (elRincianTPK) {
        const listTPK = state.master["tpk"] || [];
        elRincianTPK.innerHTML = '<option value="">-- Semua TPK --</option>' +
            listTPK.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    }

    // Panggil fungsi tahun di akhir agar tahun 2026/2027 muncul
    updateYearDropdowns();

}
// Jalankan aplikasi otomatis saat halaman dibuka
// --- HANLDER UTAMA SUBMIT FORM (PREVENT DOUBLE SUBMIT) ---
let isSubmitting = false;

async function handleStockSubmit(e) {
    e.preventDefault();

    // Mencegah klik ganda / eksekusi bersamaan
    if (isSubmitting) return;
    isSubmitting = true;

    const editId = document.getElementById('edit-id')?.value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const formData = {
        tanggal: document.getElementById('input-date').value,
        keterangan: document.getElementById('input-ket').value,
        jenis_kayu: document.getElementById('input-jenis').value,
        tpk: document.getElementById('input-tpk').value,
        petak: document.getElementById('input-petak').value || "-",
        masuk_m3: parseFloat(document.getElementById('input-in').value) || 0,
        keluar_m3: parseFloat(document.getElementById('input-out').value) || 0
    };

    try {
        if (typeof showLoading === 'function') showLoading(true);
        if (submitBtn) submitBtn.disabled = true;

        if (editId) {
            // Mode Update
            const { error } = await api.from('stok_kayu').update(formData).eq('id', editId);
            if (error) throw error;
            alert("Data berhasil diperbarui!");
            if (typeof window.cancelEdit === 'function') window.cancelEdit();
        } else {
            // Mode Simpan Baru
            const { error } = await api.from('stok_kayu').insert([formData]);
            if (error) throw error;
            alert("Data berhasil disimpan!");
            e.target.reset(); // Kosongkan form
        }

        // Refresh data tabel
        if (typeof fetchData === 'function') await fetchData();

    } catch (err) {
        console.error("Gagal memproses data:", err.message);
        alert("Gagal memproses data: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
        if (submitBtn) submitBtn.disabled = false;
        isSubmitting = false; // Reset flag penanda submit
    }
}

// --- INISIALISASI TUNGGAL SAAT APLIKASI DIMUAT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Pasang event listener form HANYA SEKALI
    const stockForm = document.getElementById('stock-form');
    if (stockForm) {
        stockForm.onsubmit = handleStockSubmit; 
    }

    // 2. Jalankan Aplikasi
    if (state.isLoggedIn) {
        startApp();
    } else {
        if (typeof initLoginHandler === 'function') initLoginHandler();
    }
});

// Eksport fungsi ke global jika dipanggil via onclick
window.renderRekapRincian = renderRekapRincian;

