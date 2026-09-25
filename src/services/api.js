import { config, getSupabaseClient } from "../../config.js";
import { state } from "../state/store.js";
import {
    showLoading,
    formatTanggalDB
} from "../utils/helpers.js";

// ================================================================
// SUPABASE CLIENT
// ================================================================

export function initSupabase() {
    if (window.api && typeof window.api.from === "function") {
        return window.api;
    }

    if (typeof getSupabaseClient === "function") {
        const client = getSupabaseClient();
        if (client && typeof client.from === "function") {
            return client;
        }
    }

    const url = config?.SUPABASE_URL || window.config?.SUPABASE_URL || "";
    const key = config?.SUPABASE_KEY || window.config?.SUPABASE_KEY || "";
    const createClientFn = window.supabase?.createClient || (typeof createClient !== "undefined" ? createClient : null);

    if (typeof createClientFn === "function" && url && key) {
        window.api = createClientFn(url, key);
        return window.api;
    }

    console.error("Supabase Client gagal dibuat. Periksa config.js dan library Supabase.");
    return null;
}

// Contoh fungsi saat data berhasil diambil dari backend/database
function ambilDataMutasiDariDatabase() {
    // Simulasi fetch data API
    fetch('/api/mutasi')
        .then(response => response.json())
        .then(result => {
            // 1. Simpan data ke dalam state global
            window.state.data = result.data || result;
            window.state.filteredData = [...window.state.data]; // Salin ke filteredData agar tidak kosong
            window.state.currentPage = 1; // Reset ke halaman 1

            // 2. Wajib panggil render tabel dan paginasi setelah data ada!
            if (typeof window.renderDashboardTable === 'function') {
                window.renderDashboardTable();
            }
            if (typeof window.renderPaginationControls === 'function') {
                window.renderPaginationControls();
            }
        })
        .catch(error => console.error("Gagal ambil data:", error));
}
// ================================================================
// HELPER M3
// ================================================================

export function hitungM3DariSM(nilaiSM, jenisKayu) {
    const sm = parseFloat(nilaiSM) || 0;
    if (sm === 0) return 0;

    let namaJenis = "";
    if (typeof jenisKayu === "string") {
        namaJenis = jenisKayu.trim();
    } else if (jenisKayu && typeof jenisKayu === "object") {
        namaJenis = String(jenisKayu.value || jenisKayu.text || "").trim();
    }

    let faktor = 0;
    if (typeof window.getFaktorKonversi === "function") {
        faktor = window.getFaktorKonversi(namaJenis);
    }

    if ((!faktor || faktor === 0) && state.konversiKayu && namaJenis) {
        const query = namaJenis.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(state.konversiKayu, query)) {
            faktor = parseFloat(state.konversiKayu[query]) || 0;
        } else {
            for (const [key, value] of Object.entries(state.konversiKayu)) {
                const normalizedKey = String(key).trim().toLowerCase();
                if (query.includes(normalizedKey) || normalizedKey.includes(query)) {
                    faktor = parseFloat(value) || 0;
                    break;
                }
            }
        }
    }

    return parseFloat((sm * faktor).toFixed(2));
}

// ================================================================
// LOAD MASTER DATA
// ================================================================

export async function loadDataMaster() {
    const client = initSupabase();
    if (!client) throw new Error("Client Supabase belum siap.");

    const { data, error } = await client.from("master_data").select("*");
    if (error) throw error;

    const masterData = Array.isArray(data) ? data : [];

    state.master = {
        jenis_kayu: masterData.filter(item => item.type === "jenis_kayu" || item.type === "jenis-kayu"),
        tpk: masterData.filter(item => item.type === "tpk")
    };

    state.konversiKayu = {};
    state.master.jenis_kayu.forEach(item => {
        const namaJenis = String(item.name || item.nama || item.nama_jenis || item.jenis_kayu || "").trim();
        const faktor = parseFloat(item.konversi ?? item.nilai_konversi ?? item.faktor_konversi ?? item.faktor ?? 0);

        if (namaJenis && Number.isFinite(faktor)) {
            state.konversiKayu[namaJenis.toLowerCase()] = faktor;
        }
    });

    if (typeof window.renderAllDropdowns === "function") window.renderAllDropdowns();
    if (typeof window.renderFilterSaldo === "function") window.renderFilterSaldo();
    if (typeof window.sinkronisasiFilterRincian === "function") window.sinkronisasiFilterRincian();

    return state.master;
}

// ================================================================
// FETCH DATA STOK (DIKEMBALIKAN KE TABEL stok_kayu)
// ================================================================

export async function fetchData({ showLoader = false, forceRefresh = false } = {}) {
    const client = initSupabase();
    if (!client) throw new Error("Client Supabase belum siap.");

    const activeState = window.state || state;

    if (!forceRefresh && activeState.data && activeState.data.length > 0) {
        console.log("Menggunakan data yang sudah ada di memori, total:", activeState.data.length);
        // Cukup panggil renderDashboardTable saja (karena di dalamnya sudah merender paginasi)
        if (typeof window.renderDashboardTable === "function") window.renderDashboardTable();
        return activeState.data;
    }

    if (showLoader) showLoading(true);

    try {
        const { data, error } = await client
            .from("stok_kayu")
            .select("*")
            .order("tanggal", { ascending: false });

        if (error) throw error;

        const newData = Array.isArray(data) ? data : [];

        activeState.data = newData;

        // Periksa apakah sedang ada filter aktif atau tidak
        if (!activeState.hasAppliedFilter || !activeState.filteredData) {
            activeState.filteredData = [...newData];
        }

        const totalRows = activeState.filteredData.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / (activeState.rowsPerPage || 25)));

        if (activeState.currentPage < 1 || activeState.currentPage > totalPages) {
            activeState.currentPage = 1;
        }

        // 🌟 HANYA panggil renderDashboardTable. 
        // Jangan panggil renderPaginationControls() di sini agar tidak terjadi dobel render/timpa.
        if (typeof window.renderDashboardTable === "function") {
            window.renderDashboardTable();
        }

        console.log("Data berhasil dimuat dari server ke state:", activeState.data.length);
        return newData;

    } catch (error) {
        console.error("Gagal mengambil data stok_kayu:", error);
        throw error;
    } finally {
        if (showLoader) showLoading(false);
    }
}

// ================================================================
// CREATE DATA
// ================================================================

export async function insertStokKayu(payload) {
    const client = initSupabase();
    if (!client) throw new Error("Client Supabase belum siap.");

    const { data, error } = await client
        .from("stok_kayu")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ================================================================
// UPDATE DATA
// ================================================================

export async function updateStokKayu(id, payload) {
    const client = initSupabase();
    if (!client) throw new Error("Client Supabase belum siap.");

    const { data, error } = await client
        .from("stok_kayu")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ================================================================
// DELETE DATA
// ================================================================

export async function deleteStokKayu(id) {
    const client = initSupabase();
    if (!client) throw new Error("Client Supabase belum siap.");

    const { error } = await client
        .from("stok_kayu")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return true;
}


// ================================================================
// GLOBAL
// ================================================================

window.initSupabase = initSupabase;
window.fetchData = fetchData;
window.loadDataMaster = loadDataMaster;
window.hitungM3DariSM = hitungM3DariSM;
window.insertStokKayu = insertStokKayu;
window.updateStokKayu = updateStokKayu;
window.deleteStokKayu = deleteStokKayu;