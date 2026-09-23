
(function () {
    const IDLE_LIMIT_MS = 15 * 60 * 1000;

    let idleTimer = null;

    // Fungsi untuk melakukan logout otomatis
    function triggerAutoLogout() {
        // Cek apakah pengguna sedang dalam status login
        const isLoggedIn = window.state && window.state.isLoggedIn;

        if (isLoggedIn) {
            console.warn("⚠️ Sesi habis karena tidak ada aktivitas. Melakukan logout otomatis...");
            alert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali demi keamanan.");

            // Panggil fungsi logout di state atau reload halaman
            if (window.state && typeof window.state.logout === "function") {
                window.state.logout();
            } else {
                // Hapus data sesi lokal jika ada
                localStorage.removeItem("sadhana_auth");
                window.location.reload();
            }
        }
    }

    // Fungsi untuk mereset timer setiap kali ada aktivitas
    function resetIdleTimer() {
        // Hanya jalankan jika pengguna benar-benar sudah login
        if (window.state && window.state.isLoggedIn) {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(triggerAutoLogout, IDLE_LIMIT_MS);
        }
    }

    // Daftar aktivitas mouse dan keyboard yang dipantau
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    // Pasang pendengar event ke seluruh dokumen
    activityEvents.forEach(event => {
        window.addEventListener(event, resetIdleTimer, true);
    });

    // Jalankan pertama kali saat skrip dimuat
    resetIdleTimer();
    console.log("🛡️ Sistem Idle Timer (Auto-Logout) aktif.");
})();