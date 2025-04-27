// Připojení na Supabase
const SUPABASE_URL = 'https://lmcmwrehrmgygsnyofdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tvůj správný klíč
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Načíst disciplíny do selectu
async function loadDisciplines() {
  const { data, error } = await supabase.from('discipliny').select('*').order('nazev');
  const select = document.getElementById('disciplineSelect');
  select.innerHTML = ''; // Vyčistit select
  if (error) {
    console.error('Chyba načítání disciplín:', error);
    return;
  }
  data.forEach(d => {
    const option = document.createElement('option');
    option.value = d.id;
    option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
    select.appendChild(option);
  });
}

// Po výběru disciplíny ukázat formulář
document.getElementById('disciplineSelect').addEventListener('change', showForm);

async function showForm() {
  const id = document.getElementById('disciplineSelect').value;
  const { data: discipline } = await supabase.from('discipliny').select('*').eq('id', id).single();

  const formContainer = document.getElementById('formContainer');
  formContainer.innerHTML = `
    <h3>Zadání výsledků</h3>
    <input type="text" id="prijmeni" placeholder="Příjmení"><br>
    <input type="text" id="jmeno" placeholder="Jméno"><br>
    ${discipline.typ === 'beh' ? 
      '<input type="number" id="cas" placeholder="Výkon (v sekundách)">' : 
      `
      <input type="number" id="pokus_1" placeholder="Pokus 1 (m)">
      <input type="number" id="pokus_2" placeholder="Pokus 2 (m)">
      <input type="number" id="pokus_3" placeholder="Pokus 3 (m)">
      `
    }
    <button onclick="saveResult('${id}', '${discipline.typ}')">Uložit výsledek</button>
  `;
  loadResults(id, discipline.typ);
}

// Uložit výsledek
async function saveResult(id, typ) {
  const prijmeni = document.getElementById('prijmeni').value;
  const jmeno = document.getElementById('jmeno').value;
  let vykon = null;
  let pokusy = [null, null, null];

  if (typ === 'beh') {
    vykon = parseFloat(document.getElementById('cas').value);
  } else {
    pokusy = [
      parseFloat(document.getElementById('pokus_1').value),
      parseFloat(document.getElementById('pokus_2').value),
      parseFloat(document.getElementById('pokus_3').value)
    ];
    vykon = Math.max(...pokusy.filter(p => !isNaN(p)));
  }

  const { error } = await supabase.from('vysledky').insert({
    disciplina_id: id,
    prijmeni,
    jmeno,
    pokus_1: pokusy[0],
    pokus_2: pokusy[1],
    pokus_3: pokusy[2],
    cas: typ === 'beh' ? vykon : null,
    nejlepsi: typ === 'technika' ? vykon : null
  });

  if (error) {
    console.error('Chyba ukládání:', error);
    alert('Chyba ukládání!');
  } else {
    alert('Výsledek uložen.');
    showForm(); // Znovu načíst formulář i výsledky
  }
}

// Načíst a zobrazit výsledky
async function loadResults(id, typ) {
  const { data: results, error } = await supabase.from('vysledky').select('*').eq('disciplina_id', id);
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  if (error) {
    console.error('Chyba načítání výsledků:', error);
    return;
  }

  // Výpočty bodů
  results.forEach(r => {
    r.body = 0;
    if (typ === 'beh' && r.cas !== null) {
      r.body = calculatePoints(results.map(x => x.cas), r.cas, false);
    } else if (typ === 'technika' && r.nejlepsi !== null) {
      r.body = calculatePoints(results.map(x => x.nejlepsi), r.nejlepsi, true);
    }
  });

  // Seřazení podle bodů
  results.sort((a, b) => b.body - a.body);

  const table = document.createElement('table');
  table.innerHTML = `
    <tr>
      <th>Pořadí</th>
      <th>Příjmení</th>
      <th>Jméno</th>
      <th>Výkon</th>
      <th>Body</th>
    </tr>
  `;

  results.forEach((r, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${r.prijmeni}</td>
      <td>${r.jmeno}</td>
      <td>${typ === 'beh' ? r.cas : r.nejlepsi}</td>
      <td>${r.body}</td>
    `;
    table.appendChild(row);
  });

  container.appendChild(table);
}

// Výpočet bodů
function calculatePoints(vykony, vykon, isTechnika) {
  vykony = vykony.filter(v => v !== null);
  vykony.sort((a, b) => isTechnika ? b - a : a - b);
  const rank = vykony.indexOf(vykon);
  const points = [10, 8, 6, 5, 4, 3, 2, 1];
  return points[rank] || 0;
}

// Načíst disciplíny po načtení stránky
loadDisciplines();
