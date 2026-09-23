import { state } from '../state/store.js';

window.initSemuaFilter = function () {
    const dataSource = (state.data && state.data.length > 0) ? state.data : [];
    const masterSource = state.masterData || [];

    // --- A. POPULATE TPK ---
    const tpkFromMaster = masterSource
        .filter(m => m.tipe === 'tpk' || m.tpk || m.nama)
        .map(m => m.nama || m.tpk);
    const tpkFromData = dataSource.map(d => d.tpk);
    const daftarTPK = [...new Set([...tpkFromMaster, ...tpkFromData].map(t => t ? String(t).trim() : null).filter(Boolean))].sort();

    // Daftar ID Dropdown TPK (Semua Filter & Modal Input)
    const idsTPK = [
        { tpkId: 'filter-tpk', petakId: 'filter-petak' },
        { tpkId: 'filter-rincian-tpk', petakId: 'filter-rincian-petak' },
        { tpkId: 'filter-rekap-tpk', petakId: 'filter-rekap-petak' },
        { tpkId: 'input-tpk', petakId: 'input-petak' },
        { tpkId: 'mutasi-tpk', petakId: 'mutasi-petak' },
        { tpkId: 'modal-tpk', petakId: 'modal-petak' }
    ];

    idsTPK.forEach(item => {
        const el = document.getElementById(item.tpkId);
        if (el) {
            el.innerHTML = '<option value="">-- Pilih TPK --</option>' +
                daftarTPK.map(t => `<option value="${t}">${t}</option>`).join('');

            el.onchange = function () {
                window.updatePetakByTPK(item.tpkId, item.petakId);
                if (item.tpkId.startsWith('filter-')) {
                    window.triggerFilterUpdate();
                }
            };
        }
    });

    // --- B. POPULATE JENIS KAYU ---
    const kayuFromMaster = masterSource
        .filter(m => m.tipe === 'jenis_kayu' || m.jenis_kayu || m.nama_kayu)
        .map(m => m.nama_kayu || m.jenis_kayu || m.nama);
    const kayuFromData = dataSource.map(d => d.jenis_kayu || d.nama_kayu);
    
    const daftarJenisKayu = [...new Set([...kayuFromMaster, ...kayuFromData].map(jk => jk ? String(jk).trim() : null).filter(Boolean))].sort();

    // Daftar ID Dropdown Jenis Kayu di Seluruh Halaman & Form Input
    const idsJenisKayu = [
        'filter-jenis-kayu', 
        'filter-rincian-jenis-kayu',
        'filter-rekap-jenis-kayu',
        'input-jenis-kayu',      // Form Input Mutasi
        'mutasi-jenis-kayu',     // Form Input Mutasi (Alt)
        'modal-jenis-kayu',      // Modal Form (Alt)
        'jenis-kayu'             // ID Sederhana (Alt)
    ];
    
    idsJenisKayu.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const defaultText = id.startsWith('filter-') ? '-- Semua Jenis Kayu --' : '-- Pilih Jenis Kayu --';
            el.innerHTML = `<option value="">${defaultText}</option>` +
                daftarJenisKayu.map(jk => `<option value="${jk}">${jk}</option>`).join('');
            
            if (id.startsWith('filter-')) {
                el.onchange = window.triggerFilterUpdate;
            }
        }
    });

    // --- C. POPULATE TAHUN ---
    const daftarTahun = [...new Set(dataSource.map(d => {
        return d.tanggal ? String(d.tanggal).split('-')[0].trim() : null;
    }).filter(Boolean))].sort((a, b) => b - a);

    if (daftarTahun.length === 0) daftarTahun.push(new Date().getFullYear().toString());

    const idsTahun = [
        'filter-dari-tahun', 'filter-sampai-tahun', 
        'filter-rincian-tahun-dari', 'filter-rincian-tahun-sampai',
        'filter-rekap-tahun-dari', 'filter-rekap-tahun-sampai'
    ];
    idsTahun.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = false;
            el.innerHTML = '<option value="">-- Tahun --</option>' +
                daftarTahun.map(th => `<option value="${th}">${th}</option>`).join('');
            el.onchange = window.triggerFilterUpdate;
        }
    });

    // --- D. POPULATE BULAN ---
    const namaBulan = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const idsBulan = [
        'filter-dari-bulan', 'filter-sampai-bulan', 
        'filter-rincian-bulan-dari', 'filter-rincian-bulan-sampai',
        'filter-rekap-bulan-dari', 'filter-rekap-bulan-sampai'
    ];
    idsBulan.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">-- Bulan --</option>' +
                namaBulan.map((bln, idx) => `<option value="${String(idx + 1).padStart(2, '0')}">${bln}</option>`).join('');
            el.onchange = window.triggerFilterUpdate;
        }
    });
};

window.updatePetakByTPK = function (tpkSelectId = 'filter-tpk', petakSelectId = 'filter-petak') {
    const tpkEl = document.getElementById(tpkSelectId);
    const petakEl = document.getElementById(petakSelectId);
    if (!petakEl) return;

    const cleanString = (str) => String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const selectedVal = cleanString(tpkEl ? tpkEl.value : '');

    petakEl.innerHTML = '<option value="">-- Semua Petak --</option>';
    const dataSource = state.data || [];

    if (!selectedVal) {
        // Jika untuk Input Form (bukan filter), aktifkan agar user bisa ketik/pilih
        petakEl.disabled = tpkSelectId.startsWith('filter-');
        return;
    }

    const matchingData = dataSource.filter(d => d.tpk && cleanString(d.tpk) === selectedVal);
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
        if (tpkSelectId.startsWith('filter-')) {
            petakEl.onchange = window.triggerFilterUpdate;
        }
    } else {
        // Untuk Form Input, biarkan terbuka jika ingin memasukkan Petak baru
        petakEl.disabled = tpkSelectId.startsWith('filter-');
    }
};

window.triggerFilterUpdate = function () {
    if (typeof state !== 'undefined') state.hasAppliedFilter = true;

    if (state.view === 'rekapsaldo' && typeof window.renderRekapSaldo === 'function') {
        window.renderRekapSaldo();
    } else if (state.view === 'rincianmutasi' && typeof window.renderRincianMutasi === 'function') {
        window.renderRincianMutasi();
    } else if (typeof window.renderDashboardTable === 'function') {
        window.renderDashboardTable();
    }
};
window.updateRincianPetakByTPK = function (element) {
    const selectedTPK = element ? element.value.trim().toLowerCase() : "";
    const petakSelect = document.getElementById("filter-rincian-petak");

    if (!petakSelect) return;

    // Simpan petak yang sedang terpilih saat ini (jika ada)
    const currentPetak = petakSelect.value;

    // Reset isi dropdown petak
    petakSelect.innerHTML = '<option value="">-- Semua Petak --</option>';

    const allData = (typeof state !== 'undefined' && Array.isArray(state.data)) ? state.data : [];

    // Filter data berdasarkan TPK yang dipilih
    const filtered = allData.filter(d => {
        const itemTPK = String(d.tpk || d.TPK || '').trim().toLowerCase();
        if (selectedTPK === "") return true;
        return itemTPK === selectedTPK;
    });

    // Ambil daftar petak unik yang sesuai dengan TPK tersebut
    const uniquePetaks = [...new Set(filtered.map(d => String(d.petak || d.Petak || '').trim()))].filter(p => p !== "" && p !== "-");
    uniquePetaks.sort();

    // Masukkan ke dalam elemen select petak
    uniquePetaks.forEach(petak => {
        const opt = document.createElement("option");
        opt.value = petak;
        opt.textContent = petak;
        petakSelect.appendChild(opt);
    });

    // Kembalikan pilihan petak jika masih ada dalam daftar baru
    if (uniquePetaks.includes(currentPetak)) {
        petakSelect.value = currentPetak;
    }

    // Panggil fungsi render tabel agar data langsung menyesuaikan
    if (typeof window.renderRincian === 'function') {
        window.renderRincian();
    }
};