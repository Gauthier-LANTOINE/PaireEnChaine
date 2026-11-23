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
  document.getElementById('overlayFin').classList.add('cache');
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
        elExistant.classList.toggle(
          'selectionnee',
          selection !== null && selection.l === l && selection.c === c
        );
      } else {
        caseEl.innerHTML = '';
        const el = creerElementCarte(carte);
        el.classList.add('apparu');
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
  const carte = grille[l][c];
  if (!carte || carte.retournee) return;

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

/* ---------- Déroulement d'un tour ---------- */

function formerPaire(s1, s2) {
  const gen = numeroPartie;
  enCours = true;
  selection = null;
  grille[s1.l][s1.c].retournee = true;
  grille[s2.l][s2.c].retournee = true;
  afficher();

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
    const el = elementCarte(l, c);
    if (el) el.classList.add('supprimee');
  });
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
  afficher();
  enCours = false;
  if (!pairesPossibles()) {
    finPartie = true;
    const rang = enregistrerScore(score);
    document.getElementById('scoreFinal').textContent = score;
    afficherClassement(rang);
    majRecord();
    document.getElementById('overlayFin').classList.remove('cache');
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
nouvellePartie();

/* ---------- PWA : inscription du service worker ---------- */
/* Gardée : le sandbox headless des tests n'a ni navigator ni window. */

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((erreur) => {
      // file:// ou http non sécurisé : l'inscription échoue, le jeu reste jouable.
      console.warn('Service worker non inscrit :', erreur);
    });
  });
}
