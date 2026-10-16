
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
let horaInicio = null;
let examenTerminado = false;


// ========================================
// MEZCLAR ELEMENTOS ALEATORIAMENTE
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
// CARGAR EXAMEN
// ========================================

async function cargarExamen() {
    if (!idExamen) {
        mostrarError("No se encontró el ID del examen.");
        return;
    }

    try {
        const respuesta = await fetch(
            URL_APPS_SCRIPT + "?id=" + encodeURIComponent(idExamen)
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.ok || !datos.examen) {
            mostrarError("No se encontró ese examen.");
            return;
        }

        const examen = datos.examen;
        const cantidadPorAlumno = Number(examen.preguntasPorAlumno);

        if (
            !Array.isArray(examen.preguntas) ||
            !Number.isInteger(cantidadPorAlumno) ||
            cantidadPorAlumno < 1 ||
            cantidadPorAlumno > examen.preguntas.length
        ) {
            mostrarError("La configuración de las preguntas no es válida.");
            return;
        }

        configuracionExamen = examen;

        document.getElementById("nombreMateria").textContent =
            examen.materia || "Examen";

        console.log("Preguntas disponibles:", examen.preguntas.length);
        console.log("Preguntas por alumno:", cantidadPorAlumno);

    } catch (error) {
        console.error("Error cargando examen:", error);
        mostrarError("No se pudo cargar el examen.");
    }
}


// ========================================
// MOSTRAR ERROR
// ========================================

function mostrarError(mensaje) {
    const inicio = document.getElementById("pantallaInicio");

    if (!inicio) {
        alert(mensaje);
        return;
    }

    let aviso = document.getElementById("errorExamen");

    if (!aviso) {
        aviso = document.createElement("p");
        aviso.id = "errorExamen";
        inicio.prepend(aviso);
    }

    aviso.textContent = mensaje;
    aviso.style.color = "#b42318";
}


// ========================================
// COMENZAR EXAMEN
// ========================================

function comenzarExamen() {
    if (!configuracionExamen) {
        alert("El examen todavía se está cargando. Esperá un momento.");
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

    preguntasSeleccionadas = mezclarArray(configuracionExamen.preguntas)
        .slice(0, cantidad);

    if (preguntasSeleccionadas.length !== cantidad) {
        alert("No se pudieron seleccionar las preguntas.");
        return;
    }

    preguntaActual = 0;
    respuestasCorrectas = 0;
    examenTerminado = false;

    horaInicio = new Date();

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

    const resultado = document.getElementById("resultado");
    resultado.textContent = "";
    resultado.className = "";

    const respuestasMezcladas = mezclarArray(
        pregunta.opciones.map((texto, indice) => ({
            texto,
            indiceOriginal: indice
        }))
    );

    respuestasMezcladas.forEach((opcion) => {
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
    if (examenTerminado) return;

    const pregunta = preguntasSeleccionadas[preguntaActual];

    const botones = document.querySelectorAll("#opciones .opcion");

    // Impedir que el alumno responda más de una vez.
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
// TERMINAR Y GUARDAR RESULTADO
// ========================================

async function terminarExamen() {
    if (examenTerminado) return;

    examenTerminado = true;

    const pantalla = document.getElementById("pantallaExamen");
    const total = preguntasSeleccionadas.length;

    const nota = Math.round(
        (respuestasCorrectas / total) * 100
    ) / 10;

    const horaFin = new Date();

    const duracionMilisegundos =
        horaFin.getTime() - horaInicio.getTime();

    const duracionSegundos = Math.max(
        0,
        Math.floor(duracionMilisegundos / 1000)
    );

    const minutos = Math.floor(duracionSegundos / 60);
    const segundos = duracionSegundos % 60;

    const tiempoTotal =
        `${minutos} min ${segundos} seg`;

    const horaInicioTexto = horaInicio.toLocaleString("es-AR");

    pantalla.innerHTML = `
        <h2>¡Examen terminado!</h2>
        <p>Alumno: ${escaparHTML(nombreAlumno)}</p>
        <p>Respuestas correctas: ${respuestasCorrectas} de ${total}</p>
        <p>Nota: ${nota.toFixed(1)}</p>
        <p>Tiempo total: ${tiempoTotal}</p>
        <p id="estadoGuardado">Guardando resultado...</p>
    `;

    try {
        const respuesta = await fetch(URL_APPS_SCRIPT, {
            method: "POST",
            body: JSON.stringify({
                accion: "guardarResultado",
                idExamen: idExamen,
                alumno: nombreAlumno,
                nota: nota,
                aciertos: `${respuestasCorrectas}/${total}`,
                horaInicio: horaInicioTexto,
                tiempoTotal: tiempoTotal
            })
        });

        const datos = await respuesta.json();

        const estado = document.getElementById("estadoGuardado");

        if (!respuesta.ok || !datos.ok) {
            throw new Error(datos.error || "No se pudo guardar el resultado.");
        }

        estado.textContent = "✅ Resultado guardado correctamente.";

    } catch (error) {
        console.error("Error guardando resultado:", error);

        const estado = document.getElementById("estadoGuardado");

        if (estado) {
            estado.textContent =
                "⚠️ No se pudo confirmar el guardado. Avisale a la profesora.";
        }
    }
}


// ========================================
// EVITAR QUE EL NOMBRE ROMPA EL HTML
// ========================================

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);
}


// ========================================
// CARGAR EXAMEN AL ABRIR LA PÁGINA
// ========================================

cargarExamen();
