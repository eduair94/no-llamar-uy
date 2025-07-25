# 📞 No Llamar API

Una API gratuita para consultar el registLa API estará disponible en `http://localhost:3000`

## ☁️ Despliegue en Vercel

Esta API puede desplegarse fácilmente en Vercel para uso en producción:

```bash
# 1. Conecta tu repositorio con Vercel
# 2. Vercel detectará automáticamente la configuración
# 3. Despliega con un clic
```

**⚠️ Nota importante**: Debido a las limitaciones de tiempo de las funciones serverless (10s Hobby / 60s Pro), se recomienda el plan Pro de Vercel para mejor rendimiento con CAPTCHAs complejos.

Ver [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) para instrucciones detalladas.

## 📋 Uso de la API"No Llame" de Uruguay, desarrollada como alternativa libre a [nollame.uy](https://nollame.uy/).

## 🎯 Descripción

Esta API permite verificar si un número telefónico uruguayo está registrado en el sistema "No Llame" de URSEC (Unidad Reguladora de Servicios de Comunicaciones). El sistema automatiza el proceso de consulta que normalmente se realiza manualmente a través del portal oficial de trámites de URSEC.

### ✨ Características

- ✅ Validación automática de números telefónicos uruguayos
- 🤖 Resolución automática de CAPTCHAs usando OCR (Tesseract.js)
- 🔄 Sistema de reintentos inteligente para mayor confiabilidad
- 📱 Normalización automática de formatos de teléfono
- 🆓 **Completamente gratuito y de código abierto**

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (versión 18 o superior)
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd no-llamar-api
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno (opcional)

Crear un archivo `.env` en la raíz del proyecto:

```env
NODE_ENV=development
PORT=3000

# Configuración de caché (opcional - ver CACHE_CONFIGURATION.md para detalles)
# MySQL (prioritario)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=no_llamar_cache

# MongoDB (alternativo)
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache

# Vercel Blob (fallback)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

> 📖 **Para configuración detallada del sistema de caché**, consulta [CACHE_CONFIGURATION.md](./CACHE_CONFIGURATION.md)

### 4. Compilar el proyecto

```bash
npm run build
```

### 5. Ejecutar la API

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

La API estará disponible en `http://localhost:3000`

## � Uso de la API

### Endpoint Principal

**GET** `/api/check/:phoneNumber[?ignoreCache=true]`

### Parámetros

- `phoneNumber`: Número telefónico uruguayo (puede incluir código de país +598 o no)

### Parámetros de consulta opcionales

- `ignoreCache`: (opcional) Si se establece en `true` o `1`, omite la caché y realiza una consulta nueva al sistema URSEC

### Ejemplos de uso

#### Consulta básica (usa caché si está disponible)

```bash
curl https://no-llamar-uy.vercel.app/api/check/95614500
```

#### Con código de país

```bash
curl https://no-llamar-uy.vercel.app/api/check/59895614500
```

#### Con formato internacional

```bash
curl https://no-llamar-uy.vercel.app/api/check/+59895614500
```

#### Ignorando caché (siempre consulta URSEC directamente)

```bash
curl "https://no-llamar-uy.vercel.app/api/check/95614500?ignoreCache=true"
```

## 📊 Respuesta de la API

### Respuesta exitosa

```json
{
  "success": true,
  "phoneNumber": "95614500",
  "validation": {
    "isValid": true,
    "formatted": "+598 95 614 500",
    "type": "Mobile"
  },
  "normalizedNumber": "95614500",
  "portalResponse": {
    "captchaSolveAttempts": 1,
    "response": "No se encontró el número ingresado en el Registro No llame",
    "isInRecord": false
  },
  "timestamp": "2025-07-22T00:17:18.073Z"
}
```

### Número registrado en "No Llame"

```json
{
  "success": true,
  "phoneNumber": "99123456",
  "validation": {
    "isValid": true,
    "formatted": "+598 99 123 456",
    "type": "Mobile"
  },
  "normalizedNumber": "99123456",
  "portalResponse": {
    "captchaSolveAttempts": 2,
    "response": "El número ingresado se encuentra en el Registro No llame",
    "isInRecord": true
  },
  "timestamp": "2025-07-22T00:17:25.451Z"
}
```

### Respuesta de error

```json
{
  "success": false,
  "error": "Invalid phone number format for Uruguay",
  "phoneNumber": "123456789",
  "timestamp": "2025-07-22T00:17:30.123Z"
}
```

## 🔧 Campos de Respuesta

| Campo | Descripción |
|-------|-------------|
| `success` | Indica si la consulta fue exitosa |
| `phoneNumber` | Número consultado (normalizado) |
| `validation.isValid` | Si el número tiene formato válido |
| `validation.formatted` | Número en formato internacional |
| `validation.type` | Tipo de línea (Mobile, Fixed Line, etc.) |
| `normalizedNumber` | Número en formato URSEC (8 dígitos) |
| `portalResponse.response` | Respuesta textual del portal URSEC |
| `portalResponse.isInRecord` | `true` si está en el registro No Llame |
| `portalResponse.captchaSolveAttempts` | Intentos de resolución del CAPTCHA |
| `timestamp` | Marca de tiempo de la consulta |
| `cached` | (opcional) `true` si la respuesta viene de caché |
| `cacheTimestamp` | (opcional) Fecha de cuando se guardó en caché |

## 💾 Sistema de Caché

La API implementa un sistema de caché inteligente multi-proveedor para mejorar el rendimiento:

### Proveedores de Caché Soportados

La API detecta automáticamente la configuración disponible y usa el mejor proveedor en este orden de prioridad:

1. **MySQL** (prioritario)
2. **MongoDB** 
3. **Vercel Blob** (fallback)

### Configuración de Proveedores

#### 🗄️ MySQL Cache

Para usar MySQL como sistema de caché, configura estas variables de entorno:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=no_llamar_cache
MYSQL_SSL=false
```

La API creará automáticamente la base de datos y las tablas necesarias. También incluye un script SQL de configuración manual en `mysql-setup.sql`.

#### 🍃 MongoDB Cache

Para usar MongoDB como sistema de caché:

```env
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache
# o
MONGO_URL=mongodb://localhost:27017/no-llamar-cache
```

#### ☁️ Vercel Blob Cache

Para usar Vercel Blob (recomendado para despliegues en Vercel):

```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Características del Caché

- **Duración**: 24 horas por defecto (configurable)
- **Alcance**: Por número de teléfono normalizado
- **Invalidación**: Automática por tiempo o manual con `ignoreCache=true`
- **Interfaz unificada**: Todos los proveedores implementan la misma interfaz
- **Auto-detección**: Selección automática del mejor proveedor disponible

### Comportamiento

- Las consultas exitosas se almacenan automáticamente en caché
- Las respuestas con errores no se cachean
- El parámetro `ignoreCache=true` omite completamente la caché
- Las respuestas cacheadas incluyen los campos `cached: true` y `cacheTimestamp`
- Limpieza automática de entradas expiradas (MySQL y MongoDB)

### Beneficios

- ⚡ **Respuesta rápida**: Respuestas instantáneas para números ya consultados
- 💰 **Menor costo**: Reduce llamadas al sistema URSEC
- 🔄 **Menor carga**: Evita resolver CAPTCHAs innecesariamente
- 🎯 **Mejor UX**: Experiencia más fluida para el usuario
- 🔧 **Flexibilidad**: Múltiples opciones de almacenamiento según el entorno

## 🏗️ Arquitectura

La API funciona siguiendo estos pasos:

1. **Validación**: Verifica y normaliza el número telefónico
2. **Sesión**: Establece una sesión con el portal de URSEC
3. **Navegación**: Extrae URLs de iframes y navega por el formulario
4. **Submission**: Envía el número al sistema de validación
5. **CAPTCHA**: Resuelve automáticamente el CAPTCHA usando OCR
6. **Resultado**: Extrae y procesa la respuesta final

## 🛠️ Tecnologías Utilizadas

### Core
- **Node.js + TypeScript**: Backend principal
- **Express**: Framework web
- **Axios**: Cliente HTTP para requests
- **Cheerio**: Parsing de HTML/XML
- **Tesseract.js**: OCR para resolución de CAPTCHAs
- **google-libphonenumber**: Validación de números telefónicos

### Cache Providers
- **MySQL2**: Driver para MySQL (cache prioritario)
- **MongoDB**: Driver oficial para MongoDB (cache alternativo)
- **@vercel/blob**: Cliente para Vercel Blob Storage (cache fallback)

## 📝 Scripts Disponibles

```bash
# Desarrollo y construcción
npm run dev      # Ejecutar en modo desarrollo
npm run build    # Compilar TypeScript
npm start        # Ejecutar en producción

# Testing y validación
npm run test:cache     # Probar todos los proveedores de caché
npm run test          # Ejecutar tests comprehensivos
npm run test:phone    # Probar PhoneChecker específicamente
npm run test:api      # Probar la API completa

# OCR API (opcional)
npm run start:ocr     # Ejecutar API de OCR por separado
npm run dev:ocr       # Ejecutar OCR API en modo desarrollo

# PM2 (gestión de procesos)
npm run pm2:start     # Iniciar con PM2
npm run pm2:stop      # Detener procesos PM2
npm run pm2:logs      # Ver logs de PM2
```

### 🧪 Probar los Proveedores de Caché

Para verificar que los proveedores de caché están funcionando correctamente:

```bash
# Probar todos los proveedores configurados
npm run test:cache

# O probar manualmente cada uno:
ts-node test-cache-providers.ts
```

Este script probará automáticamente todos los proveedores de caché disponibles según tu configuración de variables de entorno.

## ⚠️ Consideraciones Importantes

- **Rate Limiting**: Se recomienda implementar límites de velocidad para evitar sobrecarga del portal URSEC
- **Timeouts**: Las consultas pueden tomar 10-30 segundos debido al procesamiento de CAPTCHAs
- **Disponibilidad**: Depende de la disponibilidad del portal oficial de URSEC
- **Uso Responsable**: Esta herramienta debe usarse de manera responsable y ética

## 🚧 Limitaciones

- Solo funciona con números telefónicos uruguayos
- Requiere conexión a internet para acceder al portal URSEC
- La precisión del OCR puede variar según la complejidad del CAPTCHA
- Puede fallar si URSEC cambia la estructura de su portal

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Desarrollador

**Eduardo Airaudo**
- LinkedIn: [https://www.linkedin.com/in/eduardo-airaudo/](https://www.linkedin.com/in/eduardo-airaudo/)

---

### 💡 Motivación

Este proyecto fue desarrollado con el objetivo de proporcionar una **solución alternativa y gratuita** al servicio oficial de [nollame.uy](https://nollame.uy/), democratizando el acceso a la información del registro "No Llame" y permitiendo su integración en aplicaciones y sistemas de terceros.

### ⭐ ¿Te resultó útil?

Si este proyecto te ayudó, considera darle una estrella ⭐ en GitHub y compartirlo con otros desarrolladores.

---

**Nota**: Esta herramienta es independiente y no está afiliada oficialmente con URSEC. Su uso es bajo la responsabilidad del usuario final.
