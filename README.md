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
