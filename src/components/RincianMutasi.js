import { state } from "../state/store.js";
import { showLoading } from "../utils/helpers.js";

function initFilterRincianDropdowns() {
    const allData = (typeof state !== 'undefined' && Array.isArray(state.data)) ? state.data : [];

    const tpkSelect = document.getElementById("filter-rincian-tpk");
    const jenisSelect = document.getElementById("filter-rincian-jenis-kayu");

    if (!tpkSelect || !jenisSelect) return;

    // Simpan pilihan saat ini jika ada
    const currentTPK = tpkSelect.value;
    const currentJenis = jenisSelect.value;

    // Reset opsi awal
    tpkSelect.innerHTML = '<option value="">-- Semua TPK --</option>';
    jenisSelect.innerHTML = '<option value="">-- Semua Jenis --</option>';

    // Ambil data TPK yang unik
    const uniqueTPK = [...new Set(allData.map(d => String(d.tpk || d.TPK || '').trim()))].filter(Boolean);
    uniqueTPK.sort();
    uniqueTPK.forEach(tpk => {
        const opt = document.createElement("option");
        opt.value = tpk;
        opt.textContent = tpk;
        tpkSelect.appendChild(opt);
    });

    // Ambil data Jenis Kayu yang unik
    const uniqueJenis = [...new Set(allData.map(d => String(d.jenis || d.jenisKayu || d.Jenis || '').trim()))].filter(Boolean);
    uniqueJenis.sort();
    uniqueJenis.forEach(jenis => {
        const opt = document.createElement("option");
        opt.value = jenis;
        opt.textContent = jenis;
        jenisSelect.appendChild(opt);
    });

    // Kembalikan nilai terpilih jika sebelumnya sudah dipilih
    if (currentTPK) tpkSelect.value = currentTPK;
    if (currentJenis) jenisSelect.value = currentJenis;
}
function getYearMonthNum(dateInput) {
    if (!dateInput) return 0;

    if (dateInput instanceof Date && !isNaN(dateInput)) {
        return dateInput.getFullYear() * 100 + (dateInput.getMonth() + 1);
    }

    const str = String(dateInput).trim();
    if (!str) return 0;

    const dateOnly = str.split('T')[0].split(' ')[0];
    const parts = dateOnly.split(/[-/.]/);

    if (parts.length >= 3) {
        let year, month;
        if (parts[0].length === 4) { // YYYY-MM-DD
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
        } else if (parts[2].length === 4) { // DD-MM-YYYY
            year = parseInt(parts[2], 10);
            month = parseInt(parts[1], 10);
        }
        if (!isNaN(year) && !isNaN(month)) {
            return year * 100 + month;
        }
    }
    return 0;
}


function getProcessedRincianData() {
    const allData = (typeof state !== 'undefined' && Array.isArray(state.data)) ? state.data : [];

    const getVal = (id) => {
        const el = document.getElementById(id);
        if (!el) return "";
        return (el.value || "").trim().toLowerCase();
    };

    // 1. Ambil Nilai Filter berdasarkan ID SESUAI HTML
    const fBFrom = getVal("filter-rincian-bulan-dari");
    const fTFrom = getVal("filter-rincian-tahun-dari");
    const fBTo = getVal("filter-rincian-bulan-sampai");
    const fTTo = getVal("filter-rincian-tahun-sampai");

    const fTPK = getVal("filter-rincian-tpk");
    const fJenis = getVal("filter-rincian-jenis-kayu"); // DISESUAIKAN: filter-rincian-jenis-kayu
    const fPetak = getVal("filter-rincian-petak");
    const fKet = getVal("filter-rincian-ket");

    // Hitung Rentang Periode YYYYMM
    const numTFrom = parseInt(fTFrom, 10);
    const numBFrom = parseInt(fBFrom, 10) || 1;
    const numTTo = parseInt(fTTo, 10);
    const numBTo = parseInt(fBTo, 10) || 12;

    const fromVal = !isNaN(numTFrom) ? (numTFrom * 100 + numBFrom) : 0;
    const toVal = !isNaN(numTTo) ? (numTTo * 100 + numBTo) : 999999;

    let saldoAwal = 0;

    // Filter Data Mutasi
    let filtered = allData.filter(d => {
        const dateStr = d.tanggal || d.tgl || d.Tanggal;
        const dVal = getYearMonthNum(dateStr);

        // Filter Periode Tanggal
        if (fromVal > 0 && dVal < fromVal) return false;
        if (toVal < 999999 && dVal > toVal) return false;

        // Toleransi Properti Data Mentah
        const itemTPK = String(d.tpk || d.TPK || '').trim().toLowerCase();
        const itemJenis = String(d.jenis_kayu || d.jenis || d.Jenis || '').trim().toLowerCase();
        const itemPetak = String(d.petak || d.Petak || '').trim().toLowerCase();
        const itemKet = String(d.keterangan || d.ket || d.Ket || '').toLowerCase();

        if (fTPK !== "" && itemTPK !== fTPK) return false;
        if (fJenis !== "" && itemJenis !== fJenis) return false;
        if (fPetak !== "" && itemPetak !== fPetak) return false;
        if (fKet !== "" && !itemKet.includes(fKet)) return false;

        return true;
    });

    // Urutkan berdasarkan Tanggal
    filtered.sort((a, b) => {
        const dateA = new Date(a.tanggal || a.tgl);
        const dateB = new Date(b.tanggal || b.tgl);
        return dateA - dateB;
    });

    const mappedFiltered = filtered.map(d => {
        const rawMasuk = parseFloat(d.masuk_m3 ?? d.p ?? d.masuk ?? 0) || 0;
        const rawKeluar = parseFloat(d.keluar_m3 ?? d.m ?? d.keluar ?? 0) || 0;

        return {
            ...d,
            tanggal: d.tanggal || d.tgl || '-',
            p: rawMasuk,
            m: rawKeluar,
            ket: d.keterangan || d.ket || "",
            jenis: d.jenis_kayu || d.jenis || "",
            tpk: d.tpk || "-",
            petak: d.petak || "-"
        };
    });

    return { filtered: mappedFiltered, saldoAwal };
}

export function renderRincian() {
    console.log("🚀 [CEK] renderRincian BERHASIL DIPANGGIL!");

    const body = document.getElementById("rincian-table-body");
    if (!body) {
        console.error("❌ [CEK] rincian-table-body TIDAK KETEMU!");
        return;
    }

    if (typeof state !== 'undefined') {
        state.hasAppliedFilter = true;
    }

    const processed = getProcessedRincianData();
    if (!processed || !processed.filtered) return;

    const { filtered } = processed;
    const totalRows = filtered.length;

    if (totalRows === 0) {
        body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px; color: #64748b; text-align: center;">Tidak ada data mutasi yang sesuai dengan filter.</td></tr>';

        // Kosongkan container pagination jika data kosong
        const paginationContainer = document.getElementById("pagination-container");
        if (paginationContainer) paginationContainer.innerHTML = "";
        return;
    }

    const rowsPerPage = state?.rowsPerPage || 10;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

    if (!state.currentPage || state.currentPage < 1) state.currentPage = 1;
    if (state.currentPage > totalPages) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    let runningSaldo = 0;
    let totalMasukUtama = 0;
    let totalKeluarUtama = 0;

    const formatSaldoNum = (val) => {
        let num = parseFloat(val) || 0;
        if (Math.abs(num) < 0.0001) num = 0;
        return num.toFixed(2);
    };

    const processedDataWithSaldo = filtered.map((d) => {
        const valP = parseFloat(d.p || 0);
        const valM = parseFloat(d.m || 0);
        const ketUpper = String(d.ket || "").toUpperCase();

        let mskTampil = 0, klrTampil = 0;
        let mskHitung = 0, klrHitung = 0;

        if (ketUpper.includes("KIRIM")) {
            mskTampil = 0; klrTampil = valM;
            mskHitung = 0; klrHitung = valM;
        } else if (ketUpper.includes("BAP")) {
            mskTampil = valP; klrTampil = 0;
            mskHitung = 0; klrHitung = 0;
        } else if (ketUpper.includes("LHP")) {
            mskTampil = valP; klrTampil = 0;
            mskHitung = valP; klrHitung = 0;
        } else {
            mskTampil = valP; klrTampil = valM;
            mskHitung = valP; klrHitung = valM;
        }

        runningSaldo += (mskHitung - klrHitung);
        totalMasukUtama += mskHitung;
        totalKeluarUtama += klrHitung;

        return {
            tanggal: d.tanggal,
            ketTampil: d.ket || '-',
            jenisTampil: d.jenis || '-',
            tpk: d.tpk,
            petak: d.petak,
            mskTampil,
            klrTampil,
            currentRunningSaldo: runningSaldo
        };
    });

    // 🔥 PASTIKAN CONTAINER PAGINATION ADA DAN DIKELUARKAN DARI PEMBUNGKUS TABEL RINCIAN
    let container = document.getElementById("pagination-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "pagination-container";
        const targetCard = document.querySelector(".card") || document.body;
        targetCard.appendChild(container);
    }

    // Gunakan pencarian pembungkus tabel khusus rincian atau tabel aktif
    let tableContainer = document.querySelector(".rincian-table-container") || document.querySelector(".scroll-table-container") || document.querySelector("table");
    if (tableContainer && container.parentNode !== tableContainer.parentNode) {
        tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
    }

    const paginatedData = processedDataWithSaldo.slice(startIndex, endIndex);
    let htmlContent = "";

    paginatedData.forEach(d => {
        const isBAP = d.ketTampil.toUpperCase().includes('BAP');
        const rowStyle = isBAP ? 'background-color: #fffbeb; color: #92400e;' : '';

        htmlContent += `
            <tr style="${rowStyle}">
                <td>${d.tanggal}</td>
                <td>${isBAP ? `<em>(Adm)</em> ${d.ketTampil}` : d.ketTampil}</td>
                <td>${d.jenisTampil}</td>
                <td>${d.tpk}</td>
                <td style="text-align: center;">${d.petak}</td>
                <td style="text-align: right;">${d.mskTampil > 0 ? formatSaldoNum(d.mskTampil) : '-'}</td>
                <td style="text-align: right;">${d.klrTampil > 0 ? formatSaldoNum(d.klrTampil) : '-'}</td>
                <td style="text-align: right; font-weight: bold;">${formatSaldoNum(d.currentRunningSaldo)}</td>
            </tr>`;
    });

    if (state.currentPage === totalPages) {
        htmlContent += `
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #334155;">
                <td colspan="5" style="text-align: center;">TOTAL KESELURUHAN MUTASI</td>
                <td style="text-align: right;">${formatSaldoNum(totalMasukUtama)}</td>
                <td style="text-align: right;">${formatSaldoNum(totalKeluarUtama)}</td>
                <td style="text-align: right;">${formatSaldoNum(runningSaldo)}</td>
            </tr>`;
    }

    body.innerHTML = htmlContent;

    if (typeof window.initPermanentPaginationFooter === "function") {
    window.initPermanentPaginationFooter();
}
}

// Global Event Trigger sesuai OnClick pada HTML tombol Anda
window.triggerFilterUpdate = function () {
    if (typeof state !== 'undefined') {
        state.currentPage = 1;
    }
    renderRincian();
};


export async function exportRincianPDF() {
    try {
        if (typeof showLoading === 'function') showLoading(true);

        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            alert("Library jsPDF belum dimuat!");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;

        // Header Perusahaan
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("PT. SADHANA ARIFNUSA", marginX, 12);

        // 2. Sub-Judul Perusahaan
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Kawasan Pengelolaan Hutan & TPK Terpadu", marginX, 16.5);

        // 3. Teks Alamat (Di Atas Garis)
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Jl. Raya Labuhan Lombok - Sambelia | Telp: -", marginX, 20.5);

        // 4. Garis Pemisah Kop Surat (Di Bawah Alamat)
        doc.setLineWidth(0.6);
        doc.setDrawColor(30, 41, 59);
        doc.line(marginX, 22, pageWidth - marginX, 22);

        // Judul Laporan
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text("LAPORAN RINCIAN MUTASI STOK KAYU", pageWidth / 2, 33, { align: "center" });

        // === PERBAIKAN: Ambil teks filter dari HTML secara langsung ===
        const getElText = (id) => {
            const el = document.getElementById(id);
            if (!el) return "";
            if (el.tagName === "SELECT") {
                return el.options[el.selectedIndex]?.text || "";
            }
            return el.value || "";
        };

        const bFromText = getElText("filter-rincian-bulan-dari") || "Awal";
        const tFromText = getElText("filter-rincian-tahun-dari") || "";
        const bToText = getElText("filter-rincian-bulan-sampai") || "Akhir";
        const tToText = getElText("filter-rincian-tahun-sampai") || "";
        const tpkText = getElText("filter-rincian-tpk") || "Semua TPK";
        const jenisText = getElText("filter-rincian-jenis-kayu") || "Semua Jenis";

        const periodeStr = `${bFromText} ${tFromText} s/d ${bToText} ${tToText}`.trim();

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Periode: ${periodeStr} | TPK: ${tpkText} | Jenis: ${jenisText} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 38, { align: "center" });

        // Ambil Data Rincian Terproses
        const processed = getProcessedRincianData();
        if (!processed || !processed.filtered || processed.filtered.length === 0) {
            alert("Tidak ada data mutasi untuk diexport!");
            return;
        }

        const { filtered: dataMutasi } = processed;
        const tableBody = [];
        let runningSaldo = 0;
        let totalMasukUtama = 0;
        let totalKeluarUtama = 0;
        let rowCount = 0;

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
                mskTampil = valP; klrTampil = 0;
                mskHitung = 0; klrHitung = 0;
            } else if (ketUpper.includes("LHP")) {
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

        // Baris Total
        tableBody.push([
            { content: 'GRAND TOTAL MUTASI PERIODE INI', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: totalMasukUtama.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: totalKeluarUtama.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: runningSaldo.toFixed(2), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
        ]);

        doc.autoTable({
            startY: 42,
            head: [[
                'No', 'Tanggal', 'Keterangan / No. Dokumen', 'Jenis Kayu',
                'TPK', 'Petak', 'Masuk (m³)', 'Keluar (m³)', 'Saldo (m³)'
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

// Hubungkan ke window global
window.exportRincianPDF = exportRincianPDF;
window.renderRincian = renderRincian;
window.exportRincianMutasiPDF = exportRincianPDF;
window.exportRincianExcel = exportRincianExcel;

// Helper pemetaan baris khusus per kategori (BAP, LHP, KIRIM) lengkap dengan perhitungan total volume
function mapRowsForCategory(list, categoryType) {
    let totalVolume = 0;

    const rows = list.map((d, index) => {
        const valP = parseFloat(d.p || d.masuk_m3 || 0);
        const valM = parseFloat(d.m || d.keluar_m3 || 0);

        let baseObj = {
            "No": index + 1,
            "Tanggal": d.tanggal || '-',
            "Keterangan": d.ket || '-',
            "Jenis": d.jenis || '-',
            "TPK": d.tpk || '-',
            "Petak": d.petak || '-'
        };

        let currentVol = 0;
        if (categoryType === "BAP") {
            currentVol = valP > 0 ? valP : 0;
            baseObj["BAP (m3)"] = currentVol;
        } else if (categoryType === "LHP") {
            currentVol = valP > 0 ? valP : 0;
            baseObj["LHP (m3)"] = currentVol;
        } else if (categoryType === "KIRIM") {
            currentVol = valM > 0 ? valM : 0;
            baseObj["Kirim (m3)"] = currentVol;
        }

        totalVolume += currentVol;
        return baseObj;
    });

    return { rows, totalVolume };
}

// Fungsi Utama Export Excel Multi-Sheet dengan Resume Rekapitulasi per Petak & Jenis
export function exportRincianExcel() {
    try {
        const processed = getProcessedRincianData();
        if (!processed || !processed.filtered || processed.filtered.length === 0) {
            alert("Tidak ada data untuk diexport ke Excel!");
            return;
        }

        const allData = processed.filtered;

        // 1. Filter data berdasarkan kategori teks pada Keterangan/Dokumen
        const dataBAP = allData.filter(d => String(d.ket || "").toUpperCase().includes("BAP"));
        const dataLHP = allData.filter(d => String(d.ket || "").toUpperCase().includes("LHP"));
        const dataKirim = allData.filter(d => String(d.ket || "").toUpperCase().includes("KIRIM"));

        // 2. Ambil data baris dan total volume per kategori untuk sheet BAP, LHP, KIRIM
        const resBAP = mapRowsForCategory(dataBAP, "BAP");
        const resLHP = mapRowsForCategory(dataLHP, "LHP");
        const resKirim = mapRowsForCategory(dataKirim, "KIRIM");

        const buildSheetData = (rows, totalVol, volKey) => {
            if (rows.length === 0) return [];
            let sheetRows = [...rows];
            let emptyRow = { "No": "", "Tanggal": "", "Keterangan": "", "Jenis": "", "TPK": "", "Petak": "" };
            emptyRow[volKey] = "";
            sheetRows.push(emptyRow);

            let totalRow = { "No": "TOTAL", "Tanggal": "", "Keterangan": "", "Jenis": "", "TPK": "", "Petak": "" };
            totalRow[volKey] = totalVol;
            sheetRows.push(totalRow);

            return sheetRows;
        };

        const finalRowsBAP = buildSheetData(resBAP.rows, resBAP.totalVolume, "BAP (m3)");
        const finalRowsLHP = buildSheetData(resLHP.rows, resLHP.totalVolume, "LHP (m3)");
        const finalRowsKirim = buildSheetData(resKirim.rows, resKirim.totalVolume, "Kirim (m3)");

        // 3. Buat Workbook Excel baru
        const wb = XLSX.utils.book_new();

        if (finalRowsBAP.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finalRowsBAP), "BAP");
        }
        if (finalRowsLHP.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finalRowsLHP), "LHP");
        }
        if (finalRowsKirim.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finalRowsKirim), "KIRIM");
        }

        // 4. Buat Sheet "Resume" berdasarkan kombinasi Petak & Jenis Kayu (Sesuai Gambar)
        const summaryMap = {};

        allData.forEach(d => {
            const petak = String(d.petak || '-').trim();
            const jenis = String(d.jenis || d.jenis_kayu || '-').trim().toUpperCase();
            const key = `${petak}_${jenis}`;

            if (!summaryMap[key]) {
                summaryMap[key] = {
                    petak: petak,
                    jenis: jenis,
                    volLhp: 0,
                    volKirim: 0,
                    bap: 0
                };
            }

            const valP = parseFloat(d.p || d.masuk_m3 || 0);
            const valM = parseFloat(d.m || d.keluar_m3 || 0);
            const ketUpper = String(d.ket || "").toUpperCase();

            if (ketUpper.includes("LHP")) {
                summaryMap[key].volLhp += valP;
            } else if (ketUpper.includes("KIRIM")) {
                summaryMap[key].volKirim += valM;
            } else if (ketUpper.includes("BAP")) {
                summaryMap[key].bap += valP;
            }
        });

        const resumeRows = Object.values(summaryMap).map(item => {
            const lhpKirim = item.volLhp - item.volKirim;
            const lhpBap = item.volLhp - item.bap;

            return {
                "PETAK": item.petak,
                "JENIS": item.jenis,
                "VOL LHP (M3)": item.volLhp > 0 ? Number(item.volLhp.toFixed(2)) : '-',
                "VOL KIRIM (M3)": item.volKirim > 0 ? Number(item.volKirim.toFixed(2)) : '-',
                "BAP (M3)": item.bap > 0 ? Number(item.bap.toFixed(2)) : '-',
                "LHP-KIRIM": Math.abs(lhpKirim) > 0.0001 ? Number(lhpKirim.toFixed(2)) : '-',
                "LHP-BAP": Math.abs(lhpBap) > 0.0001 ? Number(lhpBap.toFixed(2)) : '-'
            };
        });

        // Urutkan berdasarkan Petak
        resumeRows.sort((a, b) => a.PETAK.localeCompare(b.PETAK));

        if (resumeRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumeRows), "Resume");
        }

        // Simpan file Excel
        XLSX.writeFile(wb, `MUTASI_SK_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
        console.error("Gagal export Excel rincian:", err);
        alert("Gagal membuat Excel: " + err.message);
    }
}

window.exportRincianExcel = exportRincianExcel;
window.exportRincianToExcel = exportRincianExcel;