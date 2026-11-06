console.log("game.js v3 cargado");

const URL_APPS_SCRIPT =
  "https://script.google.com/macros/s/AKfycbync4Zy8sk82iujKYKrwsBfI4S0j3u6houResIimu9QIY_UPiKeUlTVgVzfANB4vko6/exec";

let configuracionExamen = null;
let preguntasSeleccionadas = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let nombreAlumno = "";
let cursoAlumno = "";
let horaInicio = null;
let examenTerminado = false;

// Protección al abandonar la página
const PREGUNTAS_DE_BLOQUEO = 10;
let proteccionActiva = false;
let examenEnCurso = false;
let salioDePagina = false;
let reservaPreguntas = [];
let bloqueos = new Map();

// ==================================================
// DISEÑO
// ==================================================
const DISEÑO_PREDETERMINADO = {
  tema: "floral",
  tipoFondo: "tema",
  colorFondo: "#fff0f5",
  colorTitulo: "#9d4385",
  colorTexto: "#403542",
  colorBoton: "#9d4385",
  fuente: "elegante"
};

const FONDOS_TEMA = {
  floral:
    "radial-gradient(circle at 15% 20%, rgba(247,182,206,.55) 0 7%, transparent 8%), radial-gradient(circle at 85% 75%, rgba(185,216,173,.5) 0 8%, transparent 9%), linear-gradient(135deg, #fff0f5, #e5f1df)",
  rosa:
    "linear-gradient(135deg, #ffe0ef, #e9b5d2)",
  azul:
    "linear-gradient(135deg, #eaf3ff, #c3dcfa)",
  industrial:
    "repeating-linear-gradient(135deg, #e7edf2, #e7edf2 18px, #d9e2e9 19px, #d9e2e9 21px)",
  historia:
    "repeating-linear-gradient(135deg, #f4e8cf, #f4e8cf 18px, #ead9b6 19px, #ead9b6 21px)",
  productivo:
    "repeating-linear-gradient(90deg, #e7f0f2, #e7f0f2 18px, #d7e5e8 19px, #d7e5e8 21px)",
  personalizado:
    "#f3edff"
};

const FUENTES = {
  moderna: "Arial, Helvetica, sans-serif",
  clasica: "Georgia, 'Times New Roman', serif",
  elegante: "'Trebuchet MS', Arial, sans-serif",
  tecnica: "'Courier New', monospace"
};

// ==================================================
// MEZCLAR ARRAY
// ==================================================
function mezclarArray(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ==================================================
// APLICAR DISEÑO
// ==================================================
function aplicarDiseno() {
  const diseno = {
    ...DISEÑO_PREDETERMINADO,
    ...(configuracionExamen?.diseno || {})
  };

  const fondo =
    diseno.tipoFondo === "liso"
      ? diseno.colorFondo
      : (FONDOS_TEMA[diseno.tema] || diseno.colorFondo);

  const fuente = FUENTES[diseno.fuente] || FUENTES.elegante;
  const raiz = document.documentElement.style;

  raiz.setProperty("--examen-fondo", fondo);
  raiz.setProperty("--examen-color-titulo", diseno.colorTitulo);
  raiz.setProperty("--examen-color-texto", diseno.colorTexto);
  raiz.setProperty("--examen-color-boton", diseno.colorBoton);
  raiz.setProperty("--examen-fuente", fuente);

  let estilos = document.getElementById("estilosDisenoExamen");
  if (!estilos) {
    estilos = document.createElement("style");
    estilos.id = "estilosDisenoExamen";
    document.head.appendChild(estilos);
  }

  estilos.textContent = `
    body {
      background: var(--examen-fondo) !important;
      color: var(--examen-color-texto) !important;
      font-family: var(--examen-fuente) !important;
      transition: background .3s ease, color .3s ease;
    }

    #pantallaCarga,
    #pantallaInicio,
    #pantallaAviso,
    #pantallaExamen {
      color: var(--examen-color-texto);
    }

    #nombreMateria,
    #numeroPregunta,
    #textoPregunta,
    #pantallaCarga h2,
    #pantallaAviso h1,
    #pantallaInicio h1,
    #pantallaInicio h2,
    #pantallaExamen h1,
    #pantallaExamen h2 {
      color: var(--examen-color-titulo) !important;
    }

    #pantallaCarga button,
    #pantallaAviso button,
    #pantallaInicio button,
    #pantallaExamen button:not(.opcion) {
      background: var(--examen-color-boton) !important;
      color: #ffffff !important;
    }

    .opcion {
      font-family: var(--examen-fuente) !important;
      color: var(--examen-color-texto) !important;
    }

    .resultado-final {
      font-family: var(--examen-fuente);
      color: var(--examen-color-texto);
      border: 2px solid color-mix(in srgb, var(--examen-color-boton) 25%, transparent);
    }

    .resultado-final .resultado-titulo {
      color: var(--examen-color-titulo);
    }

    .resultado-final .nota-numero {
      background: linear-gradient(135deg, var(--examen-color-boton), var(--examen-color-titulo));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .resultado-final .barra-progreso {
      background: linear-gradient(90deg, var(--examen-color-boton), var(--examen-color-titulo));
    }
  `;
}

// ==================================================
// PANTALLA DE CARGA
// ==================================================
function mostrarCarga() {
  document.getElementById("pantallaInicio").style.display = "none";
  document.getElementById("pantallaCarga").style.display = "block";
  document.getElementById("spinnerCarga").style.display = "block";
  document.getElementById("textoCarga").textContent =
    "Preparando tu examen...";
  document.getElementById("subtextoCarga").textContent =
    "Esto puede tardar unos segundos.";
  document.getElementById("botonReintentar").hidden = true;
}

function mostrarErrorCarga(mensaje, permitirReintento) {
  document.getElementById("spinnerCarga").style.display = "none";
  document.getElementById("textoCarga").textContent =
    "No pudimos cargar el examen 😕";
  document.getElementById("subtextoCarga").textContent = mensaje;
  document.getElementById("botonReintentar").hidden = !permitirReintento;
}

// ==================================================
// CARGAR EXAMEN
// ==================================================
function cargarExamen() {
  const idExamen =
    new URLSearchParams(window.location.search).get("id");

  mostrarCarga();

  if (!idExamen) {
    mostrarErrorCarga(
      "No se indicó qué examen querés realizar. " +
      "Revisá el enlace que te pasó tu profesor/a.",
      false
    );
    return;
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 25000);
  const url = URL_APPS_SCRIPT + "?id=" + encodeURIComponent(idExamen);

  fetch(url, { signal: controlador.signal })
    .then(respuesta => {
      if (!respuesta.ok) {
        throw new Error("Respuesta HTTP " + respuesta.status);
      }
      return respuesta.json();
    })
    .then(datos => {
      if (!datos.ok || !datos.examen) {
        mostrarErrorCarga(
          datos.error || "No se pudo encontrar el examen.",
          true
        );
        return;
      }

      configuracionExamen = datos.examen;
      proteccionActiva = configuracionExamen.proteccion === true;
      aplicarDiseno();

      document.getElementById("nombreMateria").textContent =
        configuracionExamen.materia;

      document.getElementById("pantallaCarga").style.display = "none";
      document.getElementById("pantallaInicio").style.display = "block";
    })
    .catch(error => {
      console.error("Error al cargar el examen:", error);
      mostrarErrorCarga(
        "Revisá tu conexión a internet e intentá de nuevo.",
        true
      );
    })
    .finally(() => clearTimeout(temporizador));
}

// ==================================================
// COMENZAR EXAMEN
// ==================================================
function comenzarExamen() {
  if (!configuracionExamen) {
    alert("El examen todavía se está cargando. Esperá un momento.");
    return;
  }

  nombreAlumno = document.getElementById("nombre").value.trim();
  cursoAlumno = document.getElementById("curso").value.trim();

  if (!nombreAlumno || !cursoAlumno) {
    alert("Completá tu nombre y tu curso antes de comenzar.");
    return;
  }

  const disponibles = configuracionExamen.preguntas;
  const cantidad = configuracionExamen.preguntasPorAlumno;

  if (!Array.isArray(disponibles) || disponibles.length < cantidad) {
    alert("Este examen no tiene suficientes preguntas disponibles.");
    return;
  }

  // Con protección activada, primero se muestra el aviso
  if (proteccionActiva) {
    document.getElementById("pantallaInicio").style.display = "none";
    document.getElementById("pantallaAviso").style.display = "block";
    return;
  }

  iniciarExamen();
}

// ==================================================
// INICIAR EXAMEN (después del aviso, si lo hay)
// ==================================================
function iniciarExamen() {
  const cantidad = configuracionExamen.preguntasPorAlumno;
  const mezcladas = mezclarArray(configuracionExamen.preguntas);

  preguntasSeleccionadas = mezcladas.slice(0, cantidad);
  reservaPreguntas = mezcladas.slice(cantidad);
  bloqueos = new Map();

  preguntaActual = 0;
  respuestasCorrectas = 0;
  examenTerminado = false;
  examenEnCurso = true;
  salioDePagina = false;
  horaInicio = new Date();

  document.getElementById("pantallaInicio").style.display = "none";
  document.getElementById("pantallaAviso").style.display = "none";
  document.getElementById("pantallaExamen").style.display = "block";

  mostrarPregunta();
}

// ==================================================
// PROTECCIÓN AL ABANDONAR LA PÁGINA
// ==================================================
function preguntaYaRespondida() {
  return [...document.querySelectorAll("#opciones .opcion")]
    .some(boton => boton.disabled);
}

// Cambia la pregunta actual por otra. Devuelve true si pudo.
function reemplazarPreguntaActual() {
  const posicion = preguntaActual;
  const actual = preguntasSeleccionadas[posicion];

  // 1) Buscar en la reserva una pregunta que no esté bloqueada
  const elegibles = [];
  reservaPreguntas.forEach((pregunta, indice) => {
    const bloqueadaHasta = bloqueos.get(pregunta);
    if (
      bloqueadaHasta === undefined ||
      preguntaActual >= bloqueadaHasta
    ) {
      elegibles.push(indice);
    }
  });

  if (elegibles.length > 0) {
    const indice =
      elegibles[Math.floor(Math.random() * elegibles.length)];
    const nueva = reservaPreguntas[indice];

    reservaPreguntas[indice] = actual;
    preguntasSeleccionadas[posicion] = nueva;
    bloqueos.delete(nueva);
    bloqueos.set(actual, posicion + PREGUNTAS_DE_BLOQUEO);
    return true;
  }

  // 2) Sin reserva disponible: intercambiar con una pregunta posterior
  const ultima = preguntasSeleccionadas.length - 1;
  if (posicion >= ultima) return false;

  const destino = Math.min(posicion + PREGUNTAS_DE_BLOQUEO, ultima);
  [
    preguntasSeleccionadas[posicion],
    preguntasSeleccionadas[destino]
  ] = [
    preguntasSeleccionadas[destino],
    preguntasSeleccionadas[posicion]
  ];
  return true;
}

function marcarSalida() {
  if (!proteccionActiva || !examenEnCurso || examenTerminado) return;
  if (preguntaYaRespondida()) return;
  salioDePagina = true;
}

function alVolver() {
  if (!salioDePagina) return;
  salioDePagina = false;

  if (!proteccionActiva || !examenEnCurso || examenTerminado) return;
  if (preguntaYaRespondida()) return;

  if (reemplazarPreguntaActual()) {
    mostrarPregunta();
    const aviso = document.getElementById("resultado");
    aviso.textContent =
      "⚠️ Saliste de la página, por eso cambiamos tu pregunta.";
    aviso.style.color = "#b45309";
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    marcarSalida();
  } else {
    alVolver();
  }
});
window.addEventListener("blur", marcarSalida);
window.addEventListener("focus", alVolver);

// ==================================================
// MOSTRAR PREGUNTA
// ==================================================
function mostrarPregunta() {
  if (preguntaActual >= preguntasSeleccionadas.length) {
    terminarExamen();
    return;
  }

  const pregunta = preguntasSeleccionadas[preguntaActual];

  document.getElementById("numeroPregunta").textContent =
    `Pregunta ${preguntaActual + 1} de ${preguntasSeleccionadas.length}`;

  document.getElementById("textoPregunta").textContent =
    pregunta.enunciado;

  const contenedor = document.getElementById("opciones");
  contenedor.innerHTML = "";
  document.getElementById("resultado").textContent = "";

  mezclarArray(pregunta.opciones).forEach(opcion => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "opcion";
    boton.textContent = opcion;
    boton.addEventListener("click", () => {
      comprobarRespuesta(opcion, boton);
    });
    contenedor.appendChild(boton);
  });
}

// ==================================================
// COMPROBAR RESPUESTA
// ==================================================
function comprobarRespuesta(respuesta, botonElegido) {
  if (examenTerminado) return;

  const botones = document.querySelectorAll("#opciones .opcion");
  if ([...botones].some(boton => boton.disabled)) return;

  const pregunta = preguntasSeleccionadas[preguntaActual];
  const resultado = document.getElementById("resultado");
  const esCorrecta = respuesta === pregunta.correcta;

  botones.forEach(boton => {
    boton.disabled = true;
    if (boton.textContent === pregunta.correcta) {
      boton.classList.add("correcto");
    }
  });

  if (esCorrecta) {
    respuestasCorrectas++;
    resultado.textContent = "¡Correcto! 🎉";
    resultado.style.color = "#16a34a";
  } else {
    botonElegido.classList.add("incorrecto");
    resultado.textContent =
      `La respuesta correcta era: ${pregunta.correcta}`;
    resultado.style.color = "#dc2626";
  }

  const continuar = document.createElement("button");
  continuar.type = "button";
  continuar.className = "opcion";
  continuar.textContent =
    preguntaActual === preguntasSeleccionadas.length - 1
      ? "Ver mi resultado"
      : "Siguiente pregunta →";
  continuar.style.marginTop = "16px";
  continuar.style.background = "var(--examen-color-boton)";
  continuar.style.color = "#ffffff";
  continuar.style.border = "none";
  continuar.addEventListener("click", () => {
    preguntaActual++;
    mostrarPregunta();
  });

  document.getElementById("opciones").appendChild(continuar);
}

// ==================================================
// ESTILOS RESULTADO
// ==================================================
function agregarEstilosResultado() {
  if (document.getElementById("estilosResultadoAnimado")) return;

  const estilos = document.createElement("style");
  estilos.id = "estilosResultadoAnimado";
  estilos.textContent = `
    .resultado-final {
      max-width: 620px;
      margin: 24px auto;
      padding: 32px 24px;
      border-radius: 26px;
      background: rgba(255,255,255,.94);
      box-shadow: 0 18px 50px rgba(31, 41, 55, 0.12);
      text-align: center;
      overflow: hidden;
      animation: aparecerResultado .6s ease both;
    }
    .resultado-final .resultado-icono {
      font-size: 52px;
      margin-bottom: 10px;
      animation: aparecerIcono .7s ease both;
    }
    .resultado-final .resultado-titulo {
      font-size: clamp(27px, 5vw, 38px);
      font-weight: 800;
      letter-spacing: -1px;
      margin: 0 0 8px;
    }
    .resultado-final .resultado-subtitulo {
      font-size: 16px;
      margin-bottom: 26px;
    }
    .resultado-final .nota-grande {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 7px;
      margin: 12px 0 20px;
    }
    .resultado-final .nota-numero {
      font-size: clamp(62px, 13vw, 88px);
      font-weight: 900;
      letter-spacing: -5px;
      line-height: 1;
    }
    .resultado-final .nota-maxima {
      font-size: 24px;
      color: #94a3b8;
      font-weight: 700;
    }
    .resultado-final .barra-fondo {
      width: 100%;
      height: 24px;
      border-radius: 999px;
      background: #e2e8f0;
      padding: 4px;
      overflow: hidden;
      box-sizing: border-box;
      margin: 0 auto 12px;
    }
    .resultado-final .barra-progreso {
      height: 100%;
      width: 0%;
      border-radius: 999px;
      transition: width 1.8s cubic-bezier(.22, 1, .36, 1);
      position: relative;
      overflow: hidden;
    }
    .resultado-final .barra-progreso::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,.45) 45%, transparent 70%);
      transform: translateX(-100%);
      animation: brilloBarra 1.5s ease-in-out .5s infinite;
    }
    .resultado-final .porcentaje-texto {
      font-size: 14px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 25px;
    }
    .resultado-final .tarjetas-datos {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 24px;
    }
    .resultado-final .dato-tarjeta {
      padding: 17px 12px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e8edf5;
    }
    .resultado-final .dato-etiqueta {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 7px;
    }
    .resultado-final .dato-valor {
      font-size: 19px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .resultado-final .mensaje-final {
      font-size: 17px;
      font-weight: 700;
      margin-top: 23px;
    }
    .resultado-final .guardado-final {
      font-size: 13px;
      color: #64748b;
      margin-top: 20px;
      min-height: 18px;
    }
    @keyframes aparecerResultado {
      from { opacity: 0; transform: translateY(18px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes aparecerIcono {
      0% { opacity: 0; transform: scale(.5) rotate(-12deg); }
      70% { transform: scale(1.15) rotate(4deg); }
      100% { opacity: 1; transform: scale(1) rotate(0); }
    }
    @keyframes brilloBarra {
      to { transform: translateX(150%); }
    }
    @media (max-width: 480px) {
      .resultado-final { padding: 27px 17px; }
      .resultado-final .tarjetas-datos { gap: 8px; }
      .resultado-final .dato-tarjeta { padding: 14px 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .resultado-final,
      .resultado-final .resultado-icono { animation: none; }
      .resultado-final .barra-progreso { transition: none; }
      .resultado-final .barra-progreso::after { animation: none; }
    }
  `;
  document.head.appendChild(estilos);
}

// ==================================================
// MENSAJE SEGÚN NOTA
// ==================================================
function obtenerMensajeNota(nota) {
  if (nota >= 10) {
    return { icono: "🏆", titulo: "¡Perfecto!", mensaje: "¡Un examen impecable! Te luciste." };
  }
  if (nota >= 8) {
    return { icono: "🎉", titulo: "¡Excelente trabajo!", mensaje: "¡La rompiste! Seguí así." };
  }
  if (nota >= 6) {
    return { icono: "🌟", titulo: "¡Buen trabajo!", mensaje: "¡Vas por buen camino!" };
  }
  if (nota >= 4) {
    return { icono: "💪", titulo: "¡A seguir practicando!", mensaje: "Cada intento sirve para aprender." };
  }
  return { icono: "📚", titulo: "¡A no rendirse!", mensaje: "Repasar y volver a intentarlo ayuda un montón." };
}

// ==================================================
// TERMINAR EXAMEN
// ==================================================
async function terminarExamen() {
  if (examenTerminado) return;
  examenTerminado = true;
  examenEnCurso = false;

  const total = preguntasSeleccionadas.length;
  const nota = Math.round((respuestasCorrectas / total) * 100) / 10;
  const porcentaje = Math.round((respuestasCorrectas / total) * 100);
  const tiempoTotal = calcularTiempoTotal();
  const mensaje = obtenerMensajeNota(nota);

  agregarEstilosResultado();

  document.getElementById("pantallaExamen").innerHTML = `
    <section class="resultado-final">
      <div class="resultado-icono">${mensaje.icono}</div>
      <h1 class="resultado-titulo">${mensaje.titulo}</h1>
      <p class="resultado-subtitulo">
        Examen de ${escaparHTML(configuracionExamen.materia)}
      </p>

      <div class="nota-grande">
        <span class="nota-numero" id="notaAnimada">0.0</span>
        <span class="nota-maxima">/ 10</span>
      </div>

      <div class="barra-fondo" role="progressbar"
           aria-label="Nota del examen"
           aria-valuemin="0" aria-valuemax="10"
           aria-valuenow="${nota}">
        <div class="barra-progreso" id="barraNota"></div>
      </div>
      <div class="porcentaje-texto">${porcentaje}% del puntaje</div>

      <div class="tarjetas-datos">
        <div class="dato-tarjeta">
          <div class="dato-etiqueta">RESPUESTAS CORRECTAS</div>
          <div class="dato-valor">${respuestasCorrectas} de ${total}</div>
        </div>
        <div class="dato-tarjeta">
          <div class="dato-etiqueta">TIEMPO TOTAL</div>
          <div class="dato-valor">${escaparHTML(tiempoTotal)}</div>
        </div>
      </div>

      <div class="mensaje-final">${mensaje.mensaje}</div>
      <div class="guardado-final" id="estadoGuardado">
        Guardando tu resultado...
      </div>
    </section>
  `;

  // ---------- Animación ----------
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const barra = document.getElementById("barraNota");
      const numero = document.getElementById("notaAnimada");

      if (barra) barra.style.width = `${porcentaje}%`;

      if (numero) {
        const duracion = 1800;
        const inicio = performance.now();

        function animarNota(ahora) {
          const progreso = Math.min((ahora - inicio) / duracion, 1);
          const suave = 1 - Math.pow(1 - progreso, 4);
          numero.textContent = (nota * suave).toFixed(1);

          if (progreso < 1) {
            requestAnimationFrame(animarNota);
          } else {
            numero.textContent = nota.toFixed(1);
          }
        }

        requestAnimationFrame(animarNota);
      }
    });
  });

  // ---------- Guardar resultado ----------
  const idExamen =
    new URLSearchParams(window.location.search).get("id");

  try {
    const respuesta = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify({
        accion: "guardarResultado",
        idExamen: idExamen,
        alumno: nombreAlumno,
        nota: nota,
        aciertos: `${respuestasCorrectas}/${total}`,
        horaInicio: horaInicio.toLocaleString("es-AR"),
        tiempoTotal: tiempoTotal
      })
    });

    const datos = await respuesta.json();
    const estado = document.getElementById("estadoGuardado");

    if (estado) {
      estado.textContent = datos.ok
        ? "✓ Resultado guardado correctamente"
        : "No se pudo confirmar el guardado del resultado.";
      estado.style.color = datos.ok ? "#15803d" : "#b91c1c";
    }
  } catch (error) {
    const estado = document.getElementById("estadoGuardado");
    if (estado) {
      estado.textContent =
        "No se pudo confirmar el guardado. Avisale a tu profesor.";
      estado.style.color = "#b91c1c";
    }
    console.error("Error al guardar el resultado:", error);
  }
}

// ==================================================
// CALCULAR TIEMPO
// ==================================================
function calcularTiempoTotal() {
  if (!horaInicio) return "0 min 0 seg";

  const segundos = Math.max(
    0,
    Math.floor((new Date() - horaInicio) / 1000)
  );

  return `${Math.floor(segundos / 60)} min ${segundos % 60} seg`;
}

// ==================================================
// ESCAPAR HTML
// ==================================================
function escaparHTML(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

// ==================================================
// INICIAR
// ==================================================
cargarExamen();
