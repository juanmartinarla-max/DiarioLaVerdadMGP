const contenedor = document.getElementById("articulo-completo");
const zonaUsuario = document.getElementById("zona-usuario");
const id = new URLSearchParams(window.location.search).get("id");

function escaparHTML(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleString("es-AR", {
        dateStyle: "long",
        timeStyle: "short"
    });
}

async function cargarSesion() {
    try {
        const respuesta = await fetch("/api/sesion");
        const sesion = await respuesta.json();
        if (!sesion.logueado) return;

        let html = `<span class="usuario-logueado">Hola, ${escaparHTML(sesion.nombreUsuario)}</span>`;
        if (sesion.esAdmin) html += `<a href="/admin" class="btn-admin">ADMIN</a>`;
        html += `<a href="/logout" class="btn-login">CERRAR SESIÓN</a>`;
        zonaUsuario.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

async function cargarArticulo() {
    if (!id) {
        contenedor.innerHTML = "<h1>Publicación no encontrada.</h1>";
        return;
    }

    try {
        const respuesta = await fetch(`/api/articulos/${encodeURIComponent(id)}`);

        if (!respuesta.ok) {
            contenedor.innerHTML = "<h1>Publicación no encontrada.</h1>";
            return;
        }

        const articulo = await respuesta.json();
        document.title = `${articulo.titulo} - La Verdad`;

        const etiqueta = articulo.tipo === "noticia" ? "NOTICIA" : "EDICTO";

        let html = `
            <span class="tipo-noticia">${etiqueta}</span>
            <h1>${escaparHTML(articulo.titulo)}</h1>
            <p class="fecha-noticia">Publicado el ${formatearFecha(articulo.creado_en)} hs.</p>
        `;

        if (articulo.tipo === "noticia") {
            html = `
                <span class="tipo-noticia">${etiqueta}</span>
                <h1>${escaparHTML(articulo.titulo)}</h1>
                <p class="subtitulo-noticia">${escaparHTML(articulo.subtitulo)}</p>
                <p class="fecha-noticia">Publicado el ${formatearFecha(articulo.creado_en)} hs.</p>
                <img class="imagen-noticia" src="${escaparHTML(articulo.imagen)}" alt="${escaparHTML(articulo.titulo)}">
                <div class="contenido-noticia">
                    ${escaparHTML(articulo.contenido).replaceAll("\n", "<br>")}
                </div>
            `;
        } else {
            html = `
                <span class="tipo-noticia">${etiqueta}</span>
                <h1>${escaparHTML(articulo.titulo)}</h1>
                <p class="fecha-noticia">Publicado el ${formatearFecha(articulo.creado_en)} hs.</p>
                <div class="contenido-noticia">
                    ${escaparHTML(articulo.contenido).replaceAll("\n", "<br>")}
                </div>
            `;
        }

        contenedor.innerHTML = html;
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = "<h1>Error al cargar la publicación.</h1>";
    }
}

cargarSesion();
cargarArticulo();
