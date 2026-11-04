# Ventana de Lanzamiento en Godot

Prototipo de acción y supervivencia dentro de una estación espacial 2D.

## Emergencia jugable

- Vista lateral de cinco salas conectadas: control, soporte vital, laboratorio, hidroponía y taller.
- Cuatro tripulantes visibles con especialidades distintas.
- Selección directa con 1–4 y movimiento con A/D.
- Asignación arrastrando un tripulante hasta una sala.
- Reparación física manteniendo E junto a la avería.
- Incendio, fuga de oxígeno, fallo eléctrico e impacto de basura espacial.
- Oxígeno, energía, integridad del casco y moral en tiempo real.
- Victoria al sobrevivir 90 segundos y resolver todas las emergencias.

## Ejecutar y probar

```powershell
godot --path godot
godot --headless --path godot --script res://tests/test_runner.gd
```

El prototipo Canvas/JavaScript de la raíz permanece independiente.
