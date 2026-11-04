class_name StationModel
extends RefCounted

const ROOM_NAMES := ["CONTROL", "SOPORTE VITAL", "LABORATORIO", "HIDROPONÍA", "TALLER"]
const ROOM_OUTPUTS := ["datos", "oxígeno + agua", "ciencia + botiquín", "comida", "repuestos + energía"]
const EVENT_PLAN := [
	{"at":12.0, "type":"fire", "room":3, "title":"INCENDIO EN HIDROPONÍA"},
	{"at":43.0, "type":"leak", "room":1, "title":"FUGA DE OXÍGENO"},
	{"at":76.0, "type":"power", "room":4, "title":"FALLO ELÉCTRICO"},
	{"at":112.0, "type":"debris", "room":2, "title":"IMPACTO DE BASURA ESPACIAL"},
	{"at":148.0, "type":"fire", "room":0, "title":"CORTOCIRCUITO EN CONTROL"}
]

var elapsed := 0.0
var oxygen := 100.0
var energy := 100.0
var hull := 100.0
var morale := 100.0
var resolved := 0
var next_event := 0
var hazards: Array[Dictionary] = []
var finished := false
var won := false
var difficulty := "OFICIAL"
var pressure := 1.0
var event_speed := 1.0
var supplies := {"food":5, "water":5, "medkit":2, "parts":4, "science":0, "data":0}
var production := [0.0, 0.0, 0.0, 0.0, 0.0]
var ready := [0, 0, 0, 0, 0]
var upgrades := [1, 1, 1, 1, 1]

func reset() -> void:
	elapsed = 0.0; oxygen = 100.0; energy = 100.0; hull = 100.0; morale = 100.0
	resolved = 0; next_event = 0; hazards.clear(); finished = false; won = false
	supplies = {"food":5, "water":5, "medkit":2, "parts":4, "science":0, "data":0}
	production = [0.0, 0.0, 0.0, 0.0, 0.0]; ready = [0, 0, 0, 0, 0]; upgrades = [1, 1, 1, 1, 1]
	configure(difficulty)

func configure(mode: String) -> void:
	difficulty = mode
	match mode:
		"CADETE":
			pressure = 0.62; event_speed = 0.78
			supplies.food = 8; supplies.water = 8; supplies.medkit = 4; supplies.parts = 7
		"COMANDANTE":
			pressure = 1.48; event_speed = 1.32
			supplies.food = 3; supplies.water = 3; supplies.medkit = 1; supplies.parts = 2
		_:
			pressure = 1.0; event_speed = 1.0

func update(delta: float) -> Array[Dictionary]:
	if finished: return []
	elapsed += delta
	energy = maxf(0, energy - delta * 0.055 * pressure)
	oxygen = maxf(0, oxygen - delta * 0.025 * pressure)
	var spawned: Array[Dictionary] = []
	while next_event < EVENT_PLAN.size() and elapsed >= float(EVENT_PLAN[next_event].at) / event_speed:
		var event: Dictionary = EVENT_PLAN[next_event].duplicate(true)
		event["severity"] = pressure; event["progress"] = 0.0
		hazards.append(event); spawned.append(event); next_event += 1
	for hazard in hazards:
		var damage := float(hazard.severity) * delta
		match str(hazard.type):
			"fire": energy = maxf(0, energy - damage * 0.72); morale = maxf(0, morale - damage * 0.22)
			"leak": oxygen = maxf(0, oxygen - damage * 0.88)
			"power": energy = maxf(0, energy - damage * 1.05)
			"debris": hull = maxf(0, hull - damage * 0.66); oxygen = maxf(0, oxygen - damage * 0.18)
	if oxygen <= 0 or energy <= 0 or hull <= 0:
		finished = true; won = false
	elif elapsed >= 180.0 and hazards.is_empty():
		finished = true; won = true
	return spawned

func work_room(room_index: int, delta: float, role: String, efficiency: float) -> bool:
	if room_index < 0 or room_index >= ROOM_NAMES.size() or not hazard_in_room(room_index).is_empty(): return false
	var role_bonus := 1.0
	if room_index == 0 and role == "COMANDANTE": role_bonus = 1.65
	elif room_index == 1 and role == "INGENIERÍA": role_bonus = 1.45
	elif room_index == 2 and role == "CIENCIA": role_bonus = 1.7
	elif room_index == 3 and role == "MEDICINA": role_bonus = 1.35
	elif room_index == 4 and role == "INGENIERÍA": role_bonus = 1.8
	production[room_index] += delta * 5.2 * role_bonus * efficiency * float(upgrades[room_index])
	if production[room_index] >= 100.0:
		production[room_index] -= 100.0
		ready[room_index] = mini(3, int(ready[room_index]) + 1)
		return true
	return false

func collect_room(room_index: int) -> Dictionary:
	if room_index < 0 or room_index >= ready.size() or int(ready[room_index]) <= 0: return {}
	ready[room_index] -= 1
	var reward := {}
	match room_index:
		0: supplies.data += 2; morale = minf(100, morale + 3); reward = {"data":2}
		1: oxygen = minf(100, oxygen + 18); supplies.water += 2; reward = {"oxygen":18, "water":2}
		2: supplies.science += 3; supplies.medkit += 1; reward = {"science":3, "medkit":1}
		3: supplies.food += 3; reward = {"food":3}
		4: supplies.parts += 3; energy = minf(100, energy + 16); reward = {"parts":3, "energy":16}
	return reward

func upgrade_room(room_index: int) -> bool:
	if room_index < 0 or room_index >= upgrades.size() or int(upgrades[room_index]) >= 3: return false
	var cost := int(upgrades[room_index]) * 4
	if int(supplies.parts) < cost: return false
	supplies.parts -= cost; upgrades[room_index] += 1; return true

func consume_supply(kind: String) -> bool:
	if not supplies.has(kind) or int(supplies[kind]) <= 0: return false
	supplies[kind] -= 1; return true

func repair(room_index: int, amount: float, role: String) -> bool:
	for i in range(hazards.size() - 1, -1, -1):
		var hazard := hazards[i]
		if int(hazard.room) != room_index: continue
		var multiplier := 1.0
		if role == "INGENIERÍA": multiplier = 1.7
		elif role == "COMANDANTE": multiplier = 1.2
		hazard.progress = float(hazard.progress) + amount * multiplier
		if float(hazard.progress) >= 100.0:
			hazards.remove_at(i); resolved += 1; morale = minf(100, morale + 8); return true
		return false
	return false

func hazard_in_room(room_index: int) -> Dictionary:
	for hazard in hazards:
		if int(hazard.room) == room_index: return hazard
	return {}

func score() -> int:
	return roundi(oxygen * 2 + energy * 2 + hull * 3 + morale + resolved * 100 + int(supplies.science) * 30 + int(supplies.data) * 15)
