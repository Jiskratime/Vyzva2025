const supabaseUrl = 'https://lmcmwrehrmgygsnyofdf.supabase.co';
const supabaseKey = 'eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtY213cmVocm1neWdzbnlvZmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjMzNzIsImV4cCI6MjA2MDgzOTM3Mn0.oJ7rRKOg2FAurmZanqvanyu4k0gnEXQfKawayZHeSBQ'; // ← zde celý klíč
const supabase = createClient(supabaseUrl, supabaseKey);

const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
  console.log("Spuštěna funkce loadDisciplines");
  const { data, error } = await supabase
    .from('discipliny')
    .select('*')
    .order('nazev');

  if (error) {
    console.error("Chyba při načítání disciplín:", error);
    return;
  }

  data.forEach(d => {
    const option = document.createElement('option');
    option.value = JSON.stringify(d); // uložíme celý objekt
    option.textContent = `${d.nazev} | ${d.kategorie} | ${d.pohlavi}`;
    select.appendChild(option);
  });

  select.addEventListener('change', showForm);
}

function showForm() {
  const discipline = JSON.parse(select.value);
  formContainer.innerHTML = ''; // pro jistotu vyčistit

  const isTrack = discipline.typ === 'beh';

  const form = document.createElement('form');
  form.innerHTML = `
    <h3>Zápis výsledku</h3>
    <input type="text" id="surname" placeholder="Příjmení">
    <input type="text" id="name" placeholder="Jméno">
    ${
      isTrack
        ? `<input type="text" id="time" placeholder="Výkon (v s)">`
        : `
      <input type="text" id="p1" placeholder="Pokus 1 (m)">
      <input type="text" id="p2" placeholder="Pokus 2 (m)">
      <input type="text" id="p3" placeholder="Pokus 3 (m)">`
    }
    <button type="submit">Uložit</button>
    <p id="saveStatus"></p>
  `;

  form.onsubmit = async function (e) {
    e.preventDefault();

    const prijmeni = document.getElementById('surname').value;
    const jmeno = document.getElementById('name').value;
    const status = document.getElementById('saveStatus');

    let vykon = null, pokusy = [];

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

    if (error) {
      status.textContent = 'Chyba při ukládání!';
      status.style.color = 'red';
      console.error(error);
    } else {
      status.textContent = 'Výsledek uložen.';
      status.style.color = 'green';
      form.reset();
    }
  };

  formContainer.appendChild(form);
}

loadDisciplines();
