<div align="center">

<pre>
           .       *           .
      *                /\             *
                 .    /  \    .
                     | () |
          .          |    |          .
                    /|    |\
                   /_|____|_\
                      /\
                *    /  \    *
                     ·  ·
</pre>

# JUNIOR ASTRONAUT<br>MISSION TRAINER

**ACADEMIA ORBITAL JUNIOR · PROGRAMA DE FORMACIÓN JAMT**

*Tu misión empieza aquí. Tu criterio decide cómo termina.*

![Español](https://img.shields.io/badge/IDIOMA-ESPAÑOL-5bd6ff?style=for-the-badge&labelColor=07172f)
![Misiones](https://img.shields.io/badge/MISIONES-04-ff8a3d?style=for-the-badge&labelColor=07172f)
![Decisiones](https://img.shields.io/badge/DECISIONES-12-7be495?style=for-the-badge&labelColor=07172f)
![JavaScript](https://img.shields.io/badge/JAVASCRIPT-NATIVO-f7df1e?style=for-the-badge&labelColor=07172f)

---

</div>

```text
ORIGEN    : CONTROL DE MISIÓN / ACADEMIA ORBITAL
DESTINO   : NUEVO PERSONAL CADETE
ESTADO    : ENLACE ACTIVO
PRIORIDAD : APRENDER ANTES DE TOCAR EL BOTÓN ROJO
```

## 📡 Informe de misión

Bienvenido a bordo, cadete.

El espacio es enorme. Tu nave, bastante menos. Y entre tú y el vacío hay un puñado de sistemas que conviene entender antes de que empiecen a parpadear.

**Junior Astronaut Mission Trainer** es un juego educativo en español donde tomas decisiones de seguridad, navegación y supervivencia espacial. Cada escenario presenta un problema, tres opciones y una explicación para entender qué protege a la tripulación y por qué.

No necesitas llegar sabiendo física orbital. Para eso existe la academia.

> **DIRECTIVA 01:** ninguna reparación, herramienta ni récord personal vale más que volver con toda la tripulación.

## 🛰️ Tu expediente de entrenamiento

| Fase | Misión | Lo que vas a poner a prueba |
| :---: | --- | --- |
| **01** 🚀 | **Listos para despegar** | Clima, protocolos GO / NO-GO y decisiones durante el ascenso. |
| **02** 🌍 | **Órbita estable** | Microgravedad, maniobras orbitales y pérdida de señal. |
| **03** 🌱 | **Vida a bordo** | Aire respirable, reciclaje de agua y respuesta ante humo. |
| **04** 👨‍🚀 | **Paseo espacial** | Líneas de seguridad, presión del traje y herramientas en el vacío. |

Las misiones se desbloquean en orden. Completa las tres decisiones de una fase para acceder a la siguiente, incluso si te equivocas: el entrenamiento también consiste en aprender del error.

### Lo que llevas en el traje

- **12 escenarios interactivos**, con contexto científico y explicación de cada decisión.
- **Puntos y rachas:** un acierto vale 100 puntos; los consecutivos suman un bono de hasta 100 puntos extra por respuesta.
- **Cuatro insignias**, una por cada misión completada.
- **Rangos de cadete**, desde Aspirante espacial hasta Comandante junior.
- **Progreso local**, guardado en el navegador para retomar el entrenamiento.
- **Interfaz adaptable**, con ilustraciones hechas en CSS y SVG, controles de teclado y avisos para lectores de pantalla.

<details>
<summary><strong>🎖️ Consultar requisitos de ascenso</strong></summary>

| Puntos acumulados | Rango |
| ---: | --- |
| 0–449 | Aspirante espacial |
| 450–899 | Cadete orbital |
| 900–1399 | Especialista de misión |
| 1400 o más | Comandante junior |

Una respuesta incorrecta corta la racha. Volver a una pregunta respondida permite repasar, pero no volver a sumar puntos. El botón **Reiniciar** borra el expediente guardado y permite empezar de cero.

</details>

## 🚀 Despegue local

Necesitas **Git** y una versión reciente de **Node.js** compatible con módulos ES y `node --test`.

```bash
git clone https://github.com/alejondr3/Lostiravida2.git
cd Lostiravida2
npm start
```

Abre **[http://127.0.0.1:4173/](http://127.0.0.1:4173/)**, registra tu nombre de cadete y acepta la primera misión.

**No hace falta ejecutar `npm install`:** el juego y su servidor local no requieren paquetes externos.

```text
[✓] Servidor en línea
[✓] Sistemas de entrenamiento listos
[✓] Identificación del cadete pendiente
[ ] Café del comandante localizado
```

## 🧭 Cómo jugar

1. **Identifícate.** Elige el nombre que aparecerá en tu expediente.
2. **Acepta una misión.** Lee el informe y revisa qué habilidad entrenarás.
3. **Observa y decide.** Usa el dato de misión para elegir una de las tres respuestas.
4. **Lee la explicación.** Entender el procedimiento importa tanto como acertar.
5. **Avanza.** Consigue tu insignia, desbloquea la siguiente fase y sube de rango.

El progreso pertenece al navegador donde juegas. Cambiar de dispositivo o borrar los datos del sitio no transfiere tu expediente. El nombre y las respuestas se guardan en `localStorage`; el juego no tiene cuentas ni un backend de usuarios.

## 🔧 Manual técnico

La academia funciona con **HTML, CSS y JavaScript nativo**. El servidor de desarrollo usa únicamente módulos incluidos en Node.js.

```text
Lostiravida2/
├── index.html          # Entrada de la academia
├── styles.css          # Identidad visual, escenas y diseño adaptable
├── server.mjs          # Servidor HTTP para desarrollo local
├── package.json        # Comandos del proyecto
├── src/
│   ├── app.js          # Pantallas, interacción y flujo de entrenamiento
│   ├── game.js         # Puntos, rangos, desbloqueos y persistencia
│   └── missions.js     # Misiones, preguntas y explicaciones
└── test/
    └── game.test.js    # Verificación de las reglas del entrenamiento
```

### Diagnóstico de sistemas

```bash
npm test
```

Las pruebas comprueban nombres de cadete, puntuación, rachas, bloqueo de puntos duplicados, desbloqueo de misiones y rangos.

### Publicar la academia

Los archivos del juego pueden servirse directamente como sitio estático: **no hay paso de compilación**. La raíz del repositorio contiene `index.html`, `styles.css` y `src/`.

En GitHub Pages, utiliza la rama `main` y la carpeta raíz. En un alojamiento estático, publica esa misma raíz. `server.mjs` sirve para desarrollo local y no es necesario para ejecutar el juego en un hosting estático.

Las tipografías se cargan desde Google Fonts y tienen fuentes de respaldo; las ilustraciones se dibujan con CSS y SVG.

## 🛠️ Ampliar el programa

¿Tienes una idea para el siguiente entrenamiento? El banco de escenarios está en [`src/missions.js`](src/missions.js), y las reglas de progresión están en [`src/game.js`](src/game.js).

Puedes proponer mejoras o reportar fallos en [Issues](https://github.com/alejondr3/Lostiravida2/issues). Para aportar código, crea una rama, verifica las pruebas y abre un pull request explicando qué cambia para el cadete.

> Este proyecto ofrece escenarios educativos simplificados. No sustituye procedimientos operativos ni entrenamiento espacial profesional.

---

<div align="center">

**CONSTRUIDO POR [@alejondr3](https://github.com/alejondr3)**

`APRENDE · DECIDE · EXPLORA`

*Fin de la transmisión. Nos vemos en órbita.* 🪐

</div>
