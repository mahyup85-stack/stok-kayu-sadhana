export const switchView = function (viewName) {
    console.log("Berpindah ke view:", viewName);

    // Simpan nilai asli sebelum diubah-ubah
    const originalView = viewName;

    // Normalisasi awal untuk kelola-sandi dan backup-setting
    if (viewName === "kelola-sandi" || viewName === "backup-setting") {
        viewName = "pengaturan";
    }

    let actualMasterType = null;
    if (viewName === "jeniskayu" || viewName === "jenis_kayu") actualMasterType = "jenis_kayu";
    if (viewName === "tpk") actualMasterType = "tpk";

    // 1. Tutup semua modal aktif
    document.querySelectorAll('.modal-backdrop, [id^="modal-"]').forEach(m => {
        m.style.setProperty("display", "none", "important");
        m.classList.add("hidden");
    });

    // 2. Normalisasi targetId
    let targetId = `view-${viewName}`;
    if (viewName === "master" || viewName === "masterdata" || viewName === "jeniskayu" || viewName === "jenis_kayu" || viewName === "tpk") {
        targetId = "view-masterdata";
        viewName = "masterdata";
    }

    // 3. Sembunyikan semua kontainer view utama
    const views = document.querySelectorAll('.content-scroll > div');
    views.forEach(el => {
        el.style.setProperty("display", "none", "important");
        el.classList.add("hidden");
        el.classList.remove("active", "show");
    });

    // 4. Tampilkan view tujuan utama
    const target = document.getElementById(targetId);
    if (target) {
        target.style.setProperty("display", "block", "important");
        target.classList.remove("hidden");
        target.classList.add("active", "show");
    } else {
        console.error(`Elemen dengan ID "${targetId}" tidak ditemukan di DOM!`);
        return;
    }

    // 5. Perbarui Judul Header
    const titleEl = document.getElementById("current-view-title");
    if (titleEl) {
        const titles = {
            "dashboard": "KARTU STOK",
            "rekapsaldo": "REKAP SALDO",
            "rincianmutasi": "RINCIAN MUTASI",
            "jeniskayu": "MASTER DATA",
            "tpk": "MASTER DATA",
            "masterdata": "MASTER DATA",
            "pengaturan": "PENGATURAN",
            "kelola-sandi": "PENGATURAN",
            "backup-setting": "PENGATURAN"
        };
        titleEl.textContent = titles[viewName] || "DASHBOARD";
    }

    // 6. Atur Sub-menu khusus Pengaturan (Kelola Sandi vs Backup Setting) SECARA LANGSUNG
    if (viewName === "pengaturan") {
        const accEl = document.getElementById('view-kelola-sandi');
        const backupEl = document.getElementById('view-backup-setting');

        if (originalView === "kelola-sandi") {
            if (accEl) {
                accEl.style.setProperty('display', 'block', 'important');
                accEl.classList.remove('hidden');
            }
            if (backupEl) {
                backupEl.style.setProperty('display', 'none', 'important');
                backupEl.classList.add('hidden');
            }
        } else if (originalView === "backup-setting") {
            if (backupEl) {
                backupEl.style.setProperty('display', 'block', 'important');
                backupEl.classList.remove('hidden');
            }
            if (accEl) {
                accEl.style.setProperty('display', 'none', 'important');
                accEl.classList.add('hidden');
            }
        }
    }

    // 7. Pemuatan dropdown
    if (viewName.includes('rekap') || viewName.includes('rincian')) {
        if (typeof window.loadYearDropdowns === 'function') window.loadYearDropdowns();
        if (typeof window.loadMasterDropdowns === 'function') window.loadMasterDropdowns();
    }

// 8. Eksekusi render data spesifik dengan timeout secukupnya
    setTimeout(() => {
        if (viewName === "dashboard") {
            const activeState = window.state || {};
            if (!activeState.filteredData || activeState.filteredData.length === 0) {
                activeState.filteredData = [...(activeState.data || [])];
            }
            if (typeof window.renderDashboardTable === "function") window.renderDashboardTable();
            
            // 🌟 TAMBAHKAN PEMANGGILAN INI AGAR PAGINASI MUNCUL SAAT DASHBOARD DIBUKA:
            if (typeof window.renderPaginationControls === "function") window.renderPaginationControls();
            
            if (typeof window.loadMasterDropdowns === "function") window.loadMasterDropdowns();
        } else if (viewName === "rekapsaldo" && typeof window.renderRekapSaldo === "function") {
            window.renderRekapSaldo();
        } else if (viewName === "rincianmutasi" && typeof window.renderRincianMutasi === "function") {
            window.renderRincianMutasi();
        } else if (viewName === "pengaturan" && typeof window.renderPengaturan === "function") {
            window.renderPengaturan();
        } else if (viewName === "masterdata") {
            if (typeof window.openMasterModal === "function") {
                window.openMasterModal(actualMasterType || 'jenis_kayu');
            }
        }
    }, 300);
}

window.switchView = switchView;

export function toggleSubmenu(menuId) {
    const submenu = document.getElementById(`${menuId}-submenu`);

    if (!submenu) {
        return;
    }

    const isHidden = window.getComputedStyle(submenu).display === "none";

    if (isHidden) {
        submenu.classList.add("active");
        submenu.style.setProperty("display", "flex", "important");
    } else {
        submenu.classList.remove("active");
        submenu.style.setProperty("display", "none", "important");
    }
}

window.toggleSubmenu = toggleSubmenu;
window.toggleMenu = toggleSubmenu;
window.changePage = function (newPage) {
    const activeState = window.state;
    const totalData = (activeState.filteredData && activeState.filteredData.length > 0)
        ? activeState.filteredData.length
        : (activeState.data ? activeState.data.length : 0);

    const rowsPerPage = activeState.rowsPerPage || 50;
    const totalPages = Math.ceil(totalData / rowsPerPage) || 1;

    // Batasi agar halaman tidak keluar dari rentang 1 sampai totalPages
    if (newPage < 1 || newPage > totalPages) return;

    activeState.currentPage = newPage;

    if (typeof window.renderDashboardTable === "function") {
        window.renderDashboardTable();
    }
};