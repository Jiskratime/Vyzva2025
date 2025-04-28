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
    const { data: disciplinaData, error: discError } = await window.supabaseClient
      .from('discipliny')
      .select('*')
      .eq('id', disciplinaId)
      .single();
  
    if (discError) {
      alert('Chyba při načítání disciplíny.');
      return;
    }
  
    const isKriket = disciplinaData.nazev.toLowerCase().includes('kriket');
  
    const { data } = await window.supabaseClient.from('vysledky')
      .select('*, zavodnici ( prijmeni, jmeno )')
      .eq('disciplina_id', disciplinaId);
  
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
  
    // Připravíme pokusy a pořadí
    data.forEach(r => {
      if (typ === 'beh') {
        r.sortValue = r.cas !== null ? r.cas : Number.MAX_VALUE;
      } else {
        const pokusy = [
          r.pokus_1 !== null ? (isKriket ? r.pokus_1 : r.pokus_1 / 100) : -1,
          r.pokus_2 !== null ? (isKriket ? r.pokus_2 : r.pokus_2 / 100) : -1,
          r.pokus_3 !== null ? (isKriket ? r.pokus_3 : r.pokus_3 / 100) : -1
        ];
        pokusy.sort((a, b) => b - a);
        r.vykonySorted = pokusy;
      }
    });
  
    // Seřadit závodníky
    if (typ === 'beh') {
      data.sort((a, b) => a.sortValue - b.sortValue);
    } else {
      data.sort((a, b) => {
        for (let i = 0; i < Math.max(a.vykonySorted.length, b.vykonySorted.length); i++) {
          if ((b.vykonySorted[i] || -1) !== (a.vykonySorted[i] || -1)) {
            return (b.vykonySorted[i] || -1) - (a.vykonySorted[i] || -1);
          }
        }
        return 0;
      });
    }
  
    // Přidělit pořadí a body
    const points = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];
    data.forEach((r, index) => {
      r.poradi = index + 1;
      r.body = points[index] || 0;
    });
  
    // Vytvoření tabulky
    const table = document.createElement('table');
    table.id = 'resultsTable';
  
    if (typ === 'beh') {
      table.innerHTML = `
        <tr><th>Pořadí</th><th>Příjmení</th><th>Jméno</th><th>Čas (s)</th><th>Body</th></tr>
      `;
    } else {
      table.innerHTML = `
        <tr><th>Pořadí</th><th>Příjmení</th><th>Jméno</th><th>Pokus 1 (cm)</th><th>Pokus 2 (cm)</th><th>Pokus 3 (cm)</th><th>Nejlepší (cm)</th><th>Body</th></tr>
      `;
    }
  
    data.forEach(r => {
      const row = document.createElement('tr');
  
      if (typ === 'beh') {
        row.innerHTML = `
          <td>${r.poradi}</td>
          <td>${r.zavodnici.prijmeni}</td>
          <td>${r.zavodnici.jmeno}</td>
          <td>${r.cas !== null ? r.cas : ''}</td>
          <td>${r.body}</td>
        `;
      } else {
        const best = Math.max(r.pokus_1 || -1, r.pokus_2 || -1, r.pokus_3 || -1);
        row.innerHTML = `
          <td>${r.poradi}</td>
          <td>${r.zavodnici.prijmeni}</td>
          <td>${r.zavodnici.jmeno}</td>
          <td class="pokus-cell ${r.pokus_1 === best ? 'best' : ''}">${r.pokus_1 !== null ? r.pokus_1 : ''}</td>
          <td class="pokus-cell ${r.pokus_2 === best ? 'best' : ''}">${r.pokus_2 !== null ? r.pokus_2 : ''}</td>
          <td class="pokus-cell ${r.pokus_3 === best ? 'best' : ''}">${r.pokus_3 !== null ? r.pokus_3 : ''}</td>
          <td>${best !== -1 ? best : ''}</td>
          <td>${r.body}</td>
        `;
      }
  
      table.appendChild(row);
    });
  
    container.appendChild(table);
  
    // Podbarvit nejlepší pokusy
    const bestCells = document.querySelectorAll('.pokus-cell.best');
    bestCells.forEach(cell => {
      cell.style.backgroundColor = '#fff8b3'; // světle žlutá
    });
  }
  
  // Souhrn bodů
  document.getElementById('vypocitatBodyButton').addEventListener('click', async () => {
    const { data } = await window.supabaseClient.from('vysledky')
      .select('*, zavodnici ( prijmeni, jmeno, kategorie, pohlavi ), discipliny ( typ, nazev )');
  
    const summary = {};
  
    // Vyfiltrujeme jen vybranou kategorii + pohlaví
    const filtered = data.filter(r =>
      r.zavodnici.kategorie === window.selectedKategorie &&
      r.zavodnici.pohlavi === window.selectedPohlavi
    );
  
    // Seskupíme výsledky podle disciplíny
    const disciplinyMap = {};
  
    filtered.forEach(r => {
      if (!disciplinyMap[r.disciplina_id]) {
        disciplinyMap[r.disciplina_id] = {
          typ: r.discipliny.typ,
          nazev: r.discipliny.nazev,
          vysledky: []
        };
      }
      disciplinyMap[r.disciplina_id].vysledky.push(r);
    });
  
    // Přidělíme body v každé disciplíně
    for (const disciplinaId in disciplinyMap) {
      const disc = disciplinyMap[disciplinaId];
      const isBeh = disc.typ === 'beh';
      const isKriket = disc.nazev.toLowerCase().includes('kriket');
  
      disc.vysledky.forEach(r => {
        if (isBeh) {
          r.sortValue = r.cas !== null ? r.cas : Number.MAX_VALUE;
        } else {
          const pokusy = [
            r.pokus_1 !== null ? (isKriket ? r.pokus_1 : r.pokus_1 / 100) : -1,
            r.pokus_2 !== null ? (isKriket ? r.pokus_2 : r.pokus_2 / 100) : -1,
            r.pokus_3 !== null ? (isKriket ? r.pokus_3 : r.pokus_3 / 100) : -1
          ];
          pokusy.sort((a, b) => b - a);
          r.vykonySorted = pokusy;
        }
      });
  
      if (isBeh) {
        disc.vysledky.sort((a, b) => a.sortValue - b.sortValue);
      } else {
        disc.vysledky.sort((a, b) => {
          for (let i = 0; i < Math.max(a.vykonySorted.length, b.vykonySorted.length); i++) {
            if ((b.vykonySorted[i] || -1) !== (a.vykonySorted[i] || -1)) {
              return (b.vykonySorted[i] || -1) - (a.vykonySorted[i] || -1);
            }
          }
          return 0;
        });
      }
  
      const points = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];
      disc.vysledky.forEach((r, index) => {
        const zavodnik = `${r.zavodnici.prijmeni} ${r.zavodnici.jmeno}`;
        if (!summary[zavodnik]) summary[zavodnik] = 0;
        summary[zavodnik] += points[index] || 0;
      });
    }
  
    // Vykreslíme souhrn bodů
    const container = document.getElementById('summaryContainer');
    container.innerHTML = '';
  
    const h2 = document.createElement('h2');
    h2.textContent = `${window.selectedKategorie} - ${window.selectedPohlavi}`;
    container.appendChild(h2);
  
    const table = document.createElement('table');
    table.innerHTML = `<tr><th>Příjmení a jméno</th><th>Body celkem</th></tr>`;
  
    const sortedSummary = Object.entries(summary).sort((a, b) => b[1] - a[1]);
    sortedSummary.forEach(([name, points]) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${name}</td><td>${points}</td>`;
      table.appendChild(row);
    });
  
    container.appendChild(table);
  });
  // Export PDF
  document.getElementById('exportPdfButton').addEventListener('click', () => {
    const element = document.createElement('div');
    const table = document.getElementById('resultsTable').cloneNode(true);
    const footer = document.createElement('p');
    footer.style.marginTop = '20px';
    footer.style.textAlign = 'center';
    footer.textContent = 'JiskraTime';
    element.appendChild(table);
    element.appendChild(footer);
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
  