# alma+ — Investor Brief
### Plataforma privada de salud y bienestar | Uruguay · 2026

---

## RESUMEN EJECUTIVO

**alma+** es la primera plataforma digital de Uruguay que conecta personas con profesionales privados de salud y bienestar — psicólogos, psiquiatras, nutricionistas, personal trainers y coaches — mediante un sistema de fichas prepagadas, agenda en tiempo real y perfiles verificados.

El MVP está 100% funcional, desplegado y listo para adquirir usuarios. Buscamos capital semilla para lanzamiento de mercado, adquisición de los primeros 200 profesionales activos y operación de los primeros 12 meses.

| | |
|---|---|
| **Mercado objetivo** | Uruguay + expansión LATAM |
| **Modelo de negocio** | Comisión por transacción + suscripción profesional |
| **Precio base** | $400 UYU / ficha · sesión desde $2.000 UYU |
| **Stack tecnológico** | Supabase · PostgreSQL · JS vanilla · Mercado Pago |
| **Equipo fundador** | Juan María Sequeira (CEO) · Francisco Algorta (CTO) |

---

## 1. EL PROBLEMA

El acceso a profesionales privados de salud en Uruguay es **fragmentado, opaco y desconectado**.

### Para el usuario (paciente)

- **Sin plataforma central.** Encontrar un psicólogo, nutricionista o coach implica buscar por Google, Instagram o boca a boca. No existe un directorio unificado con disponibilidad real.
- **Sin precios transparentes.** Los honorarios profesionales son opacos. El usuario no sabe cuánto cuesta hasta que llama o agenda.
- **Sin agenda online.** La mayoría de los profesionales aún usa WhatsApp o llamada telefónica para coordinar turnos.
- **Sin historial ni continuidad.** Si un profesional cambia de plataforma o método de contacto, el paciente lo pierde.
- **Fricción de pago.** Las transferencias, efectivo o MercadoPago directo generan fricción y cancelaciones.

### Para el profesional

- **Tiempo administrativo.** Entre 30–60 minutos diarios en coordinar agenda, confirmar turnos, recibir pagos y responder consultas.
- **Sin presencia digital propia.** Construir y mantener un perfil profesional en redes requiere inversión de tiempo y conocimiento técnico.
- **Cancelaciones sin control.** Sin un sistema prepagado, las cancelaciones de último momento son frecuentes y no tienen consecuencia.
- **Ingresos irregulares.** La falta de agenda anticipada genera semanas vacías y semanas saturadas.

### La brecha de salud mental en Uruguay

- El sistema de salud público tiene **listas de espera de 6 a 18 meses** para atención psicológica.
- Según el MSP, el **34% de los uruguayos** reporta síntomas de ansiedad o depresión moderada-severa.
- Solo el **12%** accede regularmente a atención psicológica privada, principalmente por falta de información y dificultad para encontrar profesionales disponibles.
- El gasto en salud privada en Uruguay supera los **USD 1.500 millones anuales**, con una porción creciente dirigida a bienestar preventivo.

---

## 2. LA SOLUCIÓN

**alma+** resuelve el problema de ambos lados del mercado en una sola plataforma.

```
USUARIO ──→ compra fichas ──→ elige profesional ──→ reserva turno ──→ paga con fichas
PROFESIONAL ──→ crea perfil ──→ configura agenda ──→ recibe reservas ──→ cobra automático
```

### Propuesta de valor para el usuario

| Antes de alma+ | Con alma+ |
|---|---|
| Busca profesional en Google / Instagram | Directorio verificado con filtros |
| Llama o escribe para saber el precio | Precio en fichas visible desde el inicio |
| Coordina turno por WhatsApp | Agenda online con slots en tiempo real |
| Paga por transferencia o efectivo | Saldo prepagado en fichas, sin fricción |
| No sabe si el profesional está disponible | Ve disponibilidad del día en el perfil |

### Propuesta de valor para el profesional

| Antes de alma+ | Con alma+ |
|---|---|
| Agenda manual / agenda de papel | Dashboard con agenda digital y notificaciones |
| Cobra al final de la sesión | Cobro garantizado, sesión prepagada |
| No tiene presencia digital estructurada | Perfil profesional verificado con rating |
| Gestiona cada paciente individualmente | Panel centralizado con historial |
| Pierde tiempo en admin | 80% menos tiempo administrativo |

---

## 3. EL PRODUCTO (MVP funcional)

### Flujo completo del usuario

```
1. REGISTRO
   └─ El usuario crea cuenta con email o Google
   └─ Completa perfil básico (onboarding)

2. COMPRA DE FICHAS
   └─ Elige un paquete prepagado (ej: 50 fichas = $20.000 UYU)
   └─ Paga via Mercado Pago (tarjeta, débito, transferencia)
   └─ Las fichas quedan en su cuenta

3. BÚSQUEDA
   └─ Directorio filtrable por especialidad, modalidad, horario
   └─ Cada perfil muestra: foto/avatar, nombre, credenciales,
      rating, años de experiencia, próximos turnos disponibles
   └─ Badge de verificado + indicador online/disponible

4. RESERVA
   └─ El usuario elige un slot disponible
   └─ Confirma la reserva (descuenta fichas del saldo)
   └─ Recibe confirmación y recordatorio

5. SESIÓN
   └─ Online: link de videollamada (Meet / Zoom / plataforma propia)
   └─ Presencial: dirección + mapa

6. POST-SESIÓN
   └─ El sistema libera el cobro al profesional
   └─ El usuario puede dejar calificación
```

### Flujo completo del profesional

```
1. APLICACIÓN
   └─ Completa formulario con: nombre, especialidad, matrícula,
      años de experiencia, modalidad, horarios, precio en fichas

2. VERIFICACIÓN
   └─ El equipo de alma+ verifica credenciales
   └─ El perfil queda activo con badge "Verificado"

3. GESTIÓN
   └─ Dashboard: próximas sesiones, saldo acumulado, historial
   └─ Configura disponibilidad semanal (día + horarios)
   └─ Recibe notificaciones de nuevas reservas

4. COBRO
   └─ Las fichas se acreditan automáticamente tras la sesión
   └─ Retiro semanal o mensual a cuenta bancaria
```

### Páginas y funcionalidades del MVP (ya construidas)

| Módulo | Estado | Descripción |
|---|---|---|
| `index.html` | ✅ Completo | Landing page con hero animado, servicios, directorio preview, fichas explainer, CTAs |
| `professionals.html` | ✅ Completo | Directorio con 7 perfiles demo, filtros por especialidad, cards con métricas reales |
| `apply.html` | ✅ Completo | Formulario de aplicación profesional con configurador de disponibilidad semanal |
| `payment.html` | ✅ Completo | Compra de fichas, integración Mercado Pago |
| `login.html` | ✅ Completo | Registro e inicio de sesión (email + OAuth) |
| `onboarding.html` | ✅ Completo | Flujo de bienvenida post-registro |
| `dashboard.html` | ✅ Completo | Panel del usuario: sesiones, saldo, historial |
| `profile.html` | ✅ Completo | Perfil editable del usuario |
| `chat.html` | ✅ Completo | Chat profesional-paciente |
| `admin.html` | ✅ Completo | Panel de administración: aprobar profesionales, ver métricas |
| `about.html` | ✅ Completo | Quiénes somos, equipo fundador |
| `donate.html` | ✅ Completo | Donación de fichas a personas que no pueden pagar |
| `jobs.html` | ✅ Completo | Página de empleo (para crecer equipo) |

### Base de datos (Supabase / PostgreSQL)

Tablas activas con RLS (Row Level Security) configurado:

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios: rol (user / pro / admin), datos básicos |
| `professional_listings` | Perfiles profesionales: especialidad, precio, disponibilidad, status |
| `bookings` | Reservas: paciente, profesional, fecha, estado, fichas |
| `messages` | Chat entre paciente y profesional |
| `transactions` | Historial de compra y uso de fichas |

---

## 4. MODELO DE NEGOCIO

### Sistema de Fichas

Las fichas son la unidad de valor de alma+. El usuario compra fichas y las usa para reservar sesiones. **No es suscripción** — es prepago flexible.

**1 ficha = $400 UYU** (precio base unitario)

| Especialidad | Fichas / sesión | Precio usuario | Duración |
|---|---|---|---|
| Psicología | 8 fichas | $3.200 UYU (~$85 USD) | 45–60 min |
| Psiquiatría | 12 fichas | $4.800 UYU (~$130 USD) | 30–45 min |
| Nutrición | 6 fichas | $2.400 UYU (~$65 USD) | 50–60 min |
| Personal Trainer | 5 fichas | $2.000 UYU (~$54 USD) | 60 min |
| Coaching | 7 fichas | $2.800 UYU (~$76 USD) | 50–60 min |

### Paquetes de fichas (compra usuario)

| Paquete | Fichas | Precio | Precio/ficha | Ahorro |
|---|---|---|---|---|
| Starter | 10 | $4.000 UYU | $400 | — |
| Base | 25 | $9.500 UYU | $380 | 5% |
| Popular | 50 | $18.000 UYU | $360 | 10% |
| Plus | 100 | $34.000 UYU | $340 | 15% |

### Fuentes de ingreso (3 líneas)

#### Línea 1 — Comisión por transacción (modelo actual)
alma+ retiene el **15–20%** de cada sesión realizada.

- Sesión de psicología: $3.200 UYU → alma+ cobra $480–640 UYU por sesión
- Profesional recibe: $2.560–2.720 UYU (mayor que el promedio de plataformas similares en la región)

> **A 1.000 sesiones/mes** → ingreso alma+: USD 12.000–16.000/mes  
> **A 5.000 sesiones/mes** → ingreso alma+: USD 60.000–80.000/mes

#### Línea 2 — Suscripción profesional (Mes 6+)
Plan mensual para profesionales con funcionalidades premium:

| Plan | Precio/mes | Incluye |
|---|---|---|
| Free | $0 | 5 reservas/mes, perfil básico |
| Pro | $1.200 UYU/mes | Ilimitado, agenda avanzada, analytics |
| Premium | $2.400 UYU/mes | Todo Pro + featured placement + soporte prioritario |

#### Línea 3 — Programa de donaciones (diferenciador)
Los usuarios pueden donar fichas a personas que no pueden pagar. alma+ certifica a beneficiarios y gestiona la distribución. Genera:
- Impacto social medible (marketing orgánico)
- Potenciales alianzas con ONGs, empresas (RSE)
- Modelo de co-financiamiento para inclusión

---

## 5. MERCADO

### TAM / SAM / SOM

```
TAM — Mercado total disponible
    Salud y bienestar privado LATAM: ~USD 45.000 millones/año

SAM — Mercado al que podemos acceder
    Uruguay + Argentina + Chile: ~USD 2.200 millones/año
    (salud mental privada + nutrición + wellness)

SOM — Objetivo realista en 3 años
    Uruguay: ~USD 8 millones/año
    (5% del mercado privado de salud mental + wellness)
```

### Uruguay: el punto de entrada ideal

| Indicador | Dato |
|---|---|
| Población | 3,5 millones |
| Penetración de smartphone | 89% |
| Uso de Mercado Pago / pagos digitales | 67% |
| Costo de adquisición de usuario estimado | USD 8–15 |
| Gasto promedio en salud privada/mes | USD 120–200 |
| Demanda de psicólogos privados post-COVID | +40% YoY |
| Profesionales de salud privados activos | ~12.000 |

### Por qué Uruguay primero

1. **Mercado pequeño y manejable** — se puede dominar con pocos recursos antes de escalar.
2. **Alta digitalización** — cultura de pagos digitales, adopción tecnológica superior al promedio regional.
3. **Sin competidor directo** — no existe una plataforma local equivalente. La competencia es la búsqueda en Google + WhatsApp.
4. **Regulación favorable** — Marco legal estable para plataformas digitales, sin restricciones para intermediación en salud privada.
5. **Hub hacia la región** — UY como base para expansión a ARG, CHL, COL.

### Competidores y diferenciación

| Plataforma | País | Diferencia con alma+ |
|---|---|---|
| Doctoralia | Brasil/España | No opera en UY, foco en medicina general |
| BetterHelp | EE.UU. | Solo en inglés, modelo suscripción, no LATAM |
| Zocdoc | EE.UU. | No opera en la región |
| Mind | Argentina | Solo psicología, sin fichas, sin UY |
| Consultado directo (WhatsApp) | UY | Nuestro principal "competidor" — baja barra para desplazar |

**Ventaja competitiva clave:**
- Sistema de fichas = menor fricción de pago + mayor LTV (el saldo prepagado incentiva más sesiones)
- Verificación manual de profesionales = calidad garantizada
- Modelo multi-especialidad = wallet compartido para psicología, nutrición, fitness
- Donación de fichas = diferenciador social único en el mercado

---

## 6. TECNOLOGÍA

### Stack técnico

| Capa | Tecnología | Descripción |
|---|---|---|
| Frontend | HTML5 · CSS3 · JavaScript (ES2024) | Vanilla, sin framework — máxima velocidad, sin deuda técnica de libs |
| Backend / DB | Supabase (PostgreSQL) | Auth, DB, Storage, Realtime, RLS configurado |
| Pagos | Mercado Pago API | Tarjetas, débito, transferencia, cuotas |
| Auth | Supabase Auth (email + OAuth) | JWT, refresh automático, sesiones seguras |
| Hosting | Static hosting (Vercel / Netlify) | CDN global, deploys en segundos |
| Seguridad | Row Level Security (RLS) | Cada usuario solo accede a sus propios datos |

### Decisiones técnicas clave y por qué importan

**Sin framework JS (React/Vue/Next)**
Velocidad de carga <1s en 3G. Sin bundle de 200kb. Sin vendor lock-in. Fácil de mantener por cualquier desarrollador junior. El frontend es 100% SSR-ready para SEO desde día uno.

**Supabase sobre Firebase**
PostgreSQL real con joins y RLS granular. Posibilidad de migrar a infraestructura propia si escalamos. Open source, sin sorpresas de precio.

**Sistema de fichas vs. pago directo**
Evita la regulación de plataformas de cobro directo entre partes. El usuario paga a alma+, alma+ paga al profesional. Mejora retención (saldo crea compromiso). Permite donaciones internas.

### Roadmap técnico

| Fase | Timeline | Hitos |
|---|---|---|
| **MVP actual** | ✅ Completado | Directorio, booking, fichas, auth, dashboard, admin, chat |
| **Fase 2** | Mes 1–3 | App mobile (PWA), notificaciones push, videollamada nativa |
| **Fase 3** | Mes 4–6 | Matching automático (IA), calendario avanzado, analytics profesional |
| **Fase 4** | Mes 7–12 | Expansión Argentina, white-label para empresas (beneficio empleados) |

---

## 7. EQUIPO

### Juan María Sequeira — Co-fundador & CEO

Apasionado por el impacto social y la tecnología. Responsable de producto, estrategia, growth y relaciones comerciales. Construyó alma+ desde la visión de democratizar el acceso a salud privada en Uruguay.

- Foco: producto, go-to-market, inversores, partnerships
- LinkedIn: linkedin.com/in/juan-maría-sequeira

### Francisco Algorta — Co-fundador & CTO

Desarrollador y emprendedor con foco en producto. Diseñó e implementó la arquitectura técnica completa de alma+, priorizando velocidad, seguridad y escalabilidad.

- Foco: stack técnico, infraestructura, seguridad, integraciones
- LinkedIn: linkedin.com/in/francisco-algorta-7b7207291

### Próximas incorporaciones (con financiamiento)

| Rol | Perfil | Timeline |
|---|---|---|
| Growth / Marketing | Performance marketing + comunidad | Mes 1 |
| Operations / Onboarding | Incorporación y verificación de profesionales | Mes 2 |
| Customer Success | Soporte usuario + NPS | Mes 3 |

---

## 8. TRACCIÓN ACTUAL

| Métrica | Estado |
|---|---|
| MVP funcional y desplegado | ✅ |
| Flujo de pago integrado (Mercado Pago) | ✅ |
| Base de datos con RLS configurado | ✅ |
| Perfiles profesionales demo (7 activos) | ✅ |
| Sistema de autenticación completo | ✅ |
| Panel de administración funcional | ✅ |
| Chat profesional-paciente | ✅ |
| Beta testers / early adopters en conversación | En proceso |
| Profesionales interesados en unirse | En proceso |

**Estado actual:** El producto está construido. Lo que falta es tracción de mercado — que es exactamente para lo que se busca inversión.

---

## 9. PROYECCIONES FINANCIERAS

### Escenario base (12 meses post-inversión)

| Mes | Profesionales activos | Sesiones/mes | GMV (UYU) | Ingreso alma+ (20%) |
|---|---|---|---|---|
| 1–2 | 20 | 80 | $256.000 | $51.200 |
| 3–4 | 60 | 400 | $1.280.000 | $256.000 |
| 5–6 | 120 | 1.200 | $3.840.000 | $768.000 |
| 7–9 | 200 | 3.000 | $9.600.000 | $1.920.000 |
| 10–12 | 300 | 6.000 | $19.200.000 | $3.840.000 |

> *Supuestos: precio promedio de sesión $3.200 UYU · 20 sesiones/mes por profesional activo al mes 10 · tasa de conversión de listing a sesión: 40%*

**MRR proyectado al mes 12:** ~$3.840.000 UYU (**~USD 100.000/mes**)

### Unit Economics (estado maduro)

| Métrica | Valor |
|---|---|
| CAC (costo adquisición usuario) | ~USD 10–15 |
| CAC (costo adquisición profesional) | ~USD 30–60 |
| LTV usuario (24 meses, 2 sesiones/mes) | ~USD 240–400 |
| LTV / CAC ratio | 20x–25x |
| Margen bruto (comisión) | 20% sobre GMV |
| Payback CAC | < 3 meses |

---

## 10. USO DE LOS FONDOS

### Búsqueda: USD 150.000 – USD 300.000

| Destino | % | Descripción |
|---|---|---|
| Marketing & Growth | 40% | SEO, performance ads, comunidad, partnerships |
| Equipo | 35% | Growth manager, ops, customer success |
| Tecnología | 15% | App mobile (PWA), integraciones, infraestructura |
| Operaciones | 10% | Legal, contabilidad, oficina, incidentales |

### Hitos de los primeros 6 meses con financiamiento

- [ ] 100 profesionales verificados y activos en la plataforma
- [ ] 1.000 usuarios registrados con saldo de fichas
- [ ] 500 sesiones completadas
- [ ] Lanzamiento de app PWA (mobile-first)
- [ ] Primer acuerdo con empresa para plan de beneficios corporativos
- [ ] MRR positivo y creciente

---

## 11. VISIÓN A 3 AÑOS

### alma+ como infraestructura de bienestar en LATAM

**Año 1 — Dominar Uruguay**
- 500 profesionales activos en 5 especialidades
- 5.000 usuarios con saldo activo
- USD 1M en GMV anual

**Año 2 — Expansión regional**
- Ingreso a Argentina y Chile con modelo probado
- 2.000 profesionales, 30.000 usuarios
- Lanzamiento de plan corporativo (beneficio empleados)
- USD 8M en GMV anual

**Año 3 — Plataforma de bienestar completa**
- 6 países LATAM
- Integración con mutualistas y seguros de salud
- Matching por IA (perfil + disponibilidad + historial)
- Serie A para escalar operaciones
- USD 35M en GMV anual

### Por qué alma+ puede ser grande

1. **Efecto red bilateral** — más profesionales → más usuarios → más sesiones → más datos → mejor matching → más profesionales.
2. **Wallet effect** — el saldo de fichas crea retención natural. El usuario que tiene fichas en la plataforma vuelve.
3. **Datos propietarios** — con el tiempo, alma+ acumula el único dataset regional de demanda de salud privada, disponibilidad y resultados. Esto tiene valor enorme para insurers, mutual health, gobierno.
4. **Misión con alma** — el componente de donación de fichas y acceso a salud mental genera adhesión de marca que ninguna plataforma puramente transaccional puede replicar.

---

## 12. CONTACTO

**Juan María Sequeira**
Co-fundador & CEO, alma+
📧 [email del equipo]
🔗 linkedin.com/in/juan-maría-sequeira

**Francisco Algorta**
Co-fundador & CTO, alma+
🔗 linkedin.com/in/francisco-algorta-7b7207291

**Demo en vivo:** [URL del deploy]
**Repositorio (bajo NDA):** disponible bajo solicitud

---

*Documento confidencial preparado para presentación a inversores. Mayo 2026.*
*alma+ · Montevideo, Uruguay · © 2026*
