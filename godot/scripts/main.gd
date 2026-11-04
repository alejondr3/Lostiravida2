extends Control

const StationModelScript = preload("res://scripts/station_model.gd")
const BG := Color("050817")
const INK := Color("e9f2ff")
const CYAN := Color("6ff5e7")
const AMBER := Color("ffd15c")
const RED := Color("ff5577")
const GREEN := Color("65e891")
const ROOM_COLORS := [Color("243466"), Color("174c5c"), Color("3b2f61"), Color("17533f"), Color("56352f")]
const ROOM_RECTS := [
	Rect2(24, 178, 172, 248), Rect2(208, 178, 172, 248), Rect2(392, 178, 172, 248),
	Rect2(576, 178, 172, 248), Rect2(760, 178, 176, 248)
]

var model = StationModelScript.new()
var crew: Array[Dictionary] = [
	{"name":"ALEX", "role":"COMANDANTE", "x":104.0, "target":104.0, "color":Color("ffd15c"), "room":0, "hunger":90.0, "thirst":90.0, "health":100.0, "fatigue":0.0, "resting":false},
	{"name":"TAYLOR", "role":"INGENIERÍA", "x":288.0, "target":288.0, "color":Color("6ff5e7"), "room":1, "hunger":82.0, "thirst":88.0, "health":100.0, "fatigue":8.0, "resting":false},
	{"name":"CASEY", "role":"CIENCIA", "x":472.0, "target":472.0, "color":Color("bd91ff"), "room":2, "hunger":86.0, "thirst":84.0, "health":100.0, "fatigue":4.0, "resting":false},
	{"name":"MORGAN", "role":"MEDICINA", "x":656.0, "target":656.0, "color":Color("65e891"), "room":3, "hunger":78.0, "thirst":92.0, "health":100.0, "fatigue":12.0, "resting":false}
]
var selected := 1
var dragging := false
var running := false
var countdown := 3.0
var alert_text := "ENTRENAMIENTO DE EMERGENCIA"
var alert_timer := 0.0
var flash := 0.0
var shake := 0.0
var repaired_text := ""

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	set_process(true)
	queue_redraw()

func _process(delta: float) -> void:
	if not running:
		countdown -= delta
		if countdown <= 0:
			running = true; alert_text = "SIMULACIÓN ACTIVA · VIGILA LA ESTACIÓN"; alert_timer = 2.0
		queue_redraw(); return
	if model.finished:
		queue_redraw(); return
	var spawned: Array[Dictionary] = model.update(delta)
	for event in spawned:
		alert_text = str(event.title) + " · ASIGNA UNA TRIPULACIÓN"; alert_timer = 4.0; flash = 1.0; shake = 0.45
	update_crew(delta)
	update_needs(delta)
	if alert_timer > 0: alert_timer -= delta
	if flash > 0: flash -= delta
	if shake > 0: shake -= delta
	queue_redraw()

func update_crew(delta: float) -> void:
	for i in crew.size():
		var member := crew[i]
		if i == selected:
			var axis := Input.get_axis("move_left", "move_right")
			if absf(axis) > 0.01:
				member.x = clampf(float(member.x) + axis * 116.0 * delta, 38, 922); member.target = member.x
		else:
			member.x = move_toward(float(member.x), float(member.target), 82.0 * delta)
		member.room = room_at_x(float(member.x))
		var hazard := model.hazard_in_room(int(member.room))
		var actively_repairing := not hazard.is_empty() and (i != selected or Input.is_key_pressed(KEY_E))
		if actively_repairing:
			var complete := model.repair(int(member.room), 18.0 * delta, str(member.role))
			if complete:
				repaired_text = "AVERÍA RESUELTA POR " + str(member.name); alert_text = repaired_text; alert_timer = 3.0
		elif hazard.is_empty() and not bool(member.resting):
			var efficiency := clampf(1.0 - float(member.fatigue) / 140.0, 0.35, 1.0)
			if model.work_room(int(member.room), delta, str(member.role), efficiency):
				alert_text = "%s TERMINÓ PRODUCCIÓN EN %s · HAZ CLIC PARA RECOGER" % [member.name, StationModelScript.ROOM_NAMES[int(member.room)]]; alert_timer = 4

func update_needs(delta: float) -> void:
	for member in crew:
		member.hunger = maxf(0, float(member.hunger) - delta * 0.15)
		member.thirst = maxf(0, float(member.thirst) - delta * 0.2)
		if bool(member.resting):
			member.fatigue = maxf(0, float(member.fatigue) - delta * 2.7)
			if float(member.fatigue) <= 2: member.resting = false
		else: member.fatigue = minf(100, float(member.fatigue) + delta * 0.18)
		if float(member.hunger) <= 0 or float(member.thirst) <= 0: member.health = maxf(0, float(member.health) - delta * 1.8)
		if float(member.health) <= 0: model.morale = maxf(0, model.morale - delta * 2.0)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		if event.keycode >= KEY_1 and event.keycode <= KEY_4:
			selected = int(event.keycode - KEY_1); alert_text = "CONTROL DIRECTO · " + str(crew[selected].name); alert_timer = 2
		elif event.keycode == KEY_R and model.finished: restart()
		elif event.keycode == KEY_F: give_supply("food")
		elif event.keycode == KEY_G: give_supply("water")
		elif event.keycode == KEY_H: give_supply("medkit")
		elif event.keycode == KEY_Z:
			crew[selected].resting = not bool(crew[selected].resting); alert_text = str(crew[selected].name) + (" DESCANSA" if crew[selected].resting else " VUELVE AL TRABAJO")
		elif event.keycode == KEY_U: try_upgrade()
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			var found := crew_at(event.position)
			if found >= 0: selected = found; dragging = true
			else:
				var clicked_room := room_at_point(event.position)
				if clicked_room >= 0: collect_room(clicked_room)
		elif event.button_index == MOUSE_BUTTON_LEFT and not event.pressed and dragging:
			dragging = false
			var room := room_at_point(event.position)
			if room >= 0:
				crew[selected].target = ROOM_RECTS[room].get_center().x
				alert_text = "%s → %s" % [crew[selected].name, StationModelScript.ROOM_NAMES[room]]; alert_timer = 2
	if event is InputEventMouseMotion and dragging:
		crew[selected].x = clampf(event.position.x, 38, 922)
	queue_redraw()

func give_supply(kind: String) -> void:
	var member := crew[selected]
	if not model.consume_supply(kind): alert_text = "NO QUEDA " + kind.to_upper(); alert_timer = 2; return
	if kind == "food": member.hunger = minf(100, float(member.hunger) + 38)
	elif kind == "water": member.thirst = minf(100, float(member.thirst) + 42)
	elif kind == "medkit": member.health = minf(100, float(member.health) + 45)
	alert_text = "%s RECIBE %s" % [member.name, kind.to_upper()]; alert_timer = 2

func collect_room(room_index: int) -> void:
	var reward: Dictionary = model.collect_room(room_index)
	if reward.is_empty(): return
	var parts: Array[String] = []
	for key in reward: parts.append("%s +%s" % [str(key).to_upper(), reward[key]])
	alert_text = "RECOLECTADO · " + " · ".join(parts); alert_timer = 3

func try_upgrade() -> void:
	var room := int(crew[selected].room)
	if model.upgrade_room(room): alert_text = "%s MEJORADO A NIVEL %d" % [StationModelScript.ROOM_NAMES[room], model.upgrades[room]]
	else: alert_text = "MEJORA BLOQUEADA · NECESITAS REPUESTOS O YA ES NIVEL 3"
	alert_timer = 3

func room_at_x(value: float) -> int:
	for i in ROOM_RECTS.size():
		if value >= ROOM_RECTS[i].position.x and value <= ROOM_RECTS[i].end.x: return i
	return clampi(roundi((value - 24.0) / 184.0), 0, 4)

func room_at_point(point: Vector2) -> int:
	for i in ROOM_RECTS.size():
		if ROOM_RECTS[i].has_point(point): return i
	return -1

func crew_at(point: Vector2) -> int:
	for i in crew.size():
		if Rect2(float(crew[i].x) - 14, 348, 28, 62).has_point(point): return i
	return -1

func restart() -> void:
	model.reset(); running = false; countdown = 3; alert_text = "ENTRENAMIENTO DE EMERGENCIA"; selected = 1
	for i in crew.size():
		crew[i].x = 104.0 + i * 184.0; crew[i].target = crew[i].x; crew[i].room = i
		crew[i].hunger = 85.0; crew[i].thirst = 88.0; crew[i].health = 100.0; crew[i].fatigue = 5.0; crew[i].resting = false

func _draw() -> void:
	draw_rect(Rect2(0, 0, 960, 540), BG)
	draw_space()
	var offset := Vector2.ZERO
	if shake > 0: offset = Vector2(sin(Time.get_ticks_msec() * 0.12) * 3, cos(Time.get_ticks_msec() * 0.09) * 2)
	draw_set_transform(offset)
	draw_station()
	draw_crew()
	draw_hazards()
	draw_set_transform(Vector2.ZERO)
	draw_hud()
	if not running: draw_countdown()
	if model.finished: draw_result()
	if flash > 0 and fmod(flash, 0.18) > 0.09: draw_rect(Rect2(0, 0, 960, 540), Color(1, 0.12, 0.16, 0.12))

func draw_space() -> void:
	for x in range(11, 960, 53):
		var y := 72 + posmod(x * 29, 78); draw_rect(Rect2(x, y, 2, 2), Color("8497d5"))
	draw_circle(Vector2(848, 108), 44, Color("304c8c")); draw_circle(Vector2(838, 98), 35, Color("5074bd"))

func draw_station() -> void:
	draw_rect(Rect2(12, 164, 936, 278), Color("8391b4")); draw_rect(Rect2(18, 170, 924, 266), Color("141d38"))
	for i in ROOM_RECTS.size():
		var rect: Rect2 = ROOM_RECTS[i]; var hazard := model.hazard_in_room(i)
		draw_rect(rect, ROOM_COLORS[i]); draw_rect(rect, RED if not hazard.is_empty() else Color("6579ad"), false, 3)
		draw_rect(Rect2(rect.position + Vector2(0, 35), Vector2(rect.size.x, 3)), Color("91a5d2"))
		text(str(StationModelScript.ROOM_NAMES[i]), rect.position + Vector2(9, 24), 13, AMBER)
		text("NV.%d" % model.upgrades[i], rect.position + Vector2(rect.size.x - 42, 24), 10, CYAN)
		var production_bar := Rect2(rect.position + Vector2(8, 42), Vector2(rect.size.x - 16, 7))
		draw_rect(production_bar, Color("180b1328")); draw_rect(Rect2(production_bar.position, Vector2(production_bar.size.x * float(model.production[i]) / 100.0, 7)), GREEN)
		if int(model.ready[i]) > 0:
			draw_circle(rect.position + Vector2(rect.size.x - 18, 61), 11, AMBER); text(str(model.ready[i]), rect.position + Vector2(rect.size.x - 22, 66), 12, BG)
		draw_room_equipment(i, rect)
		if i < ROOM_RECTS.size() - 1:
			draw_rect(Rect2(rect.end.x - 5, 320, 14, 76), Color("0a1024")); draw_rect(Rect2(rect.end.x - 5, 320, 14, 76), CYAN, false, 2)
	draw_rect(Rect2(8, 438, 944, 12), Color("283b68")); draw_rect(Rect2(20, 450, 920, 4), CYAN)

func draw_room_equipment(index: int, rect: Rect2) -> void:
	var p := rect.position
	match index:
		0:
			for j in 3: draw_rect(Rect2(p + Vector2(16 + j * 48, 66), Vector2(38, 28)), Color("081127")); draw_rect(Rect2(p + Vector2(20 + j * 48, 70), Vector2(28, 12)), CYAN)
		1:
			draw_circle(p + Vector2(86, 105), 44, Color("0a1a2a")); draw_circle(p + Vector2(86, 105), 37, Color("3eb7c5"), false, 5); text("O₂", p + Vector2(73, 112), 20, INK)
		2:
			draw_rect(Rect2(p + Vector2(20, 67), Vector2(132, 72)), Color("131129")); for j in 5: draw_circle(p + Vector2(35 + j * 25, 102), 6, Color("b789ff"))
		3:
			for j in 3: draw_rect(Rect2(p + Vector2(14 + j * 51, 72), Vector2(42, 72)), Color("0b271f")); draw_circle(p + Vector2(35 + j * 51, 84), 12, GREEN)
		4:
			draw_rect(Rect2(p + Vector2(22, 72), Vector2(128, 55)), Color("231b20")); for j in 4: draw_rect(Rect2(p + Vector2(30 + j * 30, 82), Vector2(14, 32)), Color("d27a54"))

func draw_crew() -> void:
	for i in crew.size():
		var member := crew[i]; var x := float(member.x); var y := 398.0
		if i == selected: draw_circle(Vector2(x, y + 17), 19, CYAN, false, 2)
		if bool(member.resting): text("Zz", Vector2(x + 10, y - 40), 13, CYAN)
		# Mochila, traje, visor, brazos y piernas en bloques de píxel.
		draw_rect(Rect2(x - 11, y - 34, 22, 15), Color("e7eadf")); draw_rect(Rect2(x - 8, y - 31, 16, 7), member.color)
		draw_rect(Rect2(x - 12, y - 19, 24, 22), Color("d6d9d1")); draw_rect(Rect2(x - 8, y - 15, 16, 7), member.color)
		draw_rect(Rect2(x - 15, y - 16, 5, 17), Color("d6d9d1")); draw_rect(Rect2(x + 10, y - 16, 5, 17), Color("d6d9d1"))
		draw_rect(Rect2(x - 10, y + 3, 8, 12), Color("e7eadf")); draw_rect(Rect2(x + 2, y + 3, 8, 12), Color("e7eadf"))
		text(str(member.name), Vector2(x - 24, y + 31), 11, member.color)

func draw_hazards() -> void:
	for hazard in model.hazards:
		var room: int = int(hazard.room)
		var center: Vector2 = ROOM_RECTS[room].get_center()
		var pulse: float = sin(Time.get_ticks_msec() * 0.018)
		match str(hazard.type):
			"fire":
				for i in 5: draw_colored_polygon(PackedVector2Array([center + Vector2(-36 + i * 17, 48), center + Vector2(-27 + i * 17, 18 + pulse * 5), center + Vector2(-18 + i * 17, 48)]), RED if i % 2 == 0 else AMBER)
			"leak":
				for i in 6: draw_line(center + Vector2(-35, -10 + i * 8), center + Vector2(35 + pulse * 8, -10 + i * 8), CYAN, 2)
			"power":
				draw_polyline(PackedVector2Array([center + Vector2(-25,-35), center + Vector2(8,-5), center + Vector2(-8,3), center + Vector2(25,35)]), AMBER, 5)
			"debris":
				draw_circle(center, 28 + pulse * 3, RED, false, 5); draw_line(center - Vector2(35,35), center + Vector2(35,35), RED, 3); draw_line(center + Vector2(35,-35), center - Vector2(35,-35), RED, 3)
		var bar := Rect2(center.x - 55, ROOM_RECTS[room].position.y + 45, 110, 8)
		draw_rect(bar, Color("220914")); draw_rect(Rect2(bar.position, Vector2(bar.size.x * float(hazard.progress) / 100.0, 8)), GREEN)

func draw_hud() -> void:
	draw_rect(Rect2(0, 0, 960, 66), Color("e6081024")); draw_line(Vector2(0, 65), Vector2(960, 65), CYAN, 2)
	text("VENTANA DE LANZAMIENTO", Vector2(18, 27), 20, AMBER); text("ENTRENADOR ORBITAL · TIEMPO %02d:%02d" % [int(model.elapsed) / 60, int(model.elapsed) % 60], Vector2(18, 51), 12, CYAN)
	draw_meter(Vector2(360, 13), "O₂", model.oxygen, CYAN); draw_meter(Vector2(508, 13), "ENERGÍA", model.energy, AMBER); draw_meter(Vector2(656, 13), "CASCO", model.hull, GREEN); draw_meter(Vector2(804, 13), "MORAL", model.morale, Color("c59aff"))
	var warning_color := RED if alert_timer > 0 or not model.hazards.is_empty() else GREEN
	draw_rect(Rect2(12, 78, 936, 48), Color("db0b1022")); draw_rect(Rect2(12, 78, 936, 48), warning_color, false, 2)
	text("⚠ " + alert_text, Vector2(26, 107), 17, warning_color)
	text("INVENTARIO", Vector2(18, 148), 12, AMBER)
	text("COMIDA %02d   AGUA %02d   BOTIQUÍN %02d   REPUESTOS %02d   CIENCIA %02d   DATOS %02d" % [model.supplies.food, model.supplies.water, model.supplies.medkit, model.supplies.parts, model.supplies.science, model.supplies.data], Vector2(126, 148), 13, INK)
	text("CLIC EN PRODUCCIÓN LISTA: RECOGER · ARRASTRA: ASIGNAR · 1–4: CONTROL · A/D: MOVER · E: REPARAR · U: MEJORAR", Vector2(18, 466), 11, INK)
	var member := crew[selected]
	text("%s · %s   SALUD %03d   COMIDA %03d   AGUA %03d   FATIGA %03d   [F] RACIÓN [G] AGUA [H] BOTIQUÍN [Z] DESCANSO" % [member.name, member.role, member.health, member.hunger, member.thirst, member.fatigue], Vector2(18, 490), 11, member.color)
	text("OBJETIVO: MANTÉN VIVA LA ESTACIÓN 3 MINUTOS · PRODUCE, REPARTE Y SOBREVIVE", Vector2(18, 518), 13, AMBER)
	text("ALERTAS %d/5" % model.resolved, Vector2(842, 518), 11, GREEN)

func draw_meter(at: Vector2, name: String, value: float, color: Color) -> void:
	text(name, at, 11, INK); draw_rect(Rect2(at + Vector2(0, 8), Vector2(124, 9)), Color("221329")); draw_rect(Rect2(at + Vector2(0, 8), Vector2(124 * value / 100.0, 9)), color); text("%03d" % value, at + Vector2(93, 0), 10, color)

func draw_countdown() -> void:
	draw_rect(Rect2(0, 0, 960, 540), Color(0, 0, 0, 0.72)); text("SIMULACIÓN DE EMERGENCIA", Vector2(306, 226), 25, AMBER); text(str(maxi(1, ceili(countdown))), Vector2(457, 294), 54, CYAN)

func draw_result() -> void:
	draw_rect(Rect2(178, 144, 604, 252), Color("f0070c1f")); draw_rect(Rect2(178, 144, 604, 252), GREEN if model.won else RED, false, 4)
	text("ESTACIÓN ESTABILIZADA" if model.won else "MISIÓN PERDIDA", Vector2(285, 205), 30, GREEN if model.won else RED)
	text("PUNTUACIÓN %04d · EMERGENCIAS %d/5" % [model.score(), model.resolved], Vector2(300, 255), 18, INK)
	text("PULSA R PARA REPETIR EL ENTRENAMIENTO", Vector2(285, 332), 15, AMBER)

func text(value: String, at: Vector2, size: int, color: Color) -> void:
	draw_string(ThemeDB.fallback_font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
