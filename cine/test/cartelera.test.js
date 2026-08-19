const test = require('node:test');
const assert = require('node:assert/strict');
const { crearDbDePrueba } = require('./helpers');
const { listarFunciones, obtenerFuncion } = require('../src/cartelera');

test('listarFunciones devuelve las funciones sembradas con su sala', () => {
  const db = crearDbDePrueba();

  const funciones = listarFunciones(db);

  assert.equal(funciones.length, 1);
  assert.equal(funciones[0].pelicula_nombre, 'Película de prueba');
  assert.equal(funciones[0].sala_nombre, 'Sala Grande');
});

test('obtenerFuncion devuelve null si la función no existe', () => {
  const db = crearDbDePrueba();

  assert.equal(obtenerFuncion(db, 999), undefined);
});
