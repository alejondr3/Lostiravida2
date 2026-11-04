# Banda sonora original

La música de **Los Tira Vida 02** se genera en tiempo real mediante Web Audio en [`src/soundtrack.js`](src/soundtrack.js).

No utiliza grabaciones, samples, pistas descargadas ni melodías tomadas de otras obras. El secuenciador combina una frase original, acordes, bajo y percusión sintetizada. Cambia de arreglo según el estado de la expedición:

- **Órbita:** arpegio y armonía suave para preparar la misión.
- **Exploración:** melodía, bajo y percusión durante la expedición.
- **Peligro:** ritmo más rápido y una capa adicional durante los eventos.
- **Victoria:** resolución en acordes mayores al completar la extracción.

La reproducción comienza después de una interacción con la página. El volumen se controla desde la cabecera; el botón de música permite silenciarla.

## Dedicación CC0

En la medida en que existan derechos de autor sobre la composición original y el código de síntesis de `src/soundtrack.js` aportados por este proyecto, se dedican al dominio público bajo **CC0 1.0 Universal**. Se permite utilizarlos, modificarlos y distribuirlos, incluso comercialmente, sin atribución obligatoria.

Texto de la dedicación: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

Esta dedicación se limita a la música original y al archivo de síntesis indicado; no asigna una licencia general al resto del repositorio ni a las tipografías de terceros.
