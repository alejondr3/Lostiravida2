class_name StationModel
extends RefCounted

const ROOM_NAMES := ["CONTROL", "SOPORTE VITAL", "LABORATORIO", "HIDROPONÍA", "TALLER"]
const EVENT_PLAN := [
	{"at":5.0, "type":"fire", "room":3, "title":"INCENDIO EN HIDROPONÍA"},
	{"at":27.0, "type":"leak", "room":1, "title":"FUGA DE OXÍGENO"},
	{"at":52.0, "type":"power", "room":4, "title":"FALLO ELÉCTRICO"},
	{"at":72.0, "type":"debris", "room":2, "title":"IMPACTO DE BASURA ESPACIAL"}
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

func reset() -> void:
	elapsed = 0.0; oxygen = 100.0; energy = 100.0; hull = 100.0; morale = 100.0
	resolved = 0; next_event = 0; hazards.clear(); finished = false; won = false

func update(delta: float) -> Array[Dictionary]:
	if finished: return []
	elapsed += delta
	var spawned: Array[Dictionary] = []
	while next_event < EVENT_PLAN.size() and elapsed >= float(EVENT_PLAN[next_event].at):
		var event: Dictionary = EVENT_PLAN[next_event].duplicate(true)
		event["severity"] = 1.0; event["progress"] = 0.0
		hazards.append(event); spawned.append(event); next_event += 1
	for hazard in hazards:
		var damage := float(hazard.severity) * delta
		match str(hazard.type):
			"fire": energy = maxf(0, energy - damage * 1.15); morale = maxf(0, morale - damage * 0.35)
			"leak": oxygen = maxf(0, oxygen - damage * 1.35)
			"power": energy = maxf(0, energy - damage * 1.55)
			"debris": hull = maxf(0, hull - damage * 1.05); oxygen = maxf(0, oxygen - damage * 0.32)
	if oxygen <= 0 or energy <= 0 or hull <= 0:
		finished = true; won = false
	elif elapsed >= 90.0 and hazards.is_empty():
		finished = true; won = true
	return spawned

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
	return roundi(oxygen * 2 + energy * 2 + hull * 3 + morale + resolved * 100)
