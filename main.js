import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ======================================================
// 🔑 Conexión a Supabase
// Reemplaza con tus credenciales
// ======================================================
const SUPABASE_URL = "https://jfonkgyyjakarqhixfvv.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmb25rZ3l5amFrYXJxaGl4ZnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTA4MjAsImV4cCI6MjA3NDMyNjgyMH0.80LpXXn6IHVPEvE8jwcsUv0xVSc54xxNtr8xSXpP1W4";


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================================================
// 📌 Elementos del DOM
// ======================================================
const formEquipo = document.getElementById("form-equipo");
const mensaje = document.getElementById("mensaje");
const tablaEquipos = document.getElementById("tabla-equipos");

const formPartido = document.getElementById("form-partido");
const mensajePartido = document.getElementById("mensaje-partido");
const selectLocal = document.getElementById("local");
const selectVisitante = document.getElementById("visitante");
const tablaPartidos = document.getElementById("tabla-partidos");

// ======================================================
// 🚀 REGISTRAR EQUIPO
// ======================================================
formEquipo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formEquipo);
  const nombre = formData.get("nombre");

  const { error } = await supabase
    .from("equipos")
    .insert([{ nombre, puntos: 0, gf: 0, gc: 0 }]);

  if (error) {
    mensaje.innerHTML = `<p style="color:red;">❌ Error: ${error.message}</p>`;
  } else {
    mensaje.innerHTML = `<p style="color:green;">✅ Equipo registrado</p>`;
    formEquipo.reset();
    cargarEquipos();
    cargarSelectEquipos();
  }
});

// ======================================================
// 🚀 LISTAR EQUIPOS (Tabla de posiciones)
// ======================================================
async function cargarEquipos() {
  const { data, error } = await supabase
    .from("equipos")
    .select("*")
    .order("puntos", { ascending: false });

  if (error) {
    console.error("Error cargando equipos:", error.message);
    return;
  }

  tablaEquipos.innerHTML = "";
  data.forEach((equipo) => {
    tablaEquipos.innerHTML += `
      <tr>
        <td>${equipo.nombre}</td>
        <td>${equipo.puntos}</td>
        <td>${equipo.gf}</td>
        <td>${equipo.gc}</td>
      </tr>
    `;
  });
}

// ======================================================
// 🚀 CARGAR EQUIPOS EN LOS SELECT DEL FORMULARIO PARTIDOS
// ======================================================
async function cargarSelectEquipos() {
  const { data, error } = await supabase.from("equipos").select("id, nombre");

  if (error) {
    console.error("Error cargando equipos:", error.message);
    return;
  }

  const selectLocal = document.getElementById("equipo-local");
  const selectVisitante = document.getElementById("equipo-visitante");

  selectLocal.innerHTML = "";
  selectVisitante.innerHTML = "";

  data.forEach(equipo => {
    const optionLocal = document.createElement("option");
    optionLocal.value = equipo.id;
    optionLocal.textContent = equipo.nombre;

    const optionVisitante = document.createElement("option");
    optionVisitante.value = equipo.id;
    optionVisitante.textContent = equipo.nombre;

    selectLocal.appendChild(optionLocal);
    selectVisitante.appendChild(optionVisitante);
  });
}

// ======================================================
// 🚀 REGISTRAR PARTIDO
// ======================================================
formPartido.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(formPartido);
  const local = formData.get("local");
  const visitante = formData.get("visitante");
  const goles_local = parseInt(formData.get("goles_local"));
  const goles_visitante = parseInt(formData.get("goles_visitante"));

  if (local === visitante) {
    mensajePartido.innerHTML = `<p style="color:red;">❌ No puedes elegir el mismo equipo</p>`;
    return;
  }

  // Guardar partido
  const { error } = await supabase
    .from("partidos")
    .insert([{ local, visitante, goles_local, goles_visitante }]);

  if (error) {
    mensajePartido.innerHTML = `<p style="color:red;">❌ Error: ${error.message}</p>`;
    return;
  }

  // Actualizar estadísticas
  await actualizarEstadisticas(local, visitante, goles_local, goles_visitante);

  mensajePartido.innerHTML = `<p style="color:green;">✅ Partido registrado</p>`;
  formPartido.reset();
  cargarEquipos();
  cargarSelectEquipos();
  cargarPartidos();
});

// ======================================================
// 🚀 ACTUALIZAR ESTADÍSTICAS DE EQUIPOS
// ======================================================
async function actualizarEstadisticas(local, visitante, gl, gv) {
  const { data: equipos } = await supabase
    .from("equipos")
    .select("*")
    .in("id", [local, visitante]);

  let eqLocal = equipos.find((e) => e.id == local);
  let eqVisitante = equipos.find((e) => e.id == visitante);

  eqLocal.gf += gl;
  eqLocal.gc += gv;
  eqVisitante.gf += gv;
  eqVisitante.gc += gl;

  if (gl > gv) {
    eqLocal.puntos += 3;
  } else if (gl < gv) {
    eqVisitante.puntos += 3;
  } else {
    eqLocal.puntos += 1;
    eqVisitante.puntos += 1;
  }

  await supabase.from("equipos").update(eqLocal).eq("id", eqLocal.id);
  await supabase.from("equipos").update(eqVisitante).eq("id", eqVisitante.id);
}

// ======================================================
// 🚀 LISTAR PARTIDOS JUGADOS
// ======================================================
async function cargarPartidos() {
  const { data, error } = await supabase
    .from("partidos")
    .select("id, local, visitante, goles_local, goles_visitante")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error cargando partidos:", error.message);
    return;
  }

  // obtener nombres de equipos
  const { data: equipos } = await supabase.from("equipos").select("id, nombre");

  tablaPartidos.innerHTML = "";
  data.forEach((p) => {
    const nombreLocal = equipos.find((e) => e.id === p.local)?.nombre || "N/A";
    const nombreVisitante = equipos.find((e) => e.id === p.visitante)?.nombre || "N/A";

    tablaPartidos.innerHTML += `
      <tr>
        <td>${nombreLocal}</td>
        <td>${p.goles_local}</td>
        <td>${nombreVisitante}</td>
        <td>${p.goles_visitante}</td>
      </tr>
    `;
  });
}

// conexión supabase
// variables DOM

// registrar equipo
// listar equipos
// registrar partido
// actualizar estadísticas
// listar partidos

const btnReset = document.getElementById("reset-torneo");
btnReset.addEventListener("click", async () => {
  // Borrar todos los partidos
  await supabase.from("partidos").delete().neq("id", 0);

  // Borrar todos los equipos
  await supabase.from("equipos").delete().neq("id", 0);

  // Recargar tablas y selectores
  cargarEquipos();
  cargarPartidos();
  cargarSelectEquipos();

  alert("✅ Torneo reiniciado correctamente");
});


// 🚀 Cargar datos iniciales
cargarEquipos();
cargarPartidos();
cargarSelectEquipos();
