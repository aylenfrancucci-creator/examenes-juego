const URL_APPS_SCRIPT =
    "https://script.google.com/macros/s/AKfycbync4Zy8sk82iujKYKrwsBfI4S0j3u6houResIimu9QIY_UPiKeUlTVgVzfANB4vko6/exec";

const parametros = new URLSearchParams(window.location.search);
const idExamen = parametros.get("id");

let configuracionExamen = null;
let preguntasSeleccionadas = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let nombreAlumno = "";
let cursoAlumno = "";


// ========================================
// MEZCLAR ELEMENTOS AL AZAR
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
// CARGAR CONFIGURACIÓN DEL EXAMEN
// ========================================

async function cargarExamen() {
    if (!idExamen) {
        mostrarError("No se encontró el ID del examen en el enlace.");
        return;
    }

    try {
        const respuesta = await fetch(
            URL_APPS_SCRIPT + "?id=" + encodeURIComponent(idExamen)
        );

        const datos = await respuesta.json();

        console.log("Datos recibidos de Apps Script:", datos);

        if (!respuesta.ok || !datos.ok || !datos.examen) {
            mostrarError("No se encontró el examen. Revisá el enlace.");
            return;
        }

        const examen = datos.examen;

        if (!Array.isArray(examen.preguntas)) {
            mostrarError(
                "El servidor no devolvió correctamente las preguntas. " +
                "Revisá la implementación de Apps Script."
            );
            return;
        }

        const disponibles = Number(examen.cantidadPreguntas);
        const porAlumno = Number(examen.preguntasPorAlumno);

        // No confundir las preguntas disponibles con las que responde cada alumno.
        if (
            !Number.isInteger(porAlumno) ||
            porAlumno < 1 ||
            porAlumno > examen.preguntas.length
        ) {
            mostrarError(
                "No se pudo confirmar la cantidad de preguntas por alumno. " +
                "El servidor debe devolver preguntasPorAlumno y cantidadPreguntas " +
                "por separado. Revisá la versión implementada de Código.gs."
            );

            console.error("Configuración recibida:", {
                cantidadPreguntas: examen.cantidadPreguntas,
                preguntasPorAlumno: examen.preguntasPorAlumno,
                preguntasRecibidas: examen.preguntas.length
            });

            return;
        }

        if (
            !Number.isInteger(disponibles) ||
            disponibles !== examen.preguntas.length
        ) {
            console.warn(
                "La cantidad disponible guardada no coincide con el array recibido."
            );
        }

        configuracionExamen = examen;

        document.getElementById("nombreMateria").textContent =
            examen.materia || "Examen";

        console.log("Preguntas disponibles:", examen.preguntas.length);
        console.log("Preguntas que debe responder el alumno:", porAlumno);

    } catch (error) {
        console.error("Error cargando examen:", error);
        mostrarError(
            "No se pudo cargar el examen. Revisá tu conexión y Apps Script."
        );
    }
}


// ========================================
// MOSTRAR ERROR
// ========================================

function mostrarError(mensaje) {
    const inicio = document.getElementById("pantallaInicio");

    if (inicio) {
        inicio.style.display = "block";

        let aviso = document.getElementById("errorExamen");

        if (!aviso) {
            aviso = document.createElement("p");
            aviso.id = "errorExamen";
            inicio.prepend(aviso);
        }

        aviso.textContent = mensaje;
        aviso.style.color = "#b42318";
    }

    const pantalla = document.getElementById("pantallaExamen");

    if (pantalla) {
        pantalla.style.display = "none";
    }
}


// ========================================
// COMENZAR EXAMEN
// ========================================

function comenzarExamen() {
    if (!configuracionExamen) {
        alert("El examen todavía no está listo. Esperá un momento.");
        return;
    }

    nombreAlumno = document.getElementById("nombre").value.trim();
    cursoAlumno = document.getElementById("curso").value.trim();

    if (!nombreAlumno) {
        alert("Escribí tu nombre antes de comenzar.");
        return;
    }

    if (!cursoAlumno) {
        alert("Escribí tu curso antes de comenzar.");
        return;
    }

    const cantidad = Number(configuracionExamen.preguntasPorAlumno);

    // Seleccionar únicamente la cantidad configurada para cada alumno.
    preguntasSeleccionadas = mezclarArray(configuracionExamen.preguntas)
        .slice(0, cantidad);

    if (preguntasSeleccionadas.length !== cantidad) {
        mostrarError("No se pudo seleccionar la cantidad correcta de preguntas.");
        return;
    }

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

    document.getElementById("numeroPregunta").textContent =
        `Pregunta ${preguntaActual + 1} de ${preguntasSeleccionadas.length}`;

    document.getElementById("textoPregunta").textContent =
        pregunta.pregunta;

    const opciones = document.getElementById("opciones");
    opciones.innerHTML = "";

    document.getElementById("resultado").textContent = "";

    const respuestas = mezclarArray(
        pregunta.opciones.map((texto, indice) => ({
            texto,
            indiceOriginal: indice
        }))
    );

    respuestas.forEach((opcion) => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "opcion";
        boton.textContent = opcion.texto;

        boton.addEventListener("click", () => {
            comprobarRespuesta(opcion.indiceOriginal);
        });

        opciones.appendChild(boton);
    });
}


// ========================================
// COMPROBAR RESPUESTA
// ========================================

function comprobarRespuesta(respuestaElegida) {
    const pregunta = preguntasSeleccionadas[preguntaActual];
    const botones = document.querySelectorAll("#opciones .opcion");

    botones.forEach((boton) => {
        boton.disabled = true;
    });

    const resultado = document.getElementById("resultado");

    if (respuestaElegida === Number(pregunta.correcta)) {
        respuestasCorrectas++;
        resultado.textContent = "¡Correcto!";
        resultado.className = "correcto";
    } else {
        resultado.textContent =
            "Incorrecto. La respuesta correcta era: " +
            pregunta.opciones[Number(pregunta.correcta)];

        resultado.className = "incorrecto";
    }

    setTimeout(() => {
        preguntaActual++;
        mostrarPregunta();
    }, 1200);
}


// ========================================
// TERMINAR EXAMEN
// ========================================

function terminarExamen() {
    const pantalla = document.getElementById("pantallaExamen");
    const total = preguntasSeleccionadas.length;

    pantalla.innerHTML = "";

    const titulo = document.createElement("h2");
    titulo.textContent = "¡Examen terminado!";

    const resumen = document.createElement("p");
    resumen.textContent =
        `Respondiste correctamente ${respuestasCorrectas} de ${total} preguntas.`;

    pantalla.append(titulo, resumen);
}


// ========================================
// INICIAR CARGA
// ========================================

cargarExamen();
