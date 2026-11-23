# INGEBAM Factory Twins

**Prototipo independiente de gemelos digitales industriales** (v0.1.0).

## Incluye
- Plano 2D esquemático y seis máquinas industriales seleccionables.
- Telemetría simulada: temperatura, vibración, potencia y salud.
- Detección de alertas mediante umbrales ficticios.
- Simulación con pausa/reinicio, registro de eventos y mantenimiento ficticio.
- Escenarios hipotéticos de carga de producción y temperatura ambiente.
- Exportación JSON de estado y eventos.
- Interfaz adaptable a pantallas móviles.

## Ejecutar
Abrir `index.html` en un navegador moderno, o ejecutar `python -m http.server 8000` desde esta carpeta y visitar `http://localhost:8000`.

## Arquitectura propuesta para versión productiva
Sensores / PLC → gateway industrial → OPC UA / MQTT → backend autenticado → base de datos histórica → reglas y modelos → visor 2D/3D.

**No conectar este prototipo directamente a una red industrial.**

## Privacidad y alcance
El software no realiza solicitudes de red, no consulta sensores reales y no almacena información en servidores. Todos los datos, posiciones, alertas y modelos de proyección son simulados. **No apto para decisiones críticas de seguridad, producción o mantenimiento sin validación**.

## Publicar
Habilitar GitHub Pages desde Settings → Pages → Deploy from a branch → main / root.

URL prevista: https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/


## Factory Twins Studio V0.3 (editor independiente)
Abrir `studio.html` o, con GitHub Pages habilitado: https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/studio.html

Funciones implementadas:
- Inventario de equipos y modelos geométricos conceptuales en Three.js.
- Selección por clic en escena o por listado.
- Alta, duplicación, eliminación y edición numérica de posición, dimensiones y rotación.
- Nave con dimensiones modificables.
- Validación geométrica de colisiones 2D entre rectángulos orientados (SAT) y límites interiores de nave.
- Deshacer/rehacer, almacenamiento local, exportación e importación JSON con validación estructural.
- Sin conexión a Internet salvo descarga de dependencias Three.js desde CDN.

**Limitaciones comerciales:** La revisión es geométrica preliminar y NO incluye separación de seguridad, accesos, evacuación, diseño eléctrico, estructural ni normativa industrial. No hay autenticación, colaboración, base de datos remota, reconocimiento de imágenes, telemetría real ni modelos predictivos. La importación local sustituye el proyecto abierto, tras confirmar. No cargar proyectos confidenciales en equipos compartidos.

### Próximas puertas de calidad antes de producción
1. Pruebas de interfaz automatizadas y regresión geométrica, evaluación móvil y WebGL.
2. Persistencia segura por organización, autenticación/roles, auditoría y respaldos.
3. Reconstrucción fotográfica asistida (con indicadores de incertidumbre) y modelos GLB.
4. Pipeline de sensores de solo lectura con gateway segregado y datos históricos.
5. Validación con ingenieros responsables y pilotos industriales antes de comercialización operativa.

El editor no reemplaza la aplicación de monitorización V0.2: ambos conviven en el mismo repositorio.
