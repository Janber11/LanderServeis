# ADR-001: Selección del modelo de datos e infraestructura de Base de Datos

## Contexto
La plataforma requiere gestionar expedientes de reparaciones e intervenciones del hogar. Las incidencias involucran a múltiples actores (clientes, operarios de diferentes especialidades como fontaneros, albañiles o pintores) y requieren almacenar estados de reparación cambiantes, trazabilidad de intervenciones e información de facturación consolidada.

Necesitamos un sistema de base de datos que permita iterar rápido durante el desarrollo, integrarse con la pila Node.js/Express y gestionar tanto datos semi-estructurados (direcciones, historiales) como relaciones explícitas.

## Decisión
Adoptaremos **MongoDB** gestionado mediante contenedores **Docker** en entorno de desarrollo local, utilizando **Mongoose** como ODM. 

Para el modelado de datos adoptaremos un enfoque híbrido:
1. **Embebido de subdocumentos**: Para las direcciones dentro de la entidad `USER` y el historial de estados/fotos en `INCIDENT`.
2. **Colección pivote/intermedia (`INCIDENT_WORKER`)**: Para gestionar la relación N:N entre incidencias y operarios, permitiendo asignar el rol concreto de cada profesional (ej. fontanería, albañilería, pintura) y su fecha de asignación.
3. **Colección `INVOICE` normalizada**: Para agrupar N incidencias en una única factura o presupuesto final.

## Consecuencias

### Positivas
* Alta flexiblidad para extender el perfil de cliente y añadir adjuntos/fotos a los partes sin modificar la estructura global.
* Control granular sobre qué profesional interviene en cada fase del expediente a través de la colección de asignaciones `INCIDENT_WORKER`.
* Permite la facturación agrupada (agrupar múltiples partes de trabajo en un único documento contable).

### Negativas
* Al mantener colecciones normalizadas (`INCIDENT_WORKER`, `INVOICE`), se pierde la atomicidad nativa de lectura de MongoDB en una sola consulta, requiriendo el uso de `.populate()` o agregaciones (`$lookup`) en Express.
* Requiere garantizar la integridad referencial desde la lógica de la aplicación en Node.js/Mongoose.
