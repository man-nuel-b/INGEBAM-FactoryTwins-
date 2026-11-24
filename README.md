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

## Hito de calidad V0.3.1
- Se extrajo `geometry.js` como módulo puro, separado de Three.js, para validación de archivos JSON y geometría SAT.
- Pruebas manuales automatizadas en navegador: `tests.html` / `geometry-tests.js` (13 verificaciones previstas); abrir https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/tests.html para ejecutarlas y consultar el resultado. Todavía no se ha comprobado su ejecución en un navegador real.
- `studio.html` incluye ahora una carga de foto local con filtro MIME y límite de 8 MB. Es únicamente una referencia visual, **no reconstrucción por IA**. La fotografía no se conserva al recargar, no se incluye en el JSON y no se transmite a servidores por código propio.
- Se mantiene la validación de colisiones, límites de la nave, historial de edición y exportación.

### Restricciones antes de vender
No hay pruebas de regresión de interfaz verificadas en navegadores reales, pruebas de seguridad, backend multiusuario, trazabilidad industrial ni aceptación de un cliente piloto. No usar la demo como herramienta para seguridad operacional.

## Factory Twins Studio V0.3.2 — manipulación directa
- Clic sobre un equipo para seleccionarlo, arrastrar sobre el suelo para desplazarlo.
- El movimiento se valida **antes del commit**: si produce colisión con otro equipo o sale del perímetro, se revierte.
- Ajuste de posición a cuadrícula de 0,25 m (desactivable).
- Botones de giro de -15° y +15°, con rechazo de giros incompatibles.
- El panel de edición numérica ahora rechaza cambios de equipo que producen una ubicación inválida.
- Al cambiar dimensiones de nave, se rechazan nuevos conflictos de perímetro.
- Las acciones aceptadas entran al historial deshacer/rehacer.
- Pruebas de regresión de geometría ampliadas a 17 casos en `tests.html`.

**Importante:** las validaciones modelan huellas rectangulares 2D y no representan los requisitos de distancias de seguridad o normativa de una instalación real. La interacción está implementada en código pero falta probar exhaustivamente en navegadores y dispositivos reales.

## Photo Mapper V0.4 — reconstrucción asistida desde fotografía

Abrir [Photo Mapper](https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/photo-mapper.html).

El usuario puede:
1. Cargar imagen local JPG, PNG o WebP de hasta 10 MB.
2. Introducir ancho y largo estimados de la instalación.
3. Seleccionar cuatro esquinas correspondientes al rectángulo de piso, en orden: superior izquierda, superior derecha, inferior derecha e inferior izquierda.
4. El motor `photo-geometry.js` calcula una homografía proyectiva del plano de imagen al plano de suelo. **No estima de forma autónoma las medidas reales ni la profundidad de objetos**.
5. Marcar centros de máquinas visibles, clasificarlas y darles dimensiones estimadas.
6. Exportar el proyecto JSON o abrirlo directamente en `studio.html` mediante transferencia temporal de datos en la misma pestaña.
7. Corregir en Studio la geometría estimada, colisiones y posiciones no válidas.

La imagen **no** se carga a servidores, no se exporta ni permanece en almacenamiento persistente. Solo viajan posiciones y metadatos geométricos al Studio. No hay procesamiento remoto ni IA implementada.

**Limitación principal:** Una fotografía perspectiva única puede presentar oclusión, distorsión o no mostrar cuatro esquinas reales del piso. Una homografía solo describe un plano. Alturas de máquinas, superficies fuera del plano y partes ocultas requieren medición y corrección manual. No vender como fotogrametría, CAD as-built o medición profesional.

Pruebas de calibración previstas en [photo-tests.html](https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/photo-tests.html). La existencia del código de pruebas no implica que se hayan ejecutado con éxito en todos los navegadores.

## Photo Mapper V0.5 — sugerencias experimentales de regiones
- `photo-regions.js`: procesador local de bordes basado en gradientes y regiones de alta densidad de contraste.
- La interfaz presenta hasta ocho regiones sugeridas y permite aceptarlas manualmente como posiciones de equipos o descartarlas.
- La clasificación de la máquina, dimensiones y verificación de su ubicación siguen siendo responsabilidad del usuario. **No se trata de detección industrial por IA**, ni la puntuación de contraste es una probabilidad de identificación.
- Añadida validación para rechazar la colocación de centros fuera del perímetro calibrado.
- `package.json`, `node-tests.mjs` y `.github/workflows/factory-ci.yml` agregan pruebas ejecutadas automáticamente en GitHub Actions con Node.js 22.
- El despliegue en GitHub Pages sigue siendo una demo estática; ninguna imagen se transmite a la nube mediante Photo Mapper.

### Objetivos del próximo hito
1. Corregir todos los fallos de CI y validar en un navegador real la carga de imagen, calibración y transferencia a Studio.
2. Añadir un adaptador opcional de visión artificial con clasificación verificable en imágenes industriales de prueba.
3. Añadir pruebas de interfaz (incluyendo WebGL y móvil), sin sustituir la validación técnica en terreno.

## V0.6 — Detección IA genérica y revisión humana
- `photo-ai.js` integra **TensorFlow.js 4.22.0 + COCO-SSD 2.2.3** bajo demanda en el navegador; pesos y scripts se descargan externamente solo al activar el botón. Requiere conexión a Internet y compatibilidad del navegador.
- COCO-SSD puede sugerir categorías habituales (por ejemplo, refrigerador o vehículo). **No es un detector de maquinaria industrial** y carece de categorías específicas para gran parte de los equipos fabriles.
- Cada caja detectada aparece con etiqueta y puntuación del detector. Los resultados **no se insertan automáticamente**: el usuario debe calibrar el piso y aprobar o descartar. Al aceptar, se aproxima el punto de apoyo con el centro inferior de la caja y se elige manualmente el tipo de máquina y sus dimensiones.
- La fotografía se procesa en memoria del navegador con TensorFlow.js. El código propio no sube la imagen, aunque el navegador descarga librerías y pesos desde proveedores de terceros. No utilizar fotografías confidenciales sin autorizar previamente las dependencias y políticas del entorno.
- Si el modelo falla, Photo Mapper mantiene los flujos manuales y de regiones por contraste.
- `Factory Twins CI` prueba sintaxis de módulos y suite Node.js, incluyendo restricciones de tipos COCO y validación de entradas.

### Pendiente de validación
Este hito aún necesita pruebas de detección en imágenes industriales reales autorizadas, precisión por categoría, tiempos de carga y rendimiento en equipos modestos. No debe utilizarse como reconstrucción industrial precisa ni sistema de seguridad.

## Auditoría técnica — endurecimiento del visor y regresiones (noviembre 2026)

- `factory3d.js` comprueba explícitamente `host.hidden` y `getClientRects()` para pausar renderizado cuando se muestra la vista 2D; reinicia el reloj de animación al reanudar.
- Añadida liberación de `ResizeObserver`, controles OrbitControls, geometrías, materiales, renderer y listeners en `pagehide`.
- `node-tests.mjs` incorpora pruebas de calibración degenerada, horizonte proyectivo, NaN, cuadrilátero cruzado y regla literal de limpieza de nombres.
- La regla `plain(s)` elimina **solo** los signos `<` y `>`, por lo que `<b>Demo</b>` se transforma en `bDemo/b`. El código y la prueba ya coinciden; no se modifica sin justificación.
- Queda pendiente modernizar el formateo del proyecto, deshacer el contrato global entre visor y simulación, empaquetar dependencias y pruebas de interacción en navegadores reales. El manejo de modelos de IA mediante CDN sigue siendo experimental.

## MVP piloto v0.7: cadena de frío simulada

[Abrir piloto de cadena de frío](https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/pilot.html)

**Caso de uso:** instalación ficticia con dos cámaras de frío y un compresor. El motor puro `pilot-engine.js` genera lecturas sintéticas reproducibles a intervalos artificiales de 5 minutos; una cámara incorpora degradación deliberada para demostrar alertas, reconocimiento de incidencias e intervención de mantenimiento.

**Incluye:**
- Tablero independiente de temperatura, vibración, potencia y energía estimada.
- Historial de temperatura dibujado en Canvas, con umbral y serie de lecturas simuladas.
- Incidencias por cruce de umbral, reconocimiento manual y bitácora de mantenimiento ficticio.
- Exportación de JSON etiquetado como `SIMULATED`.
- Estructura de datos con `tenantId` y `plantId` para preparar posterior evolución multiempresa.
- Pruebas de dominio en `node-tests.mjs` y comprobaciones de sintaxis en CI.

**Lo que NO hace:**
- No integra el layout de Photo Mapper / Studio con el piloto todavía; es un caso operativo independiente.
- No tiene conectividad MQTT/OPC UA, backend autenticado, series históricas reales, persistencia permanente, notificaciones externas, acceso por organización o predicción estadística validada.
- No mide consumo real: suma kW sintéticos por 5/60 para una estimación kWh. No utilizar para facturación ni decisiones de seguridad.

**Propuesta de arquitectura multiempresa:** `architecture/postgres-schema-draft.sql` incluye tablas de organizaciones, membresías, plantas, equipos, lecturas, incidencias y mantenimiento con claves compuestas de pertenencia. Es **un borrador SQL no desplegado**. Las políticas RLS, el gateway industrial, autenticación e ingesta segura siguen pendientes: agregar un campo `tenant_id` por sí solo no proporciona aislamiento de datos.

**Próximo hito recomendado:** vincular equipos del editor a activos del piloto mediante identificadores persistentes, guardar proyectos por organización con autenticación y validar un piloto autorizado con datos reales de solo lectura.

## Etapa 1 — monitor unificado (nuevo MVP visual)
[Monitor unificado 2D/3D](https://man-nuel-b.github.io/INGEBAM-FactoryTwins-/operations.html)

- `monitor-domain.js` convierte cualquier `ingebam.factorytwins.project` válido en una sesión simulada de activos **con el mismo identificador persistente por equipo**.
- `operations.html` y `operations.js` muestran el mismo layout tanto en SVG 2D como en una escena 3D básica Three.js; al seleccionar un equipo en cualquier vista se actualiza el mismo panel y viceversa.
- Es posible cargar el JSON exportado desde Photo Mapper o Studio, reutilizar el proyecto guardado en el navegador o transferir el proyecto de Studio a Monitor en la misma pestaña.
- El monitor presenta indicadores SIMULADOS, escenarios hipotéticos, mantenimiento ficticio y exportación de sesión JSON.
- Se preservan explícitamente nombre, posición, dimensiones, rotación e identificadores del proyecto. No se afirma que un equipo construido desde fotografía equivalga a una medición técnica.
- La visualización 3D usa geometrías genéricas que representan la envolvente del equipo; no es una reconstrucción de maquinaria real.
- No altera el visor de demostración anterior ni el piloto de cadena de frío: ambos siguen disponibles de forma independiente.

**Estado de aceptación:** implementado y bajo pruebas automatizadas de dominio/sintaxis. Quedan pendientes pruebas reales de interacción y rendimiento WebGL en distintos navegadores y la integración del historial de incidencias del piloto con los proyectos importados. Se requiere revisar problemas geométricos antes de cualquier decisión operativa.

## Contrato de datos v0.8 (compatibilidad Etapa 1 → Etapa 3)

Se implementó `project-bundle.js`, un adaptador separado del motor geométrico, para no alterar `parseProject` ni los proyectos antiguos.

- Importa archivos geométricos legacy `ingebam.factorytwins.project` v1, sin IDs de organización, y les asigna identidad **solo demostrativa** `org-demo-01` / `site-demo-01`.
- Importa el JSON extendido que añade `organizationId`, `siteId`, `equipment[].telemetry`, `events` y `maintenanceLogs`; la telemetría sin fecha se conserva como `initialAssetState` y **nunca** se convierte en un registro histórico con una fecha inventada.
- Exporta el sobre `ingebam.factorytwins.bundle` v1 con `layout`, `thresholds`, `initialAssetState`, `telemetryReadings`, `events` y `maintenanceLogs`. Cada registro histórico tiene `equipmentId`, `timestamp` ISO UTC y `source` `simulated` o `live`.
- Valida IDs duplicados, equipos referenciados, valores numéricos finitos, fechas, categorías de evento y cantidades máximas. Las lecturas etiquetadas como `live` **no activan ningún monitor en vivo**: su etiqueta de procedencia se conserva solo en el archivo, sin conexión a dispositivos.
- `operations.js` ya utiliza el adaptador en el flujo de importación/exportación. El modo operacional sigue siendo `SIMULATED`; solo un estado importado explícitamente como `simulated` puede inicializar una sesión ficticia.
- No existe autenticación, autorización o aislamiento SaaS real: los IDs de organización y planta son metadatos, no controles de acceso. No permitir ingesta de sensores ni mezclar datos reales en un backend sin credenciales, filtrado por organización y políticas RLS.

**Evolución:** la futura API traducirá el sobre a tablas relacionales con verificación de organización basada en identidad autenticada. La geometría se mantiene independiente de la telemetría y el motor de monitorización usa `equipment.id` como referencia.

## Integración del monitor original con datos unificados (noviembre 2026)

La pantalla `index.html` mantiene su demostración 2D/3D y el contrato `window.FactoryTwinsData`. Su `app.js` ahora registra:
- Lecturas simuladas con fecha UTC, `equipmentId` estable y `source: 'simulated'`, con límite de 12.000 registros en memoria.
- Eventos estructurados (ID, fecha, tipo, severidad, mensaje y `equipmentId` cuando corresponda). Se muestran hasta 12, se conservan hasta 200 por sesión.
- Mantenimientos simulados estructurados con factor de vibración y cambio de salud.
- Umbrales configurables por equipo con valores de respaldo.

El nuevo `legacy-demo-adapter.js` exporta esos datos como `ingebam.factorytwins.bundle` v1, compatible con `operations.js`. La geometría procede del layout en **metros** de `monitor-domain.js`; los campos `x,y,w,h` de `app.js` pertenecen únicamente al esquema gráfico 2D y no deben confundirse con metros.

`geometry.js` y su `parseProject` original permanecen intactos; la extensión de proyecto se valida en `project-bundle.js`. No existe control industrial ni telemetría real.
