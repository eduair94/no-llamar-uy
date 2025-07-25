# 💾 Cache System Configuration Guide

La API "No Llamar" implementa un sistema de caché multi-proveedor para mejorar el rendimiento y reducir la carga en el sistema URSEC. Esta guía explica cómo configurar y usar cada proveedor de caché.

## 🎯 Resumen del Sistema

El sistema de caché utiliza **auto-detección** basada en variables de entorno para seleccionar automáticamente el mejor proveedor disponible siguiendo este orden de prioridad:

1. **MySQL** (prioritario)
2. **MongoDB** 
3. **Vercel Blob** (fallback)

## 🗄️ MySQL Cache Configuration

### Instalación y Configuración

MySQL es el proveedor de caché prioritario debido a su rendimiento y confiabilidad.

#### Variables de Entorno Requeridas

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=no_llamar_cache
MYSQL_SSL=false
```

#### Setup Automático

La API creará automáticamente:
- La base de datos `no_llamar_cache` si no existe
- La tabla `phone_cache` con el esquema optimizado
- Índices para mejor rendimiento
- Event scheduler para limpieza automática de caché expirado

#### Setup Manual (Opcional)

Si prefieres configurar manualmente, puedes usar el script SQL incluido:

```bash
mysql -u root -p < mysql-setup.sql
```

#### Características

- ✅ **TTL automático**: Limpieza cada hora de entradas > 24 horas
- ✅ **Índices optimizados**: Búsquedas rápidas por número de teléfono
- ✅ **JSON storage**: Almacenamiento eficiente de datos complejos
- ✅ **Connection pooling**: Manejo eficiente de conexiones
- ✅ **Transacciones ACID**: Garantías de integridad de datos

## 🍃 MongoDB Cache Configuration

### Instalación y Configuración

MongoDB es ideal para aplicaciones que ya utilizan este stack.

#### Variables de Entorno Requeridas

```env
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache
# o alternativamente
MONGO_URL=mongodb://localhost:27017/no-llamar-cache
```

#### Setup Automático

La API creará automáticamente:
- La base de datos `no_llamar_cache`
- La colección `phone_cache`
- Índice TTL para expiración automática
- Índices compuestos para optimización

#### Ejemplo de URL de Conexión

```bash
# MongoDB local
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache

# MongoDB Atlas (Cloud)
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/no-llamar-cache

# MongoDB con autenticación
MONGODB_URL=mongodb://username:password@localhost:27017/no-llamar-cache?authSource=admin
```

#### Características

- ✅ **TTL nativo**: Expiración automática mediante índices TTL
- ✅ **Esquema flexible**: Adaptable a cambios futuros
- ✅ **Replicación**: Soporte para clusters replicados
- ✅ **Aggregation**: Estadísticas avanzadas de caché

## ☁️ Vercel Blob Cache Configuration

### Configuración

Vercel Blob es el proveedor de fallback y es ideal para despliegues en Vercel.

#### Variables de Entorno Requeridas

```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

#### Obtener el Token

1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a Settings → Environment Variables
4. Crea `BLOB_READ_WRITE_TOKEN` con un token de Vercel Blob

#### Características

- ✅ **Serverless friendly**: Perfecto para Vercel y otros serverless
- ✅ **CDN global**: Distribución mundial
- ✅ **Zero config**: Funciona sin configuración adicional
- ⚠️ **Limitaciones**: Sin limpieza automática de expirados

## 🔧 Configuración de Desarrollo

### Archivo .env de Ejemplo

```env
# Configuración de desarrollo completa
NODE_ENV=development
PORT=3000

# MySQL Cache (prioritario)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secretpassword
MYSQL_DATABASE=no_llamar_cache
MYSQL_SSL=false

# MongoDB Cache (alternativo)
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache

# Vercel Blob Cache (fallback)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxx
```

### Configuración de Producción

#### Para despliegues en Vercel:
```env
NODE_ENV=production
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxx
```

#### Para servidores dedicados:
```env
NODE_ENV=production
MYSQL_HOST=your-mysql-host.com
MYSQL_USER=api_user
MYSQL_PASSWORD=secure_password
MYSQL_DATABASE=no_llamar_cache
MYSQL_SSL=true
```

## 🧪 Testing del Sistema de Caché

### Probar Todos los Proveedores

```bash
npm run test:cache
```

### Test Manual

```bash
ts-node test-cache-providers.ts
```

### Verificar Configuración

```bash
# Verificar que las variables estén configuradas
echo $MYSQL_HOST
echo $MONGODB_URL
echo $BLOB_READ_WRITE_TOKEN
```

## 📊 Monitoreo y Estadísticas

### API de Estadísticas

Puedes acceder a estadísticas del caché mediante el endpoint:

```bash
curl https://tu-api.com/api/cache/stats
```

### Logs del Sistema

Los logs mostrarán automáticamente qué proveedor de caché está siendo utilizado:

```
🔄 Auto-detected MySQL configuration, using MySQL cache service
✅ Connected to MySQL successfully
📋 Table 'phone_cache' ensured with proper schema
```

## 🔄 Switching Between Providers

Para cambiar entre proveedores:

1. **Deshabilitar el actual**: Remover o comentar las variables de entorno
2. **Habilitar el nuevo**: Configurar las variables del nuevo proveedor  
3. **Restart**: Reiniciar la aplicación

### Ejemplo: De MySQL a MongoDB

```bash
# Comentar MySQL
# MYSQL_HOST=localhost
# MYSQL_USER=root
# ...

# Habilitar MongoDB
MONGODB_URL=mongodb://localhost:27017/no-llamar-cache
```

## 🐛 Troubleshooting

### MySQL Issues

```bash
# Verificar conexión
mysql -h localhost -u root -p

# Verificar que el evento scheduler esté habilitado
mysql> SHOW VARIABLES LIKE 'event_scheduler';

# Ver logs de eventos
mysql> SHOW EVENTS;
```

### MongoDB Issues

```bash
# Verificar conexión
mongosh "mongodb://localhost:27017/no-llamar-cache"

# Ver colecciones
> show collections

# Ver índices
> db.phone_cache.getIndexes()
```

### Vercel Blob Issues

```bash
# Verificar token en Vercel dashboard
# Asegurar que el token tenga permisos de lectura/escritura
```

## ⚡ Performance Tips

### MySQL
- Usar connection pooling (ya implementado)
- Configurar `innodb_buffer_pool_size` adecuadamente
- Monitorear slow queries

### MongoDB
- Usar índices compuestos para queries frecuentes
- Configurar read preferences según uso
- Monitorear operaciones lentas

### Vercel Blob
- Minimizar operaciones de escritura
- Usar compresión para datos grandes
- Implementar retry logic

## 🔐 Security Best Practices

### Variables de Entorno
- Nunca hardcodear credenciales
- Usar servicios de secrets management en producción
- Rotar credenciales regularmente

### Acceso a Base de Datos
- Usar usuarios con permisos mínimos necesarios
- Habilitar SSL/TLS en producción
- Configurar firewalls apropiados

### Monitoreo
- Habilitar logs de acceso
- Monitorear conexiones inusuales
- Alertas por fallos de autenticación
