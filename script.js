const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
  const { data, error } = await window.supabaseClient
    .from('discipliny')
    .select('*')
    .order('nazev');
  if (error) {
    console.error('Chyba při načítání disciplín:', error);
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
  const discipline = JSON.parse(select.value);
  const isTrack = discipline.typ === 'beh';
  const form = document.createElement('form');
  form.innerHTML = `
    <h3>Zadání výsledků</h3>
    <input type="text" placeholder="Příjmení" id="surname">
    <input type="text" placeholder="Jméno" id="name">
    ${isTrack
      ? `<input type="text" placeholder="Výkon (čas v s)" id="time">`
      : `<input type="text" placeholder="Pokus 1 (m)" id="p1">
         <input type="text" placeholder="Pokus 2 (m)" id="p2">
         <input type="text" placeholder="Pokus 3 (m)" id="p3">`}
    <button type="submit">Uložit</button>
    <p id="saveStatus" style="color: green;"></p>
  `;
  form.onsubmit = async function(e) {
    e.preventDefault();
    const prijmeni = document.getElementById('surname').value;
    const jmeno = document.getElementById('name').value;
    let vykon = null;
    let pokusy = [];
    if (isTrack) {
      vykon = parseFloat(document.getElementById('time').value);
    } else {
      pokusy = [p1.value, p2.value, p3.value].map(x => parseFloat(x));
      vykon = Math.max(...pokusy.filter(x => !isNaN(x)));
    }
    const { error } = await window.supabaseClient.from('vysledky').insert([{
      id_disciplina: discipline.id,
      prijmeni,
      jmeno,
      vykon,
      pokus1: pokusy[0] || null,
      pokus2: pokusy[1] || null,
      pokus3: pokusy[2] || null
    }]);
    const status = document.getElementById('saveStatus');
    if (!error) {
      status.textContent = 'Výsledek uložen.';
      form.reset();
    } else {
      status.style.color = 'red';
      status.textContent = 'Chyba při ukládání!';
      console.error(error);
    }
  };
  formContainer.innerHTML = '';
  formContainer.appendChild(form);
}

loadDisciplines();
