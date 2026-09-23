let currentPage = 1;
const rowsPerPage = 50;

export function renderPagedData(allData) {
    const dataArray = Array.isArray(allData) ? allData : [];
    const activeState = window.state || {};
    const currentPage = activeState.currentPage || 1;
    const rowsPerPage = activeState.rowsPerPage || 50;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = dataArray.slice(startIndex, endIndex);

    const tableBody = document.getElementById("dashboard-table-body");
    if (tableBody) {
        tableBody.innerHTML = ""; 

        if (paginatedData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #888; padding: 20px;">Tidak ada data mutasi</td></tr>`;
        } else {
            paginatedData.forEach((item) => {
                // ... (proses looping baris tabel) ...
            });
        }
    }

    // --- BAGIAN INI MENYATU DI DALAM FUNGSI YANG SAMA ---
    const selectAllCheckbox = document.getElementById("select-all");
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (selectAllCheckbox && rowCheckboxes.length > 0) {
        const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
    }

    // Render tombol navigasi halaman (Pagination UI) di bawah tabel
    if (typeof renderPaginationControls === 'function') {
        renderPaginationControls(dataArray.length);
    }
}