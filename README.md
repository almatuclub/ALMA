<!DOCTYPE html>
<html lang="es">

<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>alma+ | Tu plataforma de salud y bienestar</title>

<link rel="stylesheet" href="style.css"/>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

<script>
const SUPABASE_URL = "https://iuhnhexotyrnflsmpzxi.supabase.co";
const SUPABASE_KEY = "sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>

<style>

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
    /* ─── Hero ─── */
    .hero {
      min-height: 100vh; padding-top: 68px;
      display: grid; grid-template-columns: 1fr 1fr;
      align-items: center; gap: 40px;
      background: linear-gradient(160deg, #FFF5F5 0%, #FFFCFC 60%);
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute;
      width: 600px; height: 600px; border-radius: 50%;
      background: radial-gradient(circle, rgba(229,57,53,0.06), transparent);
      top: -100px; right: -100px; pointer-events: none;
    }
    .hero__text { padding: 60px 0 60px 0; position: relative; z-index:1; }
    .hero__badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: white; border: 1.5px solid var(--red-200);
      border-radius: var(--radius-full); padding: 6px 14px 6px 8px;
      font-size: 0.8rem; font-weight: 600; color: var(--red);
      margin-bottom: 28px; box-shadow: var(--shadow-sm);
      animation: fadeUp 0.5s ease both;
    }
    .hero__badge .dot {
      width: 8px; height: 8px; background: var(--red); border-radius: 50%; flex-shrink: 0;
      position: relative;
    }
    .hero__badge .dot::after {
      content:''; position:absolute; inset:-3px; border-radius:50%;
      background:var(--red); opacity:.3; animation: pulse-ring 1.5s infinite;
    }
    .hero__text h1 { margin-bottom: 20px; animation: fadeUp .5s .1s ease both; }
    .hero__sub {
      font-size: 1.1rem; color: var(--text-2); line-height: 1.8;
      max-width: 500px; margin-bottom: 36px; animation: fadeUp .5s .2s ease both;
    }
    .hero__actions { display: flex; gap: 14px; flex-wrap: wrap; animation: fadeUp .5s .3s ease both; }

    /* Ficha info strip */
    .ficha-strip {
      display: inline-flex; align-items: center; gap: 12px;
      background: white; border: 1.5px solid var(--red-100);
      border-radius: var(--radius-full); padding: 10px 20px;
      box-shadow: var(--shadow-sm); margin-top: 24px;
      animation: fadeUp .5s .4s ease both; font-size: 0.88rem; color: var(--text-2);
    }
    .ficha-strip strong { color: var(--red); }

    .hero__visual { position: relative; height: 100%; display: flex; align-items: center; padding: 60px 0; }
    .hero__img-main {
      width: 100%; height: 480px; object-fit: cover;
      border-radius: 24px; box-shadow: var(--shadow-lg);
      animation: fadeUp .6s .2s ease both;
    }
    .hero__img-badge {
      position: absolute; bottom: 80px; left: -20px;
      background: white; border-radius: var(--radius-lg);
      padding: 16px 20px; box-shadow: var(--shadow-lg);
      display: flex; align-items: center; gap: 14px;
      animation: float 4s ease-in-out infinite;
    }
    .hero__img-badge .icon { font-size: 1.8rem; }
    .hero__img-badge strong { display: block; font-size: 0.95rem; }
    .hero__img-badge span { font-size: 0.78rem; color: var(--text-muted); }

    /* ─── Services ─── */
    .services-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
    }
    .service-card {
      background: white; border: 1.5px solid var(--border);
      border-radius: var(--radius-lg); padding: 28px 24px;
      transition: var(--transition); cursor: pointer; text-decoration: none;
      box-shadow: var(--shadow-card); display: block;
    }
    .service-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--red-200); }
    .service-icon {
      width: 60px; height: 60px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem; margin-bottom: 16px;
    }
    .service-card h3 { font-size: 1.05rem; margin-bottom: 6px; }
    .service-card .desc { font-size: 0.85rem; color: var(--text-2); line-height: 1.6; margin-bottom: 16px; }
    .service-card .session-info {
      font-size: 0.78rem; color: var(--text-muted); margin-bottom: 14px;
      display: flex; align-items: center; gap: 6px;
    }
    .service-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border); }
    .service-footer .ficha { font-size: 1rem; }
    .service-footer .ficha .symbol { width: 20px; height: 20px; font-size: 0.65rem; }

    /* ─── How it works ─── */
    .how-wrap { background: var(--red-50); border-radius: var(--radius-xl); padding: 64px 56px; }
    .steps-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; position: relative; }
    .steps-row::before {
      content: ''; position: absolute; top: 28px; left: 12.5%; right: 12.5%;
      height: 2px; background: linear-gradient(90deg, var(--red-200), var(--red-100));
      border-top: 2px dashed var(--red-200);
    }
    .step {
      text-align: center; padding: 0 12px;
    }
    .step-bubble {
      width: 54px; height: 54px; border-radius: 50%;
      background: white; border: 2px solid var(--red-200);
      color: var(--red); font-weight: 800; font-size: 1.2rem;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 16px; position: relative; z-index: 1;
      box-shadow: var(--shadow-sm);
    }
    .step h4 { font-size: 0.95rem; margin-bottom: 6px; }
    .step p { font-size: 0.82rem; color: var(--text-2); line-height: 1.6; }

    /* ─── Fichas explainer ─── */
    .fichas-section { background: var(--text); color: white; border-radius: var(--radius-xl); padding: 64px 56px; position: relative; overflow: hidden; }
    .fichas-section::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 70% at 80% 50%, rgba(229,57,53,0.25), transparent);
    }
    .fichas-section h2 { color: white; margin-bottom: 14px; position: relative; }
    .fichas-section > p { color: rgba(255,255,255,0.7); font-size: 1rem; max-width: 460px; line-height: 1.8; margin-bottom: 36px; position: relative; }
    .fichas-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; position: relative;
    }
    .ficha-item {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-md); padding: 20px; transition: var(--transition);
    }
    .ficha-item:hover { background: rgba(229,57,53,0.2); border-color: rgba(229,57,53,0.4); }
    .ficha-item .svc { font-size: 0.82rem; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
    .ficha-item .price { font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 4px; }
    .ficha-item .price span { font-size: 0.75rem; font-weight: 500; color: rgba(255,255,255,0.5); }
    .ficha-item .duration { font-size: 0.75rem; color: rgba(255,255,255,0.5); }

    /* ─── Professionals preview ─── */
    .profs-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .prof-mini {
      background: white; border: 1.5px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px;
      box-shadow: var(--shadow-card); transition: var(--transition);
    }
    .prof-mini:hover { box-shadow: var(--shadow-lg); border-color: var(--red-200); transform: translateY(-3px); }
    .prof-mini-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .prof-mini-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, var(--red-light), var(--red-dark));
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; flex-shrink: 0;
    }
    .prof-mini-name { font-size: 0.95rem; font-weight: 700; }
    .prof-mini-spec { font-size: 0.78rem; color: var(--red); font-weight: 600; }
    .prof-mini-rating { font-size: 0.78rem; color: var(--text-muted); }
    .prof-mini .next-slots { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
    .slot-pill {
      padding: 4px 10px; border-radius: var(--radius-full);
      font-size: 0.75rem; font-weight: 600;
      background: var(--red-50); color: var(--red);
      border: 1px solid var(--red-100);
    }

    /* ─── CTA ─── */
    .cta-band {
      background: linear-gradient(135deg, var(--red), var(--red-dark));
      border-radius: var(--radius-xl); padding: 56px;
      text-align: center; position: relative; overflow: hidden;
      box-shadow: var(--shadow-lg);
    }
    .cta-band::before {
      content:''; position:absolute; inset:0;
      background:url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M20 18v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E");
    }
    .cta-band h2 { color: white; margin-bottom: 12px; position: relative; }
    .cta-band p { color: rgba(255,255,255,0.85); font-size: 1rem; margin-bottom: 32px; position: relative; }
    .cta-band .btn-group { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; }

    @media(max-width:1024px){
      .hero { grid-template-columns: 1fr; min-height: auto; padding: 100px 0 60px; }
      .hero__visual { display: none; }
      .services-grid { grid-template-columns: repeat(2,1fr); }
      .fichas-grid { grid-template-columns: repeat(2,1fr); }
      .profs-preview { grid-template-columns: repeat(2,1fr); }
      .steps-row { grid-template-columns: repeat(2,1fr); }
      .steps-row::before { display: none; }
    }
    @media(max-width:600px){
      .services-grid { grid-template-columns: 1fr; }
      .fichas-grid { grid-template-columns: 1fr; }
      .profs-preview { grid-template-columns: 1fr; }
      .steps-row { grid-template-columns: 1fr; }
      .how-wrap, .fichas-section, .cta-band { padding: 40px 24px; }
    }
  </style>
</head>
<body>

<nav class="navbar">
  <div class="navbar__inner">
    <a href="index.html" class="navbar__logo">
      <div class="logo-icon">❤</div>
      <span>alma<span class="plus">+</span></span>
    </a>
    <ul class="navbar__nav">
      <li><a href="index.html">Inicio</a></li>
      <li><a href="professionals.html">Profesionales</a></li>
      <li><a href="apply.html">Soy profesional</a></li>
    </ul>
    <div class="navbar__actions">
      <a href="login.html" class="btn btn-ghost btn-sm">Ingresar</a>
      <a href="login.html#register" class="btn btn-primary btn-sm">Registrarme</a>
    </div>
    <button class="hamburger" aria-label="Menú"><span></span><span></span><span></span></button>
  </div>
</nav>
<nav class="mobile-nav">
  <a href="index.html">Inicio</a>
  <a href="professionals.html">Profesionales</a>
  <a href="apply.html">Soy profesional</a>
  <a href="login.html">Ingresar / Registrarme</a>
</nav>

<!-- ─── Hero ─── -->
<section class="hero">
  <div style="padding: 0 24px 0 max(24px, calc((100vw - 1240px)/2 + 24px))">
    <div class="hero__badge">
      <span class="dot"></span>
      Más de 480 profesionales verificados
    </div>
    <h1>Tu bienestar a un <span class="gradient-text">clic de distancia</span></h1>
    <p class="hero__sub">Psicólogos, nutricionistas, personal trainers, coaches y psiquiatras que atienden de forma privada. Elegís a quién y cuándo.</p>
    <div class="hero__actions">
      <a href="professionals.html" class="btn btn-primary btn-lg">Encontrar profesional</a>
      <a href="login.html" class="btn btn-outline btn-lg">Ingresar</a>
    </div>
    <div class="ficha-strip">
      <span class="ficha"><span class="symbol">+</span> fichas</span>
      <span>— la moneda de alma+. Comprás fichas y las usás para reservar sesiones.</span>
    </div>
  </div>
  <div class="hero__visual">
    <img src="img-therapy.png" alt="Sesión de terapia profesional" class="hero__img-main" />
    <div class="hero__img-badge">
      <div class="icon">📅</div>
      <div>
        <strong>Próxima sesión disponible</strong>
        <span>Hoy · 17:00 hs</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── How it works ─── -->
<section class="section">
  <div class="container">
    <div class="how-wrap reveal">
      <div class="section-header" style="margin-bottom:48px">
        <div class="overline">Cómo funciona</div>
        <h2>Simple y sin vueltas</h2>
        <div class="divider"></div>
      </div>
      <div class="steps-row">
        <div class="step">
          <div class="step-bubble">1</div>
          <h4>Elegís un profesional</h4>
          <p>Filtrá por especialidad, horario y precio en fichas.</p>
        </div>
        <div class="step">
          <div class="step-bubble">2</div>
          <h4>Reservás tu sesión</h4>
          <p>Elegís el día y horario disponible en el calendario.</p>
        </div>
        <div class="step">
          <div class="step-bubble">3</div>
          <h4>Pagás con fichas</h4>
          <p>Cada sesión tiene un precio fijo en fichas +.</p>
        </div>
        <div class="step">
          <div class="step-bubble">4</div>
          <h4>¡Listo, nos vemos!</h4>
          <p>Recibís confirmación y recordatorio de tu turno.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Services ─── -->
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-header reveal">
      <div class="overline">Nuestros servicios</div>
      <h2>Profesionales de salud <span class="gradient-text">privados</span></h2>
      <div class="divider"></div>
      <p>Todos atienden de forma independiente con precios transparentes en fichas.</p>
    </div>
    <div class="services-grid stagger-children">

      <a href="professionals.html?s=psicologia" class="service-card">
        <div class="service-icon" style="background:#FFF5F5">🧠</div>
        <h3>Psicología</h3>
        <p class="desc">Terapia individual con psicólogos y psicólogas especializados en diferentes enfoques.</p>
        <div class="session-info">⏱ Sesiones de 45 a 60 minutos</div>
        <div class="service-footer">
          <div class="ficha"><span class="symbol">+</span> 8 fichas / sesión</div>
          <span class="badge badge-green">Disponible hoy</span>
        </div>
      </a>

      <a href="professionals.html?s=psiquiatria" class="service-card">
        <div class="service-icon" style="background:#FFF5F5">💊</div>
        <h3>Psiquiatría</h3>
        <p class="desc">Consultas psiquiátricas para diagnóstico, seguimiento y ajuste de tratamiento.</p>
        <div class="session-info">⏱ Consultas de 30 a 45 minutos</div>
        <div class="service-footer">
          <div class="ficha"><span class="symbol">+</span> 12 fichas / consulta</div>
          <span class="badge badge-yellow">Alta demanda</span>
        </div>
      </a>

      <a href="professionals.html?s=nutricion" class="service-card">
        <div class="service-icon" style="background:#FFF5F5">🥗</div>
        <h3>Nutrición</h3>
        <p class="desc">Planes de alimentación personalizados con nutricionistas diplomados.</p>
        <div class="session-info">⏱ Sesiones de 50 a 60 minutos</div>
        <div class="service-footer">
          <div class="ficha"><span class="symbol">+</span> 6 fichas / sesión</div>
          <span class="badge badge-green">Disponible hoy</span>
        </div>
      </a>

      <a href="professionals.html?s=trainer" class="service-card">
        <div class="service-icon" style="background:#FFF5F5">🏋️</div>
        <h3>Personal Trainer</h3>
        <p class="desc">Entrenamiento físico personalizado online o presencial, adaptado a tus objetivos.</p>
        <div class="session-info">⏱ Sesiones de 60 minutos</div>
        <div class="service-footer">
          <div class="ficha"><span class="symbol">+</span> 5 fichas / sesión</div>
          <span class="badge badge-green">Disponible hoy</span>
        </div>
      </a>

      <a href="professionals.html?s=coaching" class="service-card">
        <div class="service-icon" style="background:#FFF5F5">🎯</div>
        <h3>Coaching</h3>
        <p class="desc">Acompañamiento profesional para metas de vida, carrera y transformación personal.</p>
        <div class="session-info">⏱ Sesiones de 50 a 60 minutos</div>
        <div class="service-footer">
          <div class="ficha"><span class="symbol">+</span> 7 fichas / sesión</div>
          <span class="badge badge-green">Disponible hoy</span>
        </div>
      </a>

      <a href="professionals.html" class="service-card" style="border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:200px">
        <div class="service-icon" style="background:#FFF5F5;margin:0 auto 14px">➕</div>
        <h3>Otro profesional</h3>
        <p class="desc">¿Buscás otro tipo de profesional de salud privado? Explorá el directorio completo.</p>
        <div style="margin-top:16px">
          <span class="btn btn-outline btn-sm">Ver directorio</span>
        </div>
      </a>

    </div>
  </div>
</section>

<!-- ─── Fichas explainer ─── -->
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="fichas-section reveal">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center">
        <div>
          <span class="badge badge-red" style="margin-bottom:20px;background:rgba(255,255,255,0.1);color:white;border-color:rgba(255,255,255,0.2)">Sistema de fichas</span>
          <h2>¿Qué son las fichas <span style="color:#FF8A80">+</span>?</h2>
          <p>Las fichas son la moneda de alma+. Comprás un paquete de fichas y las usás para reservar sesiones con cualquier profesional del directorio. Sin sorpresas, sin comisiones ocultas.</p>
          <a href="login.html#register" class="btn btn-white btn-lg" style="margin-top:28px">Comprar fichas →</a>
        </div>
        <div class="fichas-grid">
          <div class="ficha-item">
            <div class="svc">🧠 Psicología</div>
            <div class="price">8<span>+ fichas</span></div>
            <div class="duration">45 – 60 min por sesión</div>
          </div>
          <div class="ficha-item">
            <div class="svc">💊 Psiquiatría</div>
            <div class="price">12<span>+ fichas</span></div>
            <div class="duration">30 – 45 min por consulta</div>
          </div>
          <div class="ficha-item">
            <div class="svc">🥗 Nutrición</div>
            <div class="price">6<span>+ fichas</span></div>
            <div class="duration">50 – 60 min por sesión</div>
          </div>
          <div class="ficha-item">
            <div class="svc">🏋️ Personal Trainer</div>
            <div class="price">5<span>+ fichas</span></div>
            <div class="duration">60 min por sesión</div>
          </div>
          <div class="ficha-item">
            <div class="svc">🎯 Coaching</div>
            <div class="price">7<span>+ fichas</span></div>
            <div class="duration">50 – 60 min por sesión</div>
          </div>
          <div class="ficha-item" style="display:flex;align-items:center;justify-content:center;text-align:center">
            <a href="login.html#register" style="color:rgba(255,255,255,0.7);font-size:0.85rem;text-decoration:underline">Ver todos los precios →</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ─── Professionals preview ─── -->
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-header reveal">
      <div class="overline">Profesionales destacados</div>
      <h2>Conocé a nuestros especialistas</h2>
      <div class="divider"></div>
    </div>
    <div class="profs-preview stagger-children">
      <div class="prof-mini">
        <div class="prof-mini-head">
          <div class="prof-mini-avatar">🧠</div>
          <div>
            <div class="prof-mini-name">Lic. Valentina Suárez</div>
            <div class="prof-mini-spec">Psicología · TCC</div>
            <div class="prof-mini-rating">⭐ 4.9 · 142 sesiones</div>
          </div>
        </div>
        <div class="tags"><span class="tag">Ansiedad</span><span class="tag">Vínculos</span><span class="tag">Online</span></div>
        <div class="next-slots">
          <span class="slot-pill">Hoy 17:00</span>
          <span class="slot-pill">Hoy 18:00</span>
          <span class="slot-pill">Mañ 10:00</span>
        </div>
        <a href="professionals.html" class="btn btn-outline btn-sm" style="width:100%;margin-top:14px;justify-content:center">Ver perfil</a>
      </div>
      <div class="prof-mini">
        <div class="prof-mini-head">
          <div class="prof-mini-avatar" style="background:linear-gradient(135deg,#FF7043,#E53935)">🏋️</div>
          <div>
            <div class="prof-mini-name">Agustín Ferreyra</div>
            <div class="prof-mini-spec">Personal Trainer</div>
            <div class="prof-mini-rating">⭐ 5.0 · 98 sesiones</div>
          </div>
        </div>
        <div class="tags"><span class="tag">Funcional</span><span class="tag">Presencial</span><span class="tag">CABA</span></div>
        <div class="next-slots">
          <span class="slot-pill">Hoy 08:00</span>
          <span class="slot-pill">Mañ 07:30</span>
          <span class="slot-pill">Mañ 09:00</span>
        </div>
        <a href="professionals.html" class="btn btn-outline btn-sm" style="width:100%;margin-top:14px;justify-content:center">Ver perfil</a>
      </div>
      <div class="prof-mini">
        <div class="prof-mini-head">
          <div class="prof-mini-avatar" style="background:linear-gradient(135deg,#66BB6A,#2E7D32)">🥗</div>
          <div>
            <div class="prof-mini-name">Lic. Camila Ríos</div>
            <div class="prof-mini-spec">Nutrición</div>
            <div class="prof-mini-rating">⭐ 4.8 · 207 sesiones</div>
          </div>
        </div>
        <div class="tags"><span class="tag">Deportiva</span><span class="tag">Vegana</span><span class="tag">Online</span></div>
        <div class="next-slots">
          <span class="slot-pill">Mañ 11:00</span>
          <span class="slot-pill">Mañ 16:00</span>
          <span class="slot-pill">Jue 10:00</span>
        </div>
        <a href="professionals.html" class="btn btn-outline btn-sm" style="width:100%;margin-top:14px;justify-content:center">Ver perfil</a>
      </div>
    </div>
    <div style="text-align:center;margin-top:36px">
      <a href="professionals.html" class="btn btn-primary">Ver todos los profesionales →</a>
    </div>
  </div>
</section>

<!-- ─── CTA ─── -->
<section class="section">
  <div class="container">
    <div class="cta-band reveal">
      <h2>¿Sos profesional de la salud?</h2>
      <p>Sumáte a alma+ y gestioná tu agenda, pacientes y pagos en un solo lugar.</p>
      <div class="btn-group">
        <a href="apply.html" class="btn btn-white btn-lg">Registrarme como profesional</a>
        <a href="professionals.html" class="btn btn-lg" style="background:rgba(255,255,255,0.12);color:white;border:2px solid rgba(255,255,255,0.3)">Conocer el directorio</a>
      </div>
    </div>
  </div>
</section>

<!-- ─── Footer ─── -->
<footer>
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <div class="footer__logo">
          <div class="logo-icon">❤</div>
          <span>alma<span class="plus">+</span></span>
        </div>
        <p>Plataforma de salud y bienestar con profesionales privados verificados. Atención personalizada con precios transparentes.</p>
      </div>
      <div class="footer__col">
        <h5>Servicios</h5>
        <a href="professionals.html?s=psicologia">Psicología</a>
        <a href="professionals.html?s=psiquiatria">Psiquiatría</a>
        <a href="professionals.html?s=nutricion">Nutrición</a>
        <a href="professionals.html?s=trainer">Personal Trainer</a>
        <a href="professionals.html?s=coaching">Coaching</a>
      </div>
      <div class="footer__col">
        <h5>Para profesionales</h5>
        <a href="apply.html">Registrarme</a>
        <a href="login.html">Mi panel</a>
        <a href="#">¿Cómo funciona?</a>
      </div>
      <div class="footer__col">
        <h5>alma+</h5>
        <a href="#">Sobre nosotros</a>
        <a href="#">Contacto</a>
        <a href="#">Privacidad</a>
        <a href="#">Términos</a>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© 2026 alma+. Todos los derechos reservados.</span>
      <div class="tags" style="gap:8px">
        <span class="tag" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1);color:#aaa">🇦🇷 Argentina</span>
        <span class="tag" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1);color:#aaa">❤️ Hecho con amor</span>
      </div>
    </div>
  </div>
</footer>

<script src="script.js"></script>
</style>
</head>

<body>
</html>
