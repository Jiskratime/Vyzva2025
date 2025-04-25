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
    showResultsTable(selected);
  });

  // Načíst rovnou první
  if (data.length > 0) {
    select.selectedIndex = 0;
    const selected = data[0];
    showResultsTable(selected);
  }
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

loadDisciplines();
