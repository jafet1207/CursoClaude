// Precarga de reloj fijo para las pruebas de integración.
//
// Se carga con `node --require` ANTES de server.js, así que server.js no se toca ni se
// entera de que esto existe. Sobreescribe `Date` solo para las llamadas sin argumentos
// (que es como server.js obtiene "ahora" en hoyISO()); `new Date(x)` sigue funcionando
// igual que siempre. El instante fijo se recibe por la variable de entorno MOCK_NOW, para
// que la suite pueda construir bordes exactos (23h59, 24h, 24h01) sin depender del reloj
// real de la máquina donde corran las pruebas.
'use strict';

const RealDate = Date;
const fixedMs = process.env.MOCK_NOW ? RealDate.parse(process.env.MOCK_NOW) : RealDate.now();

if (Number.isNaN(fixedMs)) {
  throw new Error(`MOCK_NOW inválido: "${process.env.MOCK_NOW}"`);
}

class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(fixedMs);
    } else {
      super(...args);
    }
  }

  static now() {
    return fixedMs;
  }
}

global.Date = FixedDate;
