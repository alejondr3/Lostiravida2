extends Control

const MissionModelScript = preload("res://scripts/mission_model.gd")

const BG := Color("070c1f")
const PANEL := Color("111a35")
const PANEL_2 := Color("18254a")
const CYAN := Color("72e7e1")
const AMBER := Color("ffd15c")
const RED := Color("ff667f")
const GREEN := Color("72e69c")
const MUTED := Color("8795bd")

var model = MissionModelScript.new()
var selected_module := ""
var checklist := [false, false, false, false]
var return_step := 0
var body: VBoxContainer
var status_label: Label
var alert_label: Label
var event_data: Dictionary = {}

func _ready() -> void:
	build_theme()
	build_shell()
	show_design()

func build_theme() -> void:
	var ui_theme := Theme.new()
	var mono := SystemFont.new()
	mono.font_names = PackedStringArray(["Consolas", "Courier New", "monospace"])
	ui_theme.default_font = mono
	ui_theme.default_font_size = 14
	var normal := StyleBoxFlat.new()
	normal.bg_color = PANEL_2; normal.border_color = Color("41558c"); normal.set_border_width_all(2); normal.set_corner_radius_all(0)
	normal.content_margin_left = 10; normal.content_margin_right = 10; normal.content_margin_top = 7; normal.content_margin_bottom = 7
	var hover := normal.duplicate(); hover.bg_color = Color("263765"); hover.border_color = CYAN
	var pressed := normal.duplicate(); pressed.bg_color = Color("0b6673"); pressed.border_color = AMBER
	ui_theme.set_stylebox("normal", "Button", normal); ui_theme.set_stylebox("hover", "Button", hover); ui_theme.set_stylebox("pressed", "Button", pressed)
	ui_theme.set_color("font_color", "Button", Color("eaf1ff")); ui_theme.set_color("font_pressed_color", "Button", AMBER)
	theme = ui_theme

func build_shell() -> void:
	var background := ColorRect.new(); background.color = BG; background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); add_child(background)
	var root := VBoxContainer.new(); root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 12); root.add_theme_constant_override("separation", 8); add_child(root)
	var header := HBoxContainer.new(); root.add_child(header)
	var title := make_label("VENTANA DE LANZAMIENTO", 24, AMBER); title.size_flags_horizontal = Control.SIZE_EXPAND_FILL; header.add_child(title)
	status_label = make_label("", 14, CYAN); header.add_child(status_label)
	alert_label = make_label("CONTROL DE MISIÓN · EN LÍNEA", 12, GREEN); alert_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; alert_label.custom_minimum_size.x = 280; header.add_child(alert_label)
	var line := ColorRect.new(); line.color = CYAN; line.custom_minimum_size.y = 2; root.add_child(line)
	body = VBoxContainer.new(); body.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_theme_constant_override("separation", 8); root.add_child(body)

func clear_body() -> void:
	for child in body.get_children(): child.queue_free()

func make_label(value: String, size := 14, color := Color.WHITE) -> Label:
	var node := Label.new(); node.text = value; node.add_theme_font_size_override("font_size", size); node.add_theme_color_override("font_color", color); return node

func heading(value: String) -> Label: return make_label(value, 18, AMBER)

func make_button(value: String, action: Callable, width := 0) -> Button:
	var node := Button.new(); node.text = value; node.custom_minimum_size = Vector2(width, 36); node.pressed.connect(action); return node

func make_panel(width := 0) -> VBoxContainer:
	var box := VBoxContainer.new(); box.custom_minimum_size.x = width; box.add_theme_constant_override("separation", 6)
	var style := StyleBoxFlat.new(); style.bg_color = PANEL; style.border_color = Color("344770"); style.set_border_width_all(2); style.content_margin_left = 10; style.content_margin_right = 10; style.content_margin_top = 8; style.content_margin_bottom = 8
	box.add_theme_stylebox_override("panel", style)
	return box

func phase(number: int, name: String) -> void: status_label.text = "FASE %d/6 · %s" % [number, name]

func resource_text() -> String:
	return "MASA %s/%s KG   PRESUPUESTO %s/%s   ENERGÍA NETA %+d" % [model.total_mass(), MissionModelScript.MASS_LIMIT, model.total_cost(), MissionModelScript.BUDGET_LIMIT, model.net_power()]

func show_design() -> void:
	phase(1, "DISEÑO"); clear_body(); alert_label.text = "ARMA LA NAVE · TODO TIENE UN COSTO"; body.add_child(make_label(resource_text(), 15, CYAN))
	var columns := HBoxContainer.new(); columns.size_flags_vertical = Control.SIZE_EXPAND_FILL; columns.add_theme_constant_override("separation", 10); body.add_child(columns)
	var scroll := ScrollContainer.new(); scroll.custom_minimum_size.x = 235; columns.add_child(scroll)
	var palette := make_panel(220); scroll.add_child(palette); palette.add_child(heading("MÓDULOS"))
	for module_id in MissionModelScript.MODULES:
		var data: Dictionary = MissionModelScript.MODULES[module_id]
		palette.add_child(make_button("%s · %sKG · $%s" % [data.name, data.mass, data.cost], select_module.bind(module_id), 210))
	var center := make_panel(); center.size_flags_horizontal = Control.SIZE_EXPAND_FILL; columns.add_child(center); center.add_child(heading("PLANO DE LA NAVE · 4 × 3"))
	var grid_box := GridContainer.new(); grid_box.columns = 4; grid_box.size_flags_vertical = Control.SIZE_EXPAND_FILL; center.add_child(grid_box)
	for i in MissionModelScript.GRID_SIZE:
		var module_id: String = model.grid[i]
		var value := "CELDA %02d\nVACÍA" % (i + 1) if module_id == "" else "CELDA %02d\n%s" % [i + 1, MissionModelScript.MODULES[module_id].name]
		var cell := make_button(value, grid_cell_pressed.bind(i), 125); cell.custom_minimum_size.y = 82; grid_box.add_child(cell)
	center.add_child(make_label("Selecciona un módulo y una celda. Clic en un módulo instalado: retirar.", 11, MUTED))
	var side := make_panel(220); columns.add_child(side); side.add_child(heading("REVISIÓN"))
	var errors := model.can_launch()
	if errors.is_empty(): side.add_child(make_label("✓ NAVE LISTA", 14, GREEN))
	else:
		for error in errors: side.add_child(make_label("! " + error, 12, RED))
	side.add_child(make_label("OBLIGATORIOS\nMANDO · SOPORTE VITAL\nSOLAR · BATERÍAS\nCOMUNICACIONES", 11, MUTED))
	var fill := Control.new(); fill.size_flags_vertical = Control.SIZE_EXPAND_FILL; side.add_child(fill)
	var next := make_button("CONFIRMAR DISEÑO ▶", show_load, 205); next.disabled = not errors.is_empty(); side.add_child(next)

func select_module(module_id: String) -> void:
	selected_module = module_id; alert_label.text = "SELECCIONADO · " + str(MissionModelScript.MODULES[module_id].name)

func grid_cell_pressed(index: int) -> void:
	if model.grid[index] != "" and index >= 2: model.remove_module(index); alert_label.text = "MÓDULO RETIRADO"
	elif selected_module == "": alert_label.text = "SELECCIONA UN MÓDULO"
	elif not model.set_module(index, selected_module): alert_label.text = "EXCEDE MASA O PRESUPUESTO"
	else: alert_label.text = "MÓDULO INSTALADO"
	show_design()

func show_load() -> void:
	phase(2, "CARGA"); clear_body(); alert_label.text = "CADA KILO CUENTA"; body.add_child(make_label(resource_text(), 15, CYAN))
	var columns := HBoxContainer.new(); columns.size_flags_vertical = Control.SIZE_EXPAND_FILL; columns.add_theme_constant_override("separation", 14); body.add_child(columns)
	var cargo_panel := make_panel(); cargo_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL; columns.add_child(cargo_panel); cargo_panel.add_child(heading("SUMINISTROS"))
	for cargo_id in MissionModelScript.CARGO:
		var row := HBoxContainer.new(); cargo_panel.add_child(row); var data: Dictionary = MissionModelScript.CARGO[cargo_id]
		var item := make_label("%s · %s KG" % [data.name, data.mass], 14); item.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(item)
		row.add_child(make_button("−", adjust_cargo.bind(cargo_id, -1), 42)); row.add_child(make_label("  %02d  " % model.cargo[cargo_id], 17, AMBER)); row.add_child(make_button("+", adjust_cargo.bind(cargo_id, 1), 42))
	var crew := make_panel(350); columns.add_child(crew); crew.add_child(heading("COOPERATIVO LOCAL")); crew.add_child(make_label("Participantes activos", 13, MUTED))
	var crew_row := HBoxContainer.new(); crew.add_child(crew_row)
	for count in range(1, 5): crew_row.add_child(make_button(str(count), set_crew.bind(count), 60))
	crew.add_child(make_label("ACTIVOS: %d\n\nCOMANDANTE\nINGENIERÍA\nCIENCIA\nCOMUNICACIONES / DATOS" % model.crew_count, 15, CYAN))
	var footer := HBoxContainer.new(); body.add_child(footer); footer.add_child(make_button("◀ VOLVER", show_design, 160)); var fill := Control.new(); fill.size_flags_horizontal = Control.SIZE_EXPAND_FILL; footer.add_child(fill); footer.add_child(make_button("IR A LANZAMIENTO ▶", show_launch, 230))

func adjust_cargo(cargo_id: String, amount: int) -> void:
	if not model.adjust_cargo(cargo_id, amount): alert_label.text = "LÍMITE ALCANZADO"
	show_load()

func set_crew(count: int) -> void: model.crew_count = count; show_load()

func show_launch() -> void:
	phase(3, "DESPEGUE"); clear_body(); alert_label.text = "T−00:10:00 · ENCUESTA GO / NO-GO"; body.add_child(heading("CONTROL DE LANZAMIENTO")); body.add_child(make_label("Confirma cada estación. No hay despegue con un sistema NO-GO.", 14, MUTED))
	var checks := ["CLIMA Y VIENTOS", "PROPULSIÓN Y COMBUSTIBLE", "SOPORTE VITAL Y TRIPULACIÓN", "TRAYECTORIA Y COMUNICACIONES"]
	for i in checks.size(): body.add_child(make_button(("✓ GO  " if checklist[i] else "○ NO-GO  ") + checks[i], toggle_check.bind(i), 650))
	var fill := Control.new(); fill.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_child(fill)
	var launch := make_button("INICIAR CUENTA REGRESIVA", begin_orbit, 360); launch.disabled = checklist.has(false); body.add_child(launch)

func toggle_check(index: int) -> void: checklist[index] = not checklist[index]; show_launch()
func begin_orbit() -> void: model.start_orbit(); show_station()

func show_station() -> void:
	phase(4, "ESTANCIA"); clear_body(); alert_label.text = "ÓRBITA ESTABLE · TIEMPO ACELERADO"
	body.add_child(make_label("DÍA %03d/365  SALUD %03d  MORAL %03d  O₂ %03d  AGUA %03d  COMIDA %03d  ENERGÍA %03d  CIENCIA %04d" % [model.day, model.health, model.morale, model.oxygen, model.water, model.food, model.energy, model.science], 13, CYAN))
	var columns := HBoxContainer.new(); columns.size_flags_vertical = Control.SIZE_EXPAND_FILL; columns.add_theme_constant_override("separation", 12); body.add_child(columns)
	var tasks := make_panel(); tasks.size_flags_horizontal = Control.SIZE_EXPAND_FILL; columns.add_child(tasks); tasks.add_child(heading("RUTINA · PRÓXIMOS 15 DÍAS"))
	for task in ["MANTENIMIENTO", "CIENCIA", "SALUD", "COMUNICACIÓN"]: tasks.add_child(make_button(task, advance_station.bind(task), 380))
	tasks.add_child(make_label("El tiempo se pausa automáticamente ante una alerta.", 12, MUTED))
	var log_panel := make_panel(430); columns.add_child(log_panel); log_panel.add_child(heading("REGISTRO DE MISIÓN"))
	var from := maxi(0, model.mission_log.size() - 10)
	for line in model.mission_log.slice(from): log_panel.add_child(make_label(str(line), 12, Color("c8d3f3")))
	if model.day >= 365: body.add_child(make_button("INICIAR REGRESO A TIERRA ▶", show_return, 420))

func advance_station(task: String) -> void:
	event_data = model.advance_time(task)
	if event_data.is_empty(): show_station()
	else: show_event()

func show_event() -> void:
	clear_body(); alert_label.text = "⚠ ALERTA PRIORITARIA · TIEMPO EN PAUSA"
	body.add_child(make_label("⚠  " + str(event_data.title), 28, RED)); body.add_child(make_label(str(event_data.body), 18)); body.add_child(make_label("Los peligros grandes se avisan antes: la preparación decide las consecuencias.", 13, MUTED))
	var fill := Control.new(); fill.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_child(fill)
	body.add_child(make_button("PROTOCOLO · " + str(event_data.safe), resolve_event.bind(true), 750)); body.add_child(make_button("ACEPTAR RIESGO · " + str(event_data.risk), resolve_event.bind(false), 750))

func resolve_event(prepared: bool) -> void: alert_label.text = model.resolve_event(event_data, prepared); event_data = {}; show_station()

func show_return() -> void:
	phase(5, "REGRESO"); clear_body(); alert_label.text = "VENTANA DE REENTRADA ABIERTA"; body.add_child(heading("SECUENCIA DE REENTRADA"))
	var steps := ["ENCENDIDO DE SALIDA DE ÓRBITA", "SEPARACIÓN DEL MÓDULO DE SERVICIO", "APAGÓN DE PLASMA", "DESPLIEGUE DE PARACAÍDAS", "AMERIZAJE Y RECUPERACIÓN"]
	for i in steps.size(): body.add_child(make_label(("✓ " if i < return_step else "▶ " if i == return_step else "· ") + steps[i], 18, GREEN if i < return_step else AMBER if i == return_step else MUTED))
	var fill := Control.new(); fill.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_child(fill)
	if return_step < steps.size(): body.add_child(make_button("CONFIRMAR PASO DE REENTRADA", next_return_step, 440))
	else: body.add_child(make_button("ABRIR INFORME POST-MISIÓN ▶", show_report, 440))

func next_return_step() -> void: return_step += 1; show_return()

func show_report() -> void:
	phase(6, "INFORME"); clear_body(); alert_label.text = "MISIÓN CERRADA · RESULTADOS"
	body.add_child(make_label(model.outcome(), 28, GREEN if model.health > 0 else RED)); body.add_child(make_label("PUNTUACIÓN %04d   CIENCIA %04d   EVENTOS %02d   SALUD %03d" % [model.score(), model.science, model.events_survived, model.health], 17, CYAN))
	body.add_child(heading("POR QUÉ SALIÓ ASÍ"))
	if model.count_module("shield") == 0: body.add_child(make_label("• Sin refugio de radiación, las tormentas solo pudieron mitigarse.", 14, RED))
	if model.count_module("workshop") == 0: body.add_child(make_label("• Sin taller, las averías consumieron más recursos.", 14, RED))
	if model.count_module("lab") > 0: body.add_child(make_label("• El laboratorio aumentó el retorno científico.", 14, GREEN))
	if model.count_module("greenhouse") > 0: body.add_child(make_label("• El invernadero sostuvo comida y moral.", 14, GREEN))
	body.add_child(make_label("Rediseña y repite para comparar resultados.", 14, MUTED)); var fill := Control.new(); fill.size_flags_vertical = Control.SIZE_EXPAND_FILL; body.add_child(fill)
	var footer := HBoxContainer.new(); body.add_child(footer); footer.add_child(make_button("REDISEÑAR Y REPETIR", restart, 260)); var gap := Control.new(); gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL; footer.add_child(gap); footer.add_child(make_label("LUNA Y MARTE · PRÓXIMAMENTE", 15, AMBER))

func restart() -> void: model = MissionModelScript.new(); checklist = [false, false, false, false]; return_step = 0; selected_module = ""; show_design()
