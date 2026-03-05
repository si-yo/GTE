# GTE - Graph TypeScript Editor

**GTE** (Graph TypeScript Editor) est un éditeur visuel no-code permettant de créer des applications TypeScript/React en assemblant des nœuds interconnectés sur un graphe.

## Fonctionnalités

### Éditeur Visuel par Graphe
- Interface intuitive basée sur des nœuds et connexions
- Glisser-déposer des composants depuis la palette
- Connexions fluides entre les ports d'entrée/sortie
- Multi-projets avec onglets

### Catégories de Nœuds

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **UI** | Composants d'interface | Button, Input, Text, Container, Image, List |
| **Hooks** | États React | useState, useRef, useMemo, useEffect, useCallback |
| **Async** | Opérations asynchrones | Fetch API, Delay, Promise |
| **Logique** | Contrôle de flux | If/Else, Switch, For Each, Compare, AND, OR, NOT |
| **Données** | Manipulation de données | String, Number, Boolean, Array, Object, Get/Set Property |
| **Math** | Opérations mathématiques | Add, Subtract, Multiply, Divide |
| **Entités** | Gestion d'entités | Create Entity, Get/Set Attribute, Call Method |

### Fonctionnalités Avancées

- **Export de Code** : Génère du code TypeScript/React propre
- **Aperçu** : Prévisualisez votre application en temps réel
- **Bibliothèque de Templates** : Modèles prédéfinis pour démarrer rapidement
- **Gestion des Plugins** : Étendez les fonctionnalités
- **Explorateur de Fichiers** : Gérez vos projets
- **Entités** : Définissez vos propres types de données
- **Multi-graphes** : Plusieurs composants par projet

## Installation

```bash
npm install
npm run dev
```

## Utilisation

1. **Créer un projet** : Cliquez sur le bouton "+" dans la barre d'onglets
2. **Ajouter des nœuds** : Faites glisser les nœuds depuis le panneau de gauche vers le canvas
3. **Connecter les nœuds** : Reliez les ports de sortie aux ports d'entrée
4. **Configurer les propriétés** : Modifiez les paramètres dans le panneau de droite
5. **Exporter** : Cliquez sur "Export" pour générer le code TypeScript

## Technologies

- React 19
- TypeScript
- Vite
- Tailwind CSS

## Commandes

```bash
npm run dev     # Démarrer le serveur de développement
npm run build    # Build de production
npm run preview # Aperçu du build
```
