const grilla = document.getElementById("grilla-articulos");
const mensajeCarga = document.getElementById("mensaje-carga");
const selectorNoticias = document.getElementById("seleccion-noticias");
const selectorEdictos = document.getElementById("seleccion-edictos");
const zonaUsuario = document.getElementById("zona-usuario");

let articulos = [];

function escaparHTML(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function mostrarArticulos(tipo) {
    const filtrados = articulos.filter(articulo => articulo.tipo === tipo);

    grilla.innerHTML = "";

    if (filtrados.length === 0) {
        grilla.innerHTML = `<p class="sin-articulos">No hay publicaciones de este tipo.</p>`;
        return;
    }

    filtrados.forEach(articulo => {
        const tarjeta = document.createElement("article");
        tarjeta.className = `tarjeta-noticia ${articulo.tipo === "edicto" ? "tarjeta-edicto" : ""}`;

        if (articulo.tipo === "noticia") {
            tarjeta.innerHTML = `
                <a href="noticia.html?id=${articulo.id}">
                    <span class="etiqueta-publicacion">NOTICIA</span>
                    <h2>${escaparHTML(articulo.titulo)}</h2>
                    <p class="subtitulo-miniatura">${escaparHTML(articulo.subtitulo)}</p>
                    <div class="contenedor-imagen">
                        <img src="${escaparHTML(articulo.imagen)}" alt="${escaparHTML(articulo.titulo)}">
                    </div>
                </a>
            `;
        } else {
            tarjeta.innerHTML = `
                <a href="noticia.html?id=${articulo.id}">
                    <span class="etiqueta-publicacion">EDICTO</span>
                    <h2>${escaparHTML(articulo.titulo)}</h2>
                </a>
            `;
        }

        grilla.appendChild(tarjeta);
    });
}

async function cargarArticulos() {
    try {
        const respuesta = await fetch("/api/articulos");

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las publicaciones.");
        }

        articulos = await respuesta.json();
        mensajeCarga.style.display = "none";
        mostrarArticulos("noticia");
    } catch (error) {
        console.error(error);
        mensajeCarga.textContent = "No se pudieron cargar las publicaciones.";
    }
}

async function cargarSesion() {
    try {
        const respuesta = await fetch("/api/sesion");
        const sesion = await respuesta.json();

        if (!sesion.logueado) return;

        let html = `<span class="usuario-logueado">Hola, ${escaparHTML(sesion.nombreUsuario)}</span>`;

        if (sesion.esAdmin) {
            html += `<a href="/admin" class="btn-admin">ADMIN</a>`;
        }

        html += `<a href="/logout" class="btn-login">CERRAR SESIÓN</a>`;
        zonaUsuario.innerHTML = html;
    } catch (error) {
        console.error("No se pudo consultar la sesión:", error);
    }
}

selectorNoticias.addEventListener("change", () => mostrarArticulos("noticia"));
selectorEdictos.addEventListener("change", () => mostrarArticulos("edicto"));

cargarSesion();
cargarArticulos();


async function comprobarDiarioDeHoy() {
    const botonDiario = document.getElementById("boton-diario");
    const mensajeDiario = document.getElementById("mensaje-diario");

    try {
        const respuesta = await fetch("/api/diario/hoy");
        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.disponible) {
            botonDiario.removeAttribute("href");
            botonDiario.classList.add("boton-diario-deshabilitado");
            botonDiario.setAttribute("aria-disabled", "true");
            mensajeDiario.textContent = "El diario de hoy todavía no está disponible.";
        }
    } catch (error) {
        botonDiario.style.display = "none";
        mensajeDiario.textContent = "El diario de hoy todavía no está disponible.";
    }
}

comprobarDiarioDeHoy();
