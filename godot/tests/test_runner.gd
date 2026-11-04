extends SceneTree

const StationModelScript = preload("res://scripts/station_model.gd")
var failures := 0

func _init() -> void:
	var model = StationModelScript.new()
	check(model.hazards.is_empty(), "la estación comienza estable")
	var cadet = StationModelScript.new()
	cadet.configure("CADETE")
	check(cadet.pressure < 1.0 and int(cadet.supplies.food) == 8, "cadete recibe más reservas y menos presión")
	var hard = StationModelScript.new()
	hard.configure("COMANDANTE")
	check(hard.pressure > 1.0 and hard.event_speed > 1.0 and int(hard.supplies.parts) == 2, "comandante acelera eventos y limita repuestos")
	model.work_room(3, 20.0, "MEDICINA", 1.0)
	check(int(model.ready[3]) == 1, "una tripulante asignada completa producción")
	var food_before: int = model.supplies.food
	model.collect_room(3)
	check(int(model.supplies.food) > food_before, "la producción se recoge al inventario")
	var parts_before: int = model.supplies.parts
	check(model.upgrade_room(4), "los repuestos mejoran una sala")
	check(int(model.supplies.parts) < parts_before and int(model.upgrades[4]) == 2, "la mejora consume recursos y aumenta nivel")
	var spawned: Array[Dictionary] = model.update(12.1)
	check(spawned.size() == 1 and model.hazards.size() == 1, "la primera emergencia aparece en tiempo real")
	var energy_before: float = model.energy
	model.update(1.0)
	check(model.energy < energy_before, "el incendio consume energía mientras sigue activo")
	var room: int = int(model.hazards[0].room)
	model.repair(room, 40.0, "COMANDANTE")
	check(model.hazards.size() == 1, "una reparación parcial no elimina el peligro")
	model.repair(room, 60.0, "INGENIERÍA")
	check(model.hazards.is_empty() and model.resolved == 1, "ingeniería completa la reparación")
	model.update(31.0)
	check(not model.hazard_in_room(1).is_empty(), "la fuga aparece en soporte vital")
	var oxygen_before: float = model.oxygen
	model.update(1.0)
	check(model.oxygen < oxygen_before, "la fuga reduce oxígeno")
	check(model.score() > 0, "la simulación calcula puntuación")
	check(model.consume_supply("food"), "las raciones se pueden repartir")
	if failures == 0: print("OK: producción, recolección, reparto, mejoras, emergencias y reparación")
	quit(failures)

func check(condition: bool, message: String) -> void:
	if condition: print("PASS: ", message)
	else: failures += 1; push_error("FAIL: " + message)
