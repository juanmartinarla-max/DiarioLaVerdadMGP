# La Verdad - General Pueyrredón

Sitio web del diario **La Verdad de General Pueyrredón**.

El proyecto funciona con:
- Node.js + Express para el servidor.
- MySQL para usuarios, noticias, edictos y registro del diario PDF.
- HTML, CSS y JavaScript para la página web.
- Multer para las imágenes de noticias y el PDF diario.
- bcrypt para las contraseñas.
- express-session para las sesiones de usuarios.

## Estructura definitiva

```text
LaVerdad/
├── public/
│   ├── index.html
│   ├── index.js
│   ├── noticia.html
│   ├── noticia.js
│   ├── registro.html
│   ├── login.html
│   ├── admin.html
│   ├── admin.js
│   ├── style.css
│   └── Plantilla_Diario_La_Verdad_A3.pptx
│
├── uploads/
│   └── .gitkeep
│
├── database/
│   ├── database.sql
│   ├── migracion_edictos.sql
│   └── migracion_ultima.sql
│
├── server.js
├── database.js
├── package.json
├── package-lock.json
├── .env
├── .env.example
├── .gitignore
└── README.md
```

> **Importante:** `public/logo.png` no está incluido porque el logo real lo debe colocar el dueño. Copiá su archivo de logo con exactamente ese nombre dentro de `public/`.

## 1. Requisitos

Necesitás tener instalados:
- Node.js
- MySQL / MySQL Workbench

La aplicación usa el comando `npm start`, que ejecuta `server.js` desde `package.json`.

## 2. Primera instalación

Abrí una terminal dentro de la carpeta `LaVerdad`.

### Instalar dependencias

```bash
npm install
```

### Preparar MySQL

Abrí MySQL Workbench y ejecutá:

```text
database/database.sql
```

Ese archivo crea la base `la_verdad` y las tablas necesarias.

### Configurar `.env`

Abrí `.env` y colocá los datos de tu MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASENA_DE_MYSQL
DB_NAME=la_verdad

SESSION_SECRET=UNA_CLAVE_LARGA_Y_ALEATORIA
PORT=3000
```

## 3. Si ya tenías una base de datos con publicaciones

**No borres la base de datos existente.**

Ejecutá en MySQL Workbench, en este orden:

```text
database/migracion_edictos.sql
database/migracion_ultima.sql
```

Estas migraciones agregan el funcionamiento de los días de los edictos y el registro del PDF diario.

## 4. Iniciar la página

Desde la carpeta raíz del proyecto:

```bash
npm start
```

Deberías ver algo parecido a:

```text
Servidor funcionando en http://localhost:3000
Conexión con MySQL correcta.
```

Después abrí en el navegador:

```text
http://localhost:3000
```

Para detener el servidor:

```text
Ctrl + C
```

## 5. Crear el primer administrador

Primero registrá un usuario desde:

```text
http://localhost:3000/registro.html
```

Después, en MySQL Workbench:

```sql
USE la_verdad;
UPDATE usuarios
SET es_admin = TRUE
WHERE nombre_usuario = 'TU_USUARIO';
```

Luego iniciá sesión. El administrador será enviado al panel:

```text
http://localhost:3000/admin
```

## 6. Uso diario del panel

Desde el panel de administración se puede:

- Crear noticias.
- Crear edictos.
- Indicar cuántos días debe permanecer visible cada edicto.
- Ver todas las publicaciones existentes.
- Eliminar publicaciones.
- Ver un aviso cuando un edicto ya venció y debe eliminarse.
- Subir o reemplazar el PDF del diario correspondiente al día actual.
- Descargar la plantilla A3 editable.

Los edictos vencidos dejan de mostrarse públicamente, pero **no se eliminan solos**. Permanecen en administración hasta que el administrador los elimine.

## 7. Preparar el diario en PDF

La plantilla editable está en:

```text
public/Plantilla_Diario_La_Verdad_A3.pptx
```

Se edita en PowerPoint o un programa compatible y luego se exporta a PDF.

El PDF terminado se sube desde el panel mediante **SUBIR DIARIO DE HOY**.

La página pública muestra **DESCARGAR DIARIO DE HOY** únicamente cuando existe un PDF cargado para la fecha actual.

## 8. Imágenes

Las imágenes de las noticias y los PDF diarios se guardan en:

```text
uploads/
```

La carpeta se crea automáticamente si no existe.

## 9. Comandos útiles

### Iniciar normalmente

```bash
npm start
```

### Iniciar en modo desarrollo

```bash
npm run dev
```

El modo `dev` reinicia Node automáticamente cuando detecta cambios en los archivos del servidor.

### Comprobar sintaxis del servidor

```bash
node --check server.js
```

## 10. Para el futuro alojamiento web

Antes de subirlo a un hosting habrá que configurar:

1. El servidor Node.js.
2. Una base de datos MySQL del hosting.
3. Las variables de `.env` con los datos de esa base.
4. La carpeta `uploads/` con permisos de escritura.
5. El comando de inicio de Node.js.
6. El dominio o subdominio.

El alojamiento gratuito concreto lo elegiremos en el siguiente paso según qué opciones permitan **Node.js + MySQL + almacenamiento de archivos**, porque no todos los hostings gratuitos soportan las tres cosas juntas.

No subas el archivo `.env` a un repositorio público. Para publicar el proyecto, utilizá `.env.example` como referencia y configurá las variables directamente en el hosting.
