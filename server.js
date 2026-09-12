const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const nombre = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        cb(null, nombre);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(file.mimetype)) {
            return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
        }
        cb(null, true);
    }
});

const uploadPDF = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Solo se permite subir archivos PDF."));
        }
        cb(null, true);
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================
// USUARIOS
// =========================

app.post("/registro", async (req, res) => {
    try {
        const nombre_usuario = String(req.body.nombre_usuario || "").trim();
        const password = String(req.body.password || "");

        if (nombre_usuario.length < 3 || nombre_usuario.length > 50) {
            return res.status(400).send("El nombre de usuario debe tener entre 3 y 50 caracteres.");
        }

        if (password.length < 6) {
            return res.status(400).send("La contraseña debe tener al menos 6 caracteres.");
        }

        const [usuarios] = await pool.execute(
            "SELECT id FROM usuarios WHERE nombre_usuario = ?",
            [nombre_usuario]
        );

        if (usuarios.length > 0) {
            return res.status(409).send("Ese nombre de usuario ya existe.");
        }

        const password_hash = await bcrypt.hash(password, 12);

        await pool.execute(
            "INSERT INTO usuarios (nombre_usuario, password_hash) VALUES (?, ?)",
            [nombre_usuario, password_hash]
        );

        res.redirect("/login.html");
    } catch (error) {
        console.error("Error en /registro:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

app.post("/login", async (req, res) => {
    try {
        const nombre_usuario = String(req.body.nombre_usuario || "").trim();
        const password = String(req.body.password || "");

        const [usuarios] = await pool.execute(
            "SELECT id, nombre_usuario, password_hash, es_admin FROM usuarios WHERE nombre_usuario = ?",
            [nombre_usuario]
        );

        if (usuarios.length === 0) {
            return res.status(401).send("Usuario o contraseña incorrectos.");
        }

        const usuario = usuarios[0];
        const contraseñaCorrecta = await bcrypt.compare(password, usuario.password_hash);

        if (!contraseñaCorrecta) {
            return res.status(401).send("Usuario o contraseña incorrectos.");
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error("Error regenerando sesión:", err);
                return res.status(500).send("Error interno del servidor.");
            }

            req.session.usuarioId = usuario.id;
            req.session.nombreUsuario = usuario.nombre_usuario;
            req.session.esAdmin = Boolean(usuario.es_admin);

            req.session.save((err) => {
                if (err) {
                    console.error("Error guardando sesión:", err);
                    return res.status(500).send("Error interno del servidor.");
                }

                // Un administrador va directamente al panel.
                if (usuario.es_admin) {
                    return res.redirect("/admin");
                }

                res.redirect("/");
            });
        });
    } catch (error) {
        console.error("Error en /login:", error);
        res.status(500).send("Error interno del servidor.");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error cerrando sesión:", err);
            return res.status(500).send("No se pudo cerrar la sesión.");
        }
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

function requiereSesion(req, res, next) {
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: "Tenés que iniciar sesión." });
    }
    next();
}

function requiereAdmin(req, res, next) {
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: "Tenés que iniciar sesión." });
    }

    if (!req.session.esAdmin) {
        return res.status(403).json({ error: "No tenés permisos de administrador." });
    }

    next();
}

app.get("/admin", (req, res) => {
    if (!req.session.usuarioId) return res.redirect("/login.html");
    if (!req.session.esAdmin) return res.status(403).send("No tenés permisos de administrador.");
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/api/sesion", (req, res) => {
    res.json({
        logueado: Boolean(req.session.usuarioId),
        nombreUsuario: req.session.nombreUsuario || null,
        esAdmin: Boolean(req.session.esAdmin)
    });
});

// =========================
// ARTICULOS
// =========================

// Público: devuelve solamente publicaciones visibles.
// Los edictos vencidos dejan de aparecer en el diario, pero no se borran de la base.
app.get("/api/articulos", async (req, res) => {
    try {
        const [articulos] = await pool.execute(`
            SELECT id, tipo, titulo, subtitulo, imagen, contenido, creado_en
            FROM Articulos
            WHERE tipo = 'noticia'
               OR (tipo = 'edicto' AND CURDATE() < DATE_ADD(DATE(creado_en), INTERVAL dias DAY))
            ORDER BY creado_en DESC, id DESC
        `);

        res.json(articulos);
    } catch (error) {
        console.error("Error obteniendo artículos públicos:", error);
        res.status(500).json({ error: "No se pudieron obtener las publicaciones." });
    }
});

// Administradores: devuelve todas las publicaciones, incluidas las que ya vencieron.
app.get("/api/admin/articulos", requiereAdmin, async (req, res) => {
    try {
        const [articulos] = await pool.execute(`
            SELECT id, tipo, titulo, subtitulo, imagen, contenido, creado_en, dias
            FROM Articulos
            ORDER BY creado_en DESC, id DESC
        `);

        res.json(articulos);
    } catch (error) {
        console.error("Error obteniendo artículos para administración:", error);
        res.status(500).json({ error: "No se pudieron obtener las publicaciones." });
    }
});

// Público: obtiene un artículo individual cuando se abre noticia.html?id=X.
app.get("/api/articulos/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const [articulos] = await pool.execute(`
            SELECT id, tipo, titulo, subtitulo, imagen, contenido, creado_en
            FROM Articulos
            WHERE id = ?
              AND (tipo = 'noticia' OR (tipo = 'edicto' AND CURDATE() < DATE_ADD(DATE(creado_en), INTERVAL dias DAY)))
        `, [id]);

        if (articulos.length === 0) {
            return res.status(404).json({ error: "Publicación no encontrada." });
        }

        res.json(articulos[0]);
    } catch (error) {
        console.error("Error obteniendo artículo:", error);
        res.status(500).json({ error: "No se pudo obtener la publicación." });
    }
});

// Solo administradores pueden crear publicaciones.
app.post("/api/articulos", requiereAdmin, (req, res) => {
    upload.single("imagen")(req, res, async (error) => {
        try {
            if (error) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: error.message });
            }

            const tipo = String(req.body.tipo || "").trim();
            const titulo = String(req.body.titulo || "").trim();
            const subtitulo = String(req.body.subtitulo || "").trim();
            const contenido = String(req.body.contenido || "").trim();
            const dias = Number(req.body.dias);

            if (!['noticia', 'edicto'].includes(tipo)) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "El tipo debe ser noticia o edicto." });
            }

            if (!titulo) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "El título es obligatorio." });
            }

            if (tipo === "edicto" && (!Number.isInteger(dias) || dias < 0)) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Los días deben ser un número entero igual o mayor a 0." });
            }

            if (tipo === "noticia" && (!subtitulo || !req.file || !contenido)) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Una noticia necesita título, subtítulo, imagen y contenido." });
            }

            if (tipo === "edicto" && !contenido) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Un edicto necesita título y contenido." });
            }

            if (tipo === "edicto" && req.file) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Los edictos no llevan imagen." });
            }

            const imagen = req.file ? `/uploads/${req.file.filename}` : null;
            const subtituloBD = tipo === "noticia" ? subtitulo : null;

            const diasBD = tipo === "edicto" ? dias : 0;

            const [resultado] = await pool.execute(`
                INSERT INTO Articulos (tipo, titulo, subtitulo, imagen, contenido, dias)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [tipo, titulo, subtituloBD, imagen, contenido, diasBD]);

            res.status(201).json({
                mensaje: "Publicación creada correctamente.",
                id: resultado.insertId
            });
        } catch (errorInterno) {
            console.error("Error creando artículo:", errorInterno);
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    });
});

// =========================
// DIARIO PDF
// =========================

// Público: comprueba si existe un diario cargado para hoy.
app.get("/api/diario/hoy", async (req, res) => {
    try {
        const [diarios] = await pool.execute(`
            SELECT id, fecha, archivo
            FROM diarios
            WHERE fecha = CURDATE()
            LIMIT 1
        `);

        res.json({ disponible: diarios.length > 0 });
    } catch (error) {
        console.error("Error comprobando diario de hoy:", error);
        res.status(500).json({ error: "No se pudo comprobar el diario de hoy." });
    }
});

// Público: descarga el PDF cargado por el administrador para hoy.
app.get("/api/diario/hoy/descargar", async (req, res) => {
    try {
        const [diarios] = await pool.execute(`
            SELECT archivo
            FROM diarios
            WHERE fecha = CURDATE()
            LIMIT 1
        `);

        if (diarios.length === 0) {
            return res.status(404).send("El diario de hoy todavía no está disponible.");
        }

        const nombreArchivo = path.basename(diarios[0].archivo);
        const ruta = path.join(uploadsDir, nombreArchivo);

        if (!fs.existsSync(ruta)) {
            return res.status(404).send("El archivo del diario no está disponible.");
        }

        res.download(ruta, "Diario-La-Verdad-General-Pueyrredon.pdf");
    } catch (error) {
        console.error("Error descargando diario:", error);
        res.status(500).send("No se pudo descargar el diario.");
    }
});

// Público: devuelve todos los diarios anteriores disponibles.
app.get("/api/diarios", async (req, res) => {
    try {
        const [diarios] = await pool.execute(`
            SELECT id, fecha
            FROM diarios
            ORDER BY fecha DESC
        `);

        res.json(diarios);
    } catch (error) {
        console.error("Error obteniendo diarios anteriores:", error);
        res.status(500).json({ error: "No se pudieron obtener los diarios anteriores." });
    }
});

// Público: descarga un diario por su ID.
app.get("/api/diario/:id/descargar", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).send("ID de diario inválido.");
        }

        const [diarios] = await pool.execute(`
            SELECT fecha, archivo
            FROM diarios
            WHERE id = ?
            LIMIT 1
        `, [id]);

        if (diarios.length === 0) {
            return res.status(404).send("El diario solicitado no existe.");
        }

        const diario = diarios[0];
        const nombreArchivo = path.basename(diario.archivo);
        const ruta = path.join(uploadsDir, nombreArchivo);

        if (!fs.existsSync(ruta)) {
            return res.status(404).send("El archivo del diario no está disponible.");
        }

        const fecha = new Date(diario.fecha);
        const fechaTexto = fecha.toISOString().slice(0, 10);
        res.download(ruta, `Diario-La-Verdad-${fechaTexto}.pdf`);
    } catch (error) {
        console.error("Error descargando diario anterior:", error);
        res.status(500).send("No se pudo descargar el diario.");
    }
});

// Solo administradores pueden subir/reemplazar el diario de hoy.
app.post("/api/diario", requiereAdmin, (req, res) => {
    uploadPDF.single("diario")(req, res, async (error) => {
        try {
            if (error) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: error.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: "Tenés que seleccionar un archivo PDF." });
            }

            const [existentes] = await pool.execute(`
                SELECT id, archivo
                FROM diarios
                WHERE fecha = CURDATE()
                LIMIT 1
            `);

            const archivo = req.file.filename;

            if (existentes.length > 0) {
                await pool.execute(
                    "UPDATE diarios SET archivo = ? WHERE id = ?",
                    [archivo, existentes[0].id]
                );

                const archivoAnterior = path.join(uploadsDir, path.basename(existentes[0].archivo));
                if (fs.existsSync(archivoAnterior)) fs.unlinkSync(archivoAnterior);
            } else {
                await pool.execute(
                    "INSERT INTO diarios (fecha, archivo) VALUES (CURDATE(), ?)",
                    [archivo]
                );
            }

            res.status(201).json({ mensaje: "Diario de hoy subido correctamente." });
        } catch (errorInterno) {
            console.error("Error subiendo diario:", errorInterno);
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    });
});

// Solo administradores pueden eliminar.
app.delete("/api/articulos/:id", requiereAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID inválido." });
        }

        const [articulos] = await pool.execute(
            "SELECT imagen FROM Articulos WHERE id = ?",
            [id]
        );

        if (articulos.length === 0) {
            return res.status(404).json({ error: "Publicación no encontrada." });
        }

        await pool.execute("DELETE FROM Articulos WHERE id = ?", [id]);

        // También eliminamos el archivo físico si la publicación tenía imagen.
        if (articulos[0].imagen) {
            const nombreArchivo = path.basename(articulos[0].imagen);
            const rutaImagen = path.join(uploadsDir, nombreArchivo);
            if (fs.existsSync(rutaImagen)) fs.unlinkSync(rutaImagen);
        }

        res.json({ mensaje: "Publicación eliminada correctamente." });
    } catch (error) {
        console.error("Error eliminando artículo:", error);
        res.status(500).json({ error: "No se pudo eliminar la publicación." });
    }
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send("Error interno del servidor.");
});

app.listen(PORT, async () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);

    try {
        const connection = await pool.getConnection();
        console.log("Conexión con MySQL correcta.");
        connection.release();
    } catch (error) {
        console.error("No se pudo conectar a MySQL:", error.message);
        console.error("Revisá el archivo .env y que MySQL esté iniciado.");
    }
});
