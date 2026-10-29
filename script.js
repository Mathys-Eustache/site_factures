document.addEventListener('DOMContentLoaded', () => {
    // === 1. CHARGEMENT DES DONNÉES SAUVEGARDÉES ===
    // On pré-remplit les champs avec les données stockées dans le navigateur
    document.getElementById('sender_name').value = localStorage.getItem('inv_sender_name') || '';
    document.getElementById('sender_address').value = localStorage.getItem('inv_sender_address') || '';
    document.getElementById('sender_siret').value = localStorage.getItem('inv_sender_siret') || '';
    document.getElementById('iban').value = localStorage.getItem('inv_iban') || '';
    
    // Mettre la date du jour par défaut
    document.getElementById('invoice_date').valueAsDate = new Date();
    
    // Charger le logo s'il a été sauvegardé (Base64)
    let savedLogo = localStorage.getItem('inv_logo') || '';
    
    // Gérer l'upload du nouveau logo
    document.getElementById('logo_input').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                savedLogo = e.target.result;
                localStorage.setItem('inv_logo', savedLogo); // Sauvegarde du logo
            };
            reader.readAsDataURL(file);
        }
    });

    // === 2. GESTION DES LIGNES DYNAMIQUES ===
    const itemsContainer = document.getElementById('items_container');
    const addItemBtn = document.getElementById('add_item_btn');

    addItemBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" class="item-desc" placeholder="Description">
            <input type="number" class="item-qty" placeholder="Qté" value="1" min="1">
            <input type="number" class="item-price" placeholder="Prix U. HT" value="0" min="0">
            <button class="remove-btn" onclick="this.parentElement.remove()">X</button>
        `;
        itemsContainer.appendChild(row);
    });

    // === 3. GÉNÉRATION DU PDF ===
    document.getElementById('generate_btn').addEventListener('click', () => {
        // Sauvegarder les infos de l'émetteur pour la prochaine fois
        localStorage.setItem('inv_sender_name', document.getElementById('sender_name').value);
        localStorage.setItem('inv_sender_address', document.getElementById('sender_address').value);
        localStorage.setItem('inv_sender_siret', document.getElementById('sender_siret').value);
        localStorage.setItem('inv_iban', document.getElementById('iban').value);

        // Récupérer les valeurs de la facture
        const clientName = document.getElementById('client_name').value || 'Client Anonyme';
        const invoiceNum = document.getElementById('invoice_number').value || 'FAC-000';
        
        // Formater la date proprement (ex: 29 Octobre 2026)
        const dateInput = document.getElementById('invoice_date').value;
        const formattedDate = dateInput ? new Date(dateInput).toLocaleDateString('fr-FR') : '';

        // Injecter les textes dans le modèle PDF
        document.getElementById('pdf_sender_name').innerText = document.getElementById('sender_name').value;
        document.getElementById('pdf_sender_address').innerText = document.getElementById('sender_address').value;
        document.getElementById('pdf_sender_siret').innerText = document.getElementById('sender_siret').value;
        
        document.getElementById('pdf_client_name').innerText = clientName;
        document.getElementById('pdf_client_address').innerText = document.getElementById('client_address').value.replace(/\n/g, ', ');
        
        document.getElementById('pdf_invoice_number').innerText = invoiceNum;
        document.getElementById('pdf_invoice_date').innerText = formattedDate;
        document.getElementById('pdf_iban').innerText = document.getElementById('iban').value;

        // Injecter le logo
        const logoImg = document.getElementById('pdf_logo');
        if (savedLogo) {
            logoImg.src = savedLogo;
            logoImg.style.display = 'block';
        } else {
            logoImg.style.display = 'none';
        }

        // Calculer les montants et générer les lignes HTML du tableau
        let totalHT = 0;
        const tbody = document.getElementById('pdf_items_body');
        tbody.innerHTML = ''; // Vider le tableau existant

        const rows = document.querySelectorAll('.item-row');
        rows.forEach(row => {
            const desc = row.querySelector('.item-desc').value;
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const rowTotal = qty * price;
            
            if (desc) { // Ne rajouter que s'il y a une description
                totalHT += rowTotal;
                tbody.innerHTML += `
                    <tr>
                        <td>${desc}</td>
                        <td class="center">${qty}</td>
                        <td class="right">${price.toFixed(2)} €</td>
                        <td class="right">${rowTotal.toFixed(2)} €</td>
                    </tr>
                `;
            }
        });

        // Gestion de la TVA
        const applyTva = document.getElementById('tva_applicable').checked;
        const totalTva = applyTva ? (totalHT * 0.20) : 0;
        const totalTTC = totalHT + totalTva;

        document.getElementById('pdf_total_ht').innerText = totalHT.toFixed(2) + ' €';
        document.getElementById('pdf_total_ttc').innerText = totalTTC.toFixed(2) + ' €';

        // Afficher/Cacher les mentions TVA selon la case cochée
        if (applyTva) {
            document.getElementById('pdf_tva_row').style.display = 'flex';
            document.getElementById('pdf_total_tva').innerText = totalTva.toFixed(2) + ' €';
            document.getElementById('pdf_tva_mention').style.display = 'none';
        } else {
            document.getElementById('pdf_tva_row').style.display = 'none';
            document.getElementById('pdf_tva_mention').style.display = 'block';
        }

        // --- EXPORT PDF ---
        const element = document.getElementById('invoice_template');
        element.style.display = 'block'; // Rendre visible pour html2pdf

        const opt = {
            margin:       0,
            filename:     `${invoiceNum}_${clientName.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none'; // Recacher après téléchargement
        });
    });
});