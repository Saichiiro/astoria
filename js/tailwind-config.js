window.tailwind = window.tailwind || {};
window.tailwind.config = {
    corePlugins: {
        preflight: false
    },
    theme: {
        extend: {
            colors: {
                astoria: {
                    200: "#ffd3e6",
                    400: "#ff6aa2",
                    600: "#ff3f7e"
                }
            },
            boxShadow: {
                soft: "0 14px 28px rgba(255, 106, 162, 0.18)"
            }
        }
    }
};
