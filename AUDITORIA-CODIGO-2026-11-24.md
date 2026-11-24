# Auditoría de código — INGEBAM Factory Twins
**Fecha:** 24 de noviembre de 2026  
**Alcance:** repositorio `man-nuel-b/INGEBAM-FactoryTwins-`, rama `main`.  
**Método:** inspección estática del código real y revisiones de archivos de configuración, más regresiones Node.js ejecutadas en GitHub Actions. Sin prueba de interfaz de extremo a extremo en navegador real. No se hizo auditoría de pentesting, electrónica industrial ni instalación física.

## Hallazgos corregidos

| ID | Severidad | Archivo(s) | Evidencia original | Medida |
|---|---|---|---|---|
| A01 | ALTA | `photo-mapper.js` | La función `setPhoto()` no habilitaba `suggestRegions` ni `detectAI` después de `img.onload`; los controles HTML estaban `disabled`. | Habilitar ambos controles tras cargar correctamente y deshabilitarlos durante carga/error. |
| A02 | ALTA | `operations.js` | El evento de importación aplicaba `parseProject(JSON.parse(...))` antes de `loadProject`, eliminando datos operacionales e impidiendo importar bundles. | Entregar el archivo completo a `loadProject`, donde `importProjectBundle` valida y separa los datos. |
| A03 | ALTA | `studio.js` | El importador usaba solamente `parseProject`, por lo que rechazaba el sobre `ingebam.factorytwins.bundle`. | Importación mediante `importProjectBundle(input).layout`, con aviso explícito de que Studio conserva solo la geometría. |
| A04 | MEDIA | `photo-regions.js` | El corte `kept.length > limit` admitía un resultado por encima del máximo. | Cambiar a `>=` y normalizar el límite. |
| A05 | MEDIA | `operations.js` | `three.updateState` reconstruía todos los meshes y liberaba geometrías cada vez que cambiaba la selección o la telemetría simulada. | Reutilizar la escena y actualizar solo materiales si el layout no cambió. |
| A06 | MEDIA | `studio.js` | `undo` y `redo` no establecían `dirty=true`; los elementos de selección `LineSegments` y sus materiales no se liberaban al regenerar la escena. | Corrección de dirty/revision y ciclo de vida de materiales, geometrías y renderer en `pagehide`. |
| A07 | ALTA | `factory3d.js` | Las lámparas de estado de máquinas compartían el material `safety`; al ajustar una lámpara, cambiaban simultáneamente los colores de las otras. | Material independiente para cada lámpara; el render ya libera materiales distintos en su limpieza. |

## Riesgos pendientes (no corregidos)

| ID | Severidad | Área | Impacto | Cierre recomendado |
|---|---|---|---|---|
| P01 | ALTA | Seguridad SaaS | No existe backend con autenticación, RLS, control de organización ni permisos. `organizationId` es metadato, no un control de acceso. | API autorizada, pruebas de aislamiento y control por rol antes de almacenar datos de clientes. |
| P02 | ALTA | Validación end-to-end | No se han verificado con navegador real todos los pasos fotografía → perspectiva → Studio → Monitor → exportación ni las interacciones móviles. | Suite Playwright con navegador y fotos de referencia autorizadas; ejecución obligatoria en CI. |
| P03 | ALTA | IA / privacidad | `photo-ai.js` descarga código y pesos desde CDN sin hashes SRI ni dependencias empaquetadas. COCO-SSD es genérico. | Fijar dependencias, servir assets controlados, revisar cadena de suministro y precisión con dataset industrial. |
| P04 | MEDIA | Datos operacionales | `operations.js` muestra eventos de simulación y no integra completamente el histórico y mantenimientos importados en una bitácora única; al exportar la sesión, recompone fechas de algunos eventos. | Modelo de eventos inmutable con marcas temporales de origen, filtro por equipo e integración del historial. |
| P05 | MEDIA | Experiencia de Studio | La creación/duplicación de máquinas puede dejar temporalmente conflictos SAT, aunque se señalan; el editor depende de WebGL/CDN sin fallback 2D equivalente. | Alta transaccional con colocación válida o estado temporal explícito; fallback accesible sin WebGL. |
| P06 | MEDIA | Observabilidad y rendimiento | No existe presupuesto probado para 150 equipos, fotografías grandes o ejecución prolongada; los ciclos de animación carecen de instrumentación. | Pruebas de FPS/memoria y perfiles de equipo representativos. |
| P07 | MEDIA | Geometría | La homografía presupone plano horizontal y escala ingresada por el usuario; no estima geometría volumétrica real de máquinas. | Declarar y verificar tolerancias, ensayos sobre múltiples fotografías y medición externa. |
| P08 | MEDIA | Contrato de datos | Persisten formatos legacy, bundle y piloto con distinta semántica de eventos y marca de fuente, sin migración formal ni versionado de API servidor. | Esquema JSON publicado y pruebas de migración con fixtures reales y sintéticos. |

## Resultados y límite del dictamen
Los tests Node.js y los chequeos de sintaxis de GitHub Actions comprueban **lógica y contratos parciales**; no prueban que el render 3D se inicialice, que TensorFlow descargue correctamente, que se accione un botón o que funcionen los flujos de usuario en navegador. Los tests de HTML añadidos son verificaciones estáticas, no pruebas UI completas.

**Dictamen:** la Etapa 1 no está cerrada; la base geométrica y los contratos mejoraron, pero deben resolverse P02 y P05 como mínimo para aceptar el MVP visual. Tampoco está aprobado para producción industrial, telemetría real o comercialización SaaS.
