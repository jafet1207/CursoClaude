const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearDbDePrueba } = require('./helpers');
const { crearApp } = require('../src/app');

function iniciarServidor() {
  const db = crearDbDePrueba();
  const logPath = path.join(os.tmpdir(), `notificaciones-${Date.now()}-${Math.random()}.log`);
  const app = crearApp({ db, logPath });
  const servidor = app.listen(0);
  const url = `http://127.0.0.1:${servidor.address().port}`;
  return { servidor, url, db, logPath };
}

test('recorrido completo: cartelera -> mapa -> reservar -> comprar -> confirmación', async () => {
  const { servidor, url, db, logPath } = iniciarServidor();
  try {
    const cartelera = await fetch(`${url}/`);
    assert.equal(cartelera.status, 200);
    const htmlCartelera = await cartelera.text();
    assert.match(htmlCartelera, /Película de prueba/);

    const mapa = await fetch(`${url}/funciones/1`);
    assert.equal(mapa.status, 200);
    const htmlMapa = await mapa.text();
    assert.match(htmlMapa, /disponible/);

    const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();

    const reservar = await fetch(`${url}/funciones/1/butacas/${butaca.id}/reservar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'nombre=Ana+P%C3%A9rez&email=ana%40example.com',
      redirect: 'manual',
    });
    assert.equal(reservar.status, 302);
    const destino = reservar.headers.get('location');
    assert.match(destino, /\/comprar/);

    const paginaCompra = await fetch(`${url}${destino}`);
    assert.equal(paginaCompra.status, 200);
    const htmlCompra = await paginaCompra.text();
    assert.match(htmlCompra, /3000/);

    const confirmar = await fetch(`${url}/funciones/1/butacas/${butaca.id}/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'nombre=Ana+P%C3%A9rez&email=ana%40example.com&tarifa=base',
      redirect: 'manual',
    });
    assert.equal(confirmar.status, 200);
    const htmlConfirmacion = await confirmar.text();
    const compra = db.prepare('SELECT * FROM COMPRA WHERE funcion_id = 1').get();
    assert.ok(compra);
    assert.match(htmlConfirmacion, new RegExp(compra.id));

    const mapaDespues = await fetch(`${url}/funciones/1`);
    const htmlMapaDespues = await mapaDespues.text();
    assert.match(htmlMapaDespues, /vendido/);

    fs.unlinkSync(logPath);
  } finally {
    servidor.close();
  }
});

test('reservar un asiento ya vendido responde con error explícito', async () => {
  const { servidor, url, db, logPath } = iniciarServidor();
  try {
    const butaca = db.prepare("SELECT id FROM BUTACA WHERE fila='A' AND numero=1").get();
    await fetch(`${url}/funciones/1/butacas/${butaca.id}/reservar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'nombre=Ana&email=ana%40example.com',
    });
    await fetch(`${url}/funciones/1/butacas/${butaca.id}/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'nombre=Ana&email=ana%40example.com&tarifa=base',
    });

    const segundoIntento = await fetch(`${url}/funciones/1/butacas/${butaca.id}/reservar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'nombre=Luis&email=luis%40example.com',
    });

    assert.equal(segundoIntento.status, 409);
    const texto = await segundoIntento.text();
    assert.match(texto, /ya no está disponible/i);
    fs.unlinkSync(logPath);
  } finally {
    servidor.close();
  }
});
