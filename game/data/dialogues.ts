import type { CharacterType } from '../../types';

export type BossId = 'directeur' | 'aigle' | 'kawik' | 'tatoo' | 'taupe' | 'ninja_pain' | 'serpent';
export type EnemyKind = 'solfege' | 'surveillant' | 'maths' | 'cpe' | 'inspecteur';
export type EventId = 'blackout' | 'rift' | 'pop_quiz' | 'recess' | 'council' | 'helicopter';
export type Speaker = CharacterType | BossId | 'hero' | 'radio';
export interface Line { speaker: Speaker; text: string }

export const STAGE_INTRO: Record<number, Line[]> = {
  1: [
    { speaker: 'hero', text: 'Salle 104. La faille. Évidemment, le solfège.' },
    { speaker: 'radio', text: 'Ils sortent par dizaines. Carnet de correspondance en main.' },
    { speaker: 'hero', text: 'Accordez-vous. On joue fortissimo.' },
  ],
  2: [
    { speaker: 'radio', text: 'Refuge tombé. Les marmottes font des vocalises.' },
    { speaker: 'hero', text: 'Classe de neige. Classe de carnage.' },
    { speaker: 'radio', text: 'Un truc plane au-dessus de vous. Il prend des notes.' },
  ],
  3: [
    { speaker: 'hero', text: 'Les tomates brillent. Les profs aussi.' },
    { speaker: 'radio', text: 'Le Geiger bat la mesure. Mieux que l’orchestre.' },
    { speaker: 'hero', text: 'Touchez à rien de vert. Sauf pour le cogner.' },
  ],
  4: [
    { speaker: 'radio', text: 'Quarante degrés. Un prof de maths. Des équations.' },
    { speaker: 'hero', text: 'Enfin un décor à la hauteur du son.' },
    { speaker: 'radio', text: 'Ça roule vers vous. Et c’est blindé.' },
  ],
  5: [
    { speaker: 'hero', text: 'La lave monte. Les profs s’en foutent.' },
    { speaker: 'radio', text: 'Ça creuse sous vos pieds. Ça déteste la lumière.' },
    { speaker: 'hero', text: 'Un conservatoire sous un volcan. Ça explique le chauffage.' },
  ],
  6: [
    { speaker: 'radio', text: 'Les fleurs chantent faux. Comme la chorale du mardi.' },
    { speaker: 'hero', text: 'Tout est mignon. C’est un piège.' },
    { speaker: 'radio', text: 'Un lapin à bandeau noir. Carotte en poignard.' },
  ],
  7: [
    { speaker: 'hero', text: 'La faille vient d’ici. Ça pue la craie et le métronome.' },
    { speaker: 'radio', text: 'Tout siffle. Tout ondule. Évitez les lianes.' },
    { speaker: 'hero', text: 'Dernier mouvement. Pas de reprise.' },
  ],
};

export const BOSS_INTRO: Record<BossId, { boss: [string, string, string]; retort: Record<CharacterType, string> }> = {
  directeur: {
    boss: [
      'Collés. Tous. À vie.',
      'Salle 104 ouverte sans autorisation écrite.',
      'SURVEILLANTS ! Confisquez-moi ces sourires.',
    ],
    retort: {
      armand: 'Colle ça.',
      adrien: 'COLLÉ ? TROP BIEN ! JE TAPE SUR LA TABLE !',
      eliot: 'J’ai rien ouvert, mec. Même pas mes partitions.',
      swan: 'Votre micro a un temps et demi de retard.',
      pierre: 'Mon cher, à Versailles, vous porteriez les partitions.',
      audrey: 'Pose ce mégaphone. Je crie plus fort à vide.',
    },
  },
  aigle: {
    boss: [
      'D’ici, vous êtes des croches mal alignées.',
      'Trente ans de jury. Je repère un couac à 2000 mètres.',
      'Note éliminatoire. Je pique.',
    ],
    retort: {
      armand: 'Descends. Je te montre une vraie note grave.',
      adrien: 'UN PIAF JURÉ ? ROULEMENT DE PLUMES !',
      eliot: 'T’es un pigeon avec un ego, mec.',
      swan: 'L’altitude n’améliore pas votre oreille.',
      pierre: 'Un jury perché. Ils le sont tous, mon cher.',
      audrey: 'Tu veux des aigus ? Prends-les dans le bec.',
    },
  },
  kawik: {
    boss: [
      'Coucou les petits choux ! Éveil musical !',
      'Une blanche dure deux temps. Sous Kawik, un seul.',
      'Pas fait tes devoirs ? Kawik va tout grignoter !',
    ],
    retort: {
      armand: 'Mignon. Énorme. Fluo. Je déteste.',
      adrien: 'TROP CHOU ! JE PEUX TAPER ? JE TAPE !',
      eliot: 'J’avais un cochon d’Inde, mec. Moins nucléaire.',
      swan: 'J’ai fini l’éveil musical à quatre ans.',
      pierre: 'Un rongeur pédagogue. Voilà donc la réforme.',
      audrey: 'Ta comptine me file des boutons. Prends du Wagner.',
    },
  },
  tatoo: {
    boss: [
      'Dossier 4-B. Pièces manquantes : toutes.',
      'Carapace certifiée. Votre talent : jamais tamponné.',
      'Demande refusée. Retour au guichet. EN ROULANT.',
    ],
    retort: {
      armand: 'Tamponne ça.',
      adrien: 'MOI AUSSI JE TAMPONNE ! TRÈS FORT ! EN RYTHME !',
      eliot: 'Je repasse demain. Genre, jamais.',
      swan: 'Votre formulaire : quatre fautes. J’ai compté.',
      pierre: 'Partitions notariées depuis 1702, mon cher.',
      audrey: 'Je chante, je remplis pas de cerfa. Roule.',
    },
  },
  taupe: {
    boss: [
      'Sous-sol. Sans fenêtre. Sans pause. Depuis 1987.',
      'Vous, vingt minutes par jour. Ça s’entend.',
      'Retournez travailler. SOUS TERRE.',
    ],
    retort: {
      armand: 'Sous terre ? Je vous y plante.',
      adrien: 'HUIT HEURES PAR JOUR ! MES VOISINS PORTENT PLAINTE !',
      eliot: 'Vingt minutes ? Vous me surestimez.',
      swan: 'Quatre heures par jour. Métronome à 60. Au revoir.',
      pierre: 'J’ai répété à la bougie, madame. Votre cave est un palace.',
      audrey: 'Ma voix ne tient pas dans une cave. Écoutez.',
    },
  },
  ninja_pain: {
    boss: [
      'Le silence est la plus belle note.',
      'Dos voûté. Poignet cassé. Je corrige. Définitivement.',
      'Première leçon : la carotte.',
    ],
    retort: {
      armand: 'Mon dos a démissionné en sixième.',
      adrien: 'LE SILENCE ? CONNAIS PAS ! C’EST UN GROUPE ?',
      eliot: 'Un lapin ninja. J’arrête les bonbons, mec.',
      swan: 'Ma posture est parfaite. J’ai les radios.',
      pierre: 'Le silence, mon cher, c’est pour les sans-ornement.',
      audrey: 'Contre-ut, douze secondes. Toi, tu tiens quoi ?',
    },
  },
  serpent: {
    boss: [
      'Ssssi vous ssssaviez comme je vous attends…',
      'Ssssamedi, 8 h. Ssssolfège. Personne n’est venu.',
      'Alors j’ai ouvert la faille. Sssolfège. Pour l’éternité.',
    ],
    retort: {
      armand: 'Samedi 8 h. C’est pas un complot. C’est du bon sens.',
      adrien: 'SAMEDI 8 H ? JE DORMAIS ! C’EST LA LOI !',
      eliot: 'J’étais inscrit, mec. Jamais réussi à me lever.',
      swan: 'J’y venais, moi. Vous ne m’avez jamais dit bonjour.',
      pierre: 'Une faille pour remplir un cours. Lully n’aurait pas osé.',
      audrey: 'Tu fais l’appel ? Présente. Et je te le chante.',
    },
  },
};

export const BOSS_TAUNTS: Record<BossId, string[]> = {
  directeur: [
    'Ton carnet. IMMÉDIATEMENT.',
    'Collé ! Non : enterré !',
    'J’appelle tes parents. Tous.',
    'Article 12 : talent interdit !',
    'Exclusion définitive. De la vie.',
    'Silence dans les rangs, larve !',
  ],
  aigle: [
    'Recalé. Au suivant.',
    'Je vois tes fautes d’ici.',
    'Je pique. Tu crèves. Suivant.',
    'Ta justesse ? Niveau de la mer.',
    'Le jury délibère… Non.',
    'Zéro. Vu d’en haut, c’est petit.',
  ],
  kawik: [
    'Bravo mon chou ! Non. Nul.',
    'Kawik roule ! Toi, tu craques !',
    'Une graine par fausse note !',
    'Frère Jacques ! TOUT DE SUITE !',
    'Autocollant ? Non. Écrabouillé.',
    'Dodo, l’enfant do. À jamais.',
  ],
  tatoo: [
    'Formulaire B-12 non conforme !',
    'Tamponné. Rejeté. Écrasé.',
    'Guichet fermé. Toi aussi.',
    'Photocopie de ton talent : vide.',
    'Classé sans suite. Comme toi.',
    'Carapace en triple exemplaire !',
  ],
  taupe: [
    'Le soleil ? Mauvais signe.',
    'Je creuse. Toi, ta tombe.',
    'La lumière ? Pour les amateurs.',
    'Six heures de gammes. Sur lave.',
    'Ta technique ? Pleine de trous.',
    'Ça s’entend : t’as pas bossé !',
  ],
  ninja_pain: [
    'Poignet cassé. Bientôt.',
    'Geste juste. Carotte juste.',
    'Hors tempo. Hors jeu. Hors vie.',
    'Silence. Encore trop de bruit.',
    'Respire. Tant que tu peux.',
    'Un soupir. Le dernier.',
  ],
  serpent: [
    'Do, ré, mi, fa, ssssol… encore !',
    'Ssssur le temps, larve !',
    'Je sssserre à quatre temps.',
    'Ssssamedi, 8 h. À jamais.',
    'Clé de ssssol. Clé de cou.',
    'Une gamme. Encore. Encore.',
  ],
};

export const BOSS_DEATH: Record<BossId, string[]> = {
  directeur: [
    'Je… vais devoir… remplir un rapport…',
    'Vous êtes… dispensés… non… attendez…',
  ],
  aigle: [
    'Je retire… ma note…',
    'Jury… au sol… enfin…',
  ],
  kawik: [
    'Kawik… veut… un câlin…',
    'Bon… un autocollant… chacun…',
  ],
  tatoo: [
    'Carapace… hors garantie…',
    'Dossier… classé…',
  ],
  taupe: [
    'Trop… de… lumière…',
    'J’aurais dû… sortir… plus…',
  ],
  ninja_pain: [
    'Le silence… enfin…',
    'Ta posture… reste… nulle…',
  ],
  serpent: [
    'Ssssamedi… annulé…',
    'Qui va… faire… les gammes…',
  ],
};

export const TEACHER_BARKS: Record<EnemyKind, string[]> = {
  solfege: [
    'Fa dièse, crétin !',
    'Ta gamme pue.',
    'Dictée à quatre voix ! Copie !',
    'Blanche : deux noires. Toi : 0.',
    'Un soupir, c’est pas une pause !',
    'Ton rythme insulte le métronome.',
    'Clé d’ut ! Plus vite, larve !',
    'Trois dièses. Zéro neurone.',
    'Oreille relative : nulle.',
    'Solfège ou cercueil. Choisis.',
    'Lecture de notes. Top. Raté.',
    'Des triolets, mollusque !',
  ],
  surveillant: [
    'FRRRT ! On court pas !',
    'Ta carte de cantine ! Vite !',
    'Capuche ! Retire ! Maintenant !',
    'Téléphone confisqué. À vie.',
    'Nom ! Classe ! Cercueil !',
    'En rang deux par deux !',
    'Mot dans le carnet ! Signé !',
    'Le sifflet, c’est moi !',
    'Au coin ! Dans le vide !',
    'FRRRT ! FRRRT ! FRRRRRRT !',
    'Je t’ai vu. Je vois tout.',
    'Permanence. Pour l’éternité.',
  ],
  maths: [
    'Calcule ta chute. Trop tard.',
    'Craie à 40 m/s. Bonne chance.',
    'Pythagore ! En pleine face !',
    'Résous x. X, c’est ta tombe.',
    'Ta moyenne tend vers zéro.',
    'Démontre que tu sers à un truc.',
    'Calculatrice interdite, crétin !',
    'La musique sert à rien. Moi si.',
    'Ta vie : coefficient zéro.',
    'Il manque l’unité. Et le talent.',
    'Zéro. Pointé. Saignant.',
    'Divisé par toi : impossible.',
  ],
  cpe: [
    'Dans mon bureau. Pour toujours.',
    'Ton dossier pèse plus que toi.',
    'Tes parents ont signé. Adieu.',
    'Avertissement. Blâme. Exécution.',
    'Retard non justifié ! Encore !',
    'Ton absence ? Notée. Pas toi.',
    'Je bloque. Je note. Je cogne.',
    'Vie scolaire ! On ne passe pas !',
    'Mot d’excuse refusé, larve.',
    'Le règlement ? C’est moi.',
    'Mon cartable a tué des classes.',
    'Conseil de discipline. Là.',
  ],
  inspecteur: [
    'Compétence 4.2 : non acquise.',
    'Grille d’évaluation : zéro.',
    'Je rédige un rapport. Très long.',
    'Collègues ! Plus d’énergie !',
    'Ta progression, crétin ? Où ?',
    'Pas conforme au programme.',
    'Insolence évaluée par critères.',
    'Venu de l’académie. Pour toi.',
    'Réunion à 17 h. Obligatoire.',
    'Transversalité : zéro.',
    'Collègues, achevez-le !',
    'Rapport final : à abattre.',
  ],
};

export const HERO_BARKS: Record<CharacterType, { combo: string[]; special: string[]; hurt: string[]; boss: string[] }> = {
  armand: {
    combo: [
      'Pizzicato dans ta gueule.',
      'Basse continue. Dégâts continus.',
      'Fortissimo.',
      'Deux mètres de bois. Bonne nuit.',
    ],
    special: [
      'Toupie d’archet.',
      'Je tourne. Vous tombez.',
      'Accrochez-vous aux cordes.',
      'Bélier en sol mineur.',
    ],
    hurt: [
      'Pas la volute.',
      'Mon dos. Ma basse. Ma vie.',
      'Ma corde de mi…',
      'Ça, ça va rayer.',
    ],
    boss: [
      'Note grave. Dégâts graves.',
      'Ta tête résonne bien.',
      'Plus grave que ça, tu meurs.',
      'Sens cette fondamentale.',
    ],
  },
  adrien: {
    combo: [
      'BLAST BEAT !',
      'PLUS VITE ! PLUS FORT !',
      '240 BPM ET J’ACCÉLÈRE !',
      'BOUM ! TCHAK ! DANS TA FACE !',
    ],
    special: [
      'ROAAAAAR !',
      'LE ROI DE LA JUNGLE TAPE !',
      'CRINIÈRE EN SOLO !',
      'TOUT LE MONDE À TERRE !',
    ],
    hurt: [
      'AÏE ! RIEN SENTI !',
      'MES BAGUETTES !',
      'HÉ ! J’ÉTAIS EN PLEIN BREAK !',
      'OUILLE ! ON REPREND !',
    ],
    boss: [
      'CRASH DE CYMBALE DANS TA FACE !',
      'ROULEMENT SUR TON CRÂNE !',
      'T’AS PAS LE RYTHME, CRÉTIN !',
      'ENCORE ! ENCORE ! ENCORE !',
    ],
  },
  eliot: {
    combo: [
      'Tranquille, mec.',
      'Ampli sur onze.',
      'Larsen dans ta face.',
      'J’ai même pas branché.',
    ],
    special: [
      'Désolé. La cantine.',
      'Ça va sentir, mec.',
      'Distorsion… intestinale.',
      'Respirez pas. Sérieux.',
    ],
    hurt: [
      'Putain. Mes lunettes.',
      'Hé. Doucement.',
      'Aïe. Bon. OK.',
      'Corde cassée. Moral aussi.',
    ],
    boss: [
      'Riff dans les dents.',
      'T’es pas rock, mec.',
      'Power chord. Dans ta gueule.',
      'Larsen offert par la maison.',
    ],
  },
  swan: {
    combo: [
      'Exécution impeccable.',
      'Quatre temps. Toi : zéro.',
      'Comme prévu.',
      'Arpège. Arpège. Fin.',
    ],
    special: [
      'Chat-missile. Calculé.',
      'Va, Minou.',
      'Miaou. Précisément.',
      'Félin armé. Félin lancé.',
    ],
    hurt: [
      'Inacceptable.',
      'Jamais les mains.',
      'Une erreur. Je la note.',
      'Contact non prévu.',
    ],
    boss: [
      'Votre point faible : partout.',
      'Do majeur. Do mineur. Do au sol.',
      'Septième diminuée. Comme vous.',
      'Fortissimo, main gauche.',
    ],
  },
  pierre: {
    combo: [
      'Admirez l’ornementation !',
      'Trilles ! Mordants ! Cratères !',
      'Le Roi-Soleil applaudit !',
      'Basse continue, mon cher !',
    ],
    special: [
      'Que la lumière baroque soit !',
      'Fugue thermonucléaire en ré !',
      'Messieurs, couvrez-vous.',
      'Bach vous salue bien.',
    ],
    hurt: [
      'Mon jabot ! Sacrilège !',
      'Rustre !',
      'On ne touche pas au clavecin !',
      'Ma perruque, maraud !',
    ],
    boss: [
      'Révérence. Puis coup de grâce.',
      'Cadence parfaite, mon cher.',
      'Tempéré ? Moi, je suis brillant.',
      'Quel manque de raffinement.',
    ],
  },
  audrey: {
    combo: [
      'Contre-ut. Contre toi.',
      'Je chauffe à peine la voix.',
      'Vibrato dans ta face !',
      'Aaaah-AAAAAAAH !',
    ],
    special: [
      'Cot cot CODAAA !',
      'Diva de la basse-cour !',
      'Cot-cot fortissimo !',
      'Œuf au plat. Sur ta tête.',
    ],
    hurt: [
      'Ma voix ! Pas ma voix !',
      'J’ai pas fait mes vocalises !',
      'Aïe ! Je passe en mineur.',
      'Respire, Audrey.',
    ],
    boss: [
      'Ça, c’est un la. Le tien pue.',
      'Ta gueule. Je chante.',
      'Les vitres ont compris. Toi ?',
      'Aria de démolition !',
    ],
  },
};

export const EVENT_TEXT: Record<EventId, { title: string; subtitle: string; bark: string }> = {
  blackout: {
    title: 'COUPURE DE COURANT',
    subtitle: 'Noir total. Seuls les néons et les armes brillent.',
    bark: 'Qui a branché une pédale ?!',
  },
  rift: {
    title: 'FAILLE DIMENSIONNELLE',
    subtitle: 'Un portail crache des profs mutants.',
    bark: 'Muté ici. Je hais ma mutation.',
  },
  pop_quiz: {
    title: 'CONTRÔLE SURPRISE',
    subtitle: 'Des pupitres tombent du ciel. Fuyez les ombres.',
    bark: 'Copie double. Ou cercueil.',
  },
  recess: {
    title: 'RÉCRÉ !',
    subtitle: 'Pluie de bonus. Ramassez tout, vite !',
    bark: 'Pas de ballon ! Pas de joie !',
  },
  council: {
    title: 'CONSEIL DE CLASSE',
    subtitle: 'Trois inspecteurs en rayon. Brisez le cercle !',
    bark: 'Avis défavorable. Unanime.',
  },
  helicopter: {
    title: 'LE RETOUR DU DIRECTEUR',
    subtitle: 'Il survole l’arène et largue des profs. Bougez !',
    bark: 'Le budget musique ? Mon hélico !',
  },
};

export const GAME_OVER_TAUNTS: string[] = [
  'Rideau. Même ton cadavre joue faux.',
  'Le métronome t’a survécu.',
  'Parents-profs lundi, 17 h. Venez en noir.',
  'Appréciation : absent de son propre combat.',
  'Retour en éveil musical. Avec les bébés.',
  'Ton instrument demande un nouveau propriétaire.',
  'Zéro. Et le barème commençait à moins deux.',
  'Salle des profs : on parle de toi. En riant.',
  'Silence éternel. Enfin un peu de nuance.',
  'Coda ratée. Reprise. Tout de suite.',
];

export const VICTORY_LINES: Line[] = [
  { speaker: 'radio', text: 'La faille se referme ! Le conservatoire revient !' },
  { speaker: 'hero', text: 'Plus de profs. Plus de samedi 8 h.' },
  { speaker: 'radio', text: 'Le Directeur sort des décombres. Vous êtes collés.' },
  { speaker: 'hero', text: 'Évidemment.' },
  { speaker: 'radio', text: 'Et vous ouvrez le concert de fin d’année.' },
  { speaker: 'hero', text: 'Fortissimo. Les tympans vont saigner. De l’encre.' },
];

export const STAGE_CLEAR_LINES: Record<number, string> = {
  1: 'Appréciation : a tout cassé. Littéralement.',
  2: 'Bulletin : 0/20. Mais quel spectacle.',
  3: 'Travail fluo. Lavez-vous les mains avant le cours.',
  4: 'Formulaires remplis à coups de pied. Dossier accepté.',
  5: 'Beaucoup de chaleur. Zéro nuance. Volcan en larmes.',
  6: 'Posture discutable. Le lapin émet des réserves. Posthumes.',
  7: 'A sauvé l’univers. Bavarde en cours. Félicitations, hélas.',
};

export const FINALE: Record<CharacterType, { name: string; line: string }> = {
  armand: { name: 'Coda', line: 'Coda. Trois fois.' },
  adrien: { name: 'Blast Beat', line: 'SOIXANTE-QUATRE COUPS !' },
  eliot: { name: 'Larsen', line: 'Larsen dans ta face.' },
  swan: { name: 'Concerto pour Chat', line: 'Joue, Minou. Pianissimo.' },
  pierre: { name: 'Toccata', line: 'Ré mineur. Adieu.' },
  audrey: { name: 'Contre-Ut', line: 'Do suraigu. Bonne nuit.' },
};

export const CARNAGE_BARKS: Record<CharacterType, string[]> = {
  armand: ['Carnage. Évidemment.', 'Ça, c’est du grave.', 'Plus personne. Bien.'],
  adrien: ['PUTAIN DE CARNAGE !', 'J’AI PERDU LE COMPTE !', 'ENCORE ! ENCORE !'],
  eliot: ['Ampli sur douze, mec.', 'Ça dégénère. Cool.', 'J’ai même pas forcé.'],
  swan: ['Carnage. Comme prévu.', 'Massacre en mesure.', 'Je note : tous morts.'],
  pierre: ['Apothéose baroque !', 'Bach serait fier !', 'Tutti, mon cher !'],
  audrey: ['Bis ! BIS ! BIS !', 'Standing ovation !', 'Je suis l’apocalypse.'],
};

export const ON_BEAT_WORDS: string[] = [
  'SUR LE TEMPS !',
  'EN MESURE !',
  'TEMPO !',
  'PILE !',
  'TEMPS FORT !',
  'CALÉ !',
  'À LA CROCHE !',
  'GROOVE !',
];

export const KILL_WORDS: { pop: string[]; flat: string[]; out: string[]; stake: string[]; juggle: string[] } = {
  pop: ['SPLOTCH', 'SPLASH', 'BLOURP', 'KAPLOF', 'SPRATCH'],
  flat: ['FLATCH', 'SPLAF', 'CRÊPE !', 'PLONK', 'SCHLAF'],
  out: ['OUT !', 'BYE !', 'ADIEU !', 'DEHORS !', 'AU VIDE !'],
  stake: ['TOC', 'TONK', 'PLANTÉ !', 'CLONK', 'BOUM'],
  juggle: ['PAF', 'PAF PAF', 'POF', 'HOP !', 'BIS !'],
};
