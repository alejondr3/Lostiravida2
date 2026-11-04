extends SceneTree

const MissionModelScript = preload("res://scripts/mission_model.gd")

var failures := 0

func _init() -> void:
	var model = MissionModelScript.new()
	check(model.grid.size() == MissionModelScript.GRID_SIZE, "la nave usa 12 celdas")
	check(model.can_launch().is_empty(), "el diseño inicial puede lanzarse")
	var initial_mass: int = model.total_mass()
	check(model.set_module(2, "lab"), "se instala un módulo")
	check(model.total_mass() > initial_mass, "el módulo aumenta la masa")
	check(model.remove_module(2), "la nave se puede rediseñar")
	var cargo_mass: int = model.cargo_mass()
	check(model.adjust_cargo("food", 1), "se agrega carga")
	check(model.cargo_mass() > cargo_mass, "la carga afecta la masa")
	model.start_orbit()
	var before_day: int = model.day
	model.advance_time("CIENCIA")
	check(model.day > before_day and model.science > 0, "la estancia avanza y produce ciencia")
	var health_before: float = model.health
	model.resolve_event({"title":"PRUEBA", "need":"shield"}, true)
	check(model.health < health_before, "sin módulo correcto el peligro solo se mitiga")
	check(model.score() >= 0, "el informe calcula una puntuación")
	if failures == 0: print("OK: diseño, carga, estancia, eventos e informe")
	quit(failures)

func check(condition: bool, message: String) -> void:
	if condition: print("PASS: ", message)
	else: failures += 1; push_error("FAIL: " + message)
