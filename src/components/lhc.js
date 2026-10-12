import { mappingKodeKeTPK } from "../utils/helpers.js";
import { initSupabase } from "../services/api.js";

window.processUploadLhcCsv = async function() {
    const fileInput = document.getElementById("csv-lhc-file");
    if (!fileInput || fileInput.files.length === 0) {
        alert("Pilih file CSV terlebih dahulu!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split("\n");
        const payloadKuota = [];

        // Lewati baris header jika ada, lalu iterasi baris CSV
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(","); // Asumsi pemisah koma (,)
            if (cols.length < 3) continue;

            const barisCsvLhc = {
                kode_wilayah: cols[0].trim(),       // contoh: "PB07" atau "SK07"
                jenis_kayu: cols[1].trim(),         // contoh: "Acasia"
                volume_lhc: parseFloat(cols[2]) || 0 // contoh: 283.10
            };

            // Petakan otomatis ke TPK menggunakan fungsi helper
            const namaTpkTerdeteksi = mappingKodeKeTPK(barisCsvLhc.kode_wilayah);

            // Susun data siap dimasukkan ke tabel kuota_lhc Supabase
            payloadKuota.push({
                tahun: new Date().getFullYear(), // atau ambil dari input tahun pilihan
                tpk: namaTpkTerdeteksi,          // Hasil terjemahan (misal: "TPK Plambek")
                jenis_kayu: barisCsvLhc.jenis_kayu,
                volume_lhc: barisCsvLhc.volume_lhc
            });
        }

        if (payloadKuota.length === 0) {
            alert("Tidak ada data valid yang dapat dibaca dari file CSV.");
            return;
        }

        const client = initSupabase();
        if (!client) {
            alert("Koneksi Supabase gagal.");
            return;
        }

        // Simpan ke database Supabase tabel kuota_lhc
        const { error } = await client.from("kuota_lhc").insert(payloadKuota);

        if (error) {
            alert("Gagal mengimpor kuota LHC: " + error.message);
        } else {
            alert("Data kuota LHC berhasil diimpor!");
            // Muat ulang tabel kuota jika ada fungsi render-nya
            if (typeof window.loadLhcTable === "function") {
                window.loadLhcTable();
            }
        }
    };

    reader.readAsText(file);
};