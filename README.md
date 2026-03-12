<!DOCTYPE html>
<html lang="es">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>alma+ | Tu plataforma de salud y bienestar</title>

<link rel="stylesheet" href="style.css">

<!-- SUPABASE -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

<script>
const SUPABASE_URL = "https://iuhnhexotyrnflsmpzxi.supabase.co";
const SUPABASE_KEY = "sb_publishable_DwIRv7GbWFpeBXyDeghA1g_sfXSoyTp";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>

<style>

/* HERO */

.hero{
min-height:100vh;
display:grid;
grid-template-columns:1fr 1fr;
align-items:center;
gap:40px;
padding-top:80px;
background:linear-gradient(160deg,#FFF5F5 0%,#FFFCFC 60%);
}

.hero__text{
padding:60px 24px;
}

.hero h1{
font-size:42px;
margin-bottom:20px;
}

.hero__sub{
font-size:18px;
line-height:1.6;
color:#666;
margin-bottom:28px;
max-width:500px;
}

.hero__actions{
display:flex;
gap:12px;
}

.hero__img-main{
width:100%;
border-radius:20px;
box-shadow:0 10px 30px rgba(0,0,0,0.1);
}

/* BOTONES */

.btn{
padding:12px 20px;
border-radius:8px;
text-decoration:none;
font-weight:600;
display:inline-block;
}

.btn-primary{
background:#E53935;
color:white;
}

.btn-outline{
border:2px solid #E53935;
color:#E53935;
}

.btn-white{
background:white;
color:#E53935;
}

/* NAVBAR */

.navbar{
position:fixed;
top:0;
left:0;
right:0;
background:white;
border-bottom:1px solid #eee;
z-index:100;
}

.navbar__inner{
max-width:1200px;
margin:auto;
display:flex;
align-items:center;
justify-content:space-between;
padding:14px 24px;
}

.navbar__nav{
display:flex;
gap:18px;
list-style:none;
}

.navbar__nav a{
text-decoration:none;
color:#333;
font-weight:500;
}

/* SECTIONS */

.section{
padding:80px 24px;
}

.container{
max-width:1200px;
margin:auto;
}

.section-header{
text-align:center;
margin-bottom:50px;
}

.services-grid{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:20px;
}

.service-card{
background:white;
padding:28px;
border-radius:14px;
border:1px solid #eee;
text-decoration:none;
color:#333;
transition:0.2s;
}

.service-card:hover{
transform:translateY(-4px);
box-shadow:0 8px 24px rgba(0,0,0,0.08);
}

/* PROFESSIONALS */

.profs-preview{
display:grid;
grid-template-columns:repeat(3,1fr);
gap:20px;
}

.prof-mini{
background:white;
border:1px solid #eee;
border-radius:12px;
padding:20px;
}

.prof-mini-name{
font-weight:700;
}

/* CTA */

.cta-band{
background:#E53935;
color:white;
padding:60px;
border-radius:18px;
text-align:center;
}

/* FOOTER */

footer{
background:#111;
color:#bbb;
padding:60px 24px;
}

.footer__grid{
max-width:1200px;
margin:auto;
display:grid;
grid-template-columns:repeat(4,1fr);
gap:30px;
}

.footer__col a{
display:block;
color:#bbb;
text-decoration:none;
margin-bottom:8px;
}

/* RESPONSIVE */

@media(max-width:900px){

.hero{
grid-template-columns:1fr;
}

.services-grid{
grid-template-columns:1fr 1fr;
}

.profs-preview{
grid-template-columns:1fr 1fr;
}

.footer__grid{
grid-template-columns:1fr 1fr;
}

}

@media(max-width:600px){

.services-grid{
grid-template-columns:1fr;
}

.profs-preview{
grid-template-columns:1fr;
}

}

</style>

</head>

<body>

<!-- NAVBAR -->

<nav class="navbar">
<div class="navbar__inner">

<strong>alma+</strong>

<ul class="navbar__nav">
<li><a href="index.html">Inicio</a></li>
<li><a href="professionals.html">Profesionales</a></li>
<li><a href="apply.html">Soy profesional</a></li>
</ul>

<div>
<a href="login.html" class="btn btn-outline">Ingresar</a>
</div>

</div>
</nav>

<!-- HERO -->

<section class="hero">

<div class="hero__text">

<h1>Tu bienestar a un clic</h1>

<p class="hero__sub">
Psicólogos, nutricionistas, coaches y profesionales de salud
disponibles para reservar sesiones privadas.
</p>

<div class="hero__actions">
<a href="professionals.html" class="btn btn-primary">Encontrar profesional</a>
<a href="login.html" class="btn btn-outline">Ingresar</a>
</div>

</div>

<div>

<img src="img-therapy.png" class="hero__img-main">

</div>

</section>

<!-- SERVICIOS -->

<section class="section">

<div class="container">

<div class="section-header">
<h2>Nuestros servicios</h2>
</div>

<div class="services-grid">

<a class="service-card">
<h3>Psicología</h3>
<p>Terapia individual con psicólogos especializados.</p>
</a>

<a class="service-card">
<h3>Psiquiatría</h3>
<p>Diagnóstico y tratamiento profesional.</p>
</a>

<a class="service-card">
<h3>Nutrición</h3>
<p>Planes alimenticios personalizados.</p>
</a>

<a class="service-card">
<h3>Personal Trainer</h3>
<p>Entrenamiento físico profesional.</p>
</a>

<a class="service-card">
<h3>Coaching</h3>
<p>Metas personales y profesionales.</p>
</a>

<a class="service-card">
<h3>Ver directorio</h3>
<p>Explorar todos los profesionales.</p>
</a>

</div>

</div>

</section>

<!-- PROFESIONALES -->

<section class="section">

<div class="container">

<div class="section-header">
<h2>Profesionales destacados</h2>
</div>

<div class="profs-preview">

<div class="prof-mini">
<div class="prof-mini-name">Valentina Suárez</div>
<p>Psicóloga</p>
</div>

<div class="prof-mini">
<div class="prof-mini-name">Agustín Ferreyra</div>
<p>Trainer</p>
</div>

<div class="prof-mini">
<div class="prof-mini-name">Camila Ríos</div>
<p>Nutricionista</p>
</div>

</div>

</div>

</section>

<!-- CTA -->

<section class="section">

<div class="container">

<div class="cta-band">

<h2>¿Sos profesional?</h2>

<p>Sumate a alma+ y gestioná pacientes y agenda.</p>

<a href="apply.html" class="btn btn-white">Registrarme</a>

</div>

</div>

</section>

<!-- FOOTER -->

<footer>

<div class="footer__grid">

<div>
<strong>alma+</strong>
<p>Plataforma de bienestar con profesionales privados.</p>
</div>

<div class="footer__col">
<h4>Servicios</h4>
<a>Psicología</a>
<a>Psiquiatría</a>
<a>Nutrición</a>
</div>

<div class="footer__col">
<h4>Profesionales</h4>
<a>Registrarme</a>
<a>Mi panel</a>
</div>

<div class="footer__col">
<h4>alma+</h4>
<a>Contacto</a>
<a>Privacidad</a>
<a>Términos</a>
</div>

</div>

</footer>

<script src="script.js"></script>

</body>
</html>
