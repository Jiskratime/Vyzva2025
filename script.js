
const supabase = window.supabaseClient;

async function loadDisciplines() {
  const { data, error } = await supabase
    .from('discipliny')
    .select('*')
    .order('nazev');

  const select = document.getElementById('disciplineSelect');
  if (error) {
    console.error("Chyba při načítání disciplín:", error);
    return;
  }

  data.forEach(d => {
    const option = document.createElement('option');
    option.value = JSON.stringify(d);
    option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
    select.appendChild(option);
  });

  select.addEventListener('change', showForm);
}

function showForm() {
  const discipline = JSON.parse(document.getElementById('disciplineSelect').value);
  const isTrack = discipline.typ === 'beh';
  const form = document.createElement('form');

  form.innerHTML = `
    <h3>Zadání výsledků</h3>
    <input type="text" placeholder="Příjmení" id="surname">
    <input type="text" placeholder="Jméno" id="name">
    ${isTrack ? `
      <input type="number" step="0.01" placeholder="Čas (s)" id="time">
    ` : `
      <input type="number" step="0.01" placeholder="Pokus 1" id="p1">
      <input type="number" step="0.01" placeholder="Pokus 2" id="p2">
      <input type="number" step="0.01" placeholder="Pokus 3" id="p3">
    `}
    <button type="submit">Uložit</button>
    <p id="saveStatus"></p>
  `;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const prijmeni = document.getElementById('surname').value;
    const jmeno = document.getElementById('name').value;
    let vykon = null;
    let pokusy = [];

    if (isTrack) {
      vykon = parseFloat(document.getElementById('time').value);
    } else {
      pokusy = [
        parseFloat(document.getElementById('p1').value),
        parseFloat(document.getElementById('p2').value),
        parseFloat(document.getElementById('p3').value)
      ];
      vykon = Math.max(...pokusy.filter(x => !isNaN(x)));
    }

    const { error } = await supabase.from('vysledky').insert([{
      id_disciplina: discipline.id,
      prijmeni,
      jmeno,
      vykon,
      pokus1: pokusy[0] || null,
      pokus2: pokusy[1] || null,
      pokus3: pokusy[2] || null
    }]);

    const status = document.getElementById('saveStatus');
    if (error) {
      status.textContent = 'Chyba při ukládání!';
      status.style.color = 'red';
    } else {
      status.textContent = 'Výsledek uložen.';
      status.style.color = 'green';
      form.reset();
    }

    showResults(discipline.id, isTrack);
  };

  const container = document.getElementById('formContainer');
  container.innerHTML = '';
  container.appendChild(form);

  showResults(discipline.id, isTrack);
}

async function showResults(disciplinaId, isTrack) {
  const { data, error } = await supabase
    .from('vysledky')
    .select('*')
    .eq('id_disciplina', disciplinaId)
    .order('vykon', { ascending: isTrack });

  const container = document.getElementById('resultsContainer');
  if (error) {
    console.error('Chyba při načítání výsledků:', error);
    container.innerHTML = '<p>Chyba při načítání výsledků.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>Žádné výsledky.</p>';
    return;
  }

  let html = '<h3>Výsledky</h3><table border="1"><tr><th>Jméno</th><th>Příjmení</th>';
  html += isTrack ? '<th>Čas (s)</th>' : '<th>Pokus 1</th><th>Pokus 2</th><th>Pokus 3</th><th>Nejlepší</th>';
  html += '</tr>';

  data.forEach(d => {
    html += `<tr><td>${d.jmeno}</td><td>${d.prijmeni}</td>`;
    if (isTrack) {
      html += `<td>${d.vykon ?? '-'}</td>`;
    } else {
      html += `<td>${d.pokus1 ?? '-'}</td><td>${d.pokus2 ?? '-'}</td><td>${d.pokus3 ?? '-'}</td><td>${d.vykon ?? '-'}</td>`;
    }
    html += '</tr>';
  });

  html += '</table>';
  container.innerHTML = html;
}

loadDisciplines();
