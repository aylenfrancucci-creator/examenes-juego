
const URL_APPS_SCRIPT =
    "https://script.google.com/macros/s/AKfycbync4Zy8sk82iujKYKrwsBfI4S0j3u6houResIimu9QIY_UPiKeUlTVgVzfANB4vko6/exec";

const parametros = new URLSearchParams(window.location.search);
const idExamen = parametros.get("id");

let configuracionExamen = null;
let preguntasSeleccionadas = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let examenComenzado = false;


// ========================================
// MEZCLAR UN ARRAY ALEATORIAMENTE
// ========================================

function mezclarArray(array) {

    const copia = [...array];

    for (let i = copia.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [copia[i], copia[j]] = [copia[j], copia[i]];

    }

    return copia;

}


// ========================================
// ELEGIR LAS PREGUNTAS DEL ALUMNO
// ========================================

function seleccionarPreguntas() {

    const todasLasPreguntas = configuracionExamen.preguntas;

    const cantidad = Number(
        configuracionExamen.preguntasPorAlumno
    );

    if (
        !Number.isInteger(cantidad) ||
        cantidad < 1 ||
        cantidad > todasLasPreguntas.length
    ) {

        alert("La cantidad de preguntas configurada no es válida.");
        return false;

    }

    // Mezclar las preguntas disponibles y tomar solo la cantidad indicada.
    preguntasSeleccionadas = mezclarArray(todasLasPreguntas)
        .slice(0, cantidad);

    console.log(
        "Preguntas disponibles:",
        todasLasPreguntas.length
    );

    console.log(
        "Preguntas seleccionadas para este alumno:",
        preguntasSeleccionadas.length
    );

    return true;

}


// ========================================
// CARGAR EXAMEN DESDE GOOGLE
// ========================================

async function cargarExamen() {

    if (!idExamen) {

        alert("No se encontró el ID del examen.");
        return;

    }

    try {

        const respuesta = await fetch(
            URL_APPS_SCRIPT + "?id=" + encodeURIComponent(idExamen)
        );

        const datos = await respuesta.json();

        console.log("Examen recibido:", datos);

        if (!datos.ok) {

            alert("No se encontró ese examen.");
            return;

        }

        configuracionExamen = datos.examen;

        document.getElementById("nombreMateria").textContent =
            configuracionExamen.materia;

    } catch (error) {

        console.error("Error cargando examen:", error);

        alert("No se pudo cargar el examen.");

    }

}


// ========================================
// COMENZAR EXAMEN
// ========================================

function comenzarExamen() {

    if (!configuracionExamen) {

        alert("El examen todavía se está cargando. Esperá un momento.");
        return;

    }

    const nombre = document.getElementById("nombre").value.trim();
    const curso = document.getElementById("curso").value.trim();

    if (!nombre) {

        alert("Escribí tu nombre antes de comenzar.");
        return;

    }

    if (!curso) {

        alert("Escribí tu curso antes de comenzar.");
        return;

    }

    // Seleccionar las preguntas antes de comenzar.
    if (!seleccionarPreguntas()) {
        return;
    }

    examenComenzado = true;
    preguntaActual = 0;
    respuestasCorrectas = 0;

    document.getElementById("pantallaInicio").style.display = "none";
    document.getElementById("pantallaExamen").style.display = "block";

    mostrarPregunta();

}


// ========================================
// MOSTRAR PREGUNTA
// ========================================

function mostrarPregunta() {

    if (preguntaActual >= preguntasSeleccionadas.length) {

        terminarExamen();
        return;

    }

    const pregunta = preguntasSeleccionadas[preguntaActual];

    const opcionesMezcladas = pregunta.opciones.map(
        (texto, indice) => ({
            texto: texto,
            indiceOriginal: indice
        })
    );

    // Mezclar las respuestas sin perder cuál es la correcta.
    const opcionesOrdenadas = mezclarArray(opcionesMezcladas);

    document.getElementById("numeroPregunta").textContent =
        "Pregunta " + (preguntaActual + 1) +
        " de " + preguntasSeleccionadas.length;

    document.getElementById("textoPregunta").textContent =
        pregunta.pregunta;

    const opciones = document.getElementById("opciones");
    opciones.innerHTML = "";

    document.getElementById("resultado").textContent = "";

    opcionesOrdenadas.forEach((opcion) => {

        const boton = document.createElement("button");

        boton.textContent = opcion.texto;
        boton.type = "button";
        boton.className = "opcion";

        boton.onclick = function () {
            comprobarRespuesta(opcion.indiceOriginal);
        };

        opciones.appendChild(boton);

    });

}


// ========================================
// COMPROBAR RESPUESTA
// ========================================

function comprobarRespuesta(respuestaElegida) {

    const pregunta = preguntasSeleccionadas[preguntaActual];

    const botones = document.querySelectorAll(".opcion");

    botones.forEach((boton) => {
        boton.disabled = true;
    });

    const resultado = document.getElementById("resultado");

    if (respuestaElegida === pregunta.correcta) {

        respuestasCorrectas++;
        resultado.textContent = "✅ ¡Correcto!";

    } else {

        resultado.textContent =
            "❌ Incorrecto. La respuesta correcta era: " +
            pregunta.opciones[pregunta.correcta];

    }

    setTimeout(function () {

        preguntaActual++;
        mostrarPregunta();

    }, 1200);

}


// ========================================
// TERMINAR EXAMEN
// ========================================

function terminarExamen() {

    const pantalla = document.getElementById("pantallaExamen");

    pantalla.innerHTML = `
        <h2>🎉 Examen terminado</h2>
        <p>
            Respondiste correctamente
            ${respuestasCorrectas}
            de
            ${preguntasSeleccionadas.length}
            preguntas.
        </p>
    `;

}


// ========================================
// CARGAR AL ABRIR LA PÁGINA
// ========================================

cargarExamen();
