# Ventana de Lanzamiento en Godot

Prototipo de acción y supervivencia dentro de una estación espacial 2D.

Renderizado nativamente a **320 × 180** y escalado con filtrado nearest-neighbor para una estética 8-bit consistente.

## Menús y dificultad

- Menú principal animado y pantalla de controles.
- Selector de dificultad: Cadete, Oficial y Comandante.
- Las dificultades cambian reservas iniciales, daño, consumo y velocidad de los eventos.
- Pausa dentro de la misión y retorno al menú.

## Bucle de supervivencia

- Vista lateral de cinco salas conectadas: control, soporte vital, laboratorio, hidroponía y taller.
- Cuatro tripulantes visibles con especialidades distintas.
- Selección directa con 1–4 y movimiento con A/D.
- Asignación arrastrando un tripulante hasta una sala.
- Producción continua de comida, agua, oxígeno, ciencia, datos, energía, botiquines y repuestos.
- Recursos terminados que deben recogerse haciendo clic en la sala.
- Hambre, sed, salud y fatiga individuales.
- Reparto manual de raciones, agua y botiquines al astronauta seleccionado.
- Descanso, eficiencia laboral, bonificaciones por especialidad y mejoras de nivel para cada sala.
- Cápsulas de carga móviles que deben capturarse antes de que abandonen la pantalla.
- Tripulantes animados, alarmas, destellos, vibración e indicadores flotantes.
- Reparación física manteniendo E junto a la avería.
- Incendios, fugas, fallos eléctricos, impactos y cortocircuitos.
- Oxígeno, energía, integridad del casco y moral en tiempo real.
- Victoria al sostener la economía de la estación durante tres minutos y resolver las emergencias.

## Ejecutar y probar

```powershell
godot --path godot
godot --headless --path godot --script res://tests/test_runner.gd
```

El prototipo Canvas/JavaScript de la raíz permanece independiente.
