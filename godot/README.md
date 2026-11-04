# Ventana de Lanzamiento en Godot

Vertical slice en Godot 4 basado en el documento de diseño del proyecto.

## Ciclo jugable

1. Diseñar una nave modular en cuadrícula con masa, presupuesto y energía.
2. Cargar tripulación, comida, agua, oxígeno y repuestos.
3. Completar la encuesta Go/No-Go del lanzamiento.
4. Administrar un año orbital por saltos de 15 días y rutinas.
5. Resolver alertas mediante protocolos condicionados por los módulos instalados.
6. Ejecutar la reentrada y recibir un informe que explica el resultado.

Incluye cooperación local por roles para 1 a 4 participantes, consola retro, recursos visibles, eventos con aviso previo y Luna/Marte como expansiones futuras. El prototipo web de la raíz permanece independiente.

## Ejecutar y probar

```powershell
godot --path godot
godot --headless --path godot --script res://tests/test_runner.gd
```
