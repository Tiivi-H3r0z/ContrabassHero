import type { CharacterType } from '../../types';

export type BossId = 'directeur' | 'aigle' | 'kawik' | 'tatoo' | 'taupe' | 'ninja_pain' | 'serpent';
export type EnemyKind = 'solfege' | 'surveillant' | 'maths' | 'cpe' | 'inspecteur';
export type EventId = 'blackout' | 'rift' | 'pop_quiz' | 'recess' | 'council' | 'helicopter';
export type Speaker = CharacterType | BossId | 'hero' | 'radio';
export interface Line { speaker: Speaker; text: string }

export const STAGE_INTRO: Record<number, Line[]> = {
  1: [
    { speaker: 'hero', text: 'La faille s’est ouverte dans la salle 104. Évidemment, c’est la salle de solfège.' },
    { speaker: 'radio', text: 'Ici la cave à percussions. Ils sortent par dizaines. Et ils ont tous un carnet de correspondance.' },
    { speaker: 'hero', text: 'Accordez-vous vite. On joue fortissimo.' },
  ],
  2: [
    { speaker: 'radio', text: 'Le refuge est envahi. Ils font faire des vocalises aux marmottes.' },
    { speaker: 'hero', text: 'Classe de neige obligatoire. Personne ne nous a demandé notre avis.' },
    { speaker: 'radio', text: 'Attention, un truc plane au-dessus de vous. Et il a l’air de prendre des notes.' },
  ],
  3: [
    { speaker: 'hero', text: 'Les tomates brillent. Les profs aussi. Je ne veux pas savoir pourquoi.' },
    { speaker: 'radio', text: 'Le compteur Geiger bat la mesure. Mieux que la moitié de l’orchestre.' },
    { speaker: 'hero', text: 'Ne touchez à rien de vert. Surtout pas aux profs.' },
  ],
  4: [
    { speaker: 'radio', text: 'Quarante degrés, un soleil en dégradé rose et un prof de maths qui distribue des équations.' },
    { speaker: 'hero', text: 'Enfin un décor à la hauteur de notre son.' },
    { speaker: 'radio', text: 'Le sol tremble. Quelque chose roule vers vous. Quelque chose de blindé.' },
  ],
  5: [
    { speaker: 'hero', text: 'La lave monte. Les profs, eux, font comme si de rien n’était.' },
    { speaker: 'radio', text: 'Il y a des galeries sous vos pieds. Ça creuse. Et ça déteste la lumière.' },
    { speaker: 'hero', text: 'Un conservatoire sous un volcan. Ça explique enfin le chauffage.' },
  ],
  6: [
    { speaker: 'radio', text: 'Les fleurs chantent faux. On dirait la chorale du mardi.' },
    { speaker: 'hero', text: 'Tout est mignon ici. C’est forcément un piège.' },
    { speaker: 'radio', text: 'J’ai vu un lapin avec un bandeau noir. Il tenait une carotte comme un poignard.' },
  ],
  7: [
    { speaker: 'hero', text: 'La faille vient d’ici. Ça sent le métronome et la craie.' },
    { speaker: 'radio', text: 'Tout brille, tout siffle, tout ondule. Restez groupés et ne marchez sur aucune liane.' },
    { speaker: 'hero', text: 'Dernier mouvement. Pas de reprise.' },
  ],
};

export const BOSS_INTRO: Record<BossId, { boss: [string, string, string]; retort: Record<CharacterType, string> }> = {
  directeur: {
    boss: [
      'Mesdames et messieurs les élèves, ceci est une annonce du Directeur. Vous êtes tous collés.',
      'Vous avez couru dans les couloirs, joué sans partition et ouvert la salle 104 sans autorisation écrite.',
      'SURVEILLANTS ! Confisquez-moi ces instruments. Et ces sourires.',
    ],
    retort: {
      armand: 'Monsieur, ma contrebasse fait deux mètres. Je ne cours pas dans les couloirs, je les bouche.',
      adrien: 'Collé ? Trop bien ! Je peux taper sur la table pendant deux heures ?',
      eliot: 'J’ai rien ouvert, monsieur. J’ouvre jamais rien. Même pas mes partitions.',
      swan: 'Votre annonce avait un temps et demi de retard sur le micro. C’est gênant.',
      pierre: 'Mon cher, à la cour de Louis XIV, on vous aurait confié le portage des partitions. Au mieux.',
      audrey: 'Posez ce mégaphone. Je projette plus fort que vous, à vide.',
    },
  },
  aigle: {
    boss: [
      'D’ici, je vous vois tous. On dirait des croches mal alignées.',
      'J’ai été jury de concours pendant trente ans. Je repère une fausse note à deux mille mètres.',
      'Note éliminatoire. Je pique.',
    ],
    retort: {
      armand: 'Descends un peu, que je te montre ce que c’est, une vraie note grave.',
      adrien: 'Un piaf qui juge le rythme ? Viens, je te fais un roulement de plumes !',
      eliot: 'Mec, t’es un pigeon avec un ego. Redescends.',
      swan: 'Votre altitude n’améliore pas votre oreille. Vous planez, c’est tout.',
      pierre: 'Un jury perché ? Que c’est original. Ils le sont tous, mon cher.',
      audrey: 'Tu veux des aigus ? Je vais t’en donner, des aigus.',
    },
  },
  kawik: {
    boss: [
      'Coucou les petits choux ! C’est l’heure de l’éveil musical !',
      'Aujourd’hui, on apprend la blanche. Ça dure deux temps. Comme vous, quand Kawik vous roule dessus.',
      'Oh, quelqu’un n’a pas fait ses devoirs… Tant pis, Kawik va tout grignoter !',
    ],
    retort: {
      armand: 'Il est mignon. Il est énorme. Il brille dans le noir. Je n’aime pas ça du tout.',
      adrien: 'Trop chou ! Je peux le caresser ? Non ? Bon, je tape alors.',
      eliot: 'J’ai eu un cochon d’Inde quand j’étais petit. Il était plus petit. Et moins nucléaire.',
      swan: 'J’ai terminé l’éveil musical à quatre ans. Passons au niveau supérieur.',
      pierre: 'Un rongeur pédagogue. Voilà donc où mène la réforme des conservatoires.',
      audrey: 'Ta voix de comptine me donne des boutons. Je vais te chanter du Wagner.',
    },
  },
  tatoo: {
    boss: [
      'Dossier d’inscription numéro 4-B. Pièces manquantes : toutes.',
      'Ma carapace est certifiée conforme. Votre talent, en revanche, n’a jamais été tamponné.',
      'Demande refusée. Je vous renvoie au guichet… EN ROULANT.',
    ],
    retort: {
      armand: 'J’ai rempli trois formulaires pour avoir le droit de prendre le bus avec ma basse. Je suis prêt.',
      adrien: 'Il est où, le tampon ? Moi aussi, je sais tamponner. Très fort. En rythme.',
      eliot: 'Je peux repasser demain ? Genre, jamais ?',
      swan: 'Votre formulaire contient quatre fautes d’orthographe. J’ai compté.',
      pierre: 'Mes partitions sont certifiées par un notaire depuis 1702. Essayez encore.',
      audrey: 'Je chante, je ne remplis pas de cerfa. Roule-toi en boule et écoute.',
    },
  },
  taupe: {
    boss: [
      'Moi, je travaille dans les salles du sous-sol. Sans fenêtre. Sans pause. Depuis 1987.',
      'Vous, vous travaillez vingt minutes par jour en regardant vos téléphones. Ça se voit. Ça s’entend.',
      'Retournez travailler. SOUS TERRE.',
    ],
    retort: {
      armand: 'Remontez à la surface, madame. Il y a de la lumière, des gens, une vie. Je vous montre.',
      adrien: 'Moi, je travaille huit heures par jour ! Mes voisins peuvent confirmer. Et porter plainte.',
      eliot: 'Vingt minutes ? Vous m’avez confondu avec quelqu’un de motivé.',
      swan: 'Quatre heures par jour, métronome à 60. Je ne vous dois rien.',
      pierre: 'J’ai répété à la bougie toute ma jeunesse, madame. Votre cave est un palace.',
      audrey: 'Une voix comme la mienne ne se cache pas dans un sous-sol. Elle fait trembler le volcan.',
    },
  },
  ninja_pain: {
    boss: [
      'Le silence est la plus belle des notes. Vous ne l’avez jamais jouée.',
      'Dos voûté. Poignet cassé. Respiration de phoque. Je vais corriger votre posture. Définitivement.',
      'Première leçon : la carotte.',
    ],
    retort: {
      armand: 'Ma posture ? Je porte deux mètres de bois tous les jours. Mon dos a démissionné en sixième.',
      adrien: 'Le silence ? Connais pas. C’est un groupe ?',
      eliot: 'Un lapin ninja qui parle en haïku. OK, j’arrête les bonbons de la cantine.',
      swan: 'Ma posture est parfaite. J’ai les radios pour le prouver.',
      pierre: 'Le silence, mon cher, c’est pour ceux qui n’ont rien à ornementer.',
      audrey: 'Respiration de phoque ? Je tiens un contre-ut douze secondes. Toi, tu tiens quoi ?',
    },
  },
  serpent: {
    boss: [
      'Ssssi vous ssssaviez depuis combien de temps je vous attends…',
      'C’est moi qui ai ouvert la faille. Personne ne venait à mon cours de ssssolfège du samedi 8 h.',
      'Alors j’ai rendu le samedi 8 h éternel. Tout le monde en ssssalle. Gammes chromatiques. Pour toujours.',
    ],
    retort: {
      armand: 'Personne ne venait parce que c’était le samedi à 8 h. Ce n’est pas un complot, c’est du bon sens.',
      adrien: 'Samedi 8 h ? Je dormais ! Tout le monde dormait ! C’est la loi !',
      eliot: 'J’étais inscrit, en fait. J’ai juste jamais réussi à me lever. Pendant trois ans.',
      swan: 'J’y venais, moi. Chaque samedi. Vous ne m’avez jamais dit bonjour. Je ne vous le dirai pas non plus.',
      pierre: 'Ouvrir une brèche dimensionnelle pour remplir un cours. Même Lully n’aurait pas osé.',
      audrey: 'Tu as détruit le conservatoire pour faire l’appel ? Présente. Et je vais te le chanter.',
    },
  },
};

export const BOSS_TAUNTS: Record<BossId, string[]> = {
  directeur: [
    'Ton carnet de correspondance, IMMÉDIATEMENT !',
    'Ceci est un avertissement de conduite !',
    'Trois heures de colle ! Non, six !',
    'J’appelle vos parents ! Tous ! Maintenant !',
    'Interdiction de courir ! Sauf moi !',
    'Article 12 : le talent est interdit !',
  ],
  aigle: [
    'Vue d’en haut, ta technique est minuscule.',
    'Je vois tes fautes de doigté d’ici.',
    'Recalé ! Au suivant !',
    'Ta justesse ne dépasse pas le niveau de la mer.',
    'Je pique. Toi, tu chutes. Comme ta moyenne.',
    'Le jury délibère… Non.',
  ],
  kawik: [
    'Bravo mon chou ! Non, c’était nul.',
    'On frappe dans ses petites mains ! Et on tombe !',
    'Une graine pour chaque fausse note !',
    'Kawik roule ! Kawik juge !',
    'Qui veut un autocollant ? Personne. Voilà.',
    'Tout le monde chante Frère Jacques ! TOUT DE SUITE !',
  ],
  tatoo: [
    'Formulaire B-12 non conforme !',
    'Revenez avec une photocopie de votre talent !',
    'Réclamation classée sans suite !',
    'Guichet fermé ! Repassez dans six mois !',
    'Tamponné. Rejeté. Écrasé.',
    'Ma carapace existe en triple exemplaire !',
  ],
  taupe: [
    'Tu as vu le soleil ? Mauvais signe. Travaille.',
    'Six heures de gammes. Dans le noir. Sur la lave.',
    'La lumière, c’est pour les amateurs !',
    'Je creuse. Toi, tu creuses ta tombe.',
    'Ta technique a des trous. Je les connais tous.',
    'Ça s’entend que tu n’as pas travaillé !',
  ],
  ninja_pain: [
    'Ton poignet est cassé. Bientôt, vraiment.',
    'Le geste juste. La carotte juste.',
    'Respire par le ventre. Pas par la bouche.',
    'Tu es déjà hors tempo.',
    'Le tonnerre accompagne. Toi, non.',
    'Silence. Encore trop de bruit.',
  ],
  serpent: [
    'Do, ré, mi, fa, ssssol… encore !',
    'Ssssur le temps ! SSSSUR LE TEMPS !',
    'Je sssserre en mesure. À quatre temps.',
    'Une gamme de plus. Et encore une. Et encore une.',
    'Ssssamedi, 8 h. Pour l’éternité.',
    'Clé de ssssol, clé de fa, clé de cou.',
  ],
};

export const BOSS_DEATH: Record<BossId, string[]> = {
  directeur: [
    'Je… je vais devoir remplir un rapport d’incident…',
    'Vous êtes tous… dispensés de cours… non… attendez…',
  ],
  aigle: [
    'Je retire… ma note éliminatoire…',
    'J’aurais dû… rester jury… au sol…',
  ],
  kawik: [
    'Kawik… veut… un câlin… et une carotte…',
    'Bon… vous aurez… un autocollant…',
  ],
  tatoo: [
    'Ma carapace… n’était plus… sous garantie…',
    'Dossier… classé…',
  ],
  taupe: [
    'Trop… de… lumière…',
    'J’aurais dû… sortir… plus souvent…',
  ],
  ninja_pain: [
    'Le silence… enfin…',
    'Ta posture… reste… médiocre…',
  ],
  serpent: [
    'Ssssamedi… annulé…',
    'Qui va… faire… les gammes… maintenant…',
  ],
};

export const TEACHER_BARKS: Record<EnemyKind, string[]> = {
  solfege: [
    'Do, ré, mi… NON ! Ça, c’était un fa dièse !',
    'Dictée à quatre voix ! Sortez une feuille !',
    'Clé d’ut troisième ligne, et plus vite que ça !',
    'La blanche vaut deux noires. Toi, tu vaux zéro.',
    'Battez la mesure ! Pas les profs !',
    'Lecture de notes : trente secondes. Top !',
    'Ton rythme est une insulte au métronome.',
    'Un soupir n’est pas une pause café !',
    'On chante sur le nom des notes !',
    'Ton oreille relative est relativement nulle.',
    'Trois dièses à la clé, zéro neurone dans la tête.',
    'Des triolets ! Je veux entendre des triolets !',
  ],
  surveillant: [
    'FRRRT ! On ne court pas dans la faille !',
    'Carte de cantine ! Tout de suite !',
    'Tu fais quoi hors de ta salle, toi ?',
    'FRRRT ! Retire ta capuche !',
    'Téléphone confisqué jusqu’en juin !',
    'Le sifflet, c’est moi qui en joue !',
    'Ton nom ! Ta classe ! Ton instrument !',
    'En rang deux par deux ! Même en combat !',
    'Mot dans le carnet ! Signé par les parents !',
    'Pas de musique pendant la permanence !',
    'FRRRT ! FRRRT ! FRRRRRRT !',
    'Je t’ai vu ! Je vois tout ! Surtout toi !',
  ],
  maths: [
    'Calcule ta trajectoire. Ah, trop tard.',
    'Craie lancée à 40 m/s. Tu as une seconde.',
    'Une gamme, c’est une suite géométrique !',
    'Résous x. X, c’est ta note. Elle est basse.',
    'Théorème de Pythagore ! En pleine figure !',
    'La musique, ça ne sert à rien. Moi, je sers.',
    'Calculatrice interdite ! Calcul de tête !',
    'Ta moyenne tend vers zéro.',
    'Démontre-moi que tu sers à quelque chose.',
    'Le contrôle compte double. Ta vie aussi.',
    'Craie blanche : coefficient 4 !',
    'Il manque l’unité ! Et le talent !',
  ],
  cpe: [
    'Dans mon bureau. Toute la classe.',
    'Ton dossier est plus épais que mon cartable.',
    'J’ai convoqué tes parents. Ils sont d’accord.',
    'Avertissement, blâme, exclusion. Dans l’ordre.',
    'Mon cartable a vu tomber des générations.',
    'Retard non justifié ! Encore un !',
    'Ton absence a été remarquée. Pas toi.',
    'Je bloque. Je note. Je signale.',
    'Vie scolaire ! Personne ne passe !',
    'Dix-huit demi-journées d’absence. Bravo.',
    'Le règlement, c’est moi qui l’ai écrit. En gras.',
    'Mot d’excuse refusé. Même signé.',
  ],
  inspecteur: [
    'Ce cours manque cruellement de transversalité.',
    'Collègues, plus d’énergie ! Je vous observe !',
    'La grille d’évaluation est formelle : zéro.',
    'Compétence 4.2 : non acquise.',
    'Je rédige un rapport. Il sera long.',
    'Où est votre progression pédagogique ?',
    'Collègues, redoublez d’ardeur ! Et eux aussi !',
    'Votre insolence sera évaluée par critères.',
    'Ceci n’est pas conforme au programme.',
    'Je viens de l’académie. Exprès pour vous.',
    'Pas de tableau numérique ? Inacceptable.',
    'Réunion à 17 h. Présence obligatoire.',
  ],
};

export const HERO_BARKS: Record<CharacterType, { combo: string[]; special: string[]; hurt: string[]; boss: string[] }> = {
  armand: {
    combo: [
      'Ça, c’est de la basse continue.',
      'Fortissimo, messieurs-dames !',
      'Pizzicato dans les dents !',
      'Ma basse fait deux mètres. Mon combo aussi.',
    ],
    special: [
      'Toupie d’archet !',
      'Tout le monde danse !',
      'Accrochez-vous aux cordes !',
      'Je tourne, vous tombez.',
    ],
    hurt: [
      'Pas la volute !',
      'Aïe, mon dos… et ma basse !',
      'Ma corde de mi !',
      'Ça va laisser une rayure, ça.',
    ],
    boss: [
      'Note grave, dégâts graves.',
      'Ça résonne bien, ta tête.',
      'Je t’accorde un demi-ton. Plus bas.',
      'Sens-moi cette fondamentale !',
    ],
  },
  adrien: {
    combo: [
      'PLUS VITE ! PLUS FORT !',
      'Double pédale, double dose !',
      'Je suis à 240 BPM et j’accélère !',
      'Boum ! Tchak ! Boum-boum ! Tchak !',
    ],
    special: [
      'ROAAAAAR !',
      'Le roi de la jungle est batteur !',
      'Crinière en mode solo !',
      'Tout le monde à terre ! ROAR !',
    ],
    hurt: [
      'Aïe ! Ça va ! J’ai rien senti !',
      'Mes baguettes !',
      'Hé ! J’étais en plein break !',
      'Ouille ! Bon, on reprend !',
    ],
    boss: [
      'Roulement de tambour sur ta tête !',
      'Crash de cymbale dans ta face !',
      'T’as pas le rythme ! Moi si !',
      'ENCORE ! ENCORE ! ENCORE !',
    ],
  },
  eliot: {
    combo: [
      'Tranquille.',
      'Solo de trois minutes, minimum.',
      'Ampli sur onze.',
      'J’ai même pas branché la pédale.',
    ],
    special: [
      'Désolé. C’est la cantine.',
      'Attention, ça va sentir.',
      'Distorsion… intestinale.',
      'Respirez pas. Sérieux.',
    ],
    hurt: [
      'Mes lunettes !',
      'Hé, doucement…',
      'Aïe. Bon. OK.',
      'J’ai cassé une corde. Et un truc en moi.',
    ],
    boss: [
      'Riff dans les dents.',
      'T’es pas rock, mec.',
      'Larsen offert par la maison.',
      'Power chord. Power tout court.',
    ],
  },
  swan: {
    combo: [
      'Exécution impeccable.',
      'Quatre-vingt-huit touches. Aucune erreur.',
      'Comme prévu.',
      'Arpège. Arpège. Fin.',
    ],
    special: [
      'Chat-missile. Trajectoire calculée.',
      'Va, Minou.',
      'Miaou. Précisément.',
      'Félin armé. Félin lancé.',
    ],
    hurt: [
      'Inacceptable.',
      'Les mains. Jamais les mains.',
      'Une erreur. Une seule. Je la note.',
      'Ce contact n’était pas prévu.',
    ],
    boss: [
      'Fortissimo, main gauche.',
      'Votre point faible : partout.',
      'Do majeur. Do mineur. Do au sol.',
      'Septième diminuée. Comme vous.',
    ],
  },
  pierre: {
    combo: [
      'Admirez l’ornementation !',
      'Trilles, mordants, appoggiatures !',
      'Le Roi-Soleil applaudirait !',
      'Basse continue, victoire continue !',
    ],
    special: [
      'Que la lumière baroque soit !',
      'Fugue thermonucléaire en ré !',
      'Messieurs, couvrez-vous.',
      'Toccata et frappe en ré mineur !',
    ],
    hurt: [
      'Ma queue-de-cheval ! Sacrilège !',
      'Rustre !',
      'On ne touche pas un claveciniste !',
      'Mon jabot ! Vous avez froissé mon jabot !',
    ],
    boss: [
      'Révérence. Puis coup de grâce.',
      'Quel manque de raffinement.',
      'Ceci, mon cher, est une cadence parfaite.',
      'Vous êtes tempéré. Moi, je suis brillant.',
    ],
  },
  audrey: {
    combo: [
      'Contre-ut !',
      'Je chauffe à peine la voix.',
      'Écoutez-moi ce vibrato !',
      'Aaaah-AAAAAAAH !',
    ],
    special: [
      'Mode poule ! Cot cot CODAAA !',
      'Je suis la diva de la basse-cour !',
      'Cot-cot-cot fortissimo !',
      'Œuf sur le plat, à l’ancienne !',
    ],
    hurt: [
      'Ma voix ! Pas ma voix !',
      'J’ai pas fait mes vocalises !',
      'Aïe ! Ça m’a fait passer en mineur.',
      'Respire, Audrey. Respire.',
    ],
    boss: [
      'Écoute bien. Ça, c’est un la. Le tien est faux.',
      'Projection maximale !',
      'Tu entends les vitres ? Elles, elles ont compris.',
      'Aria de démolition !',
    ],
  },
};

export const EVENT_TEXT: Record<EventId, { title: string; subtitle: string; bark: string }> = {
  blackout: {
    title: 'COUPURE DE COURANT',
    subtitle: 'Noir total : seuls les néons et les instruments restent visibles.',
    bark: 'Qui a encore branché une pédale d’effet ?!',
  },
  rift: {
    title: 'FAILLE DIMENSIONNELLE',
    subtitle: 'Un portail crache des profs mutants venus d’autres niveaux.',
    bark: 'On m’a muté ici. Je déteste ma mutation.',
  },
  pop_quiz: {
    title: 'CONTRÔLE SURPRISE',
    subtitle: 'Des pupitres tombent du ciel. Surveillez les ombres au sol.',
    bark: 'Rangez vos instruments. Sortez une copie double.',
  },
  recess: {
    title: 'RÉCRÉ !',
    subtitle: 'Pluie de bonus pendant quelques secondes. Ramassez tout !',
    bark: 'Pas de ballon ! Pas de bruit ! Pas de joie !',
  },
  council: {
    title: 'CONSEIL DE CLASSE',
    subtitle: 'Trois inspecteurs reliés par des rayons. Brisez le cercle !',
    bark: 'Avis défavorable. À l’unanimité.',
  },
  helicopter: {
    title: 'LE RETOUR DU DIRECTEUR',
    subtitle: 'Il survole l’arène et largue des profs. Restez mobiles !',
    bark: 'Hélico de fonction ! Le budget musique, c’était ça !',
  },
};

export const GAME_OVER_TAUNTS: string[] = [
  'Rendez-vous parents-profs lundi, 17 h. Venez accompagnés.',
  'Appréciation : élève absent de son propre combat.',
  'Tu as joué comme tu travailles : vingt minutes, en soupirant.',
  'Le métronome a tenu plus longtemps que toi.',
  'Retour en éveil musical. Avec les petits.',
  'Ton instrument demande un changement de propriétaire.',
  'Fin de partie. Ou, comme on dit au conservatoire : « à revoir ».',
  'On va parler de toi en salle des profs. Longtemps.',
  'Tu peux recommencer. C’est même vivement conseillé.',
  'Zéro. Et je suis gentil : le barème commençait à moins deux.',
];

export const VICTORY_LINES: Line[] = [
  { speaker: 'radio', text: 'La faille se referme ! Le conservatoire revient ! Avec le parking et tout !' },
  { speaker: 'hero', text: 'Plus de profs mutants. Plus de samedi 8 h éternel.' },
  { speaker: 'radio', text: 'Le Directeur sort des décombres. Il dit qu’on est tous collés.' },
  { speaker: 'hero', text: 'Évidemment.' },
  { speaker: 'radio', text: 'Il dit aussi qu’on ouvre le concert de fin d’année. Sans répétition.' },
  { speaker: 'hero', text: 'Accordez-vous. Cette fois, c’est nous qui faisons du bruit.' },
];

export const STAGE_CLEAR_LINES: Record<number, string> = {
  1: 'Appréciation : élève turbulent. A démoli le hall, la cour et le Directeur. Peut mieux faire.',
  2: 'Appréciation : résultats en hausse, comme l’altitude. Attention à ne pas prendre la grosse tête.',
  3: 'Appréciation : travail fluorescent. Merci de se laver les mains avant le prochain cours.',
  4: 'Appréciation : a rempli tous les formulaires à coups de pied. Dossier accepté par défaut.',
  5: 'Appréciation : beaucoup de chaleur, peu de nuance. Le piano, ce n’est pas que l’instrument.',
  6: 'Appréciation : posture toujours discutable. Le lapin a émis des réserves. À titre posthume.',
  7: 'Appréciation : a sauvé l’univers. Bavarde encore beaucoup trop en cours. Félicitations, à contrecœur.',
};
