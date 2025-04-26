const client = window.supabaseClient;

async function loadDisciplines() {
  const { data, error } = await client.from('discipliny').select('*');

  if (error) {
    console.error("Chyba při načítání disciplín:", error);
    return;
  }

  const select = document.getElementById('disciplineSelect');
  select.innerHTML = '';
  data.forEach(d => {
    const option = document.createElement('option');
    option.value = JSON.stringify(d);
    option.textContent = `${d.nazev} | ${d.kategorie} | ${d.pohlavi}`;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = JSON.parse(select.value);
    showForm(selected);
    showResultsTable(selected);
  });

  if (data.length > 0) {
    select.selectedIndex = 0;
    const selected = data[0];
    showForm(selected);
    showResultsTable(selected);
  }
}

function showForm(disciplina) {
  const container = document.getElementById('formContainer');
  const isTrack = disciplina.typ === 'beh';

  container.innerHTML = `
    <input id="prijmeniInput" placeholder="Příjmení">
    <input id="jmenoInput" placeholder="Jméno">
    ${isTrack ? `
      <input id="casInput" placeholder="Čas">
    ` : `
      <input id="pokus1" placeholder="Pokus 1">
      <input id="pokus2" placeholder="Pokus 2">
      <input id="pokus3" placeholder="Pokus 3">
    `}
    <button id="saveBtn">Uložit</button>
    <div id="error" style="color:red;margin-top:5px;"></div>
  `;

  document.getElementById('saveBtn').onclick = async () => {
    const prijmeni = document.getElementById('prijmeniInput').value.trim();
    const jmeno = document.getElementById('jmenoInput').value.trim();
    const errorDiv = document.getElementById('error');

    if (!prijmeni || !jmeno) {
      errorDiv.textContent = 'Zadejte jméno i příjmení';
      return;
    }

    const { data: zavodnik, error: zavodnikErr } = await client
      .from('zavodnici')
      .insert([{ jmeno, prijmeni, kategorie: disciplina.kategorie, pohlavi: disciplina.pohlavi }])
      .select()
      .single();

    if (zavodnikErr || !zavodnik) {
      errorDiv.textContent = 'Chyba při ukládání závodníka';
      return;
    }

    let vysledkyData = {
      disciplina_id: disciplina.id,
      zavodnik_id: zavodnik.id,
    };

    if (isTrack) {
      const cas = parseFloat(document.getElementById('casInput').value);
      if (!cas) {
        errorDiv.textContent = 'Zadejte čas';
        return;
      }
      vysledkyData.cas = cas;
    } else {
      const p1 = parseFloat(document.getElementById('pokus1').value);
      const p2 = parseFloat(document.getElementById('pokus2').value);
      const p3 = parseFloat(document.getElementById('pokus3').value);
      const pokusy = [p1, p2, p3].filter(v => !isNaN(v));
      if (pokusy.length === 0) {
        errorDiv.textContent = 'Zadejte alespoň jeden pokus';
        return;
      }
      vysledkyData.pokus_1 = p1 || null;
      vysledkyData.pokus_2 = p2 || null;
      vysledkyData.pokus_3 = p3 || null;
      vysledkyData.nejlepsi = Math.max(...pokusy);
    }

    const { error: vysledkyErr } = await client
      .from('vysledky')
      .insert([vysledkyData]);

    if (vysledkyErr) {
      errorDiv.textContent = 'Chyba při ukládání výsledku';
      return;
    }

    errorDiv.style.color = 'green';
    errorDiv.textContent = 'Výsledek uložen.';
    showResultsTable(disciplina);
  };
}

async function showResultsTable(disciplina) {
  const isTrack = disciplina.typ === 'beh';

  const { data, error } = await client
    .from('vysledky')
    .select(`
      id,
      cas,
      nejlepsi,
      zavodnik: zavodnik_id (
        jmeno,
        prijmeni
      )
    `)
    .eq('disciplina_id', disciplina.id)
    .order(isTrack ? 'cas' : 'nejlepsi', { ascending: isTrack });

  const container = document.getElementById('resultsContainer');

  if (!data || data.length === 0) {
    container.innerHTML = '<p>Žádné výsledky zatím nejsou k dispozici.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Pořadí</th>
        <th>Příjmení</th>
        <th>Jméno</th>
        <th>${isTrack ? 'Čas (s)' : 'Výkon (m)'}</th>
      </tr>
    </thead>
    <tbody>
      ${data.map((row, index) => `
        <tr style="background-color: ${index === 0 ? '#ffffcc' : index === 1 ? '#dddddd' : index === 2 ? '#ccff99' : ''}">
          <td>${index + 1}</td>
          <td>${row.zavodnik?.prijmeni ?? ''}</td>
          <td>${row.zavodnik?.jmeno ?? ''}</td>
          <td>${isTrack ? row.cas : row.nejlepsi}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.innerHTML = '';
  container.appendChild(table);
}
const buttonSouhrn = document.getElementById('vypocitatBodyButton');
buttonSouhrn.addEventListener('click', vypocitejSouhrnBodu);
async function vypocitejSouhrnBodu() {
  const { data: vysledky, error } = await client
    .from('vysledky')
    .select(`
      id,
      body,
      zavodnik: zavodnik_id (
        jmeno,
        prijmeni,
        kategorie,
        pohlavi
      )
    `);

  if (error) {
    console.error('Chyba při načítání výsledků:', error);
    return;
  }

  const souhrn = {};

  vysledky.forEach(v => {
    if (!v.zavodnik) return;
    const klic = `${v.zavodnik.kategorie}_${v.zavodnik.pohlavi}`;
    if (!souhrn[klic]) {
      souhrn[klic] = [];
    }
    const existujici = souhrn[klic].find(z => z.jmeno === v.zavodnik.jmeno && z.prijmeni === v.zavodnik.prijmeni);
    if (existujici) {
      existujici.body += v.body || 0;
    } else {
      souhrn[klic].push({
        jmeno: v.zavodnik.jmeno,
        prijmeni: v.zavodnik.prijmeni,
        body: v.body || 0
      });
    }
  });

  zobrazSouhrnPodleKategorii(souhrn);
}
function zobrazSouhrnPodleKategorii(souhrn) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  for (const klic in souhrn) {
    const [kategorie, pohlavi] = klic.split('_');

    const nadpis = document.createElement('h3');
    nadpis.textContent = `${kategorie} – ${pohlavi}`;
    container.appendChild(nadpis);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pořadí</th>
          <th>Příjmení</th>
          <th>Jméno</th>
          <th>Body</th>
        </tr>
      </thead>
      <tbody>
        ${souhrn[klic]
          .sort((a, b) => b.body - a.body)
          .map((zavodnik, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${zavodnik.prijmeni}</td>
              <td>${zavodnik.jmeno}</td>
              <td>${zavodnik.body}</td>
            </tr>
          `)
          .join('')}
      </tbody>
    `;
    container.appendChild(table);
  }
}

loadDisciplines();
