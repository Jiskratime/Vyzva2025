import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
  const { data, error } = await supabase.from('discipliny').select('*').order('nazev');
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
  const discipline = JSON.parse(select.value);
  const isTrack = discipline.typ === 'beh';
  const form = document.createElement('form');
  form.innerHTML = `
    <h3>Zadání výsledků</h3>
    <input type="text" placeholder="Příjmení" id="surname" required>
    <input type="text" placeholder="Jméno" id="name" required>
    ${isTrack
      ? `<input type="number" placeholder="Výkon (čas v s)" id="time" required>`
      : `<input type="number" placeholder="Pokus 1 (m)" id="p1">
         <input type="number" placeholder="Pokus 2 (m)" id="p2">
         <input type="number" placeholder="Pokus 3 (m)" id="p3">`
    }
    <button type="submit">Uložit</button>
    <p id="saveStatus" style="color: green;"></p>
  `;
  form.onsubmit = async function(e) {
    e.preventDefault();
    const jmeno = document.getElementById('name').value;
    const prijmeni = document.getElementById('surname').value;
    let vykon = null;
    let pokusy = [];

    if (isTrack) {
      vykon = parseFloat(document.getElementById('time').value);
    } else {
      pokusy = [parseFloat(p1.value), parseFloat(p2.value), parseFloat(p3.value)];
      vykon = Math.max(...pokusy.filter(x => !isNaN(x)));
    }

    const { error } = await supabase.from('vysledky').insert([{
      jmeno,
      prijmeni,
      id_disciplina: discipline.id,
      pokus_1: pokusy[0] || null,
      pokus_2: pokusy[1] || null,
      pokus_3: pokusy[2] || null,
      nejlepsi: vykon || null
    }]);

    const status = document.getElementById('saveStatus');
    if (error) {
      console.error(error);
      status.textContent = 'Chyba při ukládání!';
      status.style.color = 'red';
    } else {
      status.textContent = 'Výsledek uložen.';
      status.style.color = 'green';
      form.reset();
    }
  };

  formContainer.innerHTML = '';
  formContainer.appendChild(form);
}

loadDisciplines();