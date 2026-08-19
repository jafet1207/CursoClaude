function listarFunciones(db) {
  return db
    .prepare(
      `SELECT FUNCION.*, SALA.nombre AS sala_nombre
       FROM FUNCION JOIN SALA ON SALA.id = FUNCION.sala_id
       WHERE FUNCION.cancelada = 0
       ORDER BY FUNCION.fecha_hora`
    )
    .all();
}

function obtenerFuncion(db, funcionId) {
  return db.prepare('SELECT * FROM FUNCION WHERE id = ?').get(funcionId);
}

module.exports = { listarFunciones, obtenerFuncion };
