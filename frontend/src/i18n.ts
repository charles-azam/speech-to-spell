export type Lang = "fr" | "en";

const translations = {
  // Lobby
  "lobby.title": { fr: "Speech to Spell", en: "Speech to Spell" },
  "lobby.subtitle": { fr: "Un duel de sorciers par la voix et les emojis", en: "A wizard duel of voice and emojis" },
  "lobby.wizardName": { fr: "Nom de sorcier", en: "Wizard Name" },
  "lobby.wizardNamePlaceholder": { fr: "Entrez votre nom de sorcier...", en: "Enter your wizard name..." },
  "lobby.gameMode": { fr: "Mode de jeu", en: "Game Mode" },
  "lobby.sameComputer": { fr: "Même ordinateur", en: "Same Computer" },
  "lobby.diffComputers": { fr: "Ordinateurs différents", en: "Different Computers" },
  "lobby.createRoom": { fr: "Créer une salle", en: "Create Room" },
  "lobby.creating": { fr: "Création...", en: "Creating..." },
  "lobby.orJoin": { fr: "ou rejoindre une salle", en: "or join a room" },
  "lobby.join": { fr: "Rejoindre", en: "Join" },
  "lobby.errorName": { fr: "Choisis un nom de sorcier !", en: "Choose a wizard name!" },
  "lobby.errorCode": { fr: "Entre un code de salle !", en: "Enter a room code!" },
  "lobby.errorCreate": { fr: "Impossible de créer la salle", en: "Failed to create room" },
  "lobby.errorNotFound": { fr: "Salle introuvable", en: "Room not found" },
  "lobby.errorFull": { fr: "La salle est pleine", en: "Room is full" },
  "lobby.errorJoin": { fr: "Impossible de rejoindre la salle", en: "Failed to join room" },

  // WaitingRoom
  "waiting.welcome": { fr: "Bienvenue,", en: "Welcome," },
  "waiting.roomCode": { fr: "Code de salle", en: "Room Code" },
  "waiting.clickCopy": { fr: "Cliquer pour copier", en: "Click to copy" },
  "waiting.copied": { fr: "Copié !", en: "Copied!" },
  "waiting.waitingOpponent": { fr: "En attente d'un adversaire...", en: "Waiting for opponent..." },
  "waiting.shareCode": { fr: "Partagez ce code avec votre adversaire pour qu'il puisse rejoindre.", en: "Share this code with your opponent so they can join." },
  "waiting.cancel": { fr: "Annuler", en: "Cancel" },

  // JudgePanel
  "judge.tribunal": { fr: "Tribunal", en: "Tribunal" },
  "judge.title": { fr: "Le Juge", en: "The Judge" },
  "judge.accepted": { fr: "ACCEPTÉ !", en: "ACCEPTED!" },
  "judge.rejected": { fr: "REJETÉ !", en: "REJECTED!" },
  "judge.explain": { fr: "EXPLIQUE !", en: "EXPLAIN!" },
  "judge.deliberating": { fr: "Le Juge délibère...", en: "The Judge deliberates..." },
  "judge.waiting": { fr: "En attente du prochain sort...", en: "Waiting for the next spell..." },

  // WizardPanel
  "wizard.health": { fr: "Vie", en: "Health" },
  "wizard.holdKey": { fr: "Maintenir [{key}] pour incanter", en: "Hold [{key}] to cast" },
  "wizard.casting": { fr: "Incantation...", en: "Casting..." },
  "wizard.judgeListening": { fr: "Le juge écoute...", en: "The judge is listening..." },

  // EmojiHand
  "emoji.hand": { fr: "Main d'emojis", en: "Emoji hand" },
  "emoji.min2": { fr: "(min 2)", en: "(min 2)" },
  "emoji.selected": { fr: "choisis", en: "selected" },

  // SpellHistory
  "spells.title": { fr: "Sorts lancés", en: "Spells cast" },

  // TextSpellInput
  "text.placeholder": { fr: "Écris ton incantation...", en: "Type your incantation..." },
  "text.cast": { fr: "Lancer", en: "Cast" },

  // PlayerControls
  "controls.explainPrompt": { fr: "Le juge veut une explication ! Maintiens [{key}] pour justifier ton sort.", en: "The judge wants an explanation! Hold [{key}] to justify your spell." },

  // App + RemoteGameView
  "status.connected": { fr: "Connecté", en: "Connected" },
  "status.disconnected": { fr: "Déconnecté", en: "Disconnected" },
  "game.triumphs": { fr: "Triomphe !", en: "Triumphs!" },
  "game.room": { fr: "Salle :", en: "Room:" },
  "game.waitingOpponent": { fr: "En attente de l'adversaire...", en: "Waiting for opponent..." },
  "game.wizard1": { fr: "Sorcier 1", en: "Wizard 1" },
  "game.wizard2": { fr: "Sorcier 2", en: "Wizard 2" },

  // Rules panel
  "rules.title": { fr: "Comment jouer", en: "How to Play" },
  "rules.goalTitle": { fr: "Objectif", en: "Goal" },
  "rules.goalText": { fr: "Réduisez les PV de votre adversaire à 0.", en: "Reduce your opponent's HP to 0." },
  "rules.castTitle": { fr: "Lancer un sort", en: "How to Cast" },
  "rules.castSame": { fr: "Même ordi : maintenez [Q] (gauche) ou [P] (droite) pour parler", en: "Same computer: hold [Q] (left) or [P] (right) to speak" },
  "rules.castRemote": { fr: "En ligne : maintenez [Espace] pour parler", en: "Online: hold [Space] to speak" },
  "rules.castText": { fr: "Ou tapez votre incantation dans la zone de texte.", en: "Or type your incantation in the text box." },
  "rules.emojiTitle": { fr: "Les Emojis", en: "The Emojis" },
  "rules.emojiText": { fr: "Le juge choisit les emojis de votre main qui correspondent à votre sort. Des combos créatifs = plus de dégâts !", en: "The judge picks emojis from your hand that match your spell. Creative combos = more damage!" },
  "rules.scoringTitle": { fr: "Dégâts", en: "Scoring" },
  "rules.scoringText": { fr: "Sorts créatifs : 20-30 dmg. Classiques : 8-15. Faibles : 1-5. Vous pouvez aussi vous soigner avec des sorts protecteurs.", en: "Creative spells: 20-30 dmg. Classic: 8-15. Weak: 1-5. You can also heal yourself with protective spells." },
  "rules.judgeTitle": { fr: "Le Juge", en: "The Judge" },
  "rules.judgeText": { fr: "Un ancien sorcier évalue vos sorts. OUI (le sort touche), NON (sort rejeté, emojis perdus), ou EXPLIQUE (seconde chance).", en: "An ancient wizard evaluates your spells. YES (spell lands), NO (spell rejected, emojis lost), or EXPLAIN (second chance)." },
  "rules.gotIt": { fr: "C'est parti !", en: "Got it!" },
  "rules.tooltip": { fr: "Règles", en: "Rules" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang];
}
