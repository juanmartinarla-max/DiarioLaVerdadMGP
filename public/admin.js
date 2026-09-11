const formulario = document.getElementById("form-articulo");
const tipo = document.getElementById("tipo");
const campoSubtitulo = document.getElementById("campo-subtitulo");
const campoImagen = document.getElementById("campo-imagen");
const campoContenido = document.getElementById("campo-contenido");
const campoDias = document.getElementById("campo-dias");
const subtitulo = document.getElementById("subtitulo");
const imagen = document.getElementById("imagen");
const contenido = document.getElementById("contenido");
const dias = document.getElementById("dias");
const mensajeFormulario = document.getElementById("mensaje-formulario");
const listaArticulos = document.getElementById("lista-articulos");
const formularioDiario = document.getElementById("form-diario");
const diarioPdf = document.getElementById("diario-pdf");
const mensajeDiarioAdmin = document.getElementById("mensaje-diario-admin");

function escaparHTML(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function actualizarCampos() {
    const esNoticia = tipo.value === "noticia";

    campoSubtitulo.style.display = esNoticia ? "block" : "none";
    campoImagen.style.display = esNoticia ? "block" : "none";
    campoContenido.style.display = "block";
    campoDias.style.display = esNoticia ? "none" : "block";

    subtitulo.required = esNoticia;
    imagen.required = esNoticia;
    contenido.required = true;
    dias.required = !esNoticia;

    if (!esNoticia) {
        subtitulo.value = "";
        imagen.value = "";
    } else {
        dias.value = "0";
    }
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function fechaLocalISO(fecha) {
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function estaVencido(articulo) {
    if (articulo.tipo !== "edicto") return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const publicado = new Date(articulo.creado_en);
    publicado.setHours(0, 0, 0, 0);

    const cantidadDias = Number(articulo.dias) || 0;
    const fechaFin = new Date(publicado);
    fechaFin.setDate(fechaFin.getDate() + cantidadDias);

    // Ejemplo: publicado el 4 con 2 días => activo 4 y 5; vence el 6.
    return hoy >= fechaFin;
}

async function cargarArticulos() {
    try {
        const respuesta = await fetch("/api/admin/articulos");
        if (!respuesta.ok) throw new Error();

        const articulos = await respuesta.json();
        listaArticulos.innerHTML = "";

        if (articulos.length === 0) {
            listaArticulos.innerHTML = "<p>No hay publicaciones todavía.</p>";
            return;
        }

        articulos.forEach(articulo => {
            const fila = document.createElement("article");
            fila.className = "fila-admin";

            const vencido = estaVencido(articulo);
            const recordatorio = vencido
                ? `<div class="recordatorio-edicto">⚠ Este edicto debe ser eliminado.</div>`
                : "";

            const detalle = articulo.tipo === "edicto"
                ? `<small>Publicado: ${formatearFecha(articulo.creado_en)}</small>`
                : `<p>${escaparHTML(articulo.subtitulo)}</p><small>Publicado: ${formatearFecha(articulo.creado_en)}</small>`;

            fila.innerHTML = `
                <div>
                    <span class="tipo-noticia">${articulo.tipo === "noticia" ? "NOTICIA" : "EDICTO"}</span>
                    <h3>${escaparHTML(articulo.titulo)}</h3>
                    ${detalle}
                    ${recordatorio}
                </div>
                <div class="acciones-admin">
                    <a href="noticia.html?id=${articulo.id}" target="_blank">VER</a>
                    <button type="button" class="boton-eliminar" data-id="${articulo.id}">ELIMINAR</button>
                </div>
            `;
            listaArticulos.appendChild(fila);
        });

        document.querySelectorAll(".boton-eliminar").forEach(boton => {
            boton.addEventListener("click", eliminarArticulo);
        });
    } catch (error) {
        listaArticulos.innerHTML = "<p>No se pudieron cargar las publicaciones.</p>";
    }
}

async function eliminarArticulo(evento) {
    const id = evento.currentTarget.dataset.id;

    if (!confirm("¿Seguro que querés eliminar esta publicación?")) return;

    try {
        const respuesta = await fetch(`/api/articulos/${id}`, { method: "DELETE" });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.error || "No se pudo eliminar.");
            return;
        }

        cargarArticulos();
    } catch (error) {
        alert("No se pudo conectar con el servidor.");
    }
}

formulario.addEventListener("submit", async event => {
    event.preventDefault();
    mensajeFormulario.textContent = "Publicando...";

    try {
        const datos = new FormData(formulario);
        const respuesta = await fetch("/api/articulos", { method: "POST", body: datos });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mensajeFormulario.textContent = resultado.error || "No se pudo publicar.";
            return;
        }

        mensajeFormulario.textContent = "Publicación creada correctamente.";
        formulario.reset();
        tipo.value = "noticia";
        actualizarCampos();
        cargarArticulos();
    } catch (error) {
        console.error(error);
        mensajeFormulario.textContent = "No se pudo conectar con el servidor.";
    }
});

formularioDiario.addEventListener("submit", async event => {
    event.preventDefault();
    mensajeDiarioAdmin.textContent = "Subiendo diario...";

    try {
        const archivo = diarioPdf.files[0];
        if (!archivo) {
            mensajeDiarioAdmin.textContent = "Seleccioná un PDF.";
            return;
        }

        const datos = new FormData();
        datos.append("diario", archivo);

        const respuesta = await fetch("/api/diario", { method: "POST", body: datos });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mensajeDiarioAdmin.textContent = resultado.error || "No se pudo subir el diario.";
            return;
        }

        mensajeDiarioAdmin.textContent = "Diario de hoy subido correctamente.";
        formularioDiario.reset();
    } catch (error) {
        console.error(error);
        mensajeDiarioAdmin.textContent = "No se pudo conectar con el servidor.";
    }
});

tipo.addEventListener("change", actualizarCampos);
actualizarCampos();
cargarArticulos();
