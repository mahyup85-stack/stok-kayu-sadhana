import { state } from '../state/store.js';


export const round2 = (num) => Math.round((parseFloat(num) || 0) * 100) / 100;
export function formatSaldo(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


export const formatTanggalDB = (dateString) => {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
};

// 🌟 Helper Utama: Ambil Angka Konversi Spesifik dari Master Data
export function getFaktorKonversi(jenisKayu) {
    if (!jenisKayu) return 0;

    const key = String(jenisKayu).trim().toLowerCase();
    const globalState = window.state || state || {};

    // Ambil array master data jenis kayu
    const masterList = globalState.masterJenisKayu || globalState.jenisKayuList || globalState.masterData?.jenis_kayu || [];

    // 1. Cari berdasarkan ID atau Nama Jenis Kayu
    const found = masterList.find(k => {
        const idMatch = String(k.id || "").trim().toLowerCase() === key;
        const nameMatch = String(k.nama_jenis || k.nama || k.jenis_kayu || "").trim().toLowerCase() === key;
        return idMatch || nameMatch;
    });

    if (found) {
        const val = parseFloat(found.konversi ?? found.nilai_konversi ?? found.faktor_konversi ?? found.rasio);
        if (!isNaN(val) && val > 0) return val;
    }

    // 2. Cek jika disimpan dalam bentuk Map/Object (konversiKayu)
    if (globalState.konversiKayu && globalState.konversiKayu[key]) {
        const val = parseFloat(globalState.konversiKayu[key]);
        if (!isNaN(val) && val > 0) return val;
    }

    return 0; // Kembalikan 0 jika tidak ditemukan
}

window.getFaktorKonversi = getFaktorKonversi;

// 🌟 Hitung Konversi M3 ke SM (Dinamis dari Master Data)
export function hitungKonversi(jenisKayu, volumeM3) {
    if (!volumeM3 || isNaN(volumeM3)) return 0;

    let faktor = getFaktorKonversi(jenisKayu);
    if (!faktor || faktor <= 0) faktor = 0.59; // Fallback jika data master belum terisi

    const hasil = parseFloat(volumeM3) / faktor;
    return Math.round(hasil);
}

window.hitungKonversi = hitungKonversi;

export function showLoading(isLoading) {
    const loader = document.getElementById('loading-overlay');
    if (loader) isLoading ? loader.classList.remove('hidden') : loader.classList.add('hidden');
}

// 🌟 Helper Konversi SM ke M3 (Diperbaiki agar dinamis mencari konversi jika berupa string/jenis kayu)
export function smToM3(sm, konversiOrJenisKayu = 0.59) {
    let faktor = 0.59;

    if (typeof konversiOrJenisKayu === 'number' && konversiOrJenisKayu > 0) {
        faktor = konversiOrJenisKayu;
    } else {
        const searchedFaktor = getFaktorKonversi(konversiOrJenisKayu);
        if (searchedFaktor > 0) faktor = searchedFaktor;
    }

    return parseFloat((parseFloat(sm || 0) * faktor).toFixed(2));
}

// 🌟 Helper Konversi M3 ke SM
export function m3ToSm(m3, konversiOrJenisKayu = 0.59) {
    const valM3 = parseFloat(m3 || 0);
    if (valM3 <= 0) return 0;

    let faktor = 0.59;
    if (typeof konversiOrJenisKayu === 'number' && konversiOrJenisKayu > 0) {
        faktor = konversiOrJenisKayu;
    } else {
        const searchedFaktor = getFaktorKonversi(konversiOrJenisKayu);
        if (searchedFaktor > 0) faktor = searchedFaktor;
    }

    return Math.round(valM3 / faktor);
}

let currentCaptchaCode = '';

// 1. Fungsi membuat string teks acak (menghindari karakter yang mirip)
export function generateCaptchaText(length = 5) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 2. Fungsi merender gambar captcha ke elemen <canvas>
export function renderCaptcha() {
    const canvas = document.getElementById('captchaCanvas');
    if (!canvas) {
        console.warn("Elemen canvas dengan ID 'captchaCanvas' tidak ditemukan!");
        return;
    }

    const ctx = canvas.getContext('2d');

    // Generate kode baru dan simpan ke variabel global
    currentCaptchaCode = generateCaptchaText(5);
    window.currentCaptchaCode = currentCaptchaCode;

    console.log("🔑 Captcha Baru Digenerate:", currentCaptchaCode);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Membuat garis-garis acak pengganggu (noise)
    for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 150}, 0.4)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }

    // Menggambar teks karakter satu per satu dengan rotasi acak
    const charWidth = canvas.width / (currentCaptchaCode.length + 1);
    for (let i = 0; i < currentCaptchaCode.length; i++) {
        const char = currentCaptchaCode[i];
        ctx.save();
        const x = charWidth * (i + 0.8);
        const y = 22 + (Math.random() * 4 - 2);
        const angle = (Math.random() - 0.5) * 0.4;

        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `bold ${20 + Math.random() * 4}px Arial, sans-serif`;
        ctx.fillStyle = `rgb(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100})`;
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }
}

// 3. Fungsi pembungkus (wrapper) untuk generate
export function generateCaptcha() {
    return renderCaptcha();
}
window.generateCaptcha = generateCaptcha;

// 4. Fungsi validasi input user terhadap target captcha
export function validateCaptcha() {
    const inputEl = document.getElementById('captcha-input');
    // Ambil input apa adanya tanpa .toUpperCase() jika ingin case-sensitive murni, 
    // atau gunakan .trim() saja agar tidak ada spasi tersembunyi
    const userInput = inputEl ? inputEl.value.trim() : '';
    const targetCode = (window.currentCaptchaCode || currentCaptchaCode || '').trim();

    console.log("🔍 Validasi Ketat -> Input User:", `"${userInput}"`, "| Target Asli:", `"${targetCode}"`);

    if (!targetCode || !userInput) {
        console.warn("Captcha kosong atau target belum di-generate!");
        return false;
    }

    // PERBANDINGAN PERSIS (Case-Sensitive: Huruf besar dan kecil harus persis sama)
    // Jika ingin mengizinkan huruf besar/kecil tapi angkanya harus akurat, 
    // pastikan generator text-nya hanya menghasilkan huruf kapital atau angka yang jelas.
    return userInput === targetCode;
}
window.validateCaptcha = validateCaptcha;

// 🌟 5. INISIALISASI OTOMATIS SAAT HALAMAN DIBUKA (PENTING)
// Memastikan captcha langsung digambar begitu script dimuat
document.addEventListener("DOMContentLoaded", () => {
    generateCaptcha();

    // Opsional: Hubungkan tombol refresh captcha agar otomatis mengganti gambar saat diklik
    const btnRefresh = document.getElementById('btn-refresh-captcha');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', generateCaptcha);
    }

    const canvasEl = document.getElementById('captchaCanvas');
    if (canvasEl) {
        canvasEl.addEventListener('click', generateCaptcha);
    }
});

// 1. Inisialisasi State Global
window.state = window.state || {};
window.state.selectedIds = window.state.selectedIds || [];

// Helper Supabase Safe-Fallback
function getSupabaseClient() {
    return window.supabaseClient || window.supabase || (typeof api !== 'undefined' ? api : null);
}

// Helper SweetAlert2 dengan Fallback Browser Default
window.showAlert = function (icon, title, text) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: icon,
            title: title,
            text: text,
            confirmButtonColor: '#1e3a8a'
        });
    } else {
        alert(`${title}\n${text || ''}`);
    }
};

window.showConfirm = async function (title, text, confirmText = 'Ya, Hapus!') {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: confirmText,
            cancelButtonText: 'Batal'
        });
        return result.isConfirmed;
    } else {
        return confirm(`${title}\n${text}`);
    }
};


// ------------------------------------------------------------------
// 2. CHECKBOX MANAGER (SINGLE & SELECT ALL)
// ------------------------------------------------------------------

export const handleRowCheckboxChange = function (checkbox) {
    if (!window.state.selectedIds) window.state.selectedIds = [];
    const val = String(checkbox.value);

    if (checkbox.checked) {
        if (!window.state.selectedIds.includes(val)) {
            window.state.selectedIds.push(val);
        }
    } else {
        window.state.selectedIds = window.state.selectedIds.filter(id => id !== val);
    }
};
window.handleRowCheckboxChange = handleRowCheckboxChange;

export const toggleSelectAll = function (masterCheckbox) {
    const checkboxes = document.querySelectorAll('.row-checkbox, .item-checkbox');
    if (!window.state.selectedIds) window.state.selectedIds = [];
    const isChecked = masterCheckbox ? masterCheckbox.checked : false;

    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const val = String(cb.value);
        if (isChecked) {
            if (!window.state.selectedIds.includes(val)) window.state.selectedIds.push(val);
        } else {
            window.state.selectedIds = window.state.selectedIds.filter(id => id !== val);
        }
    });
};
window.toggleSelectAll = toggleSelectAll;

// ------------------------------------------------------------------
// 3. SEARCH / PENCARIAN MUTASI
// ------------------------------------------------------------------

export const handleSearch = function (query) {
    const keyword = String(query || '').trim().toLowerCase();
    const dataUtama = window.state.data || [];

    if (!keyword) {
        window.state.filteredData = [...dataUtama];
    } else {
        window.state.filteredData = dataUtama.filter(item => {
            const tanggal = String(item.tanggal || item.created_at || '').toLowerCase();
            const ket = String(item.keterangan || item.ket || '').toLowerCase();
            const jenis = String(item.jenis_kayu || item.jenis || '').toLowerCase();
            const tpk = String(item.tpk || '').toLowerCase();
            const petak = String(item.petak || '').toLowerCase();

            return tanggal.includes(keyword) ||
                ket.includes(keyword) ||
                jenis.includes(keyword) ||
                tpk.includes(keyword) ||
                petak.includes(keyword);
        });
    }

    window.state.currentPage = 1;

    if (typeof window.renderDashboardTable === 'function') {
        window.renderDashboardTable();
    }
};
window.handleSearch = handleSearch;
window.searchMutasi = handleSearch;

// ------------------------------------------------------------------
// 4. EXPORT KE CSV
// ------------------------------------------------------------------

export const exportToCSV = function () {
    const dataList = window.state.filteredData || window.state.data || [];

    if (dataList.length === 0) {
        window.showAlert('info', 'Informasi', 'Tidak ada data untuk diexport!');
        return;
    }

    try {
        const headers = ["No", "Tanggal", "Keterangan", "Jenis Kayu", "TPK", "Petak", "Masuk (SM)", "Masuk (M3)", "Keluar (SM)", "Keluar (M3)"];
        const csvRows = [];
        csvRows.push(headers.join(","));

        dataList.forEach((item, index) => {
            const row = [
                index + 1,
                `"${item.tanggal || item.created_at || ''}"`,
                `"${(item.keterangan || item.ket || '').replace(/"/g, '""')}"`,
                `"${item.jenis_kayu || item.jenis || ''}"`,
                `"${item.tpk || ''}"`,
                `"${item.petak || ''}"`,
                item.masuk_sm || 0,
                item.masuk_m3 || item.masuk || 0,
                item.keluar_sm || 0,
                item.keluar_m3 || item.keluar || 0
            ];
            csvRows.push(row.join(","));
        });

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Data_Mutasi_Stok_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Gagal melakukan export CSV:", err);
        window.showAlert('error', 'Gagal', 'Terjadi kesalahan saat mengexport data CSV.');
    }
};
window.exportToCSV = exportToCSV;
window.exportCSV = exportToCSV;

window.editData = function (rowId) {
    const activeState = window.state || {};
    const dataList = activeState.data || [];

    // Cari data berdasarkan ID
    const itemToEdit = dataList.find(item => (item.id || item.id_mutasi) == rowId);
    if (!itemToEdit) {
        console.error("Data tidak ditemukan untuk diedit:", rowId);
        return;
    }

    // 1. Masukkan data ke form input (sesuaikan id input dengan form Anda)
    const inputTanggal = document.querySelector('input[name="tanggal"], #input-tanggal');
    const inputKeterangan = document.querySelector('input[name="keterangan"], #input-keterangan');
    const inputJenis = document.querySelector('select[name="jenis_kayu"], #input-jenis');
    const inputTpk = document.querySelector('select[name="tpk"], #input-tpk');
    const inputPetak = document.querySelector('input[name="petak"], #input-petak');
    const inputMasuk = document.querySelector('input[name="masuk"], #input-masuk');
    const inputKeluar = document.querySelector('input[name="keluar"], #input-keluar');

    if (inputTanggal) inputTanggal.value = itemToEdit.tanggal || itemToEdit.created_at || '';
    if (inputKeterangan) inputKeterangan.value = itemToEdit.keterangan || itemToEdit.ket || '';
    if (inputJenis) inputJenis.value = itemToEdit.jenis_kayu || itemToEdit.jenis || '';
    if (inputTpk) inputTpk.value = itemToEdit.tpk || '';
    if (inputPetak) inputPetak.value = itemToEdit.petak || '';
    if (inputMasuk) inputMasuk.value = itemToEdit.masuk_m3 || itemToEdit.masuk || 0;
    if (inputKeluar) inputKeluar.value = itemToEdit.keluar_m3 || itemToEdit.keluar || 0;

    // 2. Simpan ID yang sedang diedit ke state aktif
    activeState.editingId = rowId;

    // 3. Ubah tombol Simpan menjadi Update dan tampilkan tombol Batal
    const btnSimpan = document.querySelector('#btn-simpan, button[type="submit"], .btn-simpan');
    if (btnSimpan) {
        btnSimpan.textContent = "Update";
        btnSimpan.style.background = "#3b82f6"; // Ubah warna jadi biru untuk mode edit
    }

    // Munculkan tombol Batal jika sudah ada di HTML, atau buat secara dinamis
    let btnBatal = document.querySelector('#btn-batal-edit');
    if (!btnBatal && btnSimpan) {
        btnBatal = document.createElement('button');
        btnBatal.id = 'btn-batal-edit';
        btnBatal.type = 'button';
        btnBatal.textContent = 'Batal';
        btnBatal.style.cssText = "background: #6b7280; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 8px;";
        btnBatal.onclick = window.cancelEdit;
        btnSimpan.parentNode.appendChild(btnBatal);
    } else if (btnBatal) {
        btnBatal.style.display = 'inline-block';
    }

    // Gulir layar ke atas (form input) agar user langsung melihat form terisi
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Fungsi untuk membatalkan mode edit
window.cancelEdit = function () {
    const activeState = window.state || {};
    activeState.editingId = null;

    // Reset form input
    const form = document.querySelector('form');
    if (form) form.reset();

    // Kembalikan tombol Simpan ke semula
    const btnSimpan = document.querySelector('#btn-simpan, button[type="submit"], .btn-simpan');
    if (btnSimpan) {
        btnSimpan.textContent = "Simpan";
        btnSimpan.style.background = ""; // Kembalikan warna default
    }

    // Sembunyikan tombol Batal
    const btnBatal = document.querySelector('#btn-batal-edit');
    if (btnBatal) {
        btnBatal.style.display = 'none';
    }
};
// ------------------------------------------------------------------
// 5. HAPUS SINGLE DATA (PER BARIS)
// ------------------------------------------------------------------

export const deleteData = async function (id) {
    if (!id) return;

    const yakin = await window.showConfirm("Konfirmasi Hapus", "Apakah Anda yakin ingin menghapus data ini?");
    if (!yakin) return;

    const client = getSupabaseClient();
    if (!client) {
        window.showAlert('error', 'Gagal', 'Koneksi ke database Supabase gagal!');
        return;
    }

    try {
        if (typeof window.showLoading === 'function') window.showLoading(true);

        const targetId = isNaN(id) ? id : Number(id);
        const { error } = await client.from('stok_kayu').delete().eq('id', targetId);

        if (error) throw error;

        // 1. UPDATE STATE LOKAL SECARA INSTAN (Agar tabel langsung merespons tanpa menunggu network)
        if (window.state && Array.isArray(window.state.data)) {
            window.state.data = window.state.data.filter(item => String(item.id) !== String(targetId));
        }
        if (window.state && Array.isArray(window.state.filteredData)) {
            window.state.filteredData = window.state.filteredData.filter(item => String(item.id) !== String(targetId));
        }
        if (window.state && window.state.selectedIds) {
            window.state.selectedIds = window.state.selectedIds.filter(item => String(item) !== String(id));
        }

        // 2. LANGSUNG RENDER ULANG TABEL
        if (typeof window.renderDashboardTable === 'function') {
            window.renderDashboardTable();
        }

        window.showAlert('success', 'Berhasil!', 'Data berhasil dihapus.');

        // 3. Ambil data terbaru di background (tanpa await agar UI tidak tertahan)
        if (typeof window.fetchData === 'function') {
            window.fetchData();
        }
    } catch (err) {
        console.error("Gagal menghapus data:", err);
        window.showAlert('error', 'Gagal Hapus', err.message || err);
    } finally {
        if (typeof window.showLoading === 'function') window.showLoading(false);
    }
};
window.deleteData = deleteData;
window.deleteSingleData = deleteData;

// ------------------------------------------------------------------
// 6. HAPUS ALL / BULK DELETE (SMART HYBRID)
// ------------------------------------------------------------------

export const deleteAllData = async function () {
    const client = getSupabaseClient();
    if (!client) {
        window.showAlert('error', 'Gagal', 'Koneksi ke database Supabase gagal!');
        return;
    }

    if (window.state.selectedIds && window.state.selectedIds.length > 0) {
        const jumlah = window.state.selectedIds.length;
        const yakin = await window.showConfirm("Hapus Data Terpilih", `Apakah Anda yakin ingin menghapus ${jumlah} data yang dicentang?`);
        if (!yakin) return;

        try {
            if (typeof window.showLoading === 'function') window.showLoading(true);

            const idsToDelete = window.state.selectedIds.map(id => isNaN(id) ? id : Number(id));
            const { error } = await client.from('stok_kayu').delete().in('id', idsToDelete);

            if (error) throw error;

            window.state.selectedIds = [];
            window.showAlert('success', 'Berhasil!', `${jumlah} data terpilih berhasil dihapus.`);

            // 🌟 Cukup panggil fetchData saja
            if (typeof window.fetchData === 'function') {
                await window.fetchData();
            }
        } catch (err) {
            console.error("Gagal menghapus data terpilih:", err);
            window.showAlert('error', 'Gagal Hapus', err.message || err);
        } finally {
            if (typeof window.showLoading === 'function') window.showLoading(false);
        }
        return;
    }

    const dataList = window.state.data || [];
    if (dataList.length === 0) {
        window.showAlert('info', 'Informasi', 'Tidak ada data yang bisa dihapus!');
        return;
    }

    const yakinSemua = await window.showConfirm("⚠️ PERINGATAN BERSYARAT", "Tidak ada centang terpilih. Apakah Anda yakin ingin MENGHAPUS SELURUH DATA mutasi stok?");
    if (!yakinSemua) return;

    try {
        if (typeof window.showLoading === 'function') window.showLoading(true);

        const { error } = await client.from('stok_kayu').delete().not('id', 'is', null);

        if (error) throw error;

        window.state.selectedIds = [];

        // 🌟 Cukup panggil fetchData saja
        if (typeof window.fetchData === 'function') {
            await window.fetchData();
        } else {
            window.state.data = [];
            window.state.filteredData = [];
            if (typeof window.renderDashboardTable === 'function') window.renderDashboardTable();
        }

        window.showAlert('success', 'Berhasil!', 'Semua data mutasi berhasil dihapus!');
    } catch (err) {
        console.error("Gagal menghapus semua data:", err);
        window.showAlert('error', 'Gagal Hapus', err.message || err);
    } finally {
        if (typeof window.showLoading === 'function') window.showLoading(false);
    }
};
window.deleteAllData = deleteAllData;
window.deleteAllMutasi = deleteAllData;
export function generateQRCodeBase64(text) {
    return new Promise(resolve => {
        const tempDiv = document.createElement("div");
        tempDiv.style.display = "none";
        document.body.appendChild(tempDiv);

        if (typeof QRCode === "undefined") {
            console.error("Library QRCode belum dimuat.");
            tempDiv.remove();
            resolve("");
            return;
        }

        new QRCode(tempDiv, {
            text,
            width: 100,
            height: 100,
            correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
            const image = tempDiv.querySelector("img");
            const canvas = tempDiv.querySelector("canvas");
            let dataUrl = "";

            if (image) {
                dataUrl = image.src || "";
            } else if (canvas) {
                dataUrl = canvas.toDataURL("image/png");
            }

            tempDiv.remove();
            resolve(dataUrl);
        }, 100);
    });
}
export function togglePassword(inputId = "login-password") {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
}
window.togglePassword = togglePassword;
window.loadYearDropdowns = function () {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10;
    const endYear = currentYear + 0;

    let yearOptions = '<option value="">-- Pilih Tahun --</option>';
    for (let y = endYear; y >= startYear; y--) {
        yearOptions += `<option value="${y}">${y}</option>`;
    }

    // Targetkan langsung ID spesifik yang ada di HTML Rekap Saldo dan Rincian Mutasi
    const specificIds = [
        'filter-dari-tahun',
        'filter-sampai-tahun',
        'filter-rekap-tahun-dari',
        'filter-rekap-tahun-sampai',
        'dari-tahun',
        'sampai-tahun'
    ];

    let updatedCount = 0;

    specificIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentVal = select.value;
            select.innerHTML = yearOptions;
            if (currentVal) select.value = currentVal;
            updatedCount++;
        }
    });

    // Fallback: tetap scan semua select jika ada format ID lain
    document.querySelectorAll('select').forEach(select => {
        const id = (select.id || '').toLowerCase();
        const name = (select.getAttribute('name') || '').toLowerCase();
        if (
            (id.includes('tahun') || id.includes('year')) &&
            !specificIds.includes(select.id)
        ) {
            const currentVal = select.value;
            select.innerHTML = yearOptions;
            if (currentVal) select.value = currentVal;
            updatedCount++;
        }
    });

    console.log(`Dropdown tahun berhasil dimuat: ${updatedCount} elemen diperbarui.`);
};

window.loadYearDropdowns = loadYearDropdowns;
export async function loadComponent(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.children.length > 0) {
        console.log(`Komponen ${containerId} sudah ada di DOM, melewati fetch ulang.`);
        return;
    }

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Gagal memuat ${filePath}`);
        const html = await response.text();
        container.innerHTML = html;
    } catch (error) {
        console.error("Gagal memuat komponen:", error);
    }
}
window.loadComponent = loadComponent;