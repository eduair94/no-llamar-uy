# 🚀 Despliegue en Vercel - No Llamar API

Esta guía te ayudará a desplegar la API de verificación de números de Uruguay en Vercel.

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub/GitLab/Bitbucket
- Node.js 18+ (configurado automáticamente por Vercel)

## 🔧 Configuración del Proyecto

### 📁 Estructura para Vercel

El proyecto ya está configurado con la estructura correcta para Vercel:

```
api/
├── index.ts           # Endpoint de health check
└── check/
    └── [number].ts    # Endpoint para verificar números
src/
├── PhoneChecker.ts    # Lógica de verificación
└── PhoneValidator.ts  # Validación de números
```

### ⚙️ Configuración (vercel.json)

```json
{
  "version": 2,
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    },
    "api/check/[number].ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🚀 Pasos para Desplegar

### 1. Preparar el repositorio
```bash
git add .
git commit -m "Add Vercel serverless configuration"
git push origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en "New Project"
3. Importa tu repositorio desde GitHub/GitLab/Bitbucket
4. Vercel detectará automáticamente que es un proyecto Node.js

### 3. Configurar el proyecto

- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: (déjalo vacío)
- **Install Command**: `npm install`

### 4. Variables de entorno (opcional)

Si necesitas variables de entorno adicionales:
- Ve a Settings → Environment Variables
- Agrega las variables necesarias

### 5. Desplegar

Haz clic en "Deploy" y espera a que se complete el despliegue.

## 📋 Uso de la API en Vercel

Una vez desplegada, tu API estará disponible en `https://tu-proyecto.vercel.app`

### Endpoints disponibles:

- **Health Check**: `GET /api`
- **Verificar número**: `GET /api/check/{numero}`

### Ejemplos de uso:

```bash
# Health check
curl https://tu-proyecto.vercel.app/api

# Verificar número de teléfono
curl https://tu-proyecto.vercel.app/api/check/98297150
curl https://tu-proyecto.vercel.app/api/check/59898297150
```

## ⚡ Consideraciones de Rendimiento

### Timeouts
- **Health check**: 30 segundos (más que suficiente)
- **Verificación de números**: 60 segundos (para procesar CAPTCHAs)

### Planes de Vercel
- **Hobby (Gratis)**: 10 segundos máximo - ⚠️ Puede causar timeouts
- **Pro ($20/mes)**: 60 segundos máximo - ✅ Recomendado

### OCR y CAPTCHAs en Serverless
- **Entorno local**: Usa OCR avanzado con múltiples configuraciones
- **Vercel serverless**: Usa OCR simplificado para evitar problemas de WASM
- **Fallback automático**: Si OCR falla, genera un intento razonable

### Cold Starts
Las funciones serverless pueden tener "cold starts" (arranque en frío):
- Primera petición puede tardar 2-3 segundos extra
- Peticiones posteriores son más rápidas

## 🔍 Monitoreo y Debugging

### Ver logs en tiempo real:
```bash
vercel logs tu-proyecto.vercel.app
```

### Acceder al dashboard:
1. Ve a tu proyecto en vercel.com
2. Pestaña "Functions" para ver el rendimiento
3. Pestaña "Analytics" para métricas de uso

## 🚨 Solución de Problemas

### Error: "Function timeout"
- Cambia al plan Pro de Vercel
- El plan gratuito tiene límite de 10 segundos

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Ejecuta `npm install` localmente para verificar

### Error de CAPTCHA/OCR
- Los errores de OCR son normales ocasionalmente
- La API tiene reintentos automáticos
- Revisa los logs para más detalles

## 🔄 Actualizaciones Automáticas

Cada vez que hagas push al repositorio:
1. Vercel desplegará automáticamente
2. Recibirás una URL de preview
3. Si todo está bien, se desplegará a producción

## 🌐 Dominio Personalizado (Opcional)

Para usar tu propio dominio:
1. Ve a Settings → Domains en tu proyecto
2. Agrega tu dominio
3. Configura los DNS según las instrucciones

---

¡Tu API estará lista para uso en producción! 🎉
