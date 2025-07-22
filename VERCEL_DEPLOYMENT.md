# 🚀 Despliegue en Vercel

Esta guía te ayudará a desplegar la API No Llamar en Vercel.

## ⚠️ Consideraciones Importantes

Antes de desplegar en Vercel, ten en cuenta las siguientes limitaciones:

### 🕐 Tiempo de Ejecución
- **Hobby Plan**: 10 segundos máximo por función
- **Pro Plan**: 60 segundos máximo por función
- La resolución de CAPTCHA puede tomar 10-30 segundos

### 🤖 OCR/CAPTCHA
- Tesseract.js puede ser lento en entornos serverless
- Recomendado usar el plan Pro de Vercel para mayor tiempo límite
- Los CAPTCHAs complejos pueden causar timeouts

## 📋 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Asegúrate de que todos los archivos estén commiteados
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Importa tu repositorio `no-llamar-uy`

### 3. Configuración del Proyecto

Vercel detectará automáticamente que es un proyecto Node.js. Las configuraciones están en `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "functions": {
    "src/index.ts": {
      "maxDuration": 60
    }
  }
}
```

### 4. Variables de Entorno (Opcional)

En el dashboard de Vercel, puedes agregar variables de entorno:

- `NODE_ENV`: `production`
- Otras variables según necesites

### 5. Desplegar

Vercel desplegará automáticamente cuando hagas push a la rama principal:

```bash
git push origin main
```

## 🌐 URLs de Ejemplo

Una vez desplegado, tu API estará disponible en una URL como:
```
https://tu-proyecto.vercel.app/check/95614500
https://tu-proyecto.vercel.app/health
```

## 🐛 Troubleshooting

### Timeout Errors
- Considera upgradar a Vercel Pro para mayor tiempo límite
- Optimiza el código de OCR para mejor performance

### CAPTCHA Issues
- Los CAPTCHAs muy complejos pueden fallar
- El sistema automáticamente reintenta hasta 3 veces

### Memory Issues
- Vercel tiene límites de memoria en funciones serverless
- Tesseract.js puede consumir bastante memoria

## 📊 Monitoreo

- Usa el dashboard de Vercel para ver logs y performance
- Monitorea los timeouts y errores en la sección Functions

## 🔄 Alternativas para Producción

Para un uso intensivo, considera:

1. **VPS/Dedicated Server**: Sin límites de tiempo
2. **Docker + Cloud Run**: Mejor control sobre recursos
3. **Railway/Render**: Alternativas con menos restricciones

## 📞 Soporte

Si encuentras problemas específicos de Vercel, revisa:
- [Documentación de Vercel](https://vercel.com/docs)
- [Límites de Functions](https://vercel.com/docs/functions/serverless-functions/runtimes#limits)
