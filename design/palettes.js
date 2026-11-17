// Shared palette proposals for the design pages. Roles are fixed; only colors change.
// power = helps the player (faille, logo, heal, special ready)
// ui = interface, lives, selection
// combo = combo counter, nuance, "OUT!"
// reward = crit, score, events
// danger = enemies, telegraphs, damage taken (exclusive)
window.PALETTES = [
  {
    id: 'faille', name: 'Faille', tag: 'v1',
    pitch: "La v1. Vide violet-noir, vert de faille et cinq néons très saturés. La plus polyvalente, la plus proche des trois références.",
    void: '#0a0714', void2: '#140c26', void3: '#1f1438', ink: '#05030a', drop: '#05030a', bone: '#f3ecff', fog: '#a497c9',
    power: ['#7cff2e', 'Bave'], ui: ['#19e3ff', 'Plasma'], combo: ['#ff2bd6', 'Fuchsia'], reward: ['#ffe600', 'Bile'], danger: ['#ff4d1f', 'Alarme'],
  },
  {
    id: 'radioactif', name: 'Radioactif', tag: 'vert dominant',
    pitch: "Tout le monde baigne dans le vert, comme la 3e référence. Le décor semble contaminé ; le fuchsia du combo et l'orange du danger claquent par contraste.",
    void: '#020d06', void2: '#071a0e', void3: '#0d2a16', ink: '#000503', drop: '#000503', bone: '#eaffe6', fog: '#8fb89a',
    power: ['#39ff14', 'Isotope'], ui: ['#00ffc3', 'Menthe'], combo: ['#ff1fa8', 'Fuchsia'], reward: ['#f4ff3a', 'Uranium'], danger: ['#ff3d00', 'Fusion'],
  },
  {
    id: 'plasma', name: 'Plasma froid', tag: 'turquoise + feu',
    pitch: "Turquoise glacé et flammes orange, comme la 1re référence. Plus science-fiction : le danger brûle sur un monde froid, on le voit de loin.",
    void: '#03111a', void2: '#082233', void3: '#0e3346', ink: '#01060a', drop: '#01060a', bone: '#e8fbff', fog: '#86aebf',
    power: ['#00ffd5', 'Turquoise'], ui: ['#4da3ff', 'Arc'], combo: ['#ff3d8b', 'Rose néon'], reward: ['#ffc21a', 'Or'], danger: ['#ff5a1a', 'Brasier'],
  },
  {
    id: 'synthe', name: 'Synthé sale', tag: 'arcade 80s',
    pitch: "Nuit indigo, cyan, magenta et rouge vif. Une borne d'arcade des années 80 qu'on aurait laissée sous la pluie. Plus nocturne, plus rétro.",
    void: '#0d0221', void2: '#1b0640', void3: '#2a0c5c', ink: '#050010', drop: '#050010', bone: '#fff0fb', fog: '#b49ad6',
    power: ['#00f5ff', 'Faille cyan'], ui: ['#b98cff', 'Lavande'], combo: ['#ff2fd0', 'Magenta'], reward: ['#ffe600', 'Laser'], danger: ['#ff1744', 'Rouge vif'],
  },
  {
    id: 'bitume', name: 'Bitume', tag: 'affiche punk',
    pitch: "Contraste maximal : noir bitume, jaune acide, ombres portées jaunes. La plus agressive, façon affiche de concert punk photocopiée.",
    void: '#0b0b0b', void2: '#161616', void3: '#242424', ink: '#000000', drop: '#f2ff00', bone: '#ffffff', fog: '#a0a0a0',
    power: ['#f2ff00', 'Jaune acide'], ui: ['#ffffff', 'Blanc'], combo: ['#ff0a78', 'Rose'], reward: ['#00ff66', 'Vert cash'], danger: ['#ff2a00', 'Rouge'],
  },
  {
    id: 'chair', name: 'Chair cosmique', tag: 'organique',
    pitch: "Rose chair sur bleu nuit, comme les yeux injectés de la 2e référence. Plus organique, un peu dérangeante : la faille ressemble à de la viande.",
    void: '#0a0b24', void2: '#14163a', void3: '#1f2250', ink: '#04040f', drop: '#04040f', bone: '#fff2ec', fog: '#a3a6d6',
    power: ['#ff7ac0', 'Chair'], ui: ['#6cf2ff', 'Glace'], combo: ['#b44dff', 'Ultraviolet'], reward: ['#ffe14d', 'Miel'], danger: ['#ff3b2f', 'Écorché'],
  },
];

window.ROLES = [
  ['power', 'Pouvoir', 'Faille, logo, soin, pouvoir prêt', 'à toi, ça aide'],
  ['ui', 'Interface', 'Interface, cordes de vie, sélection', "l'interface parle"],
  ['combo', 'Combo', 'Combo, nuance, éjection « OUT ! »', 'tu es en feu'],
  ['reward', 'Récompense', 'Critique, score, événement', 'tu gagnes quelque chose'],
  ['danger', 'Danger', 'Ennemis, télégraphes, dégâts reçus', 'ça va faire mal'],
];

window.getPalette = function (id) {
  return window.PALETTES.find(p => p.id === id) || window.PALETTES[0];
};

window.applyPalette = function (p, el) {
  const s = (el || document.documentElement).style;
  ['void', 'void2', 'void3', 'ink', 'drop', 'bone', 'fog'].forEach(k => s.setProperty('--' + k.replace(/(\d)/, '-$1'), p[k]));
  window.ROLES.forEach(([k]) => s.setProperty('--' + k, p[k][0]));
};

window.hexToInt = h => parseInt(h.slice(1), 16);
