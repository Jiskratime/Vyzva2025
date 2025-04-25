
const supabaseUrl = 'https://lmcmwrehrmgygsnyofdf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtY213cmVocm1neWdzbnlvZmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjMzNzIsImV4cCI6MjA2MDgzOTM3Mn0.oJ7rRKOg2FAurmZanqvanyu4k0gnEXQfKawayZHeSBQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadDisciplines() {
  const { data, error } = await supabase.from('discipliny').select('*');
  if (error) {
    console.error("Chyba při načítání disciplíny:", error);
    return;
  }

  const select = document.getElementById('disciplineSelect');
  data.forEach((discipline) => {
    const option = document.createElement('option');
    option.value = JSON.stringify(discipline);
    option.textContent = `${discipline.nazev} – ${discipline.kategorie} – ${discipline.pohlavi}`;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const discipline = JSON.parse(select.value);
    showForm(discipline);
    showResultsTable(discipline);
  });
}

function showForm(discipline) {
  const container = document.getElementById('formContainer');
  container.innerHTML = '';

  const form = document.createElement('form');
  form.innerHTML = `
    <h3>Zápis výsledku</h3>
    <input type="text" id="jmeno" placeholder="Jméno" required>
    <input type="text" id="prijmeni" placeholder="Příjmení" required>
    ${discipline.typ === 'beh' ? `
      <input type="number" id="cas" placeholder="Čas (s)" step="0.01" required>
    ` : `
      <input type="number" id="pokus_1" placeholder="Pokus 1 (m)" step="0.01">
      <input type="number" id="pokus_2" placeholder="Pokus 2 (m)" step="0.01">
      <input type="number" id="pokus_3" placeholder="Pokus 3 (m)" step="0.01">
    `}
    <button type="submit">Uložit</button>
    <p id="saveStatus"></p>
  `;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const jmeno = document.getElementById('jmeno').value;
    const prijmeni = document.getElementById('prijmeni').value;

    let data = {
      jmeno,
      prijmeni,
      disciplina_id: discipline.id
    };

    if (discipline.typ === 'beh') {
      data.cas = parseFloat(document.getElementById('cas').value);
    } else {
      data.pokus_1 = parseFloat(document.getElementById('pokus_1').value) || null;
      data.pokus_2 = parseFloat(document.getElementById('pokus_2').value) || null;
      data.pokus_3 = parseFloat(document.getElementById('pokus_3').value) || null;
      data.nejlepsi = Math.max(data.pokus_1 || 0, data.pokus_2 || 0, data.pokus_3 || 0);
    }

    const { error } = await supabase.from('vysledky').insert([data]);
    const status = document.getElementById('saveStatus');

    if (error) {
      status.textContent = 'Chyba při ukládání';
      status.style.color = 'red';
    } else {
      status.textContent = 'Výsledek uložen';
      status.style.color = 'green';
      form.reset();
      showResultsTable(discipline);
    }
  };

  container.appendChild(form);
}

async function showResultsTable(discipline) {
  const { data, error } = await supabase
    .from('vysledky')
    .select('*')
    .eq('disciplina_id', discipline.id)
    .order(discipline.typ === 'beh' ? 'cas' : 'nejlepsi', { ascending: discipline.typ === 'beh' });

  const container = document.getElementById('resultsContainer');
  container.innerHTML = '<h3>Výsledky</h3>';

  if (error || !data || data.length === 0) {
    container.innerHTML += '<p>Žádné výsledky</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <tr><th>Jméno</th><th>Příjmení</th><th>${discipline.typ === 'beh' ? 'Čas (s)' : 'Nejlepší (m)'}</th></tr>
  `;

  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index === 0) tr.style.background = '#fffacd';
    else if (index === 1) tr.style.background = '#d3d3d3';
    else if (index === 2) tr.style.background = '#f0e68c';

    tr.innerHTML = `
      <td>${row.jmeno}</td>
      <td>${row.prijmeni}</td>
      <td>${discipline.typ === 'beh' ? row.cas : row.nejlepsi}</td>
    `;
    table.appendChild(tr);
  });

  container.appendChild(table);
}

loadDisciplines();
