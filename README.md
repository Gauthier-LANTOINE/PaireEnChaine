# 🃏 Paire en Chaîne

Jeu de cartes solo : retournez des paires, complétez des lignes et des colonnes, et utilisez vos 3 coups spéciaux pour faire le meilleur score.

## 🎮 Comment jouer

- La grille de 15 cases (3 lignes × 5 colonnes) est remplie de cartes face visible, piochées dans un paquet de 54 cartes (52 cartes classiques + 2 jokers).
- Cliquez sur **deux cartes de même valeur** pour les retourner : elles forment une paire.
- Le **joker** forme une paire avec n'importe quelle carte.
- Quand une **ligne entière (5 cartes)** est retournée, elle rapporte **+3 points** et disparaît. Quand une **colonne entière (3 cartes)** est retournée, elle rapporte **+1 point** et disparaît.
- Les cases libérées sont aussitôt remplies avec de nouvelles cartes du paquet. Quand le paquet est épuisé, les cartes défaussées sont mélangées et redeviennent le paquet.
- 💡 **Indice** : surligne pendant 5 secondes toutes les paires possibles sur la grille.

## 🎲 Graine et reproduction

Chaque partie est générée à partir d'une **graine** : un nombre qui détermine le mélange initial et tous les mélanges suivants (pile de tirage, remélange de la défausse). Même graine + mêmes coups = partie strictement identique.

- Le bouton 🎲 (en haut à droite) ouvre une boîte de dialogue où saisir une graine : un nombre (ex. `42`) ou n'importe quel texte (ex. `ma-graine`, qui est haché). Champ vide = graine aléatoire.
- La graine en cours est affichée en haut (bloc « Graine ») et sur l'écran de fin de partie.
- L'URL est mise à jour avec `?seed=…` : partagez le lien pour rejouer exactement les mêmes conditions.
- « Nouvelle partie » et « Rejouer » démarrent toujours avec une nouvelle graine aléatoire.

À noter : la graine reproduit les *conditions* de la partie (grille, tirages), pas les coups. Pour rejouer une partie à l'identique, il faut refaire les mêmes coups dans le même ordre.

## ⚡ Coups spéciaux

Chaque coup spécial n'est utilisable **qu'une seule fois** par partie :

| Coup | Effet |
| --- | --- |
| ⚡ **Resonance** | La carte du dessus du paquet est défaussée, et toutes les cartes de la grille de la même valeur sont retournées. Si la carte piochée est un joker, vous choisissez la valeur. |
| 🔄 **Echange** | Échange n'importe quelles 2 cartes de la grille (retournées ou non). |
| 👪 **Famille** | Retourne 2 cartes non retournées de la même famille (♠ ♥ ♦ ♣). |

## 🏁 Fin de partie

La partie s'achève quand il n'y a plus aucune paire possible sur la grille et qu'aucun coup spécial ne reste. Votre score rejoint alors le classement local (top 10).

## 🎨 Crédits

- **Cartes** : *Pixel Playing Cards - Asset Pack* par [dallas](https://grijzelucht.itch.io/pixel-playing-cards), sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## 📄 Licence

Code : [MIT](LICENSE).
