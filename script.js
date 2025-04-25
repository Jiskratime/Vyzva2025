const client = window.supabaseClient;

const select = document.getElementById('disciplineSelect');
const formContainer = document.getElementById('formContainer');
const resultsContainer = document.getElementById('resultsContainer');

async function loadDisciplines() {
  console.log("Spuštěna funkce loadDisciplines");
  const { data, error } = await client.from('discipliny').select('*').order('nazev');

  if (error) {
    console.error("Chyba při načítání disciplín:", error);
    return;
  }

  data.forEach(d => {
    const option = document.createElement('option');
    option.value = JSON.stringify(d); // celý objekt, kvůli id
    option.textContent = `${d.nazev} | ${d.kategorie} | ${d.pohlavi}`;
    select.appendChild(option);
  });
}

select.addEventListener('change', showForm);

function showForm() {
  const disciplina = JSON.parse(select.value);
  formContainer.innerHTML = `
    <form id="vysledkyForm">
      <input type="text" name="jmeno" placeholder="Jméno" required>
      <input type="text" name="prijmeni" placeholder="Příjmení" required>
      <input type="number" name="pokus_1" placeholder="Pokus 1" step="any">
      <input type="number" name="pokus_2" placeholder="Pokus 2" step="any">
      <input type="number" name="pokus_3" placeholder="Pokus 3" step="any">
      <input type="number" name="cas" placeholder="Čas (pro běhy)" step="any">
      <button type="submit">Uložit</button>
    </form>
  `;

  document.getElementById('vysledkyForm').onsubmit = async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const zavodnik = {
      jmeno: formData.get('jmeno'),
      prijmeni: formData.get('prijmeni')
    };

    const { data: zavodnikData, error: zavodnikError } = await client
      .from('zavodnici')
      .insert([zavodnik])
      .select();

    if (zavodnikError) {
      console.error(zavodnikError);
      return;
    }

    const id_zavodnik = zavodnikData[0].id;

    const pokusy = {
      pokus_1: Number(formData.get('pokus_1')),
      pokus_2: Number(formData.get('pokus_2')),
      pokus_3: Number(formData.get('pokus_3')),
      cas: Number(formData.get('cas')),
    };

    const vysledek = {
      zavodnik_id: id_zavodnik,
      disciplina_id: disciplina.id,
      ...pokusy
    };

    const { error: vysledkyError } = await client.from('vysledky').insert([vysledek]);
    if (vysledkyError) {
      console.error(vysledkyError);
    } else {
      alert('Výsledek uložen.');
    }
  };
}

loadDisciplines();