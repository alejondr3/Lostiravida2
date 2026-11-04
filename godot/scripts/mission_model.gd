class_name MissionModel
extends RefCounted

const GRID_SIZE := 12
const MASS_LIMIT := 18000
const BUDGET_LIMIT := 48
const MODULES := {
	"command": {"name":"MANDO", "mass":2200, "cost":6, "power":-2, "desc":"Control, navegación y regreso"},
	"life": {"name":"SOPORTE VITAL", "mass":2400, "cost":7, "power":-4, "desc":"Recicla aire y agua"},
	"solar": {"name":"PANELES SOLARES", "mass":1200, "cost":4, "power":9, "desc":"Produce energía en órbita"},
	"battery": {"name":"BATERÍAS", "mass":1500, "cost":4, "power":3, "desc":"Reserva para eclipses"},
	"shield": {"name":"REFUGIO RAD", "mass":2600, "cost":7, "power":-1, "desc":"Protección contra tormentas"},
	"lab": {"name":"LABORATORIO", "mass":1800, "cost":6, "power":-4, "desc":"Genera ciencia"},
	"greenhouse": {"name":"INVERNADERO", "mass":2100, "cost":6, "power":-3, "desc":"Mejora comida y moral"},
	"workshop": {"name":"TALLER", "mass":1700, "cost":5, "power":-3, "desc":"Reparaciones críticas"},
	"medbay": {"name":"ENFERMERÍA", "mass":1500, "cost":5, "power":-2, "desc":"Recupera salud"},
	"comms": {"name":"COMUNICACIONES", "mass":900, "cost":3, "power":-2, "desc":"Envía datos a Tierra"}
}
const CARGO := {
	"food":{"name":"COMIDA · 30 DÍAS", "mass":220, "cost":1},
	"water":{"name":"AGUA · RESERVA", "mass":120, "cost":1},
	"oxygen":{"name":"O₂ · EMERGENCIA", "mass":90, "cost":1},
	"parts":{"name":"REPUESTOS", "mass":160, "cost":2}
}

var grid: Array[String] = []
var cargo := {"food":2, "water":2, "oxygen":2, "parts":2}
var crew_count := 4
var day := 0
var shift := 0
var health := 100.0
var morale := 100.0
var oxygen := 100.0
var water := 100.0
var food := 100.0
var energy := 100.0
var science := 0
var events_survived := 0
var mission_log: Array[String] = []

func _init() -> void:
	grid.resize(GRID_SIZE)
	grid.fill("")
	grid[0] = "command"
	grid[1] = "life"
	grid[4] = "solar"
	grid[5] = "battery"
	grid[8] = "comms"

func module_mass() -> int:
	var total := 0
	for module_id in grid:
		if module_id != "": total += int(MODULES[module_id].mass)
	return total

func module_cost() -> int:
	var total := 0
	for module_id in grid:
		if module_id != "": total += int(MODULES[module_id].cost)
	return total

func cargo_mass() -> int:
	var total := crew_count * 85
	for cargo_id in cargo: total += int(CARGO[cargo_id].mass) * int(cargo[cargo_id])
	return total

func cargo_cost() -> int:
	var total := 0
	for cargo_id in cargo: total += int(CARGO[cargo_id].cost) * int(cargo[cargo_id])
	return total

func total_mass() -> int: return module_mass() + cargo_mass()
func total_cost() -> int: return module_cost() + cargo_cost()

func net_power() -> int:
	var total := 0
	for module_id in grid:
		if module_id != "": total += int(MODULES[module_id].power)
	return total

func count_module(module_id: String) -> int: return grid.count(module_id)

func can_launch() -> Array[String]:
	var errors: Array[String] = []
	for required in ["command", "life", "solar", "battery", "comms"]:
		if count_module(required) == 0: errors.append("FALTA " + str(MODULES[required].name))
	if total_mass() > MASS_LIMIT: errors.append("MASA EXCEDIDA")
	if total_cost() > BUDGET_LIMIT: errors.append("PRESUPUESTO EXCEDIDO")
	if net_power() < 1: errors.append("ENERGÍA INSUFICIENTE")
	return errors

func set_module(index: int, module_id: String) -> bool:
	if index < 2 or index >= GRID_SIZE: return false
	var old := grid[index]
	grid[index] = module_id
	if total_mass() > MASS_LIMIT or total_cost() > BUDGET_LIMIT:
		grid[index] = old
		return false
	return true

func remove_module(index: int) -> bool:
	if index < 2 or index >= GRID_SIZE or grid[index] == "": return false
	grid[index] = ""
	return true

func adjust_cargo(cargo_id: String, amount: int) -> bool:
	var old: int = cargo[cargo_id]
	cargo[cargo_id] = clampi(old + amount, 0, 8)
	if total_mass() > MASS_LIMIT or total_cost() > BUDGET_LIMIT:
		cargo[cargo_id] = old
		return false
	return true

func start_orbit() -> void:
	day = 1
	mission_log.append("DÍA 001 · INSERCIÓN ORBITAL CONFIRMADA")

func advance_time(task: String) -> Dictionary:
	shift += 1
	day = mini(365, day + 15)
	var recycling := 0.45 if count_module("life") > 0 else 1.0
	oxygen = maxf(0, oxygen - crew_count * 0.6 * recycling)
	water = maxf(0, water - crew_count * 0.75 * recycling)
	food = maxf(0, food - crew_count * 1.2 + count_module("greenhouse") * 1.6)
	energy = clampf(energy + net_power() * 0.9, 0, 100)
	morale = maxf(0, morale - 0.45 + count_module("greenhouse") * 0.2)
	if task == "CIENCIA": science += 12 + count_module("lab") * 8
	elif task == "MANTENIMIENTO": energy = minf(100, energy + 8)
	elif task == "SALUD": health = minf(100, health + 6 + count_module("medbay") * 4)
	elif task == "COMUNICACIÓN": morale = minf(100, morale + 8); science += count_module("comms") * 3
	if oxygen <= 0 or water <= 0 or food <= 0 or energy <= 0: health = maxf(0, health - 14)
	mission_log.append("DÍA %03d · %s" % [day, task])
	return event_for_shift(shift)

func event_for_shift(value: int) -> Dictionary:
	match value:
		2: return {"title":"ALERTA SOLAR", "body":"Una tormenta de radiación llegará en 8 horas.", "need":"shield", "safe":"Trasladar la tripulación al refugio", "risk":"Mantener experimentos activos"}
		4: return {"title":"FUGA DE REFRIGERANTE", "body":"Cae la capacidad térmica del segmento de servicio.", "need":"workshop", "safe":"Sellar y reparar con repuestos", "risk":"Aislar el módulo afectado"}
		7: return {"title":"CONTACTO ESCOLAR", "body":"Control solicita una transmisión educativa en vivo.", "need":"comms", "safe":"Abrir enlace de comunicaciones", "risk":"Priorizar el envío científico"}
		10: return {"title":"MICROMETEORITO", "body":"Impacto menor y pérdida de presión.", "need":"workshop", "safe":"Reparar la perforación", "risk":"Cerrar la escotilla y continuar"}
		14: return {"title":"EXPERIMENTO PROMETEDOR", "body":"La muestra puede producir resultados extraordinarios.", "need":"lab", "safe":"Dedicar energía al laboratorio", "risk":"Conservar energía"}
	return {}

func resolve_event(event: Dictionary, prepared: bool) -> String:
	if event.is_empty(): return ""
	if prepared and count_module(str(event.need)) > 0:
		events_survived += 1; science += 10; mission_log.append(str(event.title) + " · PROTOCOLO EXITOSO")
		return "PROTOCOLO EXITOSO · LA PREPARACIÓN FUNCIONÓ"
	if prepared:
		health = maxf(0, health - 8); energy = maxf(0, energy - 12)
		return "FALTABA EL MÓDULO CORRECTO · DAÑO MITIGADO"
	morale = maxf(0, morale - 8); health = maxf(0, health - 5); science += 4
	return "RIESGO ACEPTADO · HUBO CONSECUENCIAS"

func score() -> int: return maxi(0, roundi(health * 4 + morale * 2 + science * 3 + events_survived * 50))

func outcome() -> String:
	if health <= 0: return "MISIÓN PERDIDA · SIN SUPERVIVIENTES"
	if score() >= 900: return "MISIÓN EXCEPCIONAL"
	if score() >= 600: return "MISIÓN CUMPLIDA"
	return "REGRESO CON LECCIONES CRÍTICAS"
