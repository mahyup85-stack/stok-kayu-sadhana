import { state } from '../state/store.js';
import { showLoading, round2 } from '../utils/helpers.js';

// HELPER BANTUAN UNTUK MEMBACA NILAI DARI DOM
const getElValue = (id) => {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.value?.trim() || "";
};

const getElText = (id) => {
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT") {
        // Ambil teks dari opsi yang sedang dipilih
        return el.options[el.selectedIndex]?.text?.trim() || "";
    }
    return el.value?.trim() || "";
};

// Helper serbaguna untuk mencoba ID filter rekap maupun ID filter biasa
const getFilterVal = (idPrimary, idFallback) => {
    const elPrimary = document.getElementById(idPrimary);
    if (elPrimary) {
        return elPrimary.tagName === "SELECT"
            ? (elPrimary.options[elPrimary.selectedIndex]?.text?.trim() || elPrimary.value?.trim() || "")
            : elPrimary.value?.trim() || "";
    }

    const elFallback = document.getElementById(idFallback);
    if (elFallback) {
        return elFallback.tagName === "SELECT"
            ? (elFallback.options[elFallback.selectedIndex]?.text?.trim() || elFallback.value?.trim() || "")
            : elFallback.value?.trim() || "";
    }

    return "";
};


//==========================================
// 1. OLAH DATA REKAP SALDO BERDASARKAN FILTER
//==========================================
export function getProcessedRekapData() {
    const allData = Array.isArray(window.state?.data)
        ? window.state.data
        : (Array.isArray(state?.data) ? state.data : []);

    // Pembacaan ID yang disesuaikan presisi dengan HTML
    const fBFrom = getElValue("filter-dari-bulan");
    const fTFrom = getElValue("filter-dari-tahun");
    const fBTo = getElValue("filter-sampai-bulan");
    const fTTo = getElValue("filter-sampai-tahun");

    // Ambil Value & Teks Opsi sebagai Fallback
    let fTPK = getElValue("filter-tpk") || getElText("filter-tpk");
    let fJenis = getElValue("filter-rekap-jenis-kayu") || getElText("filter-rekap-jenis-kayu") || getElValue("filter-jenis") || getElText("filter-jenis");
    let fPetak = getElValue("filter-petak") || getElText("filter-petak");

    // Helper pembulatan ketat 2 desimal untuk menghindari floating-point error
    const round2 = (num) => Math.round((parseFloat(num) || 0) * 100) / 100;

    const numTFrom = parseInt(fTFrom, 10);
    const numBFrom = parseInt(fBFrom, 10);
    const numTTo = parseInt(fTTo, 10);
    const numBTo = parseInt(fBTo, 10);

    const fromVal = (!isNaN(numTFrom) && !isNaN(numBFrom)) ? (numTFrom * 100 + numBFrom) : 0;
    const toVal = (!isNaN(numTTo) && !isNaN(numBTo)) ? (numTTo * 100 + numBTo) : 999999;

    const clean = (str) => String(str || '')
        .replace(/--/g, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();

    const grouped = {};

    allData.forEach(d => {
        if (!d.tanggal) return;

        const parts = String(d.tanggal).split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const dVal = (isNaN(y) || isNaN(m)) ? 0 : (y * 100 + m);

        if (fromVal > 0 && dVal < fromVal) return;
        if (toVal < 999999 && dVal > toVal) return;

        const itemJenis = String(d.jenis_kayu || d.jenis || '').trim();
        const itemTPK = String(d.tpk || '').trim();
        const itemPetak = String(d.petak || '').trim();

        const cleanFTPK = clean(fTPK);
        if (cleanFTPK && !cleanFTPK.includes("semua") && !cleanFTPK.includes("pilih")) {
            if (clean(itemTPK) !== cleanFTPK) return;
        }

        const cleanFJenis = clean(fJenis);
        if (cleanFJenis && !cleanFJenis.includes("semua") && !cleanFJenis.includes("pilih")) {
            if (clean(itemJenis) !== cleanFJenis) return;
        }

        const cleanFPetak = clean(fPetak);
        if (cleanFPetak && !cleanFPetak.includes("semua") && !cleanFPetak.includes("pilih")) {
            if (clean(itemPetak) !== cleanFPetak) return;
        }

        const key = `${itemJenis || '-'}_${itemTPK || '-'}_${itemPetak || '-'}`;

        if (!grouped[key]) {
            grouped[key] = {
                jenis: itemJenis || '-',
                tpk: itemTPK || '-',
                petak: itemPetak || '-',
                sAwalBAP: 0, sAwalLHP: 0, bapBerjalan: 0, lhpBerjalan: 0, kirimBerjalan: 0,
                sBAP: 0, sLHP: 0
            };
        }

        const item = grouped[key];
        const valMasuk = parseFloat(d.masuk_m3 || d.p || 0) || 0;
        const valKeluar = parseFloat(d.keluar_m3 || d.m || 0) || 0;
        const ket = String(d.keterangan || "").toUpperCase();

        // Terapkan round2 pada setiap akumulasi nilai
        if (ket.includes("KIRIM")) {
            item.kirimBerjalan = round2(item.kirimBerjalan + valKeluar);
        } else if (ket.includes("LHP")) {
            item.lhpBerjalan = round2(item.lhpBerjalan + valMasuk);
        } else {
            item.bapBerjalan = round2(item.bapBerjalan + valMasuk);
        }
    });

    const rows = [];
    const totals = {
        totalSAwalBAP: 0, totalSAwalLHP: 0,
        totalBapBerjalan: 0, totalLhpBerjalan: 0, totalKirimBerjalan: 0,
        totalGrandBAP: 0, totalGrandLHP: 0
    };

    Object.values(grouped).forEach(item => {
        // Hitung saldo akhir dengan pembulatan presisi
        item.sBAP = round2(item.bapBerjalan - item.lhpBerjalan);
        item.sLHP = round2(item.lhpBerjalan - item.kirimBerjalan);

        totals.totalSAwalBAP = round2(totals.totalSAwalBAP + item.sAwalBAP);
        totals.totalSAwalLHP = round2(totals.totalSAwalLHP + item.sAwalLHP);
        totals.totalBapBerjalan = round2(totals.totalBapBerjalan + item.bapBerjalan);
        totals.totalLhpBerjalan = round2(totals.totalLhpBerjalan + item.lhpBerjalan);
        totals.totalKirimBerjalan = round2(totals.totalKirimBerjalan + item.kirimBerjalan);
        totals.totalGrandBAP = round2(totals.totalGrandBAP + item.sBAP);
        totals.totalGrandLHP = round2(totals.totalGrandLHP + item.sLHP);

        rows.push(item);
    });

    return { rows, totals };
}

//==========================================
// 2. RENDER TABEL REKAP SALDO KE DOM
//==========================================
export function renderRekapSaldo() {
    console.log("🚀 [EXEC] Fungsi renderRekapSaldo() mulai dieksekusi!");

    const tableBody = document.getElementById("rekap-table-body");
    if (!tableBody) {
        console.error("❌ [ERROR] Tabel body '#rekap-table-body' TIDAK DITEMUKAN di DOM!");
        return;
    }

    const dataProcessed = getProcessedRekapData();

    const formatSaldoNum = (val) => {
        let num = parseFloat(val) || 0;
        if (Math.abs(num) < 0.0001) num = 0;
        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const { rows, totals } = dataProcessed;

    if (rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding:20px;color:#666;">Tidak ada data untuk ditampilkan</td></tr>`;
        return;
    }

    // Pastikan container selalu berada di posisi yang benar di luar pembungkus tabel
    let container = document.getElementById("pagination-container");
    let tableContainer = document.querySelector(".scroll-table-container") || document.querySelector("table");
    if (container && tableContainer && container.parentNode !== tableContainer.parentNode) {
        tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
    }

    let html = rows.map((r) => `
    <tr>
        <td>${r.jenis}</td>
        <td>${r.tpk}</td>
        <td class="text-center">${r.petak}</td>
        <td class="text-right">${formatSaldoNum(r.sAwalBAP)}</td>
        <td class="text-right">${formatSaldoNum(r.sAwalLHP)}</td>
        <td class="text-right">${formatSaldoNum(r.bapBerjalan)}</td>
        <td class="text-right">${formatSaldoNum(r.lhpBerjalan)}</td>
        <td class="text-right">${formatSaldoNum(r.kirimBerjalan)}</td>
        <td class="text-right" style="font-weight:bold">${formatSaldoNum(r.sBAP)}</td>
        <td class="text-right" style="font-weight:bold">${formatSaldoNum(r.sLHP)}</td>
    </tr>
    `).join('');

    html += `
    <tr style="background-color:#f3f4f6;font-weight:bold;border-top:2px solid #374151;">
        <td colspan="3" class="text-center">TOTAL KESELURUHAN</td>
        <td class="text-right">${formatSaldoNum(totals.totalSAwalBAP)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalSAwalLHP)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalBapBerjalan)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalLhpBerjalan)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalKirimBerjalan)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalGrandBAP)}</td>
        <td class="text-right">${formatSaldoNum(totals.totalGrandLHP)}</td>
    </tr>
    `;

    tableBody.innerHTML = html;

    if (typeof window.initPermanentPaginationFooter === "function") {
        window.initPermanentPaginationFooter();
    }
}
//==========================================
// 3. EXPORT EXCEL
//==========================================
export function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Library SheetJS (XLSX) belum dimuat!");
        return;
    }

    const { rows, totals } = getProcessedRekapData();

    if (rows.length === 0) {
        alert("Tidak ada data untuk dieksport!");
        return;
    }

    const excelData = rows.map(r => ({
        "Jenis Kayu": r.jenis,
        "TPK": r.tpk,
        "Petak": r.petak,
        "Saldo Awal BAP (M³)": r.sAwalBAP,
        "Saldo Awal LHP (M³)": r.sAwalLHP,
        "BAP (M³)": r.bapBerjalan,
        "LHP (M³)": r.lhpBerjalan,
        "Kirim (M³)": r.kirimBerjalan,
        "Saldo BAP (M³)": r.sBAP,
        "Saldo LHP (M³)": r.sLHP
    }));

    excelData.push({
        "Jenis Kayu": "TOTAL KESELURUHAN",
        "TPK": "",
        "Petak": "",
        "Saldo Awal BAP (M³)": totals.totalSAwalBAP,
        "Saldo Awal LHP (M³)": totals.totalSAwalLHP,
        "BAP (M³)": totals.totalBapBerjalan,
        "LHP (M³)": totals.totalLhpBerjalan,
        "Kirim (M³)": totals.totalKirimBerjalan,
        "Saldo BAP (M³)": totals.totalGrandBAP,
        "Saldo LHP (M³)": totals.totalGrandLHP
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RekapSaldo");

    // Perbaikan: new Date() (menggunakan spasi)
    XLSX.writeFile(wb, `Laporan_Rekap_Saldo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

//==========================================
// 4. EXPORT PDF
//==========================================
export async function exportRekapSaldoPDF() {
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

        // HEADER / KOP SURAT
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("PT. SADHANA ARIFNUSA", marginX, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Kawasan Pengelolaan Hutan & TPK Terpadu", marginX, 16.5);

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Jl. Raya Labuhan Lombok - Sambelia | Telp: -", marginX, 20.5);

        doc.setLineWidth(0.6);
        doc.setDrawColor(30, 41, 59);
        doc.line(marginX, 22.5, pageWidth - marginX, 22.5);

        // ==========================================
        // KONVERSI & PEMBACAAN TEKS FILTER UNTUK HEADER PDF
        // ==========================================
        const namaBulanIndo = {
            "1": "Januari", "01": "Januari",
            "2": "Februari", "02": "Februari",
            "3": "Maret", "03": "Maret",
            "4": "April", "04": "April",
            "5": "Mei", "05": "Mei",
            "6": "Juni", "06": "Juni",
            "7": "Juli", "07": "Juli",
            "8": "Agustus", "08": "Agustus",
            "9": "September", "09": "September",
            "10": "Oktober", "11": "November", "12": "Desember"
        };

        const getOptionText = (id) => {
            const el = document.getElementById(id);
            if (!el) return "";
            if (el.tagName === "SELECT") {
                const opt = el.options[el.selectedIndex];
                return opt ? opt.text.trim() : "";
            }
            return el.value?.trim() || "";
        };

        const getOptionValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value?.trim() || "" : "";
        };

        // Bulan & Tahun Dari
        const bFromVal = getOptionValue("filter-rekap-bulan-dari") || getOptionValue("filter-dari-bulan");
        const tFromVal = getOptionValue("filter-rekap-tahun-dari") || getOptionValue("filter-dari-tahun");
        const bFromText = namaBulanIndo[bFromVal] || getOptionText("filter-rekap-bulan-dari") || getOptionText("filter-dari-bulan");

        // Bulan & Tahun Sampai
        const bToVal = getOptionValue("filter-rekap-bulan-sampai") || getOptionValue("filter-sampai-bulan");
        const tToVal = getOptionValue("filter-rekap-tahun-sampai") || getOptionValue("filter-sampai-tahun");
        const bToText = namaBulanIndo[bToVal] || getOptionText("filter-rekap-bulan-sampai") || getOptionText("filter-sampai-bulan");
        const tToText = tToVal; // <-- PERBAIKAN: Deklarasikan tToText menggunakan nilai tToVal

        // Format Periode
        let periodeStr = "";
        if (bFromText && tFromVal && bToText && tToText) {
            periodeStr = `${bFromText} ${tFromVal} s/d ${bToText} ${tToText}`;
        } else if (bFromText && bToText) {
            periodeStr = `${bFromText} s/d ${bToText}`;
        } else {
            periodeStr = "Semua Periode";
        }

        let tpkText = getOptionText("filter-rekap-tpk") || getOptionText("filter-tpk") || "Semua TPK";
        let jenisText = getOptionText("filter-rekap-jenis-kayu") || getOptionText("filter-jenis") || "Semua Jenis";
        let petakText = getOptionText("filter-rekap-petak") || getOptionText("filter-petak") || "";

        if (!tpkText || tpkText.includes("--")) tpkText = "Semua TPK";
        if (!jenisText || jenisText.includes("--")) jenisText = "Semua Jenis";

        // Perbaikan: new Date()
        const now = new Date();
        const tglCetak = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        let subHeaderInfo = `Periode: ${periodeStr} | TPK: ${tpkText} | Jenis: ${jenisText}`;
        if (petakText && !petakText.includes("--") && !petakText.toLowerCase().includes("semua")) {
            subHeaderInfo += ` | Petak: ${petakText}`;
        }
        subHeaderInfo += ` | Dicetak: ${tglCetak}`;

        // JUDUL LAPORAN
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("LAPORAN REKAPITULASI SALDO STOK KAYU", pageWidth / 2, 28, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(subHeaderInfo, pageWidth / 2, 33, { align: "center" });

        // DATA TABEL
        const { rows, totals } = getProcessedRekapData();

        if (!rows || rows.length === 0) {
            alert("Tidak ada data untuk dieksport ke PDF!");
            return;
        }

        const formatPDFNum = (val) => {
            let num = parseFloat(val) || 0;
            if (Math.abs(num) < 0.0001) num = 0;
            return num.toFixed(2);
        };

        const tableBody = rows.map((r, i) => [
            i + 1,
            r.jenis || '-',
            r.tpk || '-',
            r.petak || '-',
            formatPDFNum(r.sAwalBAP),
            formatPDFNum(r.sAwalLHP),
            formatPDFNum(r.bapBerjalan),
            formatPDFNum(r.lhpBerjalan),
            formatPDFNum(r.kirimBerjalan),
            formatPDFNum(r.sBAP),
            formatPDFNum(r.sLHP)
        ]);

        tableBody.push([
            { content: 'TOTAL KESELURUHAN', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
            { content: formatPDFNum(totals?.totalSAwalBAP), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalSAwalLHP), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalBapBerjalan), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalLhpBerjalan), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalKirimBerjalan), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalGrandBAP), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } },
            { content: formatPDFNum(totals?.totalGrandLHP), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } }
        ]);

        doc.autoTable({
            startY: 37,
            head: [[
                'No', 'Jenis Kayu', 'TPK', 'Petak',
                'Saldo Awal BAP (m³)', 'Saldo Awal LHP (m³)',
                'BAP (m³)', 'LHP (m³)', 'Kirim (m³)',
                'Saldo BAP (m³)', 'Saldo LHP (m³)'
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
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', cellWidth: 24 },
                6: { halign: 'right', cellWidth: 20 },
                7: { halign: 'right', cellWidth: 20 },
                8: { halign: 'right', cellWidth: 20 },
                9: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
                10: { halign: 'right', cellWidth: 24, fontStyle: 'bold' }
            },
            margin: { left: marginX, right: marginX }
        });

        // FOOTER & SIGNATURE
        let finalY = doc.lastAutoTable.finalY + 10;
        if (finalY > 160) {
            doc.addPage();
            finalY = 20;
        }

        const docID = `REKAP-SADHANA-${Date.now().toString(36).toUpperCase()}`;
        const verifyUrl = `https://stok-kayu-sadhana.vercel.app/verify?id=${docID}`;

        try {
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();

            const base64QR = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });

            if (base64QR) {
                doc.addImage(base64QR, 'PNG', marginX, finalY, 18, 18);
            }
        } catch (qrErr) {
            console.warn("Gagal membuat QR Code otomatis:", qrErr);
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

        // Perbaikan: new Date()
        doc.save(`Rekap_Saldo_Stok_Kayu_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
        console.error("Gagal export PDF rekap:", err);
        alert("Gagal membuat PDF Rekap: " + err.message);
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

function bukaRekapSaldo() {
    // 1. Tampilkan kontainer view rekap saldo
    document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
    document.getElementById('view-rekapsaldo').classList.add('active'); // Ubah display jadi block

    // 2. AMBIL DATA & PAKSA RENDER PAGINATION SEKARANG JUGA
    if (window.state && typeof window.state.filteredData !== 'undefined') {
        window.renderPaginationControls(window.state.filteredData.length);
    }
}
window.loadDataRekap = async function (filters) {
    try {
        console.log("Mengambil data rekap berdasarkan filter:", filters);

        // Contoh implementasi pemanggilan API atau pemfilteran state data lokal
        const activeState = window.state || {};
        const allData = activeState.data || [];

        // Lakukan filter data berdasarkan parameter yang dikirim
        const filtered = allData.filter(item => {
            // Sesuaikan logika filter dengan struktur data Anda
            let matchTpk = !filters.tpk || item.tpk === filters.tpk;
            let matchJenis = !filters.jenis || item.jenis_kayu === filters.jenis;
            let matchPetak = !filters.petak || item.petak === filters.petak;
            return matchTpk && matchJenis && matchPetak;
        });

        activeState.filteredRekapData = filtered;

        // Panggil fungsi render tabel rekap jika tersedia
        if (typeof window.renderRekapSaldo === "function") {
            window.renderRekapSaldo();
        }
    } catch (error) {
        console.error("Gagal memuat data rekap saldo:", error);
    }
};

window.terapkanFilterRekap = function () {
    const dariBulan = document.getElementById('rekap-filter-dari-bulan').value;
    const dariTahun = document.getElementById('rekap-filter-dari-tahun').value;
    const sampaiBulan = document.getElementById('rekap-filter-sampai-bulan').value;
    const sampaiTahun = document.getElementById('rekap-filter-sampai-tahun').value;

    // Nilai filter yang bisa kosong
    const tpk = document.getElementById('rekap-filter-tpk').value || '';
    const jenis = document.getElementById('rekap-filter-jenis').value || '';
    const petak = document.getElementById('rekap-filter-petak').value || '';

    console.log(`FILTER DIBACA -> TPK: ${tpk} | Jenis: ${jenis} | Petak: ${petak}`);

    // Panggil fungsi untuk memuat data tabel dengan parameter ini
    loadDataRekap({ dariBulan, dariTahun, sampaiBulan, sampaiTahun, tpk, jenis, petak, page: 1 });
};

// Global Binding untuk Elemen HTML (onclick / onchange)
window.exportToExcel = exportToExcel;
window.exportToPDF = exportRekapSaldoPDF;
window.exportRekapSaldoPDF = exportRekapSaldoPDF;
window.renderRekapSaldo = renderRekapSaldo;
window.renderRekapView = renderRekapSaldo;
window.triggerFilterUpdate = renderRekapSaldo;