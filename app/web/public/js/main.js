$(document).ready(() => {
    if (window.location.pathname.startsWith("/finance")) {
        $("[data-target='#collapseFinance']").attr("aria-expanded", "true");
        $("[data-target='#collapseFinance']").removeClass("collapsed");
        $("#collapseFinance").addClass("show");
    } else if (window.location.pathname.startsWith("/energy")) {
        $("[data-target='#collapseEnergy']").attr("aria-expanded", "true");
        $("[data-target='#collapseEnergy']").removeClass("collapsed");
        $("#collapseEnergy").addClass("show");
    }
});
