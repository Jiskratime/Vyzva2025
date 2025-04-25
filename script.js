
async function showResultsTable(discipline) {
  const isTrack = discipline.typ === 'beh';

  const { data, error } = await supabase
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
    .eq('disciplina_id', discipline.id)
    .order(isTrack ? 'cas' : 'nejlepsi', { ascending: isTrack });

  const container = document.getElementById('resultsContainer');
  if (!data || data.length === 0) {
    container.innerHTML = '<p>Žádné výsledky zatím nejsou k dispozici.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = \`
    <thead>
      <tr>
        <th>Pořadí</th>
        <th>Příjmení</th>
        <th>Jméno</th>
        <th>\${isTrack ? 'Čas (s)' : 'Výkon (m)'}</th>
      </tr>
    </thead>
    <tbody>
      \${data.map((row, index) => \`
        <tr style="background-color: \${index === 0 ? '#ffffcc' : index === 1 ? '#dddddd' : index === 2 ? '#f0e68c' : 'transparent'}; font-weight: \${index < 3 ? 'bold' : 'normal'};">
          <td>\${index + 1}</td>
          <td>\${row.zavodnik?.prijmeni ?? ''}</td>
          <td>\${row.zavodnik?.jmeno ?? ''}</td>
          <td>\${isTrack ? row.cas : row.nejlepsi}</td>
        </tr>\`).join('')}
    </tbody>
  \`;

  container.innerHTML = '';
  container.appendChild(table);
}
