# ==============================================================================
# Dockerfile Multi-Stage para SGIM Migración Ecuador (Go + React Vite + MongoDB)
# Optimizado para despliegue automático en Render (Web Service Docker)
# ==============================================================================

# ------------------------------------------------------------------------------
# Etapa 1: Compilación de Frontend (React + TypeScript + Tailwind + Vite)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Etapa 2: Compilación de Backend (Go 1.22 MVC)
# ------------------------------------------------------------------------------
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . ./

# Compilar binario estático optimizado para Linux de producción
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server main.go

# ------------------------------------------------------------------------------
# Etapa 3: Imagen de Ejecución Ligera (Producción)
# ------------------------------------------------------------------------------
FROM alpine:3.19
WORKDIR /app

# Certificados SSL para conexión segura TLS a MongoDB Atlas
RUN apk --no-cache add ca-certificates tzdata

# Copiar el binario del backend
COPY --from=backend-builder /app/server ./server

# Copiar la carpeta compilada del frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Render inyecta dinámicamente la variable PORT en tiempo de ejecución
ENV PORT=8080
EXPOSE 8080

CMD ["./server"]

