const lista = document.getElementById("lista-diarios");
const mensaje = document.getElementById("mensaje-diarios");

function formatearFecha(fecha) {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split("-");
    const fechaLocal = new Date(Number(anio), Number(mes) - 1, Number(dia));
    return fechaLocal.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).toUpperCase();
}

async function cargarDiarios() {
    try {
        const respuesta = await fetch("/api/diarios");
        if (!respuesta.ok) throw new Error("No se pudieron cargar los diarios.");

        const diarios = await respuesta.json();
        mensaje.style.display = "none";

        if (diarios.length === 0) {
            mensaje.textContent = "TODAVÍA NO HAY DIARIOS ANTERIORES DISPONIBLES.";
            mensaje.style.display = "block";
            return;
        }

        diarios.forEach(diario => {
            const elemento = document.createElement("article");
            elemento.className = "diario";
            elemento.innerHTML = `
                <span class="diario-fecha">${formatearFecha(diario.fecha)}</span>
                <a class="boton-descargar" href="/api/diario/${diario.id}/descargar">DESCARGAR PDF</a>
            `;
            lista.appendChild(elemento);
        });
    } catch (error) {
        console.error(error);
        mensaje.textContent = "NO SE PUDIERON CARGAR LOS DIARIOS.";
    }
}

cargarDiarios();
