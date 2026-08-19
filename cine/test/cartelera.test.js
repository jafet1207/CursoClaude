const test = require('node:test');
const assert = require('node:assert/strict');
const { crearDbDePrueba } = require('./helpers');
const { listarFunciones, obtenerFuncion } = require('../src/cartelera');

test('listarFunciones devuelve las funciones sembradas con su sala', () => {
  const db = crearDbDePrueba();

  const funciones = listarFunciones(db);

  assert.equal(funciones.length, 2);
  assert.equal(funciones[0].sala_nombre, 'Sala Grande');
  assert.ok(funciones.some((f) => f.pelicula_nombre === 'Película de prueba'));
});

test('obtenerFuncion devuelve null si la función no existe', () => {
  const db = crearDbDePrueba();

  assert.equal(obtenerFuncion(db, 999), undefined);
});
