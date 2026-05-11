document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
});
