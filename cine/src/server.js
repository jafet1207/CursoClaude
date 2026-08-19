const path = require('node:path');
const fs = require('node:fs');
const { openDb } = require('./db');
const { crearApp } = require('./app');
const { DB_PATH, sembrar } = require('./seed');

const LOG_PATH = path.join(__dirname, '..', 'data', 'notificaciones.log');
const PORT = process.env.PORT || 3000;

if (!fs.existsSync(DB_PATH)) {
  sembrar();
}

const db = openDb(DB_PATH);
const app = crearApp({ db, logPath: LOG_PATH });

app.listen(PORT, () => {
  console.log(`Cine Variedades escuchando en http://localhost:${PORT}`);
});
