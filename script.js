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
async function vypocitejSouhrnBodu() {
  const { data: vysledky, error } = await supabase
    .from('vysledky')
    .select('zavodnik_id, jmeno, prijmeni, kategorie, pohlavi, body');

  if (error) {
    console.error('Chyba při načítání výsledků:', error);
    return;
  }

  // Agregace bodů
  const souhrn = {};

  vysledky.forEach(v => {
    const klic = `${v.kategorie}_${v.pohlavi}_${v.prijmeni}_${v.jmeno}`;
    if (!souhrn[klic]) {
      souhrn[klic] = {
        jmeno: v.jmeno,
        prijmeni: v.prijmeni,
        kategorie: v.kategorie,
        pohlavi: v.pohlavi,
        body: 0
      };
    }
    souhrn[klic].body += v.body || 0;
  });

  // Rozdělit podle kategorií
  const kategorieMap = {};
  Object.values(souhrn).forEach(zavodnik => {
    const kategorieKlic = `${zavodnik.kategorie} – ${zavodnik.pohlavi}`;
    if (!kategorieMap[kategorieKlic]) {
      kategorieMap[kategorieKlic] = [];
    }
    kategorieMap[kategorieKlic].push(zavodnik);
  });

  // Vypsání do stránky
  const container = document.getElementById('resultsContainer');
  container.innerHTML = '';

  for (const kategorie in kategorieMap) {
    const zavodnici = kategorieMap[kategorie].sort((a, b) => b.body - a.body);

    const table = document.createElement('table');
    table.innerHTML = `
      <caption style="font-weight:bold; margin:10px 0;">${kategorie}</caption>
      <thead>
        <tr><th>Pořadí</th><th>Příjmení</th><th>Jméno</th><th>Body</th></tr>
      </thead>
      <tbody></tbody>
    `;

    zavodnici.forEach((zav, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${idx + 1}</td><td>${zav.prijmeni}</td><td>${zav.jmeno}</td><td>${zav.body}</td>`;

      // Barevné zvýraznění prvních tří
      if (idx === 0) row.style.backgroundColor = 'lightyellow';
      if (idx === 1) row.style.backgroundColor = 'lightgrey';
      if (idx === 2) row.style.backgroundColor = 'wheat';
      
      row.style.fontWeight = idx < 3 ? 'bold' : 'normal';

      table.querySelector('tbody').appendChild(row);
    });

    container.appendChild(table);
  }
}

loadDisciplines();
