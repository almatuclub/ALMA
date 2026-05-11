function submitHelpForm() {
  const btn = document.getElementById('help-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  setTimeout(() => {
    btn.textContent = 'Solicitud enviada ✓';
    btn.style.background = '#4CAF50';
    showToast('Tu mensaje fue recibido por nuestro equipo social. Nos contactaremos.', '🫂', 'success');
    document.getElementById('help-form').reset();

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Enviar mi situación';
      btn.style.background = '';
    }, 4000);
  }, 1500);
}
