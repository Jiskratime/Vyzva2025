const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

let selectedDiscipline = null;

async function loadDisciplines() {
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
    option.value = JSON.stringify(d);
    option.textContent = `${d.nazev} | ${d.kategorie} | ${d.pohlavi}`;
    select.appendChild(option);
  });
}

select.addEventListener('change', () => {
  selectedDiscipline = JSON.parse(select.value);
  showForm();
});

function showForm() {
  formContainer.innerHTML = '';
  const form = document.createElement('form');
  form.innerHTML = `
    <input name="prijmeni" placeholder="Příjmení" required><br>
    <input name="jmeno" placeholder="Jméno" required><br>
    ${selectedDiscipline.typ === 'technika' ? `
      <input name="pokus_1" placeholder="Pokus 1" type="number"><br>
      <input name="pokus_2" placeholder="Pokus 2" type="number"><br>
      <input name="pokus_3" placeholder="Pokus 3" type="number"><br>
    ` : ''}
    ${selectedDiscipline.typ === 'beh' ? `
      <input name="cas" placeholder="Čas" type="number" step="any"><br>
    ` : ''}
    <button type="submit">Uložit</button>
  `;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const jmeno = formData.get('jmeno');
    const prijmeni = formData.get('prijmeni');
    const cas = formData.get('cas') || null;
    const pokus_1 = formData.get('pokus_1') || null;
    const pokus_2 = formData.get('pokus_2') || null;
    const pokus_3 = formData.get('pokus_3') || null;

    const { data: zavodnik, error: zavodnikError } = await supabase
      .from('zavodnici')
      .insert([{
        jmeno,
        prijmeni,
        kategorie: selectedDiscipline.kategorie,
        pohlavi: selectedDiscipline.pohlavi
      }])
      .select()
      .single();

    if (zavodnikError) {
      console.error("Chyba při ukládání závodníka:", zavodnikError);
      return;
    }

    const { error: vysledekError } = await supabase
      .from('vysledky')
      .insert([{
        disciplina_id: selectedDiscipline.id,
        zavodnik_id: zavodnik.id,
        pokus_1,
        pokus_2,
        pokus_3,
        cas
      }]);

    if (vysledekError) {
      console.error("Chyba při ukládání výsledku:", vysledekError);
    } else {
      alert("Výsledek uložen.");
      form.reset();
    }
  };

  formContainer.appendChild(form);
}

loadDisciplines();
