function mostrarFechaActual() {
    const elemento = document.getElementById("fecha-diario");
    if (!elemento) return;

    const fecha = new Date();
    elemento.textContent = fecha.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

mostrarFechaActual();
