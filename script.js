document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('disciplineSelect');
  const { data, error } = await window.supabaseClient
    .from('discipliny')
    .select('*')
    .order('nazev');

  if (error) {
    console.error('Chyba při načítání disciplín:', error);
    select.innerHTML = '<option>Chyba při načítání</option>';
  } else {
    data.forEach((disc) => {
      const option = document.createElement('option');
      option.value = disc.id;
      option.textContent = `${disc.nazev} – ${disc.kategorie} – ${disc.pohlavi}`;
      select.appendChild(option);
    });
  }
});
