package config

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// loadEnvFile lee el archivo .env si existe en el directorio de trabajo (útil para entorno local)
func loadEnvFile() {
	file, err := os.Open(".env")
	if err != nil {
		return // En Render o Docker las variables vienen del sistema
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			if os.Getenv(k) == "" {
				_ = os.Setenv(k, v)
			}
		}
	}
}

// Database representa la clase/estructura administradora de la conexión a MongoDB.
// Implementa el patrón Singleton y maneja el pool de conexiones.
type Database struct {
	Client  *mongo.Client
	DB      *mongo.Database
	dbName  string
	uri     string
	timeout time.Duration
}

var (
	dbInstance *Database
	once       sync.Once
)

// GetDatabaseInstance inicializa o retorna la instancia global de conexión a la BD.
func GetDatabaseInstance() *Database {
	once.Do(func() {
		loadEnvFile()

		uri := os.Getenv("MONGO_URI")
		if uri == "" {
			log.Fatal("[FATAL] MONGO_URI no está configurada. Defina la variable en el archivo .env o en el entorno de Render.")
		}

		dbName := os.Getenv("MONGO_DB_NAME")
		if dbName == "" {
			dbName = "sgim_migracion"
		}

		dbInstance = &Database{
			uri:     uri,
			dbName:  dbName,
			timeout: 15 * time.Second,
		}
	})
	return dbInstance
}

// Connect establece la conexión con MongoDB aplicando pooling y verificación activa (Ping).
func (d *Database) Connect() error {
	ctx, cancel := context.WithTimeout(context.Background(), d.timeout)
	defer cancel()

	clientOptions := options.Client().
		ApplyURI(d.uri).
		SetMaxPoolSize(50).
		SetMinPoolSize(5).
		SetMaxConnIdleTime(30 * time.Second).
		SetConnectTimeout(10 * time.Second)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("error al conectar con MongoDB: %w", err)
	}

	// Verificación de conectividad (Ping)
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return fmt.Errorf("error al realizar ping a MongoDB: %w", err)
	}

	d.Client = client
	d.DB = client.Database(d.dbName)

	log.Printf("[MongoDB] Conectado exitosamente a la base de datos '%s' (MongoDB Atlas Cloud)", d.dbName)
	return nil
}

// Collection obtiene una colección de MongoDB por su nombre.
func (d *Database) Collection(name string) *mongo.Collection {
	if d.DB == nil {
		log.Fatalf("[MongoDB Error] Intento de acceso a la colección '%s' sin conexión establecida", name)
	}
	return d.DB.Collection(name)
}

// Ping valida que la conexión a MongoDB continúe saludable.
func (d *Database) Ping(ctx context.Context) error {
	if d.Client == nil {
		return fmt.Errorf("cliente MongoDB no inicializado")
	}
	return d.Client.Ping(ctx, readpref.Primary())
}

// Disconnect cierra el pool de conexiones de forma segura al detener la aplicación.
func (d *Database) Disconnect(ctx context.Context) error {
	if d.Client != nil {
		log.Println("[MongoDB] Cerrando conexiones con MongoDB...")
		return d.Client.Disconnect(ctx)
	}
	return nil
}
