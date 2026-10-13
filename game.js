// ========================================
// CONFIGURACIÓN
// ========================================

const URL_APPS_SCRIPT =
    "https://script.google.com/macros/s/AKfycbxBNzYK3YQbv5UVmrDMIUUE7RUHNVrRPj_4UvIs-PZ15IoCk9_ihgxucOQzPjWCyPEZ/exec";


// ========================================
// OBTENER ID DEL EXAMEN
// ========================================

const parametros =
    new URLSearchParams(
        window.location.search
    );

const idExamen =
    parametros.get("id");


// ========================================
// VARIABLES DEL EXAMEN
// ========================================

let configuracionExamen = null;

let preguntasSeleccionadas = [];

let preguntaActual = 0;

let respuestasCorrectas = 0;

let examenComenzado = false;


// ========================================
// CARGAR EXAMEN DESDE GOOGLE
// ========================================

async function cargarExamen() {

    if (!idExamen) {

        alert(
            "No se encontró el ID del examen."
        );

        return;
    }

    try {

        const respuesta =
            await fetch(
                URL_APPS_SCRIPT +
                "?id=" +
                encodeURIComponent(idExamen)
            );

        const datos =
            await respuesta.json();

        console.log(
            "Examen recibido:",
            datos
        );

        if (!datos.ok) {

            alert(
                "No se encontró ese examen."
            );

            return;
        }

        configuracionExamen =
            datos.examen;

        console.log(
            "Configuración cargada:",
            configuracionExamen
        );

        const nombreMateria =
            document.getElementById(
                "nombreMateria"
            );

        if (nombreMateria) {

            nombreMateria.textContent =
                configuracionExamen.materia;

        }

    } catch (error) {

        console.error(
            "Error cargando examen:",
            error
        );

        alert(
            "No se pudo cargar el examen."
        );

    }

}


// ========================================
// MEZCLAR ARRAY
// ========================================

function mezclarArray(array) {

    const copia =
        [...array];


    for (
        let i = copia.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );


        [
            copia[i],
            copia[j]
        ] =
        [
            copia[j],
            copia[i]
        ];

    }


    return copia;

}


// ========================================
// SELECCIONAR PREGUNTAS DEL ALUMNO
// ========================================

function seleccionarPreguntas() {

    const preguntas =
        configuracionExamen.preguntas;


    const cantidad =
        configuracionExamen.preguntasPorAlumno;


    // Mezclamos todas las preguntas

    const preguntasMezcladas =
        mezclarArray(preguntas);


    // Tomamos solamente la cantidad
    // que corresponde a cada alumno

    preguntasSeleccionadas =
        preguntasMezcladas.slice(
            0,
            cantidad
        );


    console.log(
        "Preguntas seleccionadas para este alumno:",
        preguntasSeleccionadas
    );

}


// ========================================
// COMENZAR EXAMEN
// ========================================

function comenzarExamen() {

    if (!configuracionExamen) {

        alert(
            "El examen todavía se está cargando. Esperá un momento."
        );

        return;
    }

    const nombre =
        document
            .getElementById("nombre")
            .value
            .trim();

    if (nombre === "") {

        alert(
            "Escribí tu nombre antes de comenzar."
        );

        return;
    }

    const curso =
        document
            .getElementById("curso")
            .value
            .trim();

    if (curso === "") {

        alert(
            "Escribí tu curso antes de comenzar."
        );

        return;
    }


    // ========================================
    // SELECCIONAR PREGUNTAS
    // ========================================

    seleccionarPreguntas();


    examenComenzado = true;

    preguntaActual = 0;

    respuestasCorrectas = 0;


    document.getElementById(
        "pantallaInicio"
    ).style.display = "none";


    document.getElementById(
        "pantallaExamen"
    ).style.display = "block";


    mostrarPregunta();

}


// ========================================
// MOSTRAR UNA SOLA PREGUNTA
// ========================================

function mostrarPregunta() {

    const preguntas =
        preguntasSeleccionadas;


    // ¿Terminamos?

    if (
        preguntaActual >=
        preguntas.length
    ) {

        terminarExamen();

        return;
    }


    // Obtener pregunta actual

    const pregunta =
        preguntas[preguntaActual];


    // ========================================
    // MEZCLAR LAS OPCIONES
    // ========================================

    const opcionesMezcladas =
        pregunta.opciones.map(
            (texto, indice) => ({
                texto: texto,
                indiceOriginal: indice
            })
        );


    // Mezclar aleatoriamente

    for (
        let i = opcionesMezcladas.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            opcionesMezcladas[i],
            opcionesMezcladas[j]
        ] =
        [
            opcionesMezcladas[j],
            opcionesMezcladas[i]
        ];

    }


    // ========================================
    // NÚMERO DE PREGUNTA
    // ========================================

    document.getElementById(
        "numeroPregunta"
    ).textContent =
        "Pregunta " +
        (preguntaActual + 1) +
        " de " +
        preguntas.length;


    // ========================================
    // TEXTO DE LA PREGUNTA
    // ========================================

    document.getElementById(
        "textoPregunta"
    ).textContent =
        pregunta.pregunta;


    // ========================================
    // CONTENEDOR DE OPCIONES
    // ========================================

    const opciones =
        document.getElementById(
            "opciones"
        );


    opciones.innerHTML = "";


    // Limpiar resultado anterior

    document.getElementById(
        "resultado"
    ).textContent = "";


    // ========================================
    // CREAR BOTONES
    // ========================================

    opcionesMezcladas.forEach(
        (opcion) => {

            const boton =
                document.createElement(
                    "button"
                );


            boton.textContent =
                opcion.texto;


            boton.type =
                "button";


            boton.className =
                "opcion";


            boton.onclick =
                function () {

                    comprobarRespuesta(
                        opcion.indiceOriginal
                    );

                };


            opciones.appendChild(
                boton
            );

        }
    );

}


// ========================================
// COMPROBAR RESPUESTA
// ========================================

function comprobarRespuesta(
    respuestaElegida
) {

    const pregunta =
        preguntasSeleccionadas[
            preguntaActual
        ];


    const botones =
        document.querySelectorAll(
            ".opcion"
        );


    // Evitar responder dos veces

    botones.forEach(
        boton => {

            boton.disabled = true;

        }
    );


    const resultado =
        document.getElementById(
            "resultado"
        );


    if (
        respuestaElegida ===
        pregunta.correcta
    ) {

        respuestasCorrectas++;


        resultado.textContent =
            "✅ ¡Correcto!";

    } else {

        resultado.textContent =
            "❌ Incorrecto. La respuesta correcta era: " +
            pregunta.opciones[
                pregunta.correcta
            ];

    }


    // Esperar antes de pasar
    // a la siguiente pregunta

    setTimeout(
        function () {

            preguntaActual++;

            mostrarPregunta();

        },
        1200
    );

}


// ========================================
// TERMINAR EXAMEN
// ========================================

function terminarExamen() {

    const pantalla =
        document.getElementById(
            "pantallaExamen"
        );


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
// COMENZAR A CARGAR
// ========================================

cargarExamen();
