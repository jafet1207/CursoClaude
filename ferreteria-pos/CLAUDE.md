# CLAUDE.md

## Propósito

Este archivo guía a Claude Code al trabajar en este repositorio. El proyecto es un
ejercicio de práctica: usar Claude Code como asistente para diagnosticar un bug real,
corregirlo, implementar un nuevo requerimiento y documentar la colaboración con el
asistente durante ese proceso.

## El asistente NO debe

- No modificar archivos de prueba (tests) a menos que se solicite explícitamente.
- No cambiar la arquitectura del proyecto sin autorización.
- No renombrar archivos, clases, métodos o variables existentes si no es estrictamente necesario.
- No refactorizar código que no esté relacionado con la solicitud.
- No eliminar código existente sin explicar el motivo.
- No cambiar el estilo de codificación ya utilizado en el proyecto.
- No agregar nuevas dependencias o librerías sin autorización.
- No modificar configuraciones del proyecto (package.json, tsconfig, appsettings, launchSettings, etc.) salvo que sea parte del requerimiento.
- No cambiar nombres de rutas, endpoints o contratos públicos sin indicarlo explícitamente.
- No asumir requerimientos que no hayan sido especificados.
- No generar código incompleto con comentarios como `// resto del código`.
- No utilizar datos ficticios cuando se espera trabajar con modelos o entidades existentes.
- No duplicar lógica existente; reutilizar funciones y componentes cuando sea posible.
- No eliminar comentarios escritos por el equipo sin autorización.
- No modificar migraciones existentes; crear nuevas cuando sea necesario.
- No cambiar el comportamiento de funcionalidades existentes si la solicitud corresponde a una nueva característica.
- No introducir cambios que degraden el rendimiento sin advertirlo.
- No exponer secretos, credenciales o cadenas de conexión en el código.

## Contexto del negocio

La Ferretería El Tornillo Feliz es un negocio familiar pequeño. Usa un script en
Node.js para calcular el total de sus ventas en caja. Un desarrollador junior
construyó la primera versión, pero desde hace unas semanas los clientes reclaman
que el total en pantalla "no cuadra" cuando compran grandes cantidades de un mismo
producto.

Por separado, la dueña pidió agregar el cálculo del Impuesto al Valor Agregado
(IVA, 13%) sobre el monto de la venta, algo que el script todavía no hace.

## Tareas de este ejercicio

1. Configurar el entorno de trabajo con Claude Code.
2. Diagnosticar y corregir el error de cálculo del descuento por compra al por mayor.
3. Implementar el cálculo del IVA (13%) sobre el subtotal ya con descuento aplicado.
4. Documentar el proceso de colaboración con el asistente (decisiones, prompts
   relevantes, hallazgos).

## Estructura del proyecto

- [src/carrito.js](src/carrito.js): lógica de cálculo del total de una venta
  (`calcularTotal`). Único módulo de lógica de negocio.
- [test/test-carrito.js](test/test-carrito.js): pruebas que describen el
  comportamiento esperado, incluyendo el caso del descuento por mayoreo y el
  nuevo requerimiento de IVA.
- `npm test` ejecuta `node test/test-carrito.js`.

## Reglas de negocio esperadas

- **Descuento por mayoreo**: se aplica un 10% de descuento sobre el subtotal
  cuando algún producto del carrito se compra en cantidad mayor a 10 unidades
  (no cuando el carrito tiene más de 10 líneas distintas).
- **IVA**: se calcula un 13% sobre el subtotal ya con el descuento aplicado, y
  se suma al total final.

## Convenciones de trabajo

- Antes de dar por resuelta una tarea, correr `npm test` y confirmar que todos
  los casos pasen.
- No agregar dependencias externas ni frameworks de pruebas: el proyecto usa
  únicamente `node:assert` y scripts planos por diseño, dado su tamaño.

# Convenciones de Código

## Generales

- Escribir todo el código en inglés.
- Comentarios únicamente cuando agreguen valor.
- Evitar código duplicado.
- Mantener métodos pequeños y con una única responsabilidad.
- Priorizar claridad sobre complejidad.
- No dejar código comentado.
- Eliminar variables y métodos sin uso.
- No utilizar valores "hardcodeados"; utilizar constantes o configuración cuando corresponda.

---

## Nomenclatura

### Variables

- camelCase
- Nombres descriptivos.
- Evitar abreviaturas innecesarias.

Correcto

```csharp
decimal totalAmount;
string customerName;
```

Incorrecto

```csharp
decimal t;
string nm;
```

---

### Constantes

- PascalCase o UPPER_CASE según el estándar del proyecto.
- Declararlas como readonly o const cuando corresponda.

```csharp
const int MaxItems = 100;
```

---

### Métodos

- PascalCase.
- Deben comenzar con un verbo.

Ejemplos

```csharp
GetProducts()
CreateOrder()
ValidatePrice()
CalculateDiscount()
```

---

### Clases

- PascalCase.
- Sustantivos.

```csharp
ProductService
OrderRepository
PriceValidator
```

---

### Interfaces

- Prefijo I.

```csharp
IProductRepository
IPriceService
```

---

### Enumeraciones

- PascalCase.

```csharp
OrderStatus
PriceType
```

Valores:

```csharp
Pending
Completed
Cancelled
```

---

## Formato

- Indentación de 4 espacios.
- Una sola instrucción por línea.
- Llaves siempre en líneas separadas.

Correcto

```csharp
if (isValid)
{
    Save();
}
```

Incorrecto

```csharp
if(isValid){Save();}
```

---

## Métodos

- Máximo recomendado: 40–60 líneas.
- Evitar más de 3 niveles de anidación.
- Retornar temprano cuando sea posible.

Correcto

```csharp
if (customer == null)
{
    return;
}
```

---

## Variables

Declararlas lo más cerca posible de donde se utilizan.

Evitar:

```csharp
string result;

// muchas líneas...

result = GetValue();
```

Preferir:

```csharp
string result = GetValue();
```

---

## Comentarios

Evitar comentarios que describan código obvio.

Incorrecto

```csharp
// Incrementa i
i++;
```

Correcto

```csharp
// Se recalcula el precio porque el proveedor cambió la tarifa.
```

---

## Manejo de errores

- No capturar excepciones para ignorarlas.
- Registrar siempre los errores importantes.
- Lanzar excepciones con mensajes claros.

Incorrecto

```csharp
catch
{
}
```

Correcto

```csharp
catch (Exception ex)
{
    logger.LogError(ex, "Error updating product.");
    throw;
}
```

---

## SQL

- Utilizar consultas SARGables.
- Evitar SELECT *.
- Nombrar columnas explícitamente.
- Utilizar índices adecuados.
- Evitar cursores cuando exista alternativa.

---

## APIs

- Utilizar nombres REST.

Correcto

```
GET    /products
POST   /products
PUT    /products/{id}
DELETE /products/{id}
```

---

## JavaScript / TypeScript

- Utilizar const siempre que sea posible.
- Utilizar let únicamente cuando cambie el valor.
- Evitar var.

---

## React

- Componentes en PascalCase.
- Hooks al inicio del componente.
- Evitar lógica compleja dentro del JSX.
- Componentes pequeños y reutilizables.

---

## CSS

- Utilizar nombres descriptivos.
- Evitar estilos inline.
- Agrupar reglas relacionadas.
- Mantener un orden consistente.

---

## Git

Commits en presente.

Correcto

```
Add product validation
Fix login bug
Update API endpoint
```

Evitar

```
Fixed
Changes
Update stuff
```

---

## Pull Requests

- Una funcionalidad por PR.
- Descripción clara.
- Capturas cuando existan cambios visuales.
- Referenciar el ticket correspondiente.

---

## Rendimiento

- Evitar consultas repetidas.
- Minimizar llamadas a la base de datos.
- Cachear información cuando aplique.
- Evitar operaciones dentro de ciclos que puedan realizarse una sola vez.

---

## Seguridad

- Validar siempre la entrada del usuario.
- Nunca confiar en datos provenientes del cliente.
- No exponer información sensible.
- Utilizar consultas parametrizadas.
- No almacenar secretos en el código fuente.
