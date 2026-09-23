# ADR-002: Estructura y organización del repositorio de código

## Contexto
Es necesario definir la estrategia de control de versiones y empaquetado del proyecto para separar la API del sistema de gestión (backend) de las interfaces de usuario web/móvil (frontend).

## Decisión
Aoptaremos por una arquitectura de **repositorios independientes** (Polyrepo). Este repositorio mantendrá de forma exclusiva el servidor **backend** (Node.js/Express/Mongoose), el entorno de desarrollo contenerizado con Docker y la documentación técnica correspondiente en `/docs`.

## Consecuencias

### Positivas
* Aislamiento de dependencias y entornos de ejecución (`package.json` propio para backend).
* Despliegues independientes (simplifica subir el backend a plataformas como Render o Fly.io sin acoplarlo al frontend).
* Claridad en el historial de commits y control de acceso.

### Negativas
* Obliga a coordinar cambios de contrato en la API entre repositorios distintos.
