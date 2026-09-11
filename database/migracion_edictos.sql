USE la_verdad;

-- Si ya tenías edictos creados con la versión anterior,
-- conserva su antiguo subtítulo como contenido.
UPDATE Articulos
SET contenido = subtitulo
WHERE tipo = 'edicto'
  AND (contenido IS NULL OR contenido = '')
  AND subtitulo IS NOT NULL;

-- A partir de ahora los edictos no usan subtítulo.
ALTER TABLE Articulos
MODIFY COLUMN subtitulo VARCHAR(500) NULL;
