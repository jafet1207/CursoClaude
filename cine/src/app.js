const path = require('node:path');
const express = require('express');
const { listarFunciones, obtenerFuncion } = require('./cartelera');
const { mapaDeFuncion, reservarAsiento, estadoAsiento } = require('./mapaButacas');
const { calcularPrecio } = require('./tarifas');
const { confirmarCompra } = require('./compras');

function crearApp({ db, logPath }) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => {
    res.render('cartelera', { funciones: listarFunciones(db) });
  });

  app.get('/funciones/:funcionId', (req, res) => {
    const funcionId = Number(req.params.funcionId);
    const funcion = obtenerFuncion(db, funcionId);
    if (!funcion) return res.status(404).send('Esa función no está disponible.');

    res.render('mapa', { funcion, mapa: mapaDeFuncion(db, funcionId) });
  });

  app.post('/funciones/:funcionId/butacas/:butacaId/reservar', (req, res) => {
    const funcionId = Number(req.params.funcionId);
    const butacaId = Number(req.params.butacaId);
    const { nombre, email } = req.body;

    try {
      reservarAsiento(db, { funcionId, butacaId, clienteEmail: email });
    } catch (error) {
      return res.status(409).send(error.message);
    }

    const params = new URLSearchParams({ nombre, email });
    res.redirect(`/funciones/${funcionId}/butacas/${butacaId}/comprar?${params}`);
  });

  app.get('/funciones/:funcionId/butacas/:butacaId/comprar', (req, res) => {
    const funcionId = Number(req.params.funcionId);
    const butacaId = Number(req.params.butacaId);
    const funcion = obtenerFuncion(db, funcionId);
    const butaca = db.prepare('SELECT * FROM BUTACA WHERE id = ?').get(butacaId);
    if (!funcion || !butaca) return res.status(404).send('No encontrado.');

    const precio = calcularPrecio({
      precioBase: funcion.precio_base,
      tarifa: 'base',
      fechaHoraFuncion: funcion.fecha_hora,
    });

    res.render('comprar', {
      funcion,
      butaca,
      precio,
      nombre: req.query.nombre || '',
      email: req.query.email || '',
    });
  });

  app.post('/funciones/:funcionId/butacas/:butacaId/confirmar', (req, res) => {
    const funcionId = Number(req.params.funcionId);
    const butacaId = Number(req.params.butacaId);
    const { nombre, email, tarifa } = req.body;
    const funcion = obtenerFuncion(db, funcionId);
    const butaca = db.prepare('SELECT * FROM BUTACA WHERE id = ?').get(butacaId);

    let compra;
    try {
      compra = confirmarCompra(db, {
        funcionId,
        butacaId,
        tarifa,
        clienteNombre: nombre,
        clienteEmail: email,
        canal: 'online',
        logPath,
      });
    } catch (error) {
      return res.status(409).send(error.message);
    }

    res.render('confirmacion', { compra, funcion, butaca });
  });

  return app;
}

module.exports = { crearApp };
