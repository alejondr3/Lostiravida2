extends Control

const StationModelScript = preload("res://scripts/station_model.gd")
const BG := Color("050817")
const INK := Color("eef4ff")
const CYAN := Color("58f4dc")
const AMBER := Color("ffd34e")
const RED := Color("ff4f6d")
const GREEN := Color("62e889")
const PURPLE := Color("b889ff")
const ROOM_COLORS := [Color("273765"), Color("17505b"), Color("3d2f62"), Color("19583d"), Color("60362f")]
const ROOM_RECTS := [Rect2(3, 66, 60, 76), Rect2(66, 66, 60, 76), Rect2(129, 66, 60, 76), Rect2(192, 66, 60, 76), Rect2(255, 66, 62, 76)]
const MENU_RECTS := [Rect2(92, 103, 136, 18), Rect2(92, 125, 136, 18)]
const DIFFICULTY_RECTS := [Rect2(11, 71, 94, 66), Rect2(113, 71, 94, 66), Rect2(215, 71, 94, 66)]

var model = StationModelScript.new()
var screen := "menu"
var paused := false
var menu_index := 0
var difficulty_index := 1
var difficulty_names := ["CADETE", "OFICIAL", "COMANDANTE"]
var clock := 0.0
var selected := 1
var dragging := false
var alert_text := "ESTACIÓN NOMINAL"
var alert_timer := 0.0
var flash := 0.0
var shake := 0.0
var cargo_active := false
var cargo_x := -20.0
var next_cargo := 22.0
var cargo_count := 0
var popups: Array[Dictionary] = []
var crew: Array[Dictionary] = []

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	create_crew()
	queue_redraw()

func create_crew() -> void:
	crew = [
		{"name":"ALEX", "role":"COMANDANTE", "x":33.0, "target":33.0, "color":AMBER, "room":0, "hunger":88.0, "thirst":90.0, "health":100.0, "fatigue":4.0, "resting":false},
		{"name":"TAYLOR", "role":"INGENIERÍA", "x":96.0, "target":96.0, "color":CYAN, "room":1, "hunger":82.0, "thirst":86.0, "health":100.0, "fatigue":8.0, "resting":false},
		{"name":"CASEY", "role":"CIENCIA", "x":159.0, "target":159.0, "color":PURPLE, "room":2, "hunger":86.0, "thirst":84.0, "health":100.0, "fatigue":5.0, "resting":false},
		{"name":"MORGAN", "role":"MEDICINA", "x":222.0, "target":222.0, "color":GREEN, "room":3, "hunger":80.0, "thirst":92.0, "health":100.0, "fatigue":10.0, "resting":false}
	]

func _process(delta: float) -> void:
	clock += delta
	update_popups(delta)
	if screen != "game" or paused or model.finished:
		queue_redraw(); return
	var spawned: Array[Dictionary] = model.update(delta)
	for event in spawned:
		alert_text = str(event.title); alert_timer = 4; flash = 0.8; shake = 0.45
	update_crew(delta)
	update_cargo(delta)
	alert_timer = maxf(0, alert_timer - delta); flash = maxf(0, flash - delta); shake = maxf(0, shake - delta)
	queue_redraw()

func update_crew(delta: float) -> void:
	for i in crew.size():
		var member := crew[i]
		if i == selected:
			var axis := Input.get_axis("move_left", "move_right")
			if absf(axis) > 0.01:
				member.x = clampf(float(member.x) + axis * 48.0 * delta, 8, 312); member.target = member.x
		else: member.x = move_toward(float(member.x), float(member.target), 34.0 * delta)
		member.room = room_at_x(float(member.x))
		update_member_needs(member, delta)
		var hazard := model.hazard_in_room(int(member.room))
		if not hazard.is_empty() and (i != selected or Input.is_key_pressed(KEY_E)):
			if model.repair(int(member.room), 19.0 * delta, str(member.role)):
				alert_text = "¡%s RESOLVIÓ LA EMERGENCIA!" % member.name; alert_timer = 3; add_popup("+SEGURIDAD", Vector2(member.x, 105), GREEN)
		elif hazard.is_empty() and not bool(member.resting):
			var efficiency := clampf(1.0 - float(member.fatigue) / 135.0, 0.3, 1.0)
			if model.work_room(int(member.room), delta, str(member.role), efficiency):
				alert_text = "%s: PRODUCCIÓN LISTA" % StationModelScript.ROOM_NAMES[int(member.room)]; alert_timer = 3

func update_member_needs(member: Dictionary, delta: float) -> void:
	member.hunger = maxf(0, float(member.hunger) - delta * 0.17 * model.pressure)
	member.thirst = maxf(0, float(member.thirst) - delta * 0.22 * model.pressure)
	if bool(member.resting):
		member.fatigue = maxf(0, float(member.fatigue) - delta * 3.0)
		if float(member.fatigue) <= 1: member.resting = false
	else: member.fatigue = minf(100, float(member.fatigue) + delta * 0.2 * model.pressure)
	if float(member.hunger) <= 0 or float(member.thirst) <= 0: member.health = maxf(0, float(member.health) - delta * 2.0)

func update_cargo(delta: float) -> void:
	if not cargo_active and model.elapsed >= next_cargo:
		cargo_active = true; cargo_x = -18; cargo_count += 1; alert_text = "CÁPSULA DE SUMINISTROS DETECTADA · HAZ CLIC"; alert_timer = 5
	if cargo_active:
		cargo_x += delta * (23.0 + model.pressure * 8.0)
		if cargo_x > 338:
			cargo_active = false; next_cargo = model.elapsed + 31.0 / model.event_speed; alert_text = "CÁPSULA PERDIDA"; alert_timer = 2

func update_popups(delta: float) -> void:
	for i in range(popups.size() - 1, -1, -1):
		popups[i].life = float(popups[i].life) - delta; popups[i].y = float(popups[i].y) - delta * 8
		if float(popups[i].life) <= 0: popups.remove_at(i)

func add_popup(value: String, at: Vector2, color: Color) -> void:
	popups.append({"text":value, "x":at.x, "y":at.y, "life":1.5, "color":color})

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		handle_key(event)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed: handle_click(event.position)
		elif dragging: finish_drag(event.position)
	if event is InputEventMouseMotion and dragging and screen == "game": crew[selected].x = clampf(event.position.x, 6, 314)
	queue_redraw()

func handle_key(event: InputEventKey) -> void:
	if screen == "menu":
		if event.keycode in [KEY_UP, KEY_W]: menu_index = posmod(menu_index - 1, 2)
		elif event.keycode in [KEY_DOWN, KEY_S]: menu_index = posmod(menu_index + 1, 2)
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			if menu_index == 0: screen = "difficulty"
			else: screen = "help"
	elif screen == "help":
		if event.keycode in [KEY_ESCAPE, KEY_ENTER, KEY_SPACE]: screen = "menu"
	elif screen == "difficulty":
		if event.keycode in [KEY_LEFT, KEY_A]: difficulty_index = posmod(difficulty_index - 1, 3)
		elif event.keycode in [KEY_RIGHT, KEY_D]: difficulty_index = posmod(difficulty_index + 1, 3)
		elif event.keycode in [KEY_ENTER, KEY_SPACE]: start_game(difficulty_names[difficulty_index])
		elif event.keycode == KEY_ESCAPE: screen = "menu"
	elif screen == "game":
		if event.keycode == KEY_ESCAPE or event.keycode == KEY_P: paused = not paused
		elif model.finished and event.keycode == KEY_R: screen = "difficulty"; model.reset()
		elif event.keycode >= KEY_1 and event.keycode <= KEY_4: selected = int(event.keycode - KEY_1)
		elif event.keycode == KEY_F: give_supply("food")
		elif event.keycode == KEY_G: give_supply("water")
		elif event.keycode == KEY_H: give_supply("medkit")
		elif event.keycode == KEY_Z: crew[selected].resting = not bool(crew[selected].resting)
		elif event.keycode == KEY_U: upgrade_selected_room()
		elif paused and event.keycode == KEY_M: screen = "menu"; paused = false

func handle_click(point: Vector2) -> void:
	if screen == "menu":
		for i in MENU_RECTS.size():
			if MENU_RECTS[i].has_point(point): menu_index = i; screen = "difficulty" if i == 0 else "help"
	elif screen == "difficulty":
		for i in DIFFICULTY_RECTS.size():
			if DIFFICULTY_RECTS[i].has_point(point): difficulty_index = i; start_game(difficulty_names[i])
	elif screen == "help": screen = "menu"
	elif screen == "game" and not paused and not model.finished:
		if cargo_active and Rect2(cargo_x - 8, 42, 20, 14).has_point(point): collect_cargo(); return
		var found := crew_at(point)
		if found >= 0: selected = found; dragging = true; return
		var room := room_at_point(point)
		if room >= 0: collect_room(room)

func finish_drag(point: Vector2) -> void:
	dragging = false
	var room := room_at_point(point)
	if room >= 0:
		crew[selected].target = ROOM_RECTS[room].get_center().x; crew[selected].resting = false
		alert_text = "%s ASIGNADO A %s" % [crew[selected].name, StationModelScript.ROOM_NAMES[room]]; alert_timer = 2

func start_game(mode: String) -> void:
	model.reset(); model.configure(mode); create_crew(); selected = 1; screen = "game"; paused = false; alert_text = "MISIÓN %s · PRODUCE Y SOBREVIVE" % mode; alert_timer = 4; cargo_active = false; next_cargo = 22; popups.clear()

func give_supply(kind: String) -> void:
	if not model.consume_supply(kind): alert_text = "RESERVA AGOTADA"; alert_timer = 2; return
	var member := crew[selected]
	if kind == "food": member.hunger = minf(100, float(member.hunger) + 40)
	elif kind == "water": member.thirst = minf(100, float(member.thirst) + 45)
	else: member.health = minf(100, float(member.health) + 50)
	add_popup("+" + kind.to_upper(), Vector2(member.x, 112), member.color)

func collect_room(room: int) -> void:
	var reward: Dictionary = model.collect_room(room)
	if reward.is_empty(): return
	var summary := ""
	for key in reward: summary += "+%s %s  " % [reward[key], str(key).to_upper()]
	alert_text = summary; alert_timer = 3; add_popup("¡RECOGIDO!", ROOM_RECTS[room].get_center(), AMBER)

func collect_cargo() -> void:
	cargo_active = false; next_cargo = model.elapsed + 30.0 / model.event_speed
	match cargo_count % 3:
		0: model.supplies.parts += 3; add_popup("+3 REPUESTOS", Vector2(cargo_x, 48), AMBER)
		1: model.supplies.food += 3; model.supplies.water += 2; add_popup("+SUMINISTROS", Vector2(cargo_x, 48), GREEN)
		2: model.supplies.medkit += 2; model.supplies.science += 2; add_popup("+CARGA CIENTÍFICA", Vector2(cargo_x, 48), PURPLE)
	alert_text = "CÁPSULA RECUPERADA"; alert_timer = 3

func upgrade_selected_room() -> void:
	var room := int(crew[selected].room)
	alert_text = "%s NIVEL %d" % [StationModelScript.ROOM_NAMES[room], model.upgrades[room]] if model.upgrade_room(room) else "FALTAN REPUESTOS / NIVEL MÁXIMO"
	alert_timer = 3

func room_at_x(value: float) -> int:
	for i in ROOM_RECTS.size():
		if value >= ROOM_RECTS[i].position.x and value <= ROOM_RECTS[i].end.x: return i
	return clampi(roundi((value - 3) / 63.0), 0, 4)

func room_at_point(point: Vector2) -> int:
	for i in ROOM_RECTS.size():
		if ROOM_RECTS[i].has_point(point): return i
	return -1

func crew_at(point: Vector2) -> int:
	for i in crew.size():
		if Rect2(float(crew[i].x) - 6, 111, 12, 26).has_point(point): return i
	return -1

func _draw() -> void:
	draw_rect(Rect2(0, 0, 320, 180), BG)
	draw_stars()
	match screen:
		"menu": draw_menu()
		"difficulty": draw_difficulty()
		"help": draw_help()
		"game": draw_game()

func draw_stars() -> void:
	for i in 34:
		var x := posmod(i * 47 - int(clock * (2 + i % 3)), 326) - 3; var y := posmod(i * 29, 177)
		draw_rect(Rect2(x, y, 1 + (1 if i % 7 == 0 else 0), 1), Color("7082b7"))

func draw_menu() -> void:
	draw_circle(Vector2(257, 42), 33, Color("263f7d")); draw_circle(Vector2(247, 35), 25, Color("4971bb"))
	var orbit := 24 + sin(clock * 1.7) * 3
	draw_line(Vector2(35, orbit), Vector2(83, orbit), CYAN, 2); draw_rect(Rect2(54, orbit - 5, 10, 10), Color("c7d2e6")); draw_rect(Rect2(39, orbit - 2, 15, 4), AMBER); draw_rect(Rect2(64, orbit - 2, 15, 4), AMBER)
	text("VENTANA DE", Vector2(24, 60), 12, CYAN); text("LANZAMIENTO", Vector2(22, 84), 23, AMBER); text("SUPERVIVENCIA ORBITAL · 8 BIT", Vector2(24, 95), 6, INK)
	for i in MENU_RECTS.size():
		var value := "INICIAR MISIÓN" if i == 0 else "CÓMO JUGAR"
		draw_button(MENU_RECTS[i], value, i == menu_index)
	text("↑↓ ELEGIR · ENTER CONFIRMAR", Vector2(96, 161), 6, Color("8898be"))

func draw_difficulty() -> void:
	text("SELECCIONA LA DIFICULTAD", Vector2(47, 35), 14, AMBER); text("LAS REGLAS CAMBIAN, NO SOLO LOS NÚMEROS", Vector2(64, 50), 6, CYAN)
	var descriptions := ["MÁS RESERVAS\nALERTAS LENTAS\nDAÑO REDUCIDO", "ECONOMÍA EQUILIBRADA\nRIESGO NORMAL\nEXPERIENCIA COMPLETA", "POCAS RESERVAS\nEVENTOS RÁPIDOS\nDAÑO EXTREMO"]
	for i in 3:
		var active := i == difficulty_index; draw_rect(DIFFICULTY_RECTS[i], Color("202d54") if active else Color("11182f")); draw_rect(DIFFICULTY_RECTS[i], AMBER if active else Color("40517e"), false, 2)
		text(difficulty_names[i], DIFFICULTY_RECTS[i].position + Vector2(8, 16), 9, AMBER if active else INK)
		var lines: PackedStringArray = descriptions[i].split("\n")
		for j in lines.size(): text(lines[j], DIFFICULTY_RECTS[i].position + Vector2(8, 32 + j * 9), 5, Color("b9c4e2"))
	text("← → ELEGIR · ENTER / CLIC PARA DESPEGAR · ESC VOLVER", Vector2(54, 158), 6, CYAN)

func draw_help() -> void:
	draw_rect(Rect2(24, 17, 272, 146), Color("ed0a1025")); draw_rect(Rect2(24, 17, 272, 146), CYAN, false, 2)
	text("CÓMO SOBREVIVIR", Vector2(88, 38), 14, AMBER)
	var lines := ["ARRASTRA ASTRONAUTAS ENTRE SALAS", "CADA SALA PRODUCE RECURSOS DISTINTOS", "CLIC EN EL ICONO AMARILLO PARA RECOGER", "1–4 SELECCIONA · A/D MUEVE · E REPARA", "F COMIDA · G AGUA · H BOTIQUÍN", "Z DESCANSO · U MEJORA · P PAUSA", "CAPTURA LAS CÁPSULAS QUE CRUZAN EL ESPACIO", "LAS EMERGENCIAS DETIENEN LA PRODUCCIÓN"]
	for i in lines.size(): text("• " + lines[i], Vector2(42, 59 + i * 11), 6, INK)
	text("CLIC / ENTER PARA VOLVER", Vector2(94, 153), 6, CYAN)

func draw_game() -> void:
	var offset := Vector2.ZERO
	if shake > 0: offset = Vector2(sin(clock * 70) * 2, cos(clock * 55))
	draw_set_transform(offset); draw_station(); draw_crew(); draw_hazards(); draw_cargo(); draw_set_transform(Vector2.ZERO)
	draw_game_hud()
	for popup in popups: text(str(popup.text), Vector2(popup.x, popup.y), 6, popup.color)
	if paused: draw_pause()
	if model.finished: draw_result()
	if flash > 0 and fmod(flash, 0.14) > 0.07: draw_rect(Rect2(0, 0, 320, 180), Color(1, 0.1, 0.15, 0.12))

func draw_station() -> void:
	draw_rect(Rect2(1, 63, 318, 83), Color("7b88aa")); draw_rect(Rect2(3, 65, 314, 79), Color("10182e"))
	for i in ROOM_RECTS.size():
		var rect: Rect2 = ROOM_RECTS[i]; var hazard := model.hazard_in_room(i)
		draw_rect(rect, ROOM_COLORS[i]); draw_rect(rect, RED if not hazard.is_empty() else Color("6274a5"), false, 1)
		text(StationModelScript.ROOM_NAMES[i], rect.position + Vector2(3, 8), 5, AMBER); text("L%d" % model.upgrades[i], rect.position + Vector2(49, 8), 4, CYAN)
		var bar := Rect2(rect.position + Vector2(3, 12), Vector2(54, 3)); draw_rect(bar, Color("0b1022")); draw_rect(Rect2(bar.position, Vector2(54 * float(model.production[i]) / 100.0, 3)), GREEN)
		if int(model.ready[i]) > 0:
			draw_rect(Rect2(rect.end.x - 10, rect.position.y + 17 + sin(clock * 6) * 2, 7, 7), AMBER); text(str(model.ready[i]), rect.end - Vector2(8, 55), 5, BG)
		draw_equipment(i, rect)
		if i < 4: draw_rect(Rect2(rect.end.x - 1, 109, 4, 21), Color("08101f")); draw_rect(Rect2(rect.end.x - 1, 109, 4, 21), CYAN, false, 1)
	draw_rect(Rect2(1, 144, 318, 4), Color("30466f")); draw_line(Vector2(4, 148), Vector2(316, 148), CYAN, 1)

func draw_equipment(index: int, rect: Rect2) -> void:
	var p := rect.position
	match index:
		0:
			for j in 3: draw_rect(Rect2(p + Vector2(5 + j * 18, 25), Vector2(13, 9)), Color("081127")); draw_rect(Rect2(p + Vector2(7 + j * 18, 27), Vector2(9, 3)), CYAN)
		1:
			draw_circle(p + Vector2(30, 38), 14, Color("0b1727")); draw_circle(p + Vector2(30, 38), 11, CYAN, false, 2); text("O2", p + Vector2(24, 41), 7, INK)
		2:
			draw_rect(Rect2(p + Vector2(7, 25), Vector2(46, 22)), Color("161229")); for j in 5: draw_rect(Rect2(p + Vector2(11 + j * 9, 34), Vector2(3, 3)), PURPLE)
		3:
			for j in 3: draw_rect(Rect2(p + Vector2(4 + j * 19, 26), Vector2(17, 23)), Color("0b281d")); draw_rect(Rect2(p + Vector2(9 + j * 19, 28), Vector2(7, 7)), GREEN)
		4:
			draw_rect(Rect2(p + Vector2(8, 26), Vector2(47, 18)), Color("24171a")); for j in 4: draw_rect(Rect2(p + Vector2(12 + j * 10, 30), Vector2(5, 10)), Color("e67d50"))

func draw_crew() -> void:
	for i in crew.size():
		var m := crew[i]; var x := float(m.x); var bob := sin(clock * 10 + i) if absf(float(m.x) - float(m.target)) > 1 else 0.0; var y := 132.0 + bob
		if i == selected: draw_rect(Rect2(x - 5, y + 7, 10, 2), CYAN)
		if bool(m.resting): text("z", Vector2(x + 4, y - 14), 5, CYAN)
		draw_rect(Rect2(x - 3, y - 13, 6, 5), Color("e9ebdd")); draw_rect(Rect2(x - 2, y - 12, 4, 2), m.color); draw_rect(Rect2(x - 4, y - 8, 8, 8), Color("d4d8d1")); draw_rect(Rect2(x - 3, y - 6, 6, 3), m.color); draw_rect(Rect2(x - 3, y, 2, 5), Color("ecebd9")); draw_rect(Rect2(x + 1, y, 2, 5), Color("ecebd9")); text(m.name, Vector2(x - 7, y + 11), 4, m.color)

func draw_hazards() -> void:
	for hazard in model.hazards:
		var room := int(hazard.room); var c: Vector2 = ROOM_RECTS[room].get_center(); var pulse := sin(clock * 16)
		match str(hazard.type):
			"fire":
				for i in 4: draw_colored_polygon(PackedVector2Array([c + Vector2(-15 + i * 9, 22), c + Vector2(-11 + i * 9, 10 + pulse * 2), c + Vector2(-7 + i * 9, 22)]), RED if i % 2 == 0 else AMBER)
			"leak": for i in 4: draw_line(c + Vector2(-14, -2 + i * 5), c + Vector2(15 + pulse * 3, -2 + i * 5), CYAN, 1)
			"power": draw_polyline(PackedVector2Array([c + Vector2(-8,-12), c + Vector2(3,-2), c + Vector2(-2,2), c + Vector2(8,13)]), AMBER, 2)
			"debris": draw_circle(c, 10 + pulse, RED, false, 2); draw_line(c - Vector2(11,11), c + Vector2(11,11), RED, 1)
		var bar := Rect2(c.x - 18, ROOM_RECTS[room].position.y + 17, 36, 3); draw_rect(bar, Color("250913")); draw_rect(Rect2(bar.position, Vector2(36 * float(hazard.progress) / 100.0, 3)), GREEN)

func draw_cargo() -> void:
	if not cargo_active: return
	var y := 47.0 + sin(clock * 5) * 2; draw_rect(Rect2(cargo_x - 6, y - 4, 12, 8), Color("d5d9d3")); draw_rect(Rect2(cargo_x - 4, y - 2, 8, 4), AMBER); draw_line(Vector2(cargo_x - 12, y), Vector2(cargo_x - 6, y), CYAN, 2); text("!", Vector2(cargo_x - 2, y + 3), 6, BG)

func draw_game_hud() -> void:
	draw_rect(Rect2(0, 0, 320, 31), Color("eb070d20")); text("VENTANA", Vector2(5, 9), 8, AMBER); text("%s · %02d:%02d" % [model.difficulty, int(model.elapsed) / 60, int(model.elapsed) % 60], Vector2(5, 19), 5, CYAN)
	draw_meter(Vector2(69, 4), "O2", model.oxygen, CYAN); draw_meter(Vector2(131, 4), "ENER", model.energy, AMBER); draw_meter(Vector2(193, 4), "CASCO", model.hull, GREEN); draw_meter(Vector2(255, 4), "MORAL", model.morale, PURPLE)
	var warning := RED if alert_timer > 0 or not model.hazards.is_empty() else GREEN; draw_rect(Rect2(3, 34, 314, 12), Color("e00a1022")); draw_rect(Rect2(3, 34, 314, 12), warning, false, 1); text("! " + alert_text, Vector2(7, 42), 6, warning)
	text("F%02d A%02d B%02d P%02d C%02d D%02d" % [model.supplies.food, model.supplies.water, model.supplies.medkit, model.supplies.parts, model.supplies.science, model.supplies.data], Vector2(205, 56), 5, INK)
	var m := crew[selected]; draw_rect(Rect2(2, 151, 316, 27), Color("e00a1022")); text("%s/%s  ♥%03d F%03d A%03d Z%03d" % [m.name, m.role, m.health, m.hunger, m.thirst, m.fatigue], Vector2(5, 160), 5, m.color); text("F COMIDA · G AGUA · H CURA · Z DESCANSO · U MEJORA · P PAUSA", Vector2(5, 170), 5, INK); text("ALERTAS %d/5" % model.resolved, Vector2(265, 160), 5, GREEN)

func draw_meter(at: Vector2, name: String, value: float, color: Color) -> void:
	text(name, at, 4, INK); draw_rect(Rect2(at + Vector2(0, 7), Vector2(55, 4)), Color("1f1022")); draw_rect(Rect2(at + Vector2(0, 7), Vector2(55 * value / 100.0, 4)), color); text("%03d" % value, at + Vector2(39, 4), 4, color)

func draw_button(rect: Rect2, value: String, active: bool) -> void:
	draw_rect(rect, Color("21315b") if active else Color("11182f")); draw_rect(rect, AMBER if active else Color("4a5b87"), false, 2 if active else 1); text(("> " if active else "  ") + value, rect.position + Vector2(18, 12), 7, AMBER if active else INK)

func draw_pause() -> void:
	draw_rect(Rect2(65, 46, 190, 90), Color("f0070c1f")); draw_rect(Rect2(65, 46, 190, 90), CYAN, false, 2); text("PAUSA", Vector2(126, 72), 18, AMBER); text("P / ESC · CONTINUAR", Vector2(101, 96), 7, INK); text("M · MENÚ PRINCIPAL", Vector2(103, 112), 7, CYAN)

func draw_result() -> void:
	draw_rect(Rect2(48, 48, 224, 88), Color("f0070c1f")); draw_rect(Rect2(48, 48, 224, 88), GREEN if model.won else RED, false, 2); text("ESTACIÓN ESTABILIZADA" if model.won else "MISIÓN PERDIDA", Vector2(77, 75), 13, GREEN if model.won else RED); text("PUNTOS %04d · ALERTAS %d/5" % [model.score(), model.resolved], Vector2(92, 96), 7, INK); text("R · ELEGIR DIFICULTAD", Vector2(100, 119), 6, AMBER)

func text(value: String, at: Vector2, size: int, color: Color) -> void:
	draw_string(ThemeDB.fallback_font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
