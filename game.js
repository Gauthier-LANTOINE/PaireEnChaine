'use strict';

/* ===== Paire en Chaîne — logique du jeu ===== */

const NB_LIGNES = 3;
const NB_COLONNES = 5;
const FAMILLES = [
  { symbole: '♠', nom: 'spades', couleur: 'noire' },
  { symbole: '♥', nom: 'hearts', couleur: 'rouge' },
  { symbole: '♦', nom: 'diamonds', couleur: 'rouge' },
  { symbole: '♣', nom: 'clubs', couleur: 'noire' },
];

const DOSSIER_ASSETS = 'Pixel Playing Cards - Asset Pack/';
const NOMS_VALEURS = {
  1: 'ace', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
  8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king',
};
const NOMS_FAMILLES_FR = { spades: 'Pique', hearts: 'Cœur', diamonds: 'Carreau', clubs: 'Trèfle' };

let pileTirage = [];
let defausse = [];
let grille = [];
let score = 0;
let selection = null;
let enCours = false;
let finPartie = false;
let coupsSpeciaux = { resonance: 1, echange: 1, famille: 1 };
let modeCoupSpecial = null; // null | { type: 'echange' | 'famille' | 'resonanceJoker', premiere }
let surbrillancePaires = false; // le bouton 💡 Indice est en cours d'affichage
let cellules = [];
let idCarte = 0;
let numeroPartie = 0;

/* ---------- Utilitaires ---------- */

function libelleValeur(v) {
  if (v === 1) return 'A';
  if (v === 11) return 'V';
  if (v === 12) return 'D';
  if (v === 13) return 'R';
  return String(v);
}

function cheminCarte(carte) {
  if (carte.joker) return DOSSIER_ASSETS + 'joker.png';
  return DOSSIER_ASSETS + NOMS_VALEURS[carte.valeur] + '_of_' + carte.nomFamille + '.png';
}

function libelleCarte(carte) {
  if (carte.joker) return 'Joker';
  return libelleValeur(carte.valeur) + ' de ' + NOMS_FAMILLES_FR[carte.nomFamille];
}

function creerPaquet() {
  const paquet = [];
  idCarte = 0;
  for (const famille of FAMILLES) {
    for (let v = 1; v <= 13; v++) {
      paquet.push({
        id: idCarte++,
        valeur: v,
        famille: famille.symbole,
        nomFamille: famille.nom,
        couleur: famille.couleur,
        joker: false,
        retournee: false,
      });
    }
  }
  for (let i = 0; i < 2; i++) {
    paquet.push({
      id: idCarte++,
      valeur: 0,
      famille: '★',
      couleur: 'joker',
      joker: true,
      retournee: false,
    });
  }
  return paquet;
}

function melanger(paquet) {
  for (let i = paquet.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paquet[i], paquet[j]] = [paquet[j], paquet[i]];
  }
  return paquet;
}

function elementCarte(l, c) {
  return cellules[l][c].querySelector('.carte');
}

function apresDelai(gen, delai, fn) {
  // Exécute fn après `delai` ms, sauf si une nouvelle partie a démarré entre-temps.
  setTimeout(() => {
    if (gen === numeroPartie) fn();
  }, delai);
}

/* ---------- Démarrage ---------- */

function nouvellePartie() {
  numeroPartie++; // invalide les callbacks en attente de la partie précédente
  const paquet = melanger(creerPaquet());
  grille = [];
  let idx = 0;
  for (let l = 0; l < NB_LIGNES; l++) {
    grille.push([]);
    for (let c = 0; c < NB_COLONNES; c++) {
      grille[l].push(paquet[idx++]);
    }
  }
  pileTirage = paquet.slice(idx);
  defausse = [];
  score = 0;
  selection = null;
  enCours = false;
  finPartie = false;
  coupsSpeciaux = { resonance: 1, echange: 1, famille: 1 };
  modeCoupSpecial = null;
  masquerPaires();
  document.getElementById('overlayFin').classList.add('cache');
  document.getElementById('overlayCoup').classList.add('cache');
  document.getElementById('overlayAide').classList.add('cache');
  majHintCoup(null);
  construireGrilleDOM();
  majRecord();
  afficher(true);
}

function construireGrilleDOM() {
  const grilleEl = document.getElementById('grille');
  grilleEl.innerHTML = '';
  cellules = [];
  for (let l = 0; l < NB_LIGNES; l++) {
    cellules.push([]);
    for (let c = 0; c < NB_COLONNES; c++) {
      const caseEl = document.createElement('div');
      caseEl.className = 'case';
      caseEl.addEventListener('click', () => clicCarte(l, c));
      grilleEl.appendChild(caseEl);
      cellules[l].push(caseEl);
    }
  }
}

/* ---------- Rendu ---------- */

function creerElementCarte(carte) {
  const el = document.createElement('div');
  el.className = 'carte ' + carte.couleur;
  el.dataset.id = carte.id;
  el.innerHTML =
    '<div class="carte-interieur">' +
      '<div class="face avant"><img src="' + cheminCarte(carte) + '" alt="' + libelleCarte(carte) + '" draggable="false"></div>' +
      '<div class="face dos"></div>' +
    '</div>';
  return el;
}

function afficher(initial = false) {
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      const caseEl = cellules[l][c];
      const carte = grille[l][c];
      const elExistant = caseEl.querySelector('.carte');
      if (!carte) {
        if (elExistant) elExistant.remove();
        continue;
      }
      if (elExistant && elExistant.dataset.id === String(carte.id)) {
        elExistant.classList.toggle('retournee', carte.retournee);
        const selectionMode = modeCoupSpecial !== null && modeCoupSpecial.premiere !== null
          ? modeCoupSpecial.premiere
          : selection;
        elExistant.classList.toggle(
          'selectionnee',
          selectionMode !== null && selectionMode.l === l && selectionMode.c === c
        );
      } else {
        caseEl.innerHTML = '';
        const el = creerElementCarte(carte);
        el.classList.toggle('retournee', carte.retournee);
        el.classList.add('apparu');
        // `apparu` doit disparaître à la fin de l'animation de distribution :
        // laissée en place, elle relancerait l'animation d'apparition si une
        // autre classe animée (ex. surbrillee) est retirée de la carte.
        el.addEventListener('animationend', () => el.classList.remove('apparu'), { once: true });
        if (initial) {
          el.style.animationDelay = ((l * NB_COLONNES + c) * 40) + 'ms';
        }
        caseEl.appendChild(el);
      }
    }
  }
  document.getElementById('score').textContent = score;
  document.getElementById('nbTirage').textContent = pileTirage.length;
  document.getElementById('nbDefausse').textContent = defausse.length;
  afficherPiles();
  majBoutonsCoups();
}

function afficherPiles() {
  const zoneT = document.getElementById('zoneTirage');
  const zoneD = document.getElementById('zoneDefausse');
  document.getElementById('compteurTirage').textContent = pileTirage.length;
  document.getElementById('compteurDefausse').textContent = defausse.length;

  zoneT.innerHTML = pileTirage.length > 0
    ? '<div class="carte-mini"></div>'
    : '<div class="carte-mini vide"></div>';

  if (defausse.length > 0) {
    const el = creerElementCarte(defausse[defausse.length - 1]);
    zoneD.innerHTML = '';
    zoneD.appendChild(el);
  } else {
    zoneD.innerHTML = '<div class="carte-mini vide"></div>';
  }
}

function afficherPoints(points) {
  const zone = document.getElementById('zoneScore');
  const el = document.createElement('div');
  el.className = 'points-flottantes';
  el.textContent = '+' + points;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/* ---------- Interaction ---------- */

function clicCarte(l, c) {
  if (enCours || finPartie) return;
  if (surbrillancePaires) masquerPaires(); // le coup qui va suivre rend l'indice périmé
  const carte = grille[l][c];
  if (!carte) return;

  if (modeCoupSpecial !== null) {
    if (modeCoupSpecial.type === 'echange') clicEchange(l, c);
    else if (modeCoupSpecial.type === 'famille') clicFamille(l, c);
    else clicResonanceJoker(l, c);
    return;
  }

  if (carte.retournee) return;

  if (selection === null) {
    selection = { l, c };
    afficher();
    return;
  }
  if (selection.l === l && selection.c === c) {
    selection = null;
    afficher();
    return;
  }

  const autre = grille[selection.l][selection.c];
  if (estPaire(autre, carte)) {
    formerPaire(selection, { l, c });
  } else {
    const el1 = elementCarte(selection.l, selection.c);
    const el2 = elementCarte(l, c);
    if (el1) el1.classList.add('secouee');
    if (el2) el2.classList.add('secouee');
    setTimeout(() => {
      if (el1) el1.classList.remove('secouee');
      if (el2) el2.classList.remove('secouee');
    }, 420);
    selection = { l, c };
    afficher();
  }
}

function estPaire(a, b) {
  if (a.joker || b.joker) return true; // joker = jolly : paire avec n'importe quelle carte
  return a.valeur === b.valeur;
}

/* ---------- Aide : surbrillance des paires (bouton 💡 Indice) ---------- */

function calculerPaires() {
  // Regroupe les cartes non retournées par valeur : chaque groupe de 2 cartes
  // ou plus est surligné en entier avec une seule couleur (n'importe laquelle
  // des cartes du groupe peut former la paire). Chaque joker forme une « paire »
  // avec n'importe quelle carte, il est donc signalé seul, avec sa couleur.
  const groupes = {};
  const jokers = [];
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      const carte = grille[l][c];
      if (!carte || carte.retournee) continue;
      if (carte.joker) {
        jokers.push({ l, c });
      } else {
        (groupes[carte.valeur] = groupes[carte.valeur] || []).push({ l, c });
      }
    }
  }
  const paires = [];
  for (const valeur of Object.keys(groupes)) {
    const cartes = groupes[valeur];
    if (cartes.length >= 2) {
      // Toute la famille visible (2, 3 ou 4 cartes) est surlignée d'une
      // seule couleur : n'importe laquelle des cartes peut former la paire.
      // (Un groupe de 1 carte ne forme aucune paire : pas de surlignage.)
      paires.push(cartes);
    }
  }
  return { paires, jokers };
}

function afficherPaires() {
  if (enCours || finPartie || surbrillancePaires) return;
  const { paires, jokers } = calculerPaires();
  if (paires.length === 0 && jokers.length === 0) {
    const gen = numeroPartie;
    majHintCoup('Aucune paire possible sur la grille.');
    apresDelai(gen, 2000, () => {
      // Ne pas écraser le bandeau d'un mode de coup lancé entre-temps.
      if (modeCoupSpecial === null) majHintCoup(null);
    });
    return;
  }
  surbrillancePaires = true;
  document.getElementById('btnPaires').disabled = true;
  const n = paires.length;
  paires.forEach((paire, i) => {
    const teinte = (i * 360 / n).toFixed(1);
    // Luminosité/saturation proches de l'or du joker (#ffd75e ≈ hsl(45, 100%, 68 %))
    // pour que toutes les bordures paraissent de la même épaisseur.
    const couleur = 'hsl(' + teinte + ', 85%, 66%)';
    // Syntaxe moderne (espaces) : seule celle-ci accepte l'alpha avec hsl().
    const halo = 'hsl(' + teinte + ' 85% 66% / 0.6)';
    paire.forEach((pos) => {
      const el = elementCarte(pos.l, pos.c);
      if (!el) return;
      // Retire `apparu` : sinon l'enlèvement de `surbrillee` relancerait
      // l'animation d'apparition de la carte.
      el.classList.remove('apparu');
      el.classList.add('surbrillee');
      el.style.setProperty('--couleur-paire', couleur);
      el.style.setProperty('--halo-paire', halo);
    });
  });
  jokers.forEach((pos) => {
    const el = elementCarte(pos.l, pos.c);
    if (!el) return;
    el.classList.remove('apparu');
    el.classList.add('surbrillee');
    el.style.setProperty('--couleur-paire', '#ffd75e'); // or = « paire avec n'importe quoi »
    el.style.setProperty('--halo-paire', 'rgba(255, 215, 94, 0.6)');
  });
  // Effacement automatique après 5 s (invalidé si une nouvelle partie démarre).
  apresDelai(numeroPartie, 5000, masquerPaires);
}

function masquerPaires() {
  if (!surbrillancePaires) return;
  surbrillancePaires = false;
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      const el = elementCarte(l, c);
      if (!el) continue;
      el.classList.remove('surbrillee');
      el.style.removeProperty('--couleur-paire');
      el.style.removeProperty('--halo-paire');
    }
  }
  document.getElementById('btnPaires').disabled = false;
}

/* ---------- Déroulement d'un tour ---------- */

function formerPaire(s1, s2) {
  const gen = numeroPartie;
  enCours = true;
  selection = null;
  grille[s1.l][s1.c].retournee = true;
  grille[s2.l][s2.c].retournee = true;
  afficher();
  resoudreTour(gen);
}

/* Pipeline de résolution commun à la paire normale et aux coups spéciaux :
   vérifie les lignes/colonnes complétées, marque les points, enlève les
   cartes complétées, remplit les cases vides puis clôt le tour. */
function resoudreTour(gen) {
  apresDelai(gen, 560, () => {
    const completions = verifierCompletions();
    const points = completions.lignes.length * 3 + completions.colonnes.length * 1;
    if (points > 0) {
      score += points;
      afficherPoints(points);
      const stat = document.getElementById('statScore');
      stat.classList.add('boost');
      apresDelai(gen, 650, () => stat.classList.remove('boost'));
      marquerCompletions(completions);
      apresDelai(gen, 650, () => {
        enleverCompletions(completions);
        apresDelai(gen, 500, () => {
          rejouer();
          apresDelai(gen, 450, apresTour);
        });
      });
    } else {
      apresTour();
    }
  });
}

function verifierCompletions() {
  const lignes = [];
  const colonnes = [];
  for (let l = 0; l < NB_LIGNES; l++) {
    let complete = true;
    for (let c = 0; c < NB_COLONNES; c++) {
      const carte = grille[l][c];
      if (!carte || !carte.retournee) { complete = false; break; }
    }
    if (complete) lignes.push(l);
  }
  for (let c = 0; c < NB_COLONNES; c++) {
    let complete = true;
    for (let l = 0; l < NB_LIGNES; l++) {
      const carte = grille[l][c];
      if (!carte || !carte.retournee) { complete = false; break; }
    }
    if (complete) colonnes.push(c);
  }
  return { lignes, colonnes };
}

function cellulesACibles(completions) {
  const set = new Set();
  completions.lignes.forEach((l) => {
    for (let c = 0; c < NB_COLONNES; c++) set.add(l + ',' + c);
  });
  completions.colonnes.forEach((c) => {
    for (let l = 0; l < NB_LIGNES; l++) set.add(l + ',' + c);
  });
  return [...set].map((k) => k.split(',').map(Number));
}

function marquerCompletions(completions) {
  cellulesACibles(completions).forEach(([l, c]) => {
    const el = elementCarte(l, c);
    if (el) el.classList.add('completee');
  });
}

function enleverCompletions(completions) {
  cellulesACibles(completions).forEach(([l, c]) => {
    defausse.push(grille[l][c]);
    grille[l][c] = null;
  });
  // Les cartes restent affichées (et pulsent) un court instant avant de
  // disparaître, pour adoucir la transition vers les nouvelles cartes.
  setTimeout(() => afficher(), 480);
}

function rejouer() {
  let piochee = false;
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      if (grille[l][c] === null) {
        if (pileTirage.length === 0) {
          if (defausse.length === 0) return; // défensif : plus aucune carte
          pileTirage = melanger(defausse);
          defausse = [];
        }
        const carte = pileTirage.pop();
        carte.retournee = false; // remise en jeu : la carte est à nouveau face visible
        grille[l][c] = carte;
        piochee = true;
      }
    }
  }
  if (piochee) afficher();
}

/* ---------- Coups spéciaux ---------- */

function majBoutonsCoups() {
  majBoutonCoup('btnResonance', '⚡ Resonance', coupsSpeciaux.resonance, 'resonance');
  majBoutonCoup('btnEchange', '🔄 Echange', coupsSpeciaux.echange, 'echange');
  majBoutonCoup('btnFamille', '👪 Famille', coupsSpeciaux.famille, 'famille');
}

function majBoutonCoup(id, libelle, compteur, type) {
  const btn = document.getElementById(id);
  btn.textContent = libelle + ' (' + compteur + ')';
  // Le bouton du coup en cours reste actif : un re-clic annule le mode.
  // Pas de grisage pendant la résolution (enCours) : les guards des
  // fonctions lancer* bloquent déjà tout lancement en cours de tour.
  const autreMode = modeCoupSpecial !== null && modeCoupSpecial.type !== type;
  btn.disabled = compteur === 0 || finPartie || autreMode;
}

function majHintCoup(texte) {
  const hint = document.getElementById('hintCoup');
  if (texte === null) {
    hint.classList.add('cache');
    document.getElementById('grille').classList.remove('mode-coup');
  } else {
    document.getElementById('texteHintCoup').textContent = texte;
    hint.classList.remove('cache');
    document.getElementById('grille').classList.add('mode-coup');
  }
  majBoutonsCoups();
}

function annulerModeCoup() {
  modeCoupSpecial = null;
  selection = null;
  majHintCoup(null);
  afficher();
}

function secouerCartes(paires) {
  paires.forEach(([l, c]) => {
    const el = elementCarte(l, c);
    if (el) el.classList.add('secouee');
  });
  setTimeout(() => {
    paires.forEach(([l, c]) => {
      const el = elementCarte(l, c);
      if (el) el.classList.remove('secouee');
    });
  }, 420);
}

function coupsSpeciauxRestants() {
  return coupsSpeciaux.resonance + coupsSpeciaux.echange + coupsSpeciaux.famille;
}

/* ----- ⚡ Resonance : pioche la carte du dessus, la défausse, retourne toutes
   les cartes de la grille de la même valeur (joker = choix du joueur). ----- */

function lancerResonance() {
  if (enCours || finPartie || coupsSpeciaux.resonance === 0 || modeCoupSpecial !== null) return;
  if (surbrillancePaires) masquerPaires();
  if (pileTirage.length === 0) {
    if (defausse.length === 0) return;
    pileTirage = melanger(defausse);
    defausse = [];
  }
  const apercu = pileTirage[pileTirage.length - 1];
  const zone = document.getElementById('apercuCoup');
  zone.innerHTML = '';
  zone.appendChild(creerElementCarte(apercu));
  document.getElementById('overlayCoup').classList.remove('cache');
}

function annulerResonance() {
  document.getElementById('overlayCoup').classList.add('cache');
  afficher();
}

function confirmerResonance() {
  const gen = numeroPartie;
  enCours = true;
  coupsSpeciaux.resonance--;
  const carte = pileTirage.pop();
  defausse.push(carte);
  document.getElementById('overlayCoup').classList.add('cache');
  selection = null;
  if (carte.joker) {
    modeCoupSpecial = { type: 'resonanceJoker', premiere: null };
    enCours = false; // le joueur doit pouvoir choisir une carte sur la grille
    majHintCoup('Joker ! Choisis une carte sur la grille : toutes les cartes de la même valeur seront retournées.');
    afficher();
  } else {
    retournerValeur(carte.valeur);
    afficher();
    resoudreTour(gen);
  }
}

function clicResonanceJoker(l, c) {
  const carte = grille[l][c];
  const gen = numeroPartie;
  enCours = true;
  modeCoupSpecial = null;
  majHintCoup(null);
  retournerValeur(carte.valeur);
  afficher();
  resoudreTour(gen);
}

function retournerValeur(valeur) {
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      const carte = grille[l][c];
      if (carte && !carte.retournee && carte.valeur === valeur) {
        carte.retournee = true;
      }
    }
  }
}

/* ----- 🔄 Echange : échange 2 cartes de la grille (retournées ou non). ----- */

function lancerEchange() {
  if (enCours || finPartie) return;
  if (modeCoupSpecial !== null) {
    if (modeCoupSpecial.type === 'echange') annulerModeCoup(); // re-clic = annuler le mode
    return;
  }
  if (coupsSpeciaux.echange === 0) return;
  if (surbrillancePaires) masquerPaires();
  selection = null;
  modeCoupSpecial = { type: 'echange', premiere: null };
  majHintCoup('Choisis la 1re carte à échanger (retournée ou non).');
  afficher();
}

function clicEchange(l, c) {
  if (modeCoupSpecial.premiere === null) {
    modeCoupSpecial.premiere = { l, c };
    majHintCoup('Choisis la 2e carte à échanger.');
    afficher();
    return;
  }
  const p = modeCoupSpecial.premiere;
  if (p.l === l && p.c === c) {
    modeCoupSpecial.premiere = null;
    majHintCoup('Choisis la 1re carte à échanger (retournée ou non).');
    afficher();
    return;
  }
  const gen = numeroPartie;
  enCours = true;
  coupsSpeciaux.echange--;
  const tmp = grille[p.l][p.c];
  grille[p.l][p.c] = grille[l][c];
  grille[l][c] = tmp;
  selection = null;
  modeCoupSpecial = null;
  majHintCoup(null);
  afficher();
  resoudreTour(gen);
}

/* ----- 👪 Famille : retourne 2 cartes non retournées de la même famille
   (le joker compte pour toutes les familles). ----- */

function lancerFamille() {
  if (enCours || finPartie) return;
  if (modeCoupSpecial !== null) {
    if (modeCoupSpecial.type === 'famille') annulerModeCoup(); // re-clic = annuler le mode
    return;
  }
  if (coupsSpeciaux.famille === 0) return;
  if (surbrillancePaires) masquerPaires();
  selection = null;
  modeCoupSpecial = { type: 'famille', premiere: null };
  majHintCoup('Choisis 2 cartes non retournées de la même famille (♠ ♥ ♦ ♣).');
  afficher();
}

function clicFamille(l, c) {
  const carte = grille[l][c];
  if (carte.retournee) {
    secouerCartes([[l, c]]);
    return;
  }
  if (modeCoupSpecial.premiere === null) {
    modeCoupSpecial.premiere = { l, c };
    majHintCoup('Choisis la 2e carte de la même famille.');
    afficher();
    return;
  }
  const p = modeCoupSpecial.premiere;
  if (p.l === l && p.c === c) {
    modeCoupSpecial.premiere = null;
    majHintCoup('Choisis 2 cartes non retournées de la même famille (♠ ♥ ♦ ♣).');
    afficher();
    return;
  }
  const autre = grille[p.l][p.c];
  const valide = autre.nomFamille === carte.nomFamille || autre.joker || carte.joker;
  if (!valide) {
    secouerCartes([[p.l, p.c], [l, c]]);
    return; // la 1re carte reste sélectionnée
  }
  const gen = numeroPartie;
  enCours = true;
  coupsSpeciaux.famille--;
  grille[p.l][p.c].retournee = true;
  grille[l][c].retournee = true;
  selection = null;
  modeCoupSpecial = null;
  majHintCoup(null);
  afficher();
  resoudreTour(gen);
}

/* ---------- Fin de partie ---------- */

function pairesPossibles() {
  const compte = {};
  let jokers = 0;
  let visibles = 0;
  for (let l = 0; l < NB_LIGNES; l++) {
    for (let c = 0; c < NB_COLONNES; c++) {
      const carte = grille[l][c];
      if (!carte || carte.retournee) continue;
      visibles++;
      if (carte.joker) {
        jokers++;
      } else {
        compte[carte.valeur] = (compte[carte.valeur] || 0) + 1;
        if (compte[carte.valeur] === 2) return true;
      }
    }
  }
  // un joker visible forme une paire avec n'importe quelle autre carte visible
  return jokers > 0 && visibles >= 2;
}

function apresTour() {
  enCours = false;
  afficher();
  if (!pairesPossibles() && coupsSpeciauxRestants() === 0) {
    finPartie = true;
    const rang = enregistrerScore(score);
    document.getElementById('scoreFinal').textContent = score;
    afficherClassement(rang);
    majRecord();
    document.getElementById('overlayFin').classList.remove('cache');
    majBoutonsCoups(); // boutons grisés sous l'overlay de fin
  }
}

/* ---------- Meilleurs scores ---------- */

const CLES_CLASSEMENT = 'paireEnChaine.classement';
const CLASSEMENT_MAX = 10;
const MEDAILLES = ['🥇', '🥈', '🥉'];

function chargerClassement() {
  try {
    const brut = localStorage.getItem(CLES_CLASSEMENT);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch (e) {
    return [];
  }
}

function enregistrerScore(nouveauScore) {
  const classement = chargerClassement();
  const entree = { score: nouveauScore, date: new Date().toISOString() };
  classement.push(entree);
  classement.sort((a, b) => b.score - a.score);
  const top = classement.slice(0, CLASSEMENT_MAX);
  try {
    localStorage.setItem(CLES_CLASSEMENT, JSON.stringify(top));
  } catch (e) { /* stockage indisponible : le classement n'est pas persisté */ }
  return top.indexOf(entree) + 1; // 0 si le score n'entre pas dans le top 10
}

function formaterDateClassement(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function afficherClassement(rangNouveau) {
  const liste = document.getElementById('classementListe');
  const classement = chargerClassement();
  if (classement.length === 0) {
    liste.innerHTML = '<li class="vide">Aucun score enregistré pour l\'instant.</li>';
    return;
  }
  liste.innerHTML = classement
    .map((e, i) => {
      const classe = 'rang' + (i + 1 === rangNouveau ? ' rang-nouveau' : '');
      const medaille = i < 3 ? MEDAILLES[i] : (i + 1) + '.';
      return '<li class="' + classe + '">' +
        '<span class="medaille">' + medaille + '</span>' +
        '<span class="rang-score">' + e.score + '</span>' +
        '<span class="rang-date">' + formaterDateClassement(e.date) + '</span>' +
        '</li>';
    })
    .join('');
}

function majRecord() {
  const classement = chargerClassement();
  document.getElementById('record').textContent = classement.length > 0 ? classement[0].score : 0;
}

/* ---------- Initialisation ---------- */

document.getElementById('btnNouvelle').addEventListener('click', nouvellePartie);
document.getElementById('btnRejouer').addEventListener('click', nouvellePartie);
document.getElementById('btnPaires').addEventListener('click', afficherPaires);
document.getElementById('btnResonance').addEventListener('click', lancerResonance);
document.getElementById('btnEchange').addEventListener('click', lancerEchange);
document.getElementById('btnFamille').addEventListener('click', lancerFamille);
document.getElementById('btnAnnulerMode').addEventListener('click', annulerModeCoup);
document.getElementById('btnConfirmerCoup').addEventListener('click', confirmerResonance);
document.getElementById('btnAnnulerCoup').addEventListener('click', annulerResonance);
document.getElementById('btnAide').addEventListener('click', () => document.getElementById('overlayAide').classList.remove('cache'));
document.getElementById('btnFermerAide').addEventListener('click', () => document.getElementById('overlayAide').classList.add('cache'));
nouvellePartie();

/* ---------- PWA : inscription du service worker ---------- */
/* Gardée : le sandbox headless des tests n'a ni navigator ni window. */

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Le rechargement automatique en cas de mise à jour est assuré par un
    // script inline dans index.html (toujours à jour, servi réseau d'abord).
    navigator.serviceWorker.register('sw.js').catch((erreur) => {
      // file:// ou http non sécurisé : l'inscription échoue, le jeu reste jouable.
      console.warn('Service worker non inscrit :', erreur);
    });
  });
}
