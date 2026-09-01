# CLAUDE.md

## Propósito

Este archivo guía a Claude Code al trabajar en cualquiera de los repositorios de este
curso. Define las reglas de comportamiento del asistente y las convenciones de código
que deben respetarse de forma transversal en todos los proyectos, sin importar su
lenguaje, framework o dominio de negocio.

Los proyectos del curso son ejercicios de práctica: usar Claude Code como asistente para
diagnosticar bugs reales, corregirlos, implementar nuevos requerimientos y documentar la
colaboración con el asistente durante ese proceso. El contexto de negocio, las tareas
concretas y la estructura específica de cada ejercicio se describen en la consigna de
cada proyecto, no en este archivo.

## Idioma / Language

- Always answer in English, regardless of the language used in the prompt.

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

## Contexto de cada proyecto

El contexto de negocio, las tareas específicas, la estructura de carpetas y las reglas de
negocio esperadas son propios de cada ejercicio y se encuentran en su consigna o
documentación (por ejemplo, un archivo `README.md` o un documento de consigna dentro del
repositorio). Antes de empezar, revisar esa documentación para entender el dominio y los
requerimientos concretos.

## Convenciones de trabajo

- Antes de empezar, entender la estructura del proyecto, sus scripts y cómo se ejecutan
  sus pruebas (`package.json`, `README.md`, consigna, etc.).
- Antes de dar por resuelta una tarea, ejecutar la suite de pruebas del proyecto y
  confirmar que todos los casos pasen.
- Respetar las herramientas y el enfoque de pruebas que ya usa el proyecto; no introducir
  dependencias ni frameworks nuevos sin autorización.

# Convenciones de Código

## Generales

- Escribir todo el código en inglés.
- Comentarios únicamente cuando agreguen valor (evitar los que describan algo obvio).
- Evitar código duplicado; eliminar variables y métodos sin uso; no dejar código comentado.
- Mantener métodos pequeños, con una única responsabilidad, priorizando claridad sobre complejidad.
- No utilizar valores "hardcodeados"; utilizar constantes o configuración cuando corresponda.

## Nomenclatura

### Variables

- camelCase, nombres descriptivos, evitar abreviaturas innecesarias.

```csharp
decimal totalAmount;
string customerName;
```

### Constantes

- PascalCase o UPPER_CASE según el estándar del proyecto; declararlas como readonly o const.

```csharp
const int MaxItems = 100;
```

### Métodos

- PascalCase, deben comenzar con un verbo.

```csharp
GetProducts()
CreateOrder()
CalculateDiscount()
```

### Clases

- PascalCase, sustantivos (`ProductService`, `OrderRepository`).

### Interfaces

- Prefijo I (`IProductRepository`).

### Enumeraciones

- PascalCase, valores también en PascalCase (`OrderStatus.Pending`).

## Formato

- Indentación de 4 espacios, una sola instrucción por línea, llaves siempre en líneas separadas.

```csharp
if (isValid)
{
    Save();
}
```

## Métodos

- Máximo recomendado 40–60 líneas, evitar más de 3 niveles de anidación, retornar temprano cuando sea posible.

## Variables

- Declararlas lo más cerca posible de donde se utilizan, en vez de declarar arriba y asignar después.

## Comentarios

- Evitar comentarios que describan código obvio; sí explicar el porqué de una decisión no evidente.

```csharp
// Se recalcula el precio porque el proveedor cambió la tarifa.
```

## Manejo de errores

- No capturar excepciones para ignorarlas.
- Registrar siempre los errores importantes.
- Lanzar excepciones con mensajes claros.

```csharp
catch (Exception ex)
{
    logger.LogError(ex, "Error updating product.");
    throw;
}
```

## SQL

- Utilizar consultas SARGables, evitar SELECT *, nombrar columnas explícitamente, usar índices adecuados y evitar cursores cuando exista alternativa.

## APIs

- Utilizar nombres REST.

```
GET    /products
POST   /products
PUT    /products/{id}
DELETE /products/{id}
```

## JavaScript / TypeScript

- Utilizar const siempre que sea posible; let únicamente cuando cambie el valor; evitar var.

## React

- Componentes en PascalCase, hooks al inicio del componente, evitar lógica compleja dentro del JSX, componentes pequeños y reutilizables.

## CSS

- Nombres descriptivos, evitar estilos inline, agrupar reglas relacionadas, mantener un orden consistente.

## Git

- Commits en presente (`Add product validation`, no `Fixed`).

## Pull Requests

- Una funcionalidad por PR, descripción clara, capturas cuando existan cambios visuales, referenciar el ticket correspondiente.

## Rendimiento

- Evitar consultas repetidas, minimizar llamadas a la base de datos, cachear información cuando aplique, evitar operaciones dentro de ciclos que puedan realizarse una sola vez.

## Seguridad

- Validar siempre la entrada del usuario, nunca confiar en datos provenientes del cliente, no exponer información sensible, utilizar consultas parametrizadas, no almacenar secretos en el código fuente.
