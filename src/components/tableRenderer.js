// 1. Fungsi Utama Render Tabel Dashboard
window.renderDashboardTable = function () {
    const activeState = window.state || {};

    // Ambil data (prioritaskan filteredData jika ada filter aktif, jika tidak ambil data utama)
    const dataToRender = (activeState.filteredData !== undefined && activeState.filteredData !== null)
        ? activeState.filteredData
        : (activeState.data || []);

    const dataArray = Array.isArray(dataToRender) ? dataToRender : [];

    const currentPage = activeState.currentPage || 1;
    const rowsPerPage = activeState.rowsPerPage || 50;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = dataArray.slice(startIndex, endIndex);

    const tableBody = document.getElementById("dashboard-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #888; padding: 20px;">
                    Tidak ada data mutasi
                </td>
            </tr>
        `;
        return;
    }

    paginatedData.forEach((item) => {
        const itemId = String(item.id || '');
        const isChecked = (activeState.selectedIds || []).includes(itemId) ? 'checked' : '';

        const valMasuk = Number(item.masuk_m3 ?? item.masuk_sm ?? 0).toFixed(2);
        const valKeluar = Number(item.keluar_m3 ?? item.keluar_sm ?? 0).toFixed(2);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 40px;">
                <input type="checkbox" class="row-checkbox" value="${itemId}" ${isChecked} onchange="window.handleRowCheckboxChange(this)">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.tanggal || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.keterangan || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.jenis_kayu || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.tpk || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.petak || '-'}</td>
            
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">${valMasuk}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">${valKeluar}</td>
            
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 80px;">
                <div style="display: flex; gap: 12px; justify-content: center; align-items: center;">
                    <button type="button" onclick="editData('${itemId}')" title="Edit Data" style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button type="button" onclick="deleteData('${itemId}')" title="Hapus Data" style="background: transparent; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Sinkronisasi status master "Select All" checkbox
    const selectAllCheckbox = document.getElementById("select-all");
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (selectAllCheckbox && rowCheckboxes.length > 0) {
        const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }

    if (typeof window.updateSmartDeleteButtonUI === "function") {
        window.updateSmartDeleteButtonUI();
    }

    if (typeof window.initPermanentPaginationFooter === "function") {
        window.initPermanentPaginationFooter();
    }
};

// 2. Handler untuk Merekam Centang Baris ke selectedIds
window.handleRowCheckboxChange = function (checkbox) {
    const activeState = window.state || {};
    if (!activeState.selectedIds) {
        activeState.selectedIds = [];
    }

    const itemId = String(checkbox.value);

    if (checkbox.checked) {
        if (!activeState.selectedIds.includes(itemId)) {
            activeState.selectedIds.push(itemId);
        }
    } else {
        activeState.selectedIds = activeState.selectedIds.filter(id => id !== itemId);
    }

    if (typeof window.updateSmartDeleteButtonUI === "function") {
        window.updateSmartDeleteButtonUI();
    }
};

export default window.renderDashboardTable;