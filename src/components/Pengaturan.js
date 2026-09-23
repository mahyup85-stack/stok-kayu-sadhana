import { state } from '../state/store.js';
import { initSupabase } from '../services/api.js';
import { showLoading } from '../utils/helpers.js';


// Fungsi untuk memuat kredensial terbaru saat aplikasi startup
window.loadSavedCredentials = async function () {
    try {
        // 1. Cek dulu dari localStorage (paling cepat)
        const localUser = localStorage.getItem("sadhana_custom_user");
        const localPass = localStorage.getItem("sadhana_custom_pass");

        if (localUser && localPass) {
            if (window.state && window.state.config) {
                window.state.config.user = localUser;
                window.state.config.pass = localPass;
                console.log("🔓 Kredensial lokal dimuat dari localStorage.");
            }
            return;
        }

        // 2. Jika tidak ada di localStorage, ambil dari database Supabase (tabel 'setting')
        if (typeof initSupabase === "function") {
            const client = initSupabase();
            const { data, error } = await client
                .from('settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (!error && data) {
                const dbUser = data.username;
                const dbPass = data.password;

                if (dbUser && dbPass) {
                    // Simpan ke state dan localStorage agar sinkron
                    if (window.state && window.state.config) {
                        window.state.config.user = dbUser;
                        window.state.config.pass = dbPass;
                    }
                    localStorage.setItem("sadhana_custom_user", dbUser);
                    localStorage.setItem("sadhana_custom_pass", dbPass);
                    console.log("☁️ Kredensial disinkronkan dari database Supabase.");
                }
            }
        }
    } catch (err) {
        console.error("Gagal memuat kredensial, menggunakan default:", err);
    }
    finally {
        if (typeof showLoading === "function") showLoading(false);
    }
}


window.handleAccountChange = async function (event) {
    event.preventDefault();
    console.log("Fungsi dipanggil!");

    const newUser = document.getElementById('new-user').value.trim();
    const newPass = document.getElementById('new-pass').value.trim();

    if (!newUser || !newPass) {
        alert("Username dan Password tidak boleh kosong!");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin mengubah akun akses aplikasi?")) return;

    try {
        // Nyalakan indikator loading agar tombol/layar terkunci atau menampilkan animasi
        if (typeof showLoading === "function") showLoading(true);
        const client = initSupabase();

        // Menggunakan query database ke tabel 'settings' (dengan 's')
        const { error } = await client
            .from('settings')
            .upsert({ id: 1, username: newUser, password: newPass });

        if (error) throw error;

        // Simpan juga ke localStorage agar instan
        localStorage.setItem("sadhana_custom_user", newUser);
        localStorage.setItem("sadhana_custom_pass", newPass);

        // Perbarui state aktif
        if (window.state && window.state.config) {
            window.state.config.user = newUser;
            window.state.config.pass = newPass;
        }

        alert("Akun berhasil diperbarui di database!");
        document.getElementById('form-change-pass').reset();
    } catch (err) {
        console.error("Gagal mengubah akun:", err);
        alert("Gagal mengubah akun: " + (err.message || err));
    } finally {
        // Pastikan loading selalu dimatikan baik berhasil maupun gagal
        if (typeof showLoading === "function") showLoading(false);
    }
};

/**
 * 2. Toggle Intip / Sembunyikan Kata Sandi (Password Viewer)
 */
window.togglePassword = function (inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        iconEl.innerText = '🙈';
    } else {
        input.type = 'password';
        iconEl.innerText = '👁️';
    }
};

/**
 * 3. Export & Download Backup Data (JSON)
 * PERBAIKAN: Menggunakan Blob & URL.createObjectURL agar aman untuk data berukuran besar
 */
window.backupData = async function () {
    try {
        showLoading(true);
        const client = initSupabase();

        // Mengambil seluruh tabel master data & transaksi
        const [masterRes, transaksiRes] = await Promise.all([
            client.from('master_data').select('*'),
            client.from('stok_kayu').select('*')
        ]);

        if (masterRes.error) throw masterRes.error;
        if (transaksiRes.error) throw transaksiRes.error;

        // Menyusun objek backup JSON
        const backupPayload = {
            app: "SadhanaApp",
            version: "1.0",
            timestamp: new Date().toISOString(),
            data: {
                master_data: masterRes.data || [],
                stok_kayu: transaksiRes.data || []
            }
        };

        // Buat file Blob JSON
        const jsonString = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadAnchor = document.createElement('a');
        const filename = `backup_sadhana_${new Date().toISOString().slice(0, 10)}.json`;

        downloadAnchor.href = url;
        downloadAnchor.download = filename;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();

        // Cleanup memory
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);

        alert("Backup berhasil diunduh!");
    } catch (err) {
        console.error("Gagal membuat backup:", err);
        alert("Gagal mengunduh backup: " + (err.message || err));
    } finally {
        showLoading(false);
    }
};

/**
 * 4. Restore Data dari File JSON
 */
window.restoreData = async function (event) {
    const inputElement = event.target;
    const file = inputElement.files[0];

    if (!file) return;

    if (!file.name.endsWith('.json')) {
        alert("Format file tidak valid. Harap unggah file .json!");
        inputElement.value = ''; // Reset input file
        return;
    }

    const confirmRestore = confirm("PERINGATAN: Memulihkan data akan menggantikan/menambahkan data yang ada di database. Lanjutkan?");
    if (!confirmRestore) {
        inputElement.value = ''; // Reset input file
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            showLoading(true);
            const json = JSON.parse(e.target.result);

            if (!json.data || !json.data.master_data || !json.data.transaksi) {
                throw new Error("Struktur file backup JSON tidak valid atau rusak.");
            }

            const client = initSupabase();

            // Upsert / Insert data master
            if (json.data.master_data.length > 0) {
                const { error: errMaster } = await client
                    .from('master_data')
                    .upsert(json.data.master_data);
                if (errMaster) throw errMaster;
            }

            // Upsert / Insert data transaksi
            if (json.data.transaksi.length > 0) {
                const { error: errTx } = await client
                    .from('stok_kayu')
                    .upsert(json.data.transaksi);
                if (errTx) throw errTx;
            }

            alert("Pemulihan data (Restore) berhasil dilakukan! Halaman akan dimuat ulang.");
            window.location.reload();
        } catch (err) {
            console.error("Gagal melakukan restore:", err);
            alert("Gagal memulihkan data: " + (err.message || err));
        } finally {
            showLoading(false);
            inputElement.value = ''; // Reset input file agar bisa diunggah ulang
        }
    };

    reader.readAsText(file);
};

/**
 * 5. Render Halaman Pengaturan
 */
window.renderPengaturan = function () {
    console.log("Render pengaturan dijalankan...");

    // Secara default, arahkan ke view kelola akun atau tampilkan bagian yang sesuai
    const accountSection = document.getElementById('view-kelola-sandi');
    const backupSection = document.getElementById('view-backup-setting');

    // Pastikan salah satu tampil saat halaman pengaturan dibuka pertama kali
    if (accountSection && backupSection) {
        // Cek mana yang sedang aktif atau set default ke kelola akun
        const isBackupActive = !backupSection.classList.contains('hidden') && backupSection.style.display !== 'none';
        if (!isBackupActive) {
            accountSection.style.setProperty('display', 'block', 'important');
            accountSection.classList.remove('hidden');
        }
    }
};