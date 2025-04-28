// Načíst disciplíny
async function loadDisciplines() {
    const select = document.getElementById('disciplineSelect');
    select.innerHTML = '';
    const { data, error } = await window.supabaseClient.from('discipliny').select('*').order('nazev');
    if (error) {
      alert('Chyba načítání disciplín.');
      return;
    }
    data.forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = `${d.nazev} – ${d.kategorie} – ${d.pohlavi}`;
      select.appendChild(option);
    });
  }
  
  // Po výběru disciplíny
  async function showForm() {
    const id = document.getElementById('disciplineSelect').value;
    const { data: discipline } = await window.supabaseClient.from('discipliny').select('*').eq('id', id).single();
  
    // Uložíme aktuální kategorii a pohlaví do window
    window.selectedKategorie = discipline.kategorie;
    window.selectedPohlavi = discipline.pohlavi;
  
    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = `
      <h3>Zadání výsledků</h3>
      <input type="text" id="prijmeni" placeholder="Příjmení"><br>
      <input type="text" id="jmeno" placeholder="Jméno"><br>
      ${discipline.typ === 'beh' ? 
        '<input type="number" id="cas" placeholder="Čas v sekundách">' :
        '<input type="number" id="pokus_1" placeholder="Pokus 1 (m)"><br><input type="number" id="pokus_2" placeholder="Pokus 2 (m)"><br><input type="number" id="pokus_3" placeholder="Pokus 3 (m)"><br>'
      }
      <button onclick="saveResult('${id}', '${discipline.typ}')">Uložit výsledek</button>
    `;
    loadResults(id, discipline.typ);
  }
  
  }
  
  document.getElementById('disciplineSelect').addEventListener('change', showForm);
  
  // Uložit výsledek
  async function saveResult(disciplinaId, typ) {
    const prijmeni = document.getElementById('prijmeni').value.trim();
    const jmeno = document.getElementById('jmeno').value.trim();
    if (!prijmeni || !jmeno) {
      alert('Vyplň příjmení a jméno!');
      return;
    }
    let vykon = null;
    let pokusy = [null, null, null];
    if (typ === 'beh') {
      vykon = parseFloat(document.getElementById('cas').value);
      if (isNaN(vykon)) { alert('Vyplň čas!'); return; }
    } else {
      pokusy = [
        parseFloat(document.getElementById('pokus_1').value),
        parseFloat(document.getElementById('pokus_2').value),
        parseFloat(document.getElementById('pokus_3').value)
      ];
      vykon = Math.max(...pokusy.filter(p => !isNaN(p)));
      if (!vykon) { alert('Vyplň alespoň jeden pokus!'); return; }
    }
  
    try {
      let { data: zavodnik, error: zavError } = await window.supabaseClient
        .from('zavodnici')
        .select('*')
        .eq('prijmeni', prijmeni)
        .eq('jmeno', jmeno)
        .single();
  
      if (zavError && zavError.code !== 'PGRST116') {
        console.error('Chyba při hledání závodníka:', zavError.message);
        alert('Chyba při hledání závodníka: ' + zavError.message);
        return;
      }
  
      if (!zavodnik) {
        const { data: newZavodnik, error: insertZavError } = await window.supabaseClient
          .from('zavodnici')
          .insert({
            prijmeni,
            jmeno,
            kategorie: window.selectedKategorie, // přidáno
            pohlavi: window.selectedPohlavi      // přidáno
          })
          .select()
          .single();
  
        if (insertZavError) {
          alert('Chyba při zakládání závodníka: ' + insertZavError.message);
          return;
        }
        zavodnik = newZavodnik;
      }
  
      const { error: insertError } = await window.supabaseClient.from('vysledky').insert({
        disciplina_id: disciplinaId,
        zavodnik_id: zavodnik.id,
        cas: typ === 'beh' ? vykon : null,
        pokus_1: typ === 'technika' ? pokusy[0] : null,
        pokus_2: typ === 'technika' ? pokusy[1] : null,
        pokus_3: typ === 'technika' ? pokusy[2] : null,
        nejlepsi: typ === 'technika' ? vykon : null
      });
  
      if (insertError) {
        alert('Chyba při ukládání výsledku: ' + insertError.message);
        return;
      }
  
      alert('Výsledek uložen.');
      showForm(); // obnoví formulář a výsledky
  
    } catch (err) {
      console.error('Chyba komunikace se serverem:', err);
      alert('Chyba při komunikaci se serverem.');
    }
  }
  

  // Načíst výsledky
  async function loadResults(disciplinaId, typ) {
    const { data } = await window.supabaseClient.from('vysledky')
      .select('*, zavodnici ( prijmeni, jmeno )')
      .eq('disciplina_id', disciplinaId);
  
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
  
    data.forEach(r => {
      r.body = 0;
      if (typ === 'beh' && r.cas !== null) {
        r.body = calculatePoints(data.map(x => x.cas), r.cas, false);
      } else if (typ === 'technika' && r.nejlepsi !== null) {
        r.body = calculatePoints(data.map(x => x.nejlepsi), r.nejlepsi, true);
      }
    });
  
    data.sort((a, b) => b.body - a.body);
  
    const table = document.createElement('table');
    table.id = 'resultsTable';
    table.innerHTML = `
      <tr><th>Příjmení</th><th>Jméno</th><th>Výkon</th><th>Body</th></tr>
    `;
    data.forEach(r => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${r.zavodnici.prijmeni}</td>
        <td>${r.zavodnici.jmeno}</td>
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
    const points = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];
    return points[rank] || 0;
  }
  
  // Souhrn bodů
  document.getElementById('vypocitatBodyButton').addEventListener('click', async () => {
    const { data } = await window.supabaseClient.from('vysledky')
      .select('*, zavodnici ( prijmeni, jmeno, kategorie, pohlavi ), discipliny ( typ )');
  
    const summary = {};
  
    data.forEach(r => {
      const key = `${r.zavodnici.kategorie} - ${r.zavodnici.pohlavi}`;
      if (!summary[key]) summary[key] = {};
      const vykon = r.discipliny.typ === 'beh' ? r.cas : r.nejlepsi;
      const bod = calculatePoints(
        data.filter(x => x.disciplina_id === r.disciplina_id)
            .map(x => r.discipliny.typ === 'beh' ? x.cas : x.nejlepsi),
        vykon,
        r.discipliny.typ !== 'beh'
      );
      const zavodnik = `${r.zavodnici.prijmeni} ${r.zavodnici.jmeno}`;
      if (!summary[key][zavodnik]) summary[key][zavodnik] = 0;
      summary[key][zavodnik] += bod;
    });
  
    const container = document.getElementById('summaryContainer');
    container.innerHTML = '';
  
    for (const group in summary) {
      const h2 = document.createElement('h2');
      h2.textContent = group;
      container.appendChild(h2);
  
      const table = document.createElement('table');
      table.innerHTML = `<tr><th>Příjmení a jméno</th><th>Body celkem</th></tr>`;
  
      const sorted = Object.entries(summary[group]).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([name, points]) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${name}</td><td>${points}</td>`;
        table.appendChild(row);
      });
  
      container.appendChild(table);
    }
  });
  
  // Export PDF
  document.getElementById('exportPdfButton').addEventListener('click', () => {
    const element = document.getElementById('resultsTable');
    html2pdf().from(element).save('vysledky.pdf');
  });
  
  // Export Excel
  document.getElementById('exportExcelButton').addEventListener('click', () => {
    const table = document.getElementById('resultsTable');
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, 'vysledky.xlsx');
  });
  
  // Start
  document.addEventListener('DOMContentLoaded', () => {
    loadDisciplines();
});
  