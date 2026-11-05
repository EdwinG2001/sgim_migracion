package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/middlewares"
	"sgim_migracion/models"
	"sgim_migracion/models/filters"
	"sgim_migracion/views"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PublicTramiteController struct{}

func NewPublicTramiteController() *PublicTramiteController {
	return &PublicTramiteController{}
}

// TramiteDetalladoDTO incluye campos del trámite y tablas satélite (direcciones, núcleo, teléfonos)
type TramiteDetalladoDTO struct {
	TipoTramite string `json:"tipo_tramite"` // refugio, prorroga, visa, censo, movimiento
	Username    string `json:"username,omitempty"`
	Token       string `json:"token,omitempty"`
	PersonaID   string `json:"persona_id,omitempty"`

	// Datos del Trámite Específico
	MotivoSalida    string `json:"motivo_salida,omitempty"`
	FechaIngreso    string `json:"fecha_ingreso,omitempty"` // YYYY-MM-DD
	TipoVisa        string `json:"tipo_visa,omitempty"`     // trabajo, estudios, etc.
	DiasExtension   int    `json:"dias_extension,omitempty"`
	TipoMovimiento  string `json:"tipo_movimiento,omitempty"`
	PuntoControl    string `json:"punto_control,omitempty"`
	MedioTransporte string `json:"medio_transporte,omitempty"`
	MotivoViaje     string `json:"motivo_viaje,omitempty"`

	// Domicilio en Ecuador (Colección 'direcciones')
	Provincia      string `json:"provincia,omitempty"`
	Canton         string `json:"canton,omitempty"`
	Parroquia      string `json:"parroquia,omitempty"`
	CallePrincipal string `json:"calle_principal,omitempty"`

	// Familiar Acompañante (Colección 'nucleo_familiar')
	FamiliarNombres   string `json:"familiar_nombres,omitempty"`
	FamiliarApellidos string `json:"familiar_apellidos,omitempty"`
	FamiliarDocumento string `json:"familiar_documento,omitempty"`
	FamiliarParentesco string `json:"familiar_parentesco,omitempty"` // conyuge, hijo, etc.

	// Teléfono adicional (Colección 'telefonos')
	TelefonoAdicional string `json:"telefono_adicional,omitempty"`

	// Datos Biométricos (Colección 'biometricos' para Censo Migratorio)
	CodigoDactilar string `json:"codigo_dactilar,omitempty"`
	DedoRegistro   string `json:"dedo_registro,omitempty"`
	FotoURL        string `json:"foto_url,omitempty"`

	// Asistencia Humanitaria / Beneficios Legales (Colección 'beneficios')
	SolicitarBeneficio bool   `json:"solicitar_beneficio,omitempty"`
	TipoBeneficio      string `json:"tipo_beneficio,omitempty"` // salud, educacion, trabajo, cedula
}

// SolicitarTramite procesa la solicitud de un usuario autenticado llenando sus tablas satélite
func (c *PublicTramiteController) SolicitarTramite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto TramiteDetalladoDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload JSON inválido", err.Error())
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var uID primitive.ObjectID
	var personaID primitive.ObjectID
	var user models.Usuario
	var persona models.Persona

	// 1. Intentar obtener el usuario desde el JWT Context
	claims, errClaims := middlewares.GetUserFromContext(r)
	if errClaims == nil && claims != nil {
		if parsedUID, errP := filters.ParseObjectID(claims.UserID); errP == nil {
			uID = parsedUID
		}
	}

	// 2. Intentar validar token desde Header Authorization o dto.Token
	if uID.IsZero() {
		tokenStr := ""
		authH := r.Header.Get("Authorization")
		if authH != "" {
			parts := strings.Split(authH, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenStr = parts[1]
			}
		}
		if tokenStr == "" && dto.Token != "" {
			tokenStr = dto.Token
		}
		if tokenStr != "" {
			if parsedClaims, errT := middlewares.ValidateTokenString(tokenStr); errT == nil {
				if parsedUID, errP := filters.ParseObjectID(parsedClaims.UserID); errP == nil {
					uID = parsedUID
				}
			}
		}
	}

	// 3. Si aún no se tiene uID, buscar usuario en MongoDB por dto.Username
	if uID.IsZero() && dto.Username != "" {
		_ = db.Collection("usuarios").FindOne(ctx, bson.M{"username": dto.Username}).Decode(&user)
		if !user.ID.IsZero() {
			uID = user.ID
			if user.PersonaID != nil {
				personaID = *user.PersonaID
			}
		}
	}

	// 4. Si aún no se tiene personaID pero hay dto.PersonaID
	if personaID.IsZero() && dto.PersonaID != "" {
		if parsedPID, errP := filters.ParseObjectID(dto.PersonaID); errP == nil {
			personaID = parsedPID
		}
	}

	// 5. Si tenemos uID pero no personaID, buscar el usuario en MongoDB
	if !uID.IsZero() && personaID.IsZero() {
		if errFindU := db.Collection("usuarios").FindOne(ctx, bson.M{"_id": uID}).Decode(&user); errFindU == nil {
			if user.PersonaID != nil {
				personaID = *user.PersonaID
			}
		}
	}

	if personaID.IsZero() {
		views.RenderError(w, http.StatusUnauthorized, "Debe iniciar sesión para realizar este trámite")
		return
	}

	// Obtener la persona vinculada en MongoDB
	_ = db.Collection("personas").FindOne(ctx, bson.M{"_id": personaID}).Decode(&persona)

	now := time.Now().UTC().Truncate(time.Millisecond)

	// 1. Guardar Domicilio en 'direcciones' si fue completado
	if dto.Provincia != "" && dto.CallePrincipal != "" {
		canton := dto.Canton
		if canton == "" {
			canton = "Quito"
		}
		parroquia := dto.Parroquia
		if parroquia == "" {
			parroquia = "Centro"
		}
		dir := models.Direccion{
			PersonaID:      personaID,
			Provincia:      dto.Provincia,
			Canton:         canton,
			Parroquia:      parroquia,
			CallePrincipal: dto.CallePrincipal,
			EsActual:       true,
			FechaDesde:     now,
			CreatedAt:      now,
		}
		_, _ = db.Collection("direcciones").InsertOne(ctx, dir)
	}

	// 2. Guardar Familiar en 'nucleo_familiar' si fue completado
	if dto.FamiliarNombres != "" && dto.FamiliarParentesco != "" {
		famDoc := dto.FamiliarDocumento
		if famDoc == "" {
			famDoc = fmt.Sprintf("FAM-%s-%d", persona.NumeroDocumento, time.Now().UnixNano()%10000)
		}
		
		parentesco := strings.ToLower(strings.TrimSpace(dto.FamiliarParentesco))
		validParents := map[string]bool{
			"conyuge": true, "hijo": true, "hija": true, "padre": true, "madre": true, "hermano": true, "hermana": true, "otro": true,
		}
		if !validParents[parentesco] {
			parentesco = "otro"
		}

		// Crear registro de persona para el familiar
		famPersona := models.Persona{
			TipoDocumento:   "pasaporte",
			NumeroDocumento: famDoc,
			Nombres:         dto.FamiliarNombres,
			Apellidos:       dto.FamiliarApellidos,
			FechaNacimiento: now.AddDate(-10, 0, 0), // Default fecha
			Nacionalidad:    persona.Nacionalidad,
			Sexo:            "M",
			Estado:          "activo",
			CreatedAt:       now,
			UpdatedAt:       now,
			CreatedBy:       uID,
		}
		resFamP, errFamP := db.Collection("personas").InsertOne(ctx, famPersona)
		if errFamP == nil {
			famID := resFamP.InsertedID.(primitive.ObjectID)
			nucleo := models.NucleoFamiliar{
				PersonaID:         personaID,
				FamiliarPersonaID: famID,
				Parentesco:        parentesco,
				CreatedAt:         now,
			}
			_, _ = db.Collection("nucleo_familiar").InsertOne(ctx, nucleo)
		}
	}

	// 3. Guardar Teléfono Adicional en 'telefonos' si fue provisto
	if len(strings.TrimSpace(dto.TelefonoAdicional)) >= 7 {
		_, _ = db.Collection("telefonos").InsertOne(ctx, models.Telefono{
			PersonaID:   personaID,
			Numero:      strings.TrimSpace(dto.TelefonoAdicional),
			Tipo:        "movil",
			EsPrincipal: false,
			CreatedAt:   now,
		})
	}

	// 4. Guardar Biometría en 'biometricos' (para Censo Migratorio o si se enviaron datos biométricos)
	var codigoDactilarRegistrado string
	if dto.TipoTramite == "censo" || strings.TrimSpace(dto.CodigoDactilar) != "" {
		codDactilar := strings.TrimSpace(dto.CodigoDactilar)
		if len(codDactilar) < 3 {
			codDactilar = fmt.Sprintf("DACT-EC-%d", time.Now().UnixNano()%100000)
		}
		codigoDactilarRegistrado = codDactilar

		// 4.1 Huella dactilar (Cumple estricto JSON Schema: persona_id, tipo, archivo_url, fecha_captura, created_at)
		huellaURL := fmt.Sprintf("biometria/huellas/%s.wsq", codDactilar)
		bioHuella := models.Biometrico{
			PersonaID:    personaID,
			Tipo:         "huella",
			ArchivoURL:   huellaURL,
			FechaCaptura: now,
			CreatedAt:    now,
		}
		resBioH, errBioH := db.Collection("biometricos").InsertOne(ctx, bioHuella)
		if errBioH == nil {
			_ = models.RegistrarAuditoria(ctx, uID, models.AccionCreate, "biometricos", resBioH.InsertedID.(primitive.ObjectID), nil, bioHuella, nil)
		}

		// 4.2 Captura facial digital (Módulo en mantenimiento por requerimiento de usuario, no se persiste en BD)
	}

	// 5. Guardar Beneficio en 'beneficios' (si fue solicitado explícitamente o en trámites de refugio / censo)
	var beneficioRegistrado string
	if dto.SolicitarBeneficio || strings.TrimSpace(dto.TipoBeneficio) != "" {
		tBen := strings.ToLower(strings.TrimSpace(dto.TipoBeneficio))
		validBeneficios := map[string]bool{
			"salud": true, "educacion": true, "trabajo": true, "cedula": true,
		}
		if !validBeneficios[tBen] {
			if dto.TipoTramite == "censo" {
				tBen = "cedula"
			} else {
				tBen = "salud"
			}
		}
		beneficioRegistrado = tBen

		beneficioDoc := models.Beneficio{
			PersonaID:       personaID,
			TipoBeneficio:   tBen,
			FechaAsignacion: now,
			Estado:          "activo",
			CreatedAt:       now,
			CreatedBy:       uID,
		}
		resBen, errBen := db.Collection("beneficios").InsertOne(ctx, beneficioDoc)
		if errBen == nil {
			_ = models.RegistrarAuditoria(ctx, uID, models.AccionCreate, "beneficios", resBen.InsertedID.(primitive.ObjectID), nil, beneficioDoc, nil)
		}
	}

	// 6. Crear el Trámite Específico
	var tramiteID primitive.ObjectID
	var detalleMsg string

	switch dto.TipoTramite {
	case "refugio":
		motivo := dto.MotivoSalida
		if len(motivo) < 10 {
			motivo = "Solicitud formal de refugio por motivos humanitarios y situación en país de origen."
		}
		fIngreso := now
		if dto.FechaIngreso != "" {
			if parsed, err := time.Parse("2006-01-02", dto.FechaIngreso); err == nil {
				fIngreso = parsed
			}
		}

		solPI := models.SolicitudPI{
			PersonaID:           personaID,
			MotivoSalida:        motivo,
			PaisOrigen:          persona.Nacionalidad,
			FechaIngresoEcuador: filters.NormalizeUTC(fIngreso),
			Estado:              "en_tramite",
			FechaSolicitud:      now,
			CreatedAt:           now,
			UpdatedAt:           now,
			CreatedBy:           uID,
		}
		res, err := db.Collection("solicitudes_pi").InsertOne(ctx, solPI)
		if err != nil {
			views.RenderError(w, http.StatusBadRequest, "Error registrando solicitud de refugio", err.Error())
			return
		}
		tramiteID = res.InsertedID.(primitive.ObjectID)
		detalleMsg = "Solicitud de Refugio PI registrada. Asignada a analista_pi (Corozo Angulo Milena Jazmin)."
		if beneficioRegistrado != "" {
			detalleMsg += fmt.Sprintf(" Beneficio legal amparado (%s) registrado y activado en colección 'beneficios'.", strings.ToUpper(beneficioRegistrado))
		}

	case "prorroga":
		dias := dto.DiasExtension
		if dias <= 0 || dias > 90 {
			dias = 90
		}
		pror := models.Prorroga{
			PersonaID:                personaID,
			MovimientoIngresoID:      primitive.NewObjectID(),
			FechaSolicitud:           now,
			FechaVencimientoOriginal: now,
			NuevaFechaVencimiento:    now.AddDate(0, 0, dias),
			Estado:                   "solicitada",
			CreatedAt:                now,
			CreatedBy:                uID,
		}
		res, err := db.Collection("prorrogas").InsertOne(ctx, pror)
		if err != nil {
			views.RenderError(w, http.StatusBadRequest, "Error registrando prórroga", err.Error())
			return
		}
		tramiteID = res.InsertedID.(primitive.ObjectID)
		detalleMsg = fmt.Sprintf("Prórroga turística de %d días solicitada. Asignada a analista_visas (Caisa Preciado Franklin Andres).", dias)

	case "visa":
		tVisa := dto.TipoVisa
		if tVisa == "" {
			tVisa = "trabajo"
		}
		solVisa := models.SolicitudVisa{
			PersonaID:      personaID,
			TipoVisa:       tVisa,
			Estado:         "recibida",
			FechaSolicitud: now,
			CreatedAt:      now,
			UpdatedAt:      now,
			CreatedBy:      uID,
		}
		res, err := db.Collection("solicitudes_visa").InsertOne(ctx, solVisa)
		if err != nil {
			views.RenderError(w, http.StatusBadRequest, "Error registrando visa", err.Error())
			return
		}
		tramiteID = res.InsertedID.(primitive.ObjectID)
		detalleMsg = fmt.Sprintf("Solicitud de visa de %s registrada. Asignada a analista_visas (Caisa Preciado Franklin Andres).", tVisa)

	case "censo":
		numCert := fmt.Sprintf("CERT-CEN-%d-%s-%d", now.Year(), personaID.Hex()[len(personaID.Hex())-4:], time.Now().Unix()%100000)
		censoID := primitive.NewObjectID()
		var censoAbierto models.Censo
		if err := db.Collection("censos").FindOne(ctx, bson.M{"estado": "abierto"}).Decode(&censoAbierto); err == nil {
			censoID = censoAbierto.ID
		}

		regCenso := models.RegistroCenso{
			CensoID:           censoID,
			PersonaID:         personaID,
			NumeroCertificado: numCert,
			FechaRegistro:     now,
			CreatedAt:         now,
			CreatedBy:         uID,
		}
		res, err := db.Collection("registros_censo").InsertOne(ctx, regCenso)
		if err != nil {
			views.RenderError(w, http.StatusBadRequest, "Error registrando censo", err.Error())
			return
		}
		tramiteID = res.InsertedID.(primitive.ObjectID)
		detalleMsg = fmt.Sprintf("Certificado de Censo emitido: %s. Asignado a analista_regularizacion (Caicedo Medina Lessly Jelena).", numCert)
		if codigoDactilarRegistrado != "" {
			detalleMsg += fmt.Sprintf(" Enrolamiento biométrico dactilar (%s) guardado en colección 'biometricos'. Captura facial en mantenimiento.", codigoDactilarRegistrado)
		}
		if beneficioRegistrado != "" {
			detalleMsg += fmt.Sprintf(" Beneficio de regularización VIRTE (%s) registrado en colección 'beneficios'.", strings.ToUpper(beneficioRegistrado))
		}

	default: // movimiento
		tipoM := dto.TipoMovimiento
		if tipoM != "ingreso" && tipoM != "salida" {
			tipoM = "ingreso"
		}
		punto := dto.PuntoControl
		if punto == "" {
			punto = "UIO"
		}
		transporte := dto.MedioTransporte
		if transporte == "" {
			transporte = "aereo"
		}
		motivo := dto.MotivoViaje
		if motivo == "" {
			motivo = "turismo"
		}

		mov := models.Movimiento{
			PersonaID:       personaID,
			Tipo:            tipoM,
			PuntoControl:    punto,
			FechaHora:       now,
			MedioTransporte: transporte,
			MotivoViaje:     motivo,
			RequiereVisa:    false,
			DiasPermitidos:  filters.IntToInt32(90),
			Estado:          "activo",
			CreatedAt:       now,
			CreatedBy:       uID,
		}
		res, err := db.Collection("movimientos").InsertOne(ctx, mov)
		if err != nil {
			views.RenderError(w, http.StatusBadRequest, "Error registrando movimiento", err.Error())
			return
		}
		tramiteID = res.InsertedID.(primitive.ObjectID)
		detalleMsg = fmt.Sprintf("Movimiento de %s en punto %s registrado. Asignado a oficial_migracion (Intriago Salazar Josue Leonardo).", tipoM, punto)
	}

	// 5. Auditoría Inmutable
	_ = models.RegistrarAuditoria(ctx, uID, models.AccionCreate, dto.TipoTramite, tramiteID, nil, map[string]interface{}{
		"tipo_tramite": dto.TipoTramite,
		"persona_id":   personaID.Hex(),
		"documento":    persona.NumeroDocumento,
	}, nil)

	respData := map[string]interface{}{
		"tramite_id":       tramiteID.Hex(),
		"tipo_tramite":     dto.TipoTramite,
		"persona_id":       personaID.Hex(),
		"numero_documento": persona.NumeroDocumento,
		"titular":          fmt.Sprintf("%s %s", persona.Nombres, persona.Apellidos),
		"detalle":          detalleMsg,
		"estado":           "Recibido en sistema / Pendiente de revisión operativa",
	}
	if codigoDactilarRegistrado != "" {
		respData["codigo_dactilar"] = codigoDactilarRegistrado
		respData["biometricos_guardados"] = true
	}
	if beneficioRegistrado != "" {
		respData["tipo_beneficio"] = beneficioRegistrado
		respData["beneficio_guardado"] = true
	}

	views.RenderSuccess(w, http.StatusCreated, "Trámite registrado y procesado exitosamente", respData)
}

// ListarMisTramites devuelve los trámites solicitados por el ciudadano autenticado
func (c *PublicTramiteController) ListarMisTramites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var uID primitive.ObjectID
	var personaID primitive.ObjectID
	var user models.Usuario

	// 1. Intentar por JWT Claims en contexto
	if claims, err := middlewares.GetUserFromContext(r); err == nil && claims != nil {
		if parsedUID, errP := filters.ParseObjectID(claims.UserID); errP == nil {
			uID = parsedUID
		}
	}

	// 2. Intentar por Header Authorization o query param "token"
	if uID.IsZero() {
		tokenStr := ""
		authH := r.Header.Get("Authorization")
		if authH != "" {
			parts := strings.Split(authH, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenStr = parts[1]
			}
		}
		if tokenStr == "" {
			tokenStr = r.URL.Query().Get("token")
		}
		if tokenStr != "" {
			if parsedClaims, errT := middlewares.ValidateTokenString(tokenStr); errT == nil {
				if parsedUID, errP := filters.ParseObjectID(parsedClaims.UserID); errP == nil {
					uID = parsedUID
				}
			}
		}
	}

	// 3. Intentar por query param "username" o "email"
	qUser := strings.TrimSpace(r.URL.Query().Get("username"))
	if qUser == "" {
		qUser = strings.TrimSpace(r.URL.Query().Get("email"))
	}
	if uID.IsZero() && qUser != "" {
		filterU := bson.M{
			"username": primitive.Regex{Pattern: "^" + regexp.QuoteMeta(qUser) + "$", Options: "i"},
		}
		_ = db.Collection("usuarios").FindOne(ctx, filterU).Decode(&user)
		if !user.ID.IsZero() {
			uID = user.ID
			if user.PersonaID != nil {
				personaID = *user.PersonaID
			}
		}
	}

	// 4. Intentar por query param "persona_id"
	if personaID.IsZero() {
		qPersonaID := strings.TrimSpace(r.URL.Query().Get("persona_id"))
		if qPersonaID != "" {
			if parsedPID, errP := filters.ParseObjectID(qPersonaID); errP == nil {
				personaID = parsedPID
			}
		}
	}

	// 5. Intentar por query param "documento"
	if personaID.IsZero() {
		qDoc := strings.TrimSpace(r.URL.Query().Get("documento"))
		if qDoc != "" {
			var p models.Persona
			if errP := db.Collection("personas").FindOne(ctx, bson.M{"numero_documento": qDoc}).Decode(&p); errP == nil {
				personaID = p.ID
			}
		}
	}

	// 6. Si tenemos uID pero aún no personaID, buscar en usuarios
	if !uID.IsZero() && personaID.IsZero() {
		if errFindU := db.Collection("usuarios").FindOne(ctx, bson.M{"_id": uID}).Decode(&user); errFindU == nil {
			if user.PersonaID != nil {
				personaID = *user.PersonaID
			}
		}
	}

	if personaID.IsZero() && uID.IsZero() {
		views.RenderSuccess(w, http.StatusOK, "Mis trámites", []interface{}{})
		return
	}

	// Construir filtro amplio que soporte vinculación por persona_id o por usuario creador (created_by)
	var matchFilter bson.M
	if !personaID.IsZero() && !uID.IsZero() {
		matchFilter = bson.M{
			"$or": []bson.M{
				{"persona_id": personaID},
				{"created_by": uID},
			},
		}
	} else if !personaID.IsZero() {
		matchFilter = bson.M{"persona_id": personaID}
	} else {
		matchFilter = bson.M{"created_by": uID}
	}

	var misTramites []map[string]interface{}

	// 1. Visas
	curV, errV := db.Collection("solicitudes_visa").Find(ctx, matchFilter)
	if errV == nil {
		var list []models.SolicitudVisa
		if err := curV.All(ctx, &list); err == nil {
			for _, item := range list {
				misTramites = append(misTramites, map[string]interface{}{
					"id":            item.ID.Hex(),
					"tipo":          "Solicitud de Visa (" + strings.ToUpper(item.TipoVisa) + ")",
					"fecha":         item.FechaSolicitud.Format("02/01/2006"),
					"estado":        item.Estado,
					"encargado":     "Caisa Preciado Franklin Andres (Analista de Visas)",
					"solicitado":    "Visa de Residencia tipo " + item.TipoVisa,
					"observaciones": "Solicitud ingresada formalmente en el sistema consular SGIM.",
				})
			}
		}
	}

	// 2. Prórrogas
	curP, errP := db.Collection("prorrogas").Find(ctx, matchFilter)
	if errP == nil {
		var list []models.Prorroga
		if err := curP.All(ctx, &list); err == nil {
			for _, item := range list {
				misTramites = append(misTramites, map[string]interface{}{
					"id":            item.ID.Hex(),
					"tipo":          "Prórroga de Estadía Turística (90 días)",
					"fecha":         item.FechaSolicitud.Format("02/01/2006"),
					"estado":        item.Estado,
					"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
					"solicitado":    "Extensión reglamentaria de permanencia en territorio nacional",
					"observaciones": "Vencimiento calculado: " + item.NuevaFechaVencimiento.Format("02/01/2006"),
				})
			}
		}
	}

	// 3. Protección Internacional (Refugio)
	curPI, errPI := db.Collection("solicitudes_pi").Find(ctx, matchFilter)
	if errPI == nil {
		var list []models.SolicitudPI
		if err := curPI.All(ctx, &list); err == nil {
			for _, item := range list {
				misTramites = append(misTramites, map[string]interface{}{
					"id":            item.ID.Hex(),
					"tipo":          "Solicitud de Estatuto de Refugiado y Protección Internacional",
					"fecha":         item.FechaSolicitud.Format("02/01/2006"),
					"estado":        item.Estado,
					"encargado":     "Corozo Angulo Milena Jazmin (Analista de Protección Internacional)",
					"solicitado":    "Estatuto de refugiado por: " + item.MotivoSalida,
					"observaciones": "Ingreso a Ecuador registrado el " + item.FechaIngresoEcuador.Format("02/01/2006"),
				})
			}
		}
	}

	// 4. Movimientos Fronterizos
	curM, errM := db.Collection("movimientos").Find(ctx, matchFilter)
	if errM == nil {
		var list []models.Movimiento
		if err := curM.All(ctx, &list); err == nil {
			for _, item := range list {
				misTramites = append(misTramites, map[string]interface{}{
					"id":            item.ID.Hex(),
					"tipo":          "Registro de Movimiento Fronterizo (" + strings.ToUpper(item.Tipo) + ")",
					"fecha":         item.FechaHora.Format("02/01/2006 15:04"),
					"estado":        item.Estado,
					"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
					"solicitado":    "Punto de Control: " + item.PuntoControl + " | Transporte: " + item.MedioTransporte,
					"observaciones": "Motivo: " + item.MotivoViaje + " (Días autorizados: " + fmt.Sprintf("%d", item.DiasPermitidos) + ")",
				})
			}
		}
	}

	// 5. Registros Censales (VIRTE)
	curC, errC := db.Collection("registros_censo").Find(ctx, matchFilter)
	if errC == nil {
		var list []models.RegistroCenso
		if err := curC.All(ctx, &list); err == nil {
			for _, item := range list {
				misTramites = append(misTramites, map[string]interface{}{
					"id":            item.ID.Hex(),
					"tipo":          "Registro de Censo Migratorio (VIRTE)",
					"fecha":         item.FechaRegistro.Format("02/01/2006"),
					"estado":        "completado",
					"encargado":     "Caicedo Medina Lessly Jelena (Analista de Regularización)",
					"solicitado":    "Certificado N°: " + item.NumeroCertificado,
					"observaciones": "Empadronamiento censal completado exitosamente.",
				})
			}
		}
	}

	// 6. Enrolamiento Biométrico (Colección 'biometricos')
	if !personaID.IsZero() {
		curBio, errBio := db.Collection("biometricos").Find(ctx, bson.M{"persona_id": personaID})
		if errBio == nil {
			var listBio []models.Biometrico
			if err := curBio.All(ctx, &listBio); err == nil {
				for _, bio := range listBio {
					misTramites = append(misTramites, map[string]interface{}{
						"id":            bio.ID.Hex(),
						"tipo":          "Registro Biométrico Oficial (" + strings.ToUpper(bio.Tipo) + ")",
						"fecha":         bio.FechaCaptura.Format("02/01/2006"),
						"estado":        "validado",
						"encargado":     "Caicedo Medina Lessly Jelena (Analista de Regularización)",
						"solicitado":    "Archivo / Hash Biométrico: " + bio.ArchivoURL,
						"observaciones": "Identidad biométrica registrada y custodiada en la base de datos SGIM.",
					})
				}
			}
		}

		// 7. Beneficios Sociales / Protección (Colección 'beneficios')
		curBen, errBen := db.Collection("beneficios").Find(ctx, bson.M{"persona_id": personaID})
		if errBen == nil {
			var listBen []models.Beneficio
			if err := curBen.All(ctx, &listBen); err == nil {
				for _, ben := range listBen {
					misTramites = append(misTramites, map[string]interface{}{
						"id":            ben.ID.Hex(),
						"tipo":          "Beneficio Legal Amparado (" + strings.ToUpper(ben.TipoBeneficio) + ")",
						"fecha":         ben.FechaAsignacion.Format("02/01/2006"),
						"estado":        ben.Estado,
						"encargado":     "Corozo Angulo Milena Jazmin (Analista de Protección Internacional)",
						"solicitado":    "Derecho amparado: Acceso legal a " + strings.ToUpper(ben.TipoBeneficio),
						"observaciones": "Beneficio legal activo conforme a la Ley Orgánica de Movilidad Humana.",
					})
				}
			}
		}
	}

	views.RenderSuccess(w, http.StatusOK, "Mis trámites migratorios", misTramites)
}

// ConsultaPublica permite rastrear el estado de un trámite por número de documento o ID de trámite sin requerir autenticación
func (c *PublicTramiteController) ConsultaPublica(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	qDoc := strings.TrimSpace(r.URL.Query().Get("documento"))
	qTramiteID := strings.TrimSpace(r.URL.Query().Get("tramite_id"))

	if qDoc == "" && qTramiteID == "" {
		views.RenderError(w, http.StatusBadRequest, "Debe ingresar un número de documento o un código de trámite para consultar")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var personaID primitive.ObjectID
	var titularNombre string

	// 1. Si enviaron documento, buscar en personas
	if qDoc != "" {
		var p models.Persona
		errP := db.Collection("personas").FindOne(ctx, bson.M{
			"numero_documento": primitive.Regex{Pattern: "^" + regexp.QuoteMeta(qDoc) + "$", Options: "i"},
		}).Decode(&p)
		if errP == nil {
			personaID = p.ID
			titularNombre = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
		} else {
			// Intentar buscar en usuarios por si ingresaron username o email
			var u models.Usuario
			errU := db.Collection("usuarios").FindOne(ctx, bson.M{
				"username": primitive.Regex{Pattern: "^" + regexp.QuoteMeta(qDoc) + "$", Options: "i"},
			}).Decode(&u)
			if errU == nil && u.PersonaID != nil {
				personaID = *u.PersonaID
				var p2 models.Persona
				if errP2 := db.Collection("personas").FindOne(ctx, bson.M{"_id": personaID}).Decode(&p2); errP2 == nil {
					titularNombre = fmt.Sprintf("%s %s", p2.Nombres, p2.Apellidos)
				}
			}
		}
	}

	var parsedTID primitive.ObjectID
	if qTramiteID != "" {
		parsedTID, _ = filters.ParseObjectID(qTramiteID)
	}

	resultados := make([]map[string]interface{}, 0)

	// Búsqueda por tramite_id específico si fue provisto
	if !parsedTID.IsZero() {
		// 1. Visa
		var v models.SolicitudVisa
		if err := db.Collection("solicitudes_visa").FindOne(ctx, bson.M{"_id": parsedTID}).Decode(&v); err == nil {
			tNom := titularNombre
			if tNom == "" {
				var p models.Persona
				if errP := db.Collection("personas").FindOne(ctx, bson.M{"_id": v.PersonaID}).Decode(&p); errP == nil {
					tNom = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
				}
			}
			resultados = append(resultados, map[string]interface{}{
				"id":            v.ID.Hex(),
				"tipo":          "Solicitud de Visa (" + strings.ToUpper(v.TipoVisa) + ")",
				"titular":       tNom,
				"fecha":         v.FechaSolicitud.Format("02/01/2006"),
				"estado":        v.Estado,
				"encargado":     "Caisa Preciado Franklin Andres (Analista de Visas)",
				"solicitado":    "Visa de Residencia tipo " + v.TipoVisa,
				"observaciones": "Solicitud ingresada formalmente en el sistema consular SGIM.",
			})
		}

		// 2. Prórroga
		var pr models.Prorroga
		if err := db.Collection("prorrogas").FindOne(ctx, bson.M{"_id": parsedTID}).Decode(&pr); err == nil {
			tNom := titularNombre
			if tNom == "" {
				var p models.Persona
				if errP := db.Collection("personas").FindOne(ctx, bson.M{"_id": pr.PersonaID}).Decode(&p); errP == nil {
					tNom = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
				}
			}
			resultados = append(resultados, map[string]interface{}{
				"id":            pr.ID.Hex(),
				"tipo":          "Prórroga de Estadía Turística (90 días)",
				"titular":       tNom,
				"fecha":         pr.FechaSolicitud.Format("02/01/2006"),
				"estado":        pr.Estado,
				"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
				"solicitado":    "Extensión reglamentaria de permanencia en territorio nacional",
				"observaciones": "Vencimiento calculado: " + pr.NuevaFechaVencimiento.Format("02/01/2006"),
			})
		}

		// 3. Refugio PI
		var pi models.SolicitudPI
		if err := db.Collection("solicitudes_pi").FindOne(ctx, bson.M{"_id": parsedTID}).Decode(&pi); err == nil {
			tNom := titularNombre
			if tNom == "" {
				var p models.Persona
				if errP := db.Collection("personas").FindOne(ctx, bson.M{"_id": pi.PersonaID}).Decode(&p); errP == nil {
					tNom = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
				}
			}
			resultados = append(resultados, map[string]interface{}{
				"id":            pi.ID.Hex(),
				"tipo":          "Solicitud de Estatuto de Refugiado y Protección Internacional",
				"titular":       tNom,
				"fecha":         pi.FechaSolicitud.Format("02/01/2006"),
				"estado":        pi.Estado,
				"encargado":     "Corozo Angulo Milena Jazmin (Analista de Protección Internacional)",
				"solicitado":    "Estatuto de refugiado por: " + pi.MotivoSalida,
				"observaciones": "Ingreso a Ecuador registrado el " + pi.FechaIngresoEcuador.Format("02/01/2006"),
			})
		}

		// 4. Movimiento
		var m models.Movimiento
		if err := db.Collection("movimientos").FindOne(ctx, bson.M{"_id": parsedTID}).Decode(&m); err == nil {
			tNom := titularNombre
			if tNom == "" {
				var p models.Persona
				if errP := db.Collection("personas").FindOne(ctx, bson.M{"_id": m.PersonaID}).Decode(&p); errP == nil {
					tNom = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
				}
			}
			resultados = append(resultados, map[string]interface{}{
				"id":            m.ID.Hex(),
				"tipo":          "Registro de Movimiento Fronterizo (" + strings.ToUpper(m.Tipo) + ")",
				"titular":       tNom,
				"fecha":         m.FechaHora.Format("02/01/2006 15:04"),
				"estado":        m.Estado,
				"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
				"solicitado":    "Punto de Control: " + m.PuntoControl + " | Transporte: " + m.MedioTransporte,
				"observaciones": "Motivo: " + m.MotivoViaje + " (Días autorizados: " + fmt.Sprintf("%d", m.DiasPermitidos) + ")",
			})
		}

		// 5. Censo
		var rc models.RegistroCenso
		if err := db.Collection("registros_censo").FindOne(ctx, bson.M{"_id": parsedTID}).Decode(&rc); err == nil {
			tNom := titularNombre
			if tNom == "" {
				var p models.Persona
				if errP := db.Collection("personas").FindOne(ctx, bson.M{"_id": rc.PersonaID}).Decode(&p); errP == nil {
					tNom = fmt.Sprintf("%s %s", p.Nombres, p.Apellidos)
				}
			}
			resultados = append(resultados, map[string]interface{}{
				"id":            rc.ID.Hex(),
				"tipo":          "Registro de Censo Migratorio (VIRTE)",
				"titular":       tNom,
				"fecha":         rc.FechaRegistro.Format("02/01/2006"),
				"estado":        "completado",
				"encargado":     "Caicedo Medina Lessly Jelena (Analista de Regularización)",
				"solicitado":    "Certificado N°: " + rc.NumeroCertificado,
				"observaciones": "Empadronamiento censal completado exitosamente.",
			})
		}
	}

	// Si no fue búsqueda por ID exclusivo o aún no tenemos resultados pero sí personaID:
	if len(resultados) == 0 && !personaID.IsZero() {
		filterP := bson.M{"persona_id": personaID}

		// 1. Visas
		curV, _ := db.Collection("solicitudes_visa").Find(ctx, filterP)
		if curV != nil {
			var list []models.SolicitudVisa
			if err := curV.All(ctx, &list); err == nil {
				for _, item := range list {
					resultados = append(resultados, map[string]interface{}{
						"id":            item.ID.Hex(),
						"tipo":          "Solicitud de Visa (" + strings.ToUpper(item.TipoVisa) + ")",
						"titular":       titularNombre,
						"fecha":         item.FechaSolicitud.Format("02/01/2006"),
						"estado":        item.Estado,
						"encargado":     "Caisa Preciado Franklin Andres (Analista de Visas)",
						"solicitado":    "Visa de Residencia tipo " + item.TipoVisa,
						"observaciones": "Solicitud ingresada formalmente en el sistema consular SGIM.",
					})
				}
			}
		}

		// 2. Prórrogas
		curPr, _ := db.Collection("prorrogas").Find(ctx, filterP)
		if curPr != nil {
			var list []models.Prorroga
			if err := curPr.All(ctx, &list); err == nil {
				for _, item := range list {
					resultados = append(resultados, map[string]interface{}{
						"id":            item.ID.Hex(),
						"tipo":          "Prórroga de Estadía Turística (90 días)",
						"titular":       titularNombre,
						"fecha":         item.FechaSolicitud.Format("02/01/2006"),
						"estado":        item.Estado,
						"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
						"solicitado":    "Extensión reglamentaria de permanencia en territorio nacional",
						"observaciones": "Vencimiento calculado: " + item.NuevaFechaVencimiento.Format("02/01/2006"),
					})
				}
			}
		}

		// 3. Protección Internacional (Refugio)
		curPI, _ := db.Collection("solicitudes_pi").Find(ctx, filterP)
		if curPI != nil {
			var list []models.SolicitudPI
			if err := curPI.All(ctx, &list); err == nil {
				for _, item := range list {
					resultados = append(resultados, map[string]interface{}{
						"id":            item.ID.Hex(),
						"tipo":          "Solicitud de Estatuto de Refugiado y Protección Internacional",
						"titular":       titularNombre,
						"fecha":         item.FechaSolicitud.Format("02/01/2006"),
						"estado":        item.Estado,
						"encargado":     "Corozo Angulo Milena Jazmin (Analista de Protección Internacional)",
						"solicitado":    "Estatuto de refugiado por: " + item.MotivoSalida,
						"observaciones": "Ingreso a Ecuador registrado el " + item.FechaIngresoEcuador.Format("02/01/2006"),
					})
				}
			}
		}

		// 4. Movimientos Fronterizos
		curM, _ := db.Collection("movimientos").Find(ctx, filterP)
		if curM != nil {
			var list []models.Movimiento
			if err := curM.All(ctx, &list); err == nil {
				for _, item := range list {
					resultados = append(resultados, map[string]interface{}{
						"id":            item.ID.Hex(),
						"tipo":          "Registro de Movimiento Fronterizo (" + strings.ToUpper(item.Tipo) + ")",
						"titular":       titularNombre,
						"fecha":         item.FechaHora.Format("02/01/2006 15:04"),
						"estado":        item.Estado,
						"encargado":     "Intriago Salazar Josue Leonardo (Oficial de Migración)",
						"solicitado":    "Punto de Control: " + item.PuntoControl + " | Transporte: " + item.MedioTransporte,
						"observaciones": "Motivo: " + item.MotivoViaje + " (Días autorizados: " + fmt.Sprintf("%d", item.DiasPermitidos) + ")",
					})
				}
			}
		}

		// 5. Censo Migratorio
		curC, _ := db.Collection("registros_censo").Find(ctx, filterP)
		if curC != nil {
			var list []models.RegistroCenso
			if err := curC.All(ctx, &list); err == nil {
				for _, item := range list {
					resultados = append(resultados, map[string]interface{}{
						"id":            item.ID.Hex(),
						"tipo":          "Registro de Censo Migratorio (VIRTE)",
						"titular":       titularNombre,
						"fecha":         item.FechaRegistro.Format("02/01/2006"),
						"estado":        "completado",
						"encargado":     "Caicedo Medina Lessly Jelena (Analista de Regularización)",
						"solicitado":    "Certificado N°: " + item.NumeroCertificado,
						"observaciones": "Empadronamiento censal completado exitosamente.",
					})
				}
			}
		}

		// 6. Enrolamiento Biométrico (Colección 'biometricos')
		curBio, _ := db.Collection("biometricos").Find(ctx, filterP)
		if curBio != nil {
			var listBio []models.Biometrico
			if err := curBio.All(ctx, &listBio); err == nil {
				for _, bio := range listBio {
					resultados = append(resultados, map[string]interface{}{
						"id":            bio.ID.Hex(),
						"tipo":          "Registro Biométrico Oficial (" + strings.ToUpper(bio.Tipo) + ")",
						"titular":       titularNombre,
						"fecha":         bio.FechaCaptura.Format("02/01/2006"),
						"estado":        "validado",
						"encargado":     "Caicedo Medina Lessly Jelena (Analista de Regularización)",
						"solicitado":    "Archivo / Hash Biométrico: " + bio.ArchivoURL,
						"observaciones": "Identidad biométrica custodiada en la base de datos SGIM.",
					})
				}
			}
		}

		// 7. Beneficios Sociales / Asistencia Humanitaria (Colección 'beneficios')
		curBen, _ := db.Collection("beneficios").Find(ctx, filterP)
		if curBen != nil {
			var listBen []models.Beneficio
			if err := curBen.All(ctx, &listBen); err == nil {
				for _, ben := range listBen {
					resultados = append(resultados, map[string]interface{}{
						"id":            ben.ID.Hex(),
						"tipo":          "Beneficio Legal Amparado (" + strings.ToUpper(ben.TipoBeneficio) + ")",
						"titular":       titularNombre,
						"fecha":         ben.FechaAsignacion.Format("02/01/2006"),
						"estado":        ben.Estado,
						"encargado":     "Corozo Angulo Milena Jazmin (Analista de Protección Internacional)",
						"solicitado":    "Derecho amparado: Acceso a " + strings.ToUpper(ben.TipoBeneficio),
						"observaciones": "Beneficio legal activo conforme a la Ley Orgánica de Movilidad Humana.",
					})
				}
			}
		}
	}

	views.RenderSuccess(w, http.StatusOK, "Consulta pública de trámite", resultados)
}
