extends SceneTree

const StationModelScript = preload("res://scripts/station_model.gd")
var failures := 0

func _init() -> void:
	var model = StationModelScript.new()
	check(model.hazards.is_empty(), "la estación comienza estable")
	var spawned: Array[Dictionary] = model.update(5.1)
	check(spawned.size() == 1 and model.hazards.size() == 1, "la primera emergencia aparece en tiempo real")
	var energy_before: float = model.energy
	model.update(1.0)
	check(model.energy < energy_before, "el incendio consume energía mientras sigue activo")
	var room: int = int(model.hazards[0].room)
	model.repair(room, 40.0, "COMANDANTE")
	check(model.hazards.size() == 1, "una reparación parcial no elimina el peligro")
	model.repair(room, 60.0, "INGENIERÍA")
	check(model.hazards.is_empty() and model.resolved == 1, "ingeniería completa la reparación")
	model.update(22.0)
	check(not model.hazard_in_room(1).is_empty(), "la fuga aparece en soporte vital")
	var oxygen_before: float = model.oxygen
	model.update(1.0)
	check(model.oxygen < oxygen_before, "la fuga reduce oxígeno")
	check(model.score() > 0, "la simulación calcula puntuación")
	if failures == 0: print("OK: movimiento temporal, emergencias, daño y reparaciones")
	quit(failures)

func check(condition: bool, message: String) -> void:
	if condition: print("PASS: ", message)
	else: failures += 1; push_error("FAIL: " + message)
