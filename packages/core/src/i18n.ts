/**
 * UI copy lives here, never inline in components (BUILD_PLAN D14).
 * Romanian is the only locale for the demo; the shape is deliberately
 * compatible with react-i18next so swapping it in later is mechanical.
 */

export const ro = {
  nav: {
    feed: "Feed",
    campaigns: "Campanii",
    profile: "Profilul meu",
    earnings: "Câștiguri",
    assistant: "Asistent",
    settings: "Setări",
    support: "Suport",
    analytics: "Analize",
    creators: "Creatori",
    helpCenter: "Centru de ajutor",
    logout: "Ieșire",
  },
  roles: {
    creator: "Creator",
    brandManager: "Manager de brand",
  },
  landing: {
    navCreator: "Sunt creator",
    hasAccount: "Ai deja cont?",
    signIn: "Loghează-te",
    /**
     * The first wave is invite-only, so the primary action is asking to be let
     * in rather than signing in. It is a real gate — not the scarcity line a
     * landing page puts on when it has nothing else to say — which is the only
     * reason it belongs on the page at all.
     *
     * Not "Cere acces", which was the first attempt: "cere" is both an
     * imperative and faintly a plea, and "acces" is a permissions dialog. This
     * says what actually happens when you press it — you do not get in, you join
     * a queue — and it says it the way a person would.
     */
    requestAccess: "Intră pe listă",
    /**
     * The second door in the hero, and the quiet one: it goes nowhere off the
     * page, it just moves you down it. Somebody who is not ready to give an
     * address should still have something to press — the alternative to joining
     * is not leaving, it is looking.
     */
    heroCtaExplore: "Vezi cum funcționează",

    /** Brandbook §08: settled doctrine for the business side. Kept for meta/OG. */
    heroTitle: "Reclama se plătește doar dacă se vede",
    /**
     * One sentence, no comma, broken where it turns. The second half takes the
     * accent end of the gradient; splitting it here rather than letting the line
     * wrap means the break lands on the same word at every width instead of
     * wherever the box happens to end.
     *
     * Three drafts, each shorter, and the size follows the length: two sentences
     * at 52 characters capped the display at 80px, a comma-joined 40 ran to
     * 110px, and this one — 25, no punctuation but the full stop — runs to 126.
     * Headline size is a copy decision before it is a CSS one.
     *
     * "Din stilul tău" is the load-bearing half. It answers who makes the ten
     * without saying it: they come out of the creator's own work, which is the
     * difference between a coach and a ghostwriter the brandbook insists on.
     */
    heroTitleLead: "Zece idei",
    heroTitleAccent: "din stilul tău.",
    /**
     * Opens on a fact about the reader rather than a promise to them.
     *
     * "Postezi deja" is observable and slightly uncomfortable — they have been
     * doing the work for free — where "oricine are creativitate în el" is a
     * compliment nobody can check, which the brandbook files under superlatives
     * without evidence. Then the belief that stopped them, named and removed,
     * and only then the offer. Four short sentences; the mechanics that used to
     * crowd this line live in the proof strip and the cards below it.
     */
    /**
     * Who produces the ten is the whole sentence.
     *
     * The draft before this said "îți dăm zece idei" — we hand them over — which
     * is the ghostwriter the brandbook rules out in as many words: the AI
     * provokes, it does not dictate. "Din el ies" puts the portrait at the
     * source, so the ten come out of the creator's own work and we are the thing
     * that read it back to them.
     *
     * No money in it either. The model still has a section of its own further
     * down; the hero is about the person.
     */
    heroSubtitle:
      "Îți citim clipurile și îți construim portretul de creator. De acolo vezi zece direcții de conținut și campaniile care ți se potrivesc.",
    heroCtaCreator: "Vreau să fiu plătit pe vizionări",
    heroCtaBrand: "Vreau reclamă pentru afacerea mea",
    heroNote: "Fără abonament, fără contract anual, fără agenție la mijloc.",
    proof: {
      noMarketing: "cunoștințe de marketing necesare",
      creatorFee: "costuri sau comisioane pentru creatori",
      noContract: "contracte, abonamente sau exclusivitate",
    },

    /**
     * Section eyebrows. Numbering a landing page is not decoration — it tells a
     * reader how much is left, which is the question that decides whether they
     * keep scrolling. Kept short enough to sit on one line beside the rule.
     */
    sections: {
      forWho: "Pentru cine",
      money: "Modelul",
      campaigns: "Campanii deschise",
      creatorFlow: "Pentru creatori",
      brandFlow: "Pentru afaceri",
      how: "Cum funcționează",
      brands: "Pentru afaceri",
    },

    moneyTitle: "Unde se duc banii, de fapt",
    moneySubtitle: "Același buget, două trasee.",
    agencyLabel: "Modelul de până acum",
    agencyPoints: [
      "O parte din buget se duce pe onorarii înainte să ajungă la cineva care filmează",
      "Plătești tariful omului înainte să știi dacă merge",
      "Alegi omul după numărul de urmăritori — adică după preț, nu după rezultat",
      "Raportul vine la final, în capturi de ecran",
      "Dacă postarea nu prinde, banii rămân cheltuiți",
    ],
    viraLabel: "Modelul next10",
    viraPoints: [
      "Plătești vizionări, nu onorariul cuiva",
      "Plătești după ce vizionarea a fost validată, nu înainte",
      "Alegi după ce a mers deja, nu după cât de cunoscut e omul",
      "Vezi vizionările crescând în timp real, direct de pe TikTok",
      "Ce nu s-a consumat se întoarce la tine",
    ],
    moneyNote:
      "Vizionările sunt luate direct de pe TikTok și validate înainte de plată. Nu din capturi de ecran și nu din ce declară cineva.",

    forWhoTitle: "Pentru cine am construit next10",
    forWhoSubtitle: "De la primul clip la a suta campanie — aceleași reguli pentru toți.",
    audiences: [
      {
        icon: "storefront",
        audience: "Pentru afaceri",
        role: "Deschizi o campanie și plătești vizionările ei",
        title: "Nu mai da banii înainte să știi dacă se vede",
        cta: "Deschide o campanie",
        points: [
          "Plătești vizionarea validată, nu estimarea nimănui",
          "Aprobi fiecare clip înainte să ajungă pe TikTok",
          "Ce nu se consumă din buget se întoarce în cont",
        ],
      },
      {
        icon: "person",
        audience: "Pentru creatori",
        role: "Filmezi pentru campaniile lor și ești plătit pe vizionări",
        title: "Faci deja reclamă. Doar că gratis.",
        cta: "Intră cu contul de TikTok",
        points: [
          // The brandbook's own description of what a creator gets (p.2): choose
          // freely, see what you earn and what you risk, be paid to stay
          // yourself. The follower threshold moved out — it is stated properly
          // in the creator flow below, with its reason.
          "Alegi tu la ce aplici. Brieful spune ce trebuie spus, nu cum.",
          "Aceeași rată pe mia de vizionări ca oricine. Fără negociere.",
          "Ești plătit să rămâi tu. Fiecare campanie îți crește autenticitatea, nu ți-o consumă.",
        ],
      },
    ],

    /**
     * The eyebrow above this already says "Cum funcționează", so the heading
     * does not have to repeat it and can carry the argument instead: the whole
     * creator proposition in two lines. The subtitle keeps the mechanics, which
     * is the order every other section on the page follows — label, meaning,
     * then how.
     */
    howTitle: "Clipul tău are valoare. De azi are și preț.",
    howSubtitle: "Trei pași, de la contul tău la primul câștig.",
    steps: [
      {
        icon: "link",
        title: "Îți conectezi contul de TikTok",
        text: (minFollowers: string) =>
          `O autorizare standard, și un cont cu cel puțin ${minFollowers} de urmăritori — pragul ține spamul afară, nu pe tine.`,
      },
      {
        icon: "campaign",
        title: "Afli ce ți se potrivește",
        text: "next10 îți citește clipurile și îți face portretul de creator. De acolo știe ce campanii ți se potrivesc — și ce ar prinde la publicul tău.",
      },
      {
        icon: "task_alt",
        title: "Urci clipul, primești aprobarea, postezi",
        text: "Clipul urcă întâi pe next10, ca afacerea să-l aprobe. Abia apoi îl postezi de pe contul tău.",
      },
    ],

    /**
     * The screen that shows the product. Two views of one transaction — the
     * creator deciding, the business watching — so the label has to name both
     * ends without pretending they are two products.
     */
    productSection: "Cum arată",
    productTitle: "O campanie, de la un capăt la altul",
    productSubtitle:
      "Creatorul alege. Afacerea aprobă înainte să ajungă pe TikTok. Apoi vede vizionările crescând, în timp real.",
    /**
     * Whose move a beat is, in the single merged flow. Two words, because they
     * sit on a chip beside the step number — the section heading has already
     * said what the sequence is.
     */
    flowSideCreator: "Creator",
    flowSideBrand: "Afacere",

    /** Window title on the hero's product panel. */
    showcaseLabel: "Portret de creator",

    productCreatorLabel: "Creatorul alege",
    productBrandLabel: "Afacerea aprobă",
    productAnalyticsLabel: "Afacerea urmărește",

    /**
     * The same three-beat shape as the creator flow, from the other side. The
     * two run one after the other on the page, so they have to rhyme: set up,
     * decide, get paid — against set up, decide, pay.
     */
    brandSteps: [
      {
        icon: "campaign",
        title: "Spui ce vrei să se întâmple",
        /**
         * It used to end "iar next10 traduce asta în ce trebuie filmat", which
         * is not a thing the product does. Nothing here turns an objective into
         * a shot list — the business sets its own requirements, and what gets
         * filmed is the creator's. The platform's job in this step is where the
         * campaign goes, not what it says.
         */
        text: "Alegi obiectivul, pui un buget și cerințele — ce trebuie spus, ce hashtag, cât de lung. De acolo campania ajunge la creatorii potriviți.",
      },
      {
        icon: "task_alt",
        title: "Creatorii aplică, tu aprobi",
        text: "Vezi fiecare clip înainte să ajungă pe TikTok, cu verificările automate deja rulate lângă el.",
      },
      {
        icon: "payments",
        title: "Plătești doar ce s-a văzut",
        text: "Vizionările sunt citite din API-ul oficial TikTok și validate înainte de plată. Ce nu se consumă se întoarce.",
      },
    ],

    /**
     * The words drifting behind the hero.
     *
     * Qualities rather than product terms. `validat`, `portret`, `chitanță` are
     * the right words in the interface and the wrong ones here — a background
     * reading like a feature list is a feature list nobody asked for. These are
     * what the product is *for*, which is what a hero should be standing in.
     *
     * All abstract nouns, so nothing here is a claim that could need evidence.
     */
    wordfall: [
      "creativitate",
      "autenticitate",
      "onestitate",
      "transparență",
      "claritate",
      "libertate",
      "încredere",
      "originalitate",
      "naturalețe",
      "spontaneitate",
      "imaginație",
      "personalitate",
      "curaj",
      "corectitudine",
    ],

    campaignsTitle: "Cine își face reclamă acum pe next10",
    campaignsSubtitle:
      "O sală de cartier, o shaormerie, o frizerie. Exact genul de afaceri care până acum n-aveau unde.",
    seeAll: "Vezi toate campaniile",
    campaignCardPayment: "Plată pe vizionare validată",

    brandsTitle: "Prima ta reclamă, chiar dacă n-ai mai făcut niciodată una",
    brandsText:
      "Nu-ți trebuie fotograf, agenție sau echipă de marketing. Spui ce vrei să se întâmple, pui un buget, iar creatori reali filmează pentru tine.",
    brandsPoints: [
      "Pornești și oprești campania când vrei, fără contract anual",
      "Aprobi fiecare clip înainte să ajungă pe TikTok",
      "Alegi tu creatorii sau lași next10 să-ți propună potriviri",
    ],
    brandsCardLabel: "Exemplu: campanie de cartier",
    brandsCardActive: "Activă",
    brandsCardCreators: (n: number) => `Prima campanie, ${n} creatori`,
    /**
     * Deliberately still "măsurate" and deliberately still the other word.
     * Measured and validated are different facts (CLAUDE.md #3) and this card
     * shows the first, so renaming it to "vizionări validate" would change a
     * claim rather than a term. Settle what the card reports, then name it.
     */
    brandsCardViews: "vizualizări măsurate",
    brandsCardBudgetUsed: (percent: number) => `${percent}% din buget consumat`,
    brandsCardRefund: "Restul se restituie automat, la închiderea campaniei",

    /**
     * Deliberately not "au lucrat cu noi" — nobody has. These are people the
     * team expects to work with, and the label has to survive the question
     * "since when?" without anyone having to explain it away.
     */
    ambassadorsLabel: "Ambasadori next10",
    scrollCue: "Derulează",

    footerNote: "next10 — plătești reclama doar dacă se vede.",
    footerLinks: {
      terms: "Termeni",
      privacy: "Confidențialitate",
      contact: "Contact",
    },
  },
  signIn: {
    title: "Intră în next10",
    subtitle: "Alege cum vrei să continui.",
    creatorTitle: "Sunt creator",
    creatorText: "Intri cu contul tău de TikTok. Nu-ți trebuie cont separat pe next10.",
    brandTitle: "Am o afacere",
    brandText: "Intri cu emailul și parola contului de business. N-ai cont? Îl faci în pasul următor.",
    paidOut: "plătiți către creatori",
    legal: "Prin continuare accepți Termenii și Politica de confidențialitate.",
    backToSite: "Înapoi la site",
    backToChooser: "Înapoi",
  },

  creatorAuth: {
    title: "Intră cu contul tău de TikTok",
    subtitle:
      "Nu-ți faci cont pe next10. Contul tău de TikTok e contul tău aici — de acolo citim clipurile și vizualizările pe care ești plătit.",
    button: "Continuă cu TikTok",
    readsTitle: "Ce vede next10",
    reads: [
      "Numele de utilizator și poza de profil",
      "Clipurile tale publice și cifrele lor",
      "Numărul de urmăritori — doar informativ, nu decide nimic",
    ],
    readsNot: "next10 nu poate posta în locul tău și nu-ți vede mesajele.",
    noSeparateAccount: "Fără parolă nouă, fără formular, fără email de confirmare.",
    legal: "Prin continuare accepți Termenii și Politica de confidențialitate.",
  },

  brandAuth: {
    registerTitle: "Creează cont de business",
    registerSubtitle:
      "Contul de business e separat de TikTok: afacerea ta nu postează, creatorii o fac pentru ea.",
    loginTitle: "Intră în contul de business",
    loginSubtitle: "Bine ai revenit. Continuă de unde ai rămas.",

    businessName: "Numele afacerii",
    businessNamePlaceholder: "Ex.: Shaorma la Vlad",
    contactName: "Numele tău",
    contactNamePlaceholder: "Ex.: Vlad Ionescu",
    email: "Email",
    emailPlaceholder: "nume@afacerea-ta.ro",
    password: "Parolă",
    passwordPlaceholder: "Minimum 8 caractere",

    submitRegister: "Creează contul",
    submitLogin: "Intră în cont",
    submitting: "Se procesează…",
    toLogin: "Ai deja cont de business?",
    toLoginAction: "Intră",
    toRegister: "N-ai încă un cont?",
    toRegisterAction: "Creează unul",

    errors: {
      required: "Completează câmpul.",
      email: "Scrie o adresă de email validă.",
      password: "Parola trebuie să aibă cel puțin 8 caractere.",
      emailInUse: "Există deja un cont cu acest email. Intră în cont.",
      invalidCredentials: "Email sau parolă incorecte.",
      notConfigured: "Autentificarea nu este configurată încă. Revino în curând.",
      generic: "Ceva n-a mers. Încearcă din nou.",
    },
    legal: "Prin crearea contului accepți Termenii și Politica de confidențialitate.",
  },
  brandOnboarding: {
    title: "Spune-ne despre afacerea ta",
    subtitle: "Câteva detalii ne ajută să potrivim creatorii cu brandul tău. Le poți schimba oricând.",
    companyName: "Numele afacerii",
    verticals: "Domenii de interes",
    companySize: "Mărimea companiei",
    budgetBand: "Buget lunar de marketing",
    audienceAges: "Vârsta publicului țintă",
    primaryGoal: "Obiectivul principal",
    brandSafety: "Preferințe de siguranță a brandului",
    avoidAlcohol: "Evită conținutul cu alcool",
    avoidGambling: "Evită conținutul cu jocuri de noroc",
    avoidPolitical: "Evită conținutul politic",
    description: "Descrierea afacerii",
    descriptionPlaceholder: "Ce faceți, pe scurt.",
    values: "Valori (separate prin virgulă)",
    valuesPlaceholder: "autenticitate, sustenabilitate",
    website: "Site web",
    competitorBrands: "Branduri de evitat (separate prin virgulă)",
    competitorBrandsPlaceholder: "un competitor, alt competitor",
    productsToPromote: "Produse sau servicii de promovat",
    productsPlaceholder: "Ce vrei să promovezi.",
    submit: "Salvează și continuă",
    submitting: "Se salvează…",
    error: "Nu s-a putut salva. Încearcă din nou.",
    companySizes: { Solo: "Doar eu", Small: "2–10", Medium: "11–50", Large: "50+" },
    budgetBands: {
      Under1k: "Sub 1.000 €",
      From1kTo5k: "1.000–5.000 €",
      From5kTo20k: "5.000–20.000 €",
      Over20k: "Peste 20.000 €",
    },
    audienceAgeLabels: {
      Teens: "13–17",
      A18_24: "18–24",
      A25_34: "25–34",
      A35_44: "35–44",
      A45Plus: "45+",
    },
    objectives: {
      Awareness: "Notorietate",
      Visits: "Vizite",
      Offer: "Ofertă",
      Launch: "Lansare",
      Community: "Comunitate",
    },
    categories: {
      Food: "Mâncare",
      Sport: "Sport",
      Tech: "Tehnologie",
      Beauty: "Frumusețe",
      Travel: "Călătorii",
      Comedy: "Comedie",
      Education: "Educație",
      Lifestyle: "Lifestyle",
      Gaming: "Gaming",
      Music: "Muzică",
    },
  },
  feed: {
    earned: "generați",
    verifiedViews: "vizionări validate",
    viewCampaign: "Vezi campania",
    madeWithVira: "Creat cu next10",
    nextVideo: "Următorul video",
    yourEarnings: "Câștigurile tale",
    firstCampaignCta: "Aplică la prima campanie",

    tabAll: "Campanii",
    tabForYou: "Pentru tine",

    /**
     * The working behind the estimate. The range was already derived from the
     * creator's own history — it just lived in a code comment, so the card
     * asserted a figure it never justified.
     */
    howEstimated: "Cum se ajunge la sumă",
    yourAverage: "Media ta",
    yourAverageNote: "ultimele 20 de clipuri",
    campaignRate: "Rata campaniei",
    viewsShort: "vizionări",
    perMilleShort: "/ 1.000 validate",

    youWouldEarn: "Ai lua estimat",
    atYourAudience: "la audiența ta",
    perMille: "la 1.000 de vizionări validate",
    budgetLeft: "Buget rămas",
    budgetLive: "se consumă acum",
    slotsLeft: (n: number) => (n === 1 ? "1 loc rămas" : `${n} locuri rămase`),
    apply: "Aplică la campanie",
    match: "potrivire",

    save: "Salvează",
    saved: "Salvat",
    howToFilm: "Cum filmez",
    whyMatch: "De ce mi-o arăți",
    notInterested: "Nu-mi arăta",

    whyMatchTitle: "De ce ți-o arătăm",
    whyMatchNote: "Fiecare motiv se sprijină pe ce ai postat deja, nu pe presupuneri.",
    whyMatchPending: "Potrivirea detaliată apare când se activează motorul de potrivire.",
    loading: "Se încarcă campaniile…",
    close: "Închide",

    dismissed: (brand: string) => `Nu-ți mai arătăm campanii ca „${brand}”.`,
    dismissedNote: "Am reținut și pentru potrivirile viitoare.",
    undo: "Anulează",

    emptyTitle: "Le-ai văzut pe toate",
    emptyText: "Revino mai târziu — campaniile noi apar aici pe măsură ce afacerile le deschid.",
    resetDismissed: "Arată-le din nou pe cele ascunse",
  },
  /**
   * The waitlist. One field, because one field is all we are entitled to ask
   * for before we have given anything — the form that decides whether someone
   * gets in comes after they are on the list, not before.
   */
  waitlist: {
    back: "Înapoi",
    title: "Intră pe listă",
    subtitle:
      "Primul val e pe invitație. Lasă-ne adresa și îți scriem când se deschide un loc pentru tine.",
    emailLabel: "Adresa ta de email",
    emailPlaceholder: "nume@exemplu.ro",
    submit: "Trimite adresa",
    sending: "Se trimite…",
    invalid: "Scrie o adresă de email validă.",
    error: "Nu am putut trimite adresa. Încearcă din nou.",

    /** Split around the link — a sentence with an anchor in it cannot be one string. */
    consentLead: "Trimițând adresa ești de acord cu",
    consentLink: "politica de confidențialitate",
    consentTail: "O folosim ca să-ți scriem despre listă și pentru nimic altceva.",

    doneTitle: "Ești pe listă",
    doneText:
      "Îți scriem pe adresa asta când se deschide un loc. Până atunci nu primești nimic de la noi.",
    doneAnother: "Adaugă altă adresă",
  },
  campaigns: {
    title: "Marketplace de campanii",
    subtitle:
      "Descoperă campanii potrivite pentru stilul tău și pentru publicul pe care îl ai deja.",
    filters: { niche: "Nișă", payout: "Plată", deadline: "Termen" },
    filterAll: "Toate",
    nicheAll: "Toate nișele",
    sortPayoutDesc: "Plată: mare → mică",
    sortPayoutAsc: "Plată: mică → mare",
    sortDeadlineSoon: "Termen: apropiat",
    sortDeadlineFar: "Termen: îndepărtat",
    available: (n: number) =>
      n === 1 ? "1 campanie disponibilă" : `${n} campanii disponibile`,
    noResults: "Nicio campanie pentru filtrele alese.",
    clearFilters: "Resetează filtrele",
    deadlineLeft: (n: number) =>
      n <= 0 ? "Ultima zi" : n === 1 ? "Mai e 1 zi" : `Mai sunt ${n} zile`,
    deadlineNone: "Fără termen",
    payoutRate: "Rată de plată",
    estimatedEarnings: "Câștig estimat",
    whyItMatches: "De ce ți se potrivește",
    deadline: "Termen limită",
    availability: "Locuri rămase",
    slotsLeft: (n: number) => `${n} locuri rămase`,
    apply: "Aplică acum",
    strongMatch: "Se potrivește bine",
    worthTrying: "Merită încercat",
    lockedFollowers: (n: string) => `Necesită minimum ${n} urmăritori`,
    policyTitle: "Politica campaniei",
    productPlacementNote:
      "Această campanie cere ca produsul să apară în clip, iar creatorul îl achiziționează singur.",
  },
  /**
   * The application screen: one campaign, everything it asks, and the draft the
   * creator uploads for approval.
   *
   * The copy avoids promising a payout. The estimate is derived from the
   * creator's own average and says so; the money that gets paid is the validated
   * views, and the screen keeps those two sentences apart.
   */
  apply: {
    back: "Înapoi la campanii",
    loading: "Se încarcă campania…",
    notFoundTitle: "Campania nu mai e disponibilă",
    notFoundText: "S-a închis sau a fost retrasă de brand. Vezi ce e deschis acum.",

    stepsTitle: "Cum decurge",
    steps: {
      apply: "Aplici",
      draft: "Urci draftul",
      approval: "Brandul aprobă",
      post: "Postezi pe TikTok",
      paid: "Ești plătit",
    },
    stepsNote:
      "Nu posta pe TikTok înainte de aprobare. Un clip postat mai devreme nu poate intra la plată.",

    briefTitle: "Ce cere brandul",
    message: "Mesajul brandului",
    requirements: "Cerințe",
    hashtags: "Hashtag-uri obligatorii",
    mention: "Cont de menționat",
    duration: "Durata clipului",
    deadline: "Termen limită",
    noDeadline: "Fără termen",
    category: "Nișă",

    payTitle: "Cât și cum se plătește",
    rate: "Rată de plată",
    perMille: "la 1.000 de vizionări validate",
    estimate: "Estimat pentru tine",
    estimateHow: "Cum se ajunge la sumă",
    yourAverage: "Media ta",
    yourAverageNote: "clipurile de pe contul tău",
    noAverageNote: "Nu avem încă destule clipuri de la tine — estimarea folosește o medie de pornire.",
    budgetLeft: "Buget în campanie",
    payNote:
      "Se plătesc vizionările validate prin API-ul oficial TikTok. Suma de mai sus e derivată din media ta, nu o sumă promisă.",

    lockedTitle: "Nu poți aplica încă",
    lockedNote:
      "Campania cere un prag de urmăritori pentru că produsul e cumpărat de creator. Restul campaniilor rămân deschise.",
    yourFollowers: (n: string) => `Ai ${n} urmăritori.`,

    formTitle: "Trimite aplicarea",
    pitchLabel: "Ce idee ai pentru clip",
    pitchOptional: "opțional",
    pitchPlaceholder:
      "Ex.: filmez dimineața la local, arăt coada de la 8 și de ce merită așteptarea.",
    confirmLabel: "Am citit cerințele și pot livra până la termen.",
    submit: "Trimite aplicarea",
    appliedTitle: "Aplicare trimisă",
    appliedAt: "Trimisă",
    appliedNote: "Poți urca draftul acum — nu trebuie să aștepți un răspuns ca să începi.",
    withdraw: "Retrage aplicarea",
    yourPitch: "Ideea trimisă",

    draftTitle: "Încarcă draftul spre aprobare",
    draftSubtitle:
      "Brandul se uită la clip înainte să-l postezi. next10 nu publică nimic în locul tău — aprobarea e permisiune, nu difuzare.",
    draftLocked: "Se deblochează după ce trimiți aplicarea.",
    dropzone: "Trage videoclipul aici",
    dropzoneOr: "sau",
    choose: "Alege fișier",
    dropzoneHint: (max: string) => `MP4 sau MOV, până la ${max}.`,
    replaceFile: "Schimbă fișierul",
    removeFile: "Elimină",
    notVideo: "Fișierul ales nu e un videoclip.",
    tooLarge: (max: string) => `Fișierul depășește ${max}.`,
    durationLabel: "Durată",
    durationReading: "se citește…",
    durationUnknown: "Nu am putut citi durata din fișier.",
    durationOk: (range: string) => `Se încadrează în ${range}`,
    durationOff: (range: string) =>
      `Campania cere ${range}. Poți trimite oricum, dar brandul vede diferența.`,

    captionLabel: "Descrierea propusă",
    captionHint:
      "Hashtag-urile și menționarea cerute sunt deja puse. Dacă le ștergi, clipul nu trece verificarea.",
    captionPlaceholder: "Scrie descrierea cu care postezi pe TikTok.",

    checklistTitle: "Ce ai acoperit în clip",
    checklistNote: "Bifezi tu; brandul vede exact lista asta lângă clip.",

    sendDraft: "Trimite spre aprobare",
    sendDraftHint: "Alege un fișier și scrie descrierea.",
    draftSentTitle: "Draft trimis spre aprobare",
    draftSentNote:
      "Îți spunem când brandul decide. Dacă cere schimbări, primești motivul concret, nu un „nu”.",
    draftSentAt: "Trimis",
    waiting: "Așteaptă aprobarea",
    replaceDraft: "Trimite alt draft",
    coveredCount: (n: number, total: number) => `${n} din ${total} cerințe bifate`,

    /** Shown back on the marketplace card, so it stops offering something already done. */
    viewApplication: "Vezi aplicarea",
    cardApplied: "Ai aplicat",
    cardDraftSent: "Draft în aprobare",
  },
  /**
   * Rewritten against the real `CreatorPortrait` contract (ADR-011 → ADR-016).
   *
   * Gone with the invented shape: `archetype`, `growthTip`, and the language of
   * discrete "claims". Evidence is per style dimension now, so the copy talks
   * about why a score sits where it does rather than about standalone
   * statements — and it has to be able to say "we could not tell", which is a
   * different sentence from "this is average".
   */
  portrait: {
    tabPortrait: "Portret",
    tabVideos: "Videoclipuri",
    followers: "urmăritori",

    dossierTitle: "Despre creator",
    styleDimensions: "Dimensiuni de stil",
    styleNote:
      "Fiecare dimensiune își arată motivul și clipurile pe care se sprijină. Scorurile vin din clipuri, niciodată din răspunsurile la chestionar sau din numărul de urmăritori.",
    whyThisScore: "De ce",
    groundedIn: (n: number) => (n === 1 ? "sprijinit pe 1 clip" : `sprijinit pe ${n} clipuri`),
    /** An axis with no clips behind it. Never "0" and never silently a middling score. */
    ungrounded: "Nemăsurat",
    ungroundedNote: "Nu am găsit semnal pentru asta în clipuri. Poziția e neutră, nu observată.",
    confidenceLabel: "Încredere",

    productsTitle: "Branduri apărute în clipuri",
    productsNote:
      "Un brand văzut pe ecran nu înseamnă o colaborare. Scrie lângă fiecare dacă a fost declarată în clip.",
    productDisclosed: "Colaborare declarată în clip",
    productNotDisclosed: "Fără declarație în clip",
    productDeclaredByCreator: "Declarat și de creator",
    productInClips: (n: number) => (n === 1 ? "într-un clip" : `în ${n} clipuri`),

    generatedWith: (model: string, promptVersion: string) => `${model} · ${promptVersion}`,
    generatedAt: (date: string) => `Generat ${date}`,

    pendingTitle: "Portretul tău încă se construiește",
    pendingText:
      "Ți-am conectat contul TikTok și ți-am adus clipurile. Portretul se generează după ce clipurile tale sunt analizate.",

    yourClips: "Clipurile tale",
    noClips: "Niciun clip găsit pe contul tău încă.",
    views: "vizualizări",
    loading: "Se încarcă profilul tău…",

    /** The eight axes, in the order the contract declares them. */
    dimensions: {
      warmth: "Căldură",
      energy: "Energie",
      authority: "Autoritate",
      refinement: "Rafinament",
      convention: "Convenție",
      humor: "Umor",
      demonstration: "Demonstrație",
      intimacy: "Intimitate",
    },
  },
  clipSelect: {
    title: "Alege-ți clipurile",
    subtitle: (max: number) =>
      `Selectează până la ${max} clipuri de pe contul tău TikTok. Le folosim pentru portretul tău AI și pentru potriviri.`,
    counter: (n: number, max: number) => `${n}/${max} selectate`,
    preview: "Previzualizează",
    confirm: "Confirmă selecția",
    saving: "Se salvează…",
    error: "Nu am putut salva selecția. Încearcă din nou.",
    minHint: "Alege cel puțin un clip.",
    empty: "Nu am găsit clipuri pe contul tău.",
    views: "vizualizări",
  },
  creatorOnboarding: {
    step: (n: number, total: number) => `Pasul ${n} din ${total}`,
    stepClips: "Clipuri",
    stepProfile: "Profil",
  },
  creatorQuestionnaire: {
    title: "Spune-ne despre tine",
    subtitle:
      "Ne ajută să-ți potrivim campaniile și brandurile care ți se potrivesc cu adevărat. Câmpurile sunt opționale, dar cu cât completezi mai mult, cu atât potrivirea e mai bună.",
    sectionCategories: "Categorii",
    sectionLogistics: "Logistică",
    sectionContent: "Conținut",
    sectionSafety: "Siguranța brandului",
    sectionAbout: "Despre tine",
    sectionHistory: "Colaborări anterioare",
    preferredCategories: "Categorii preferate",
    excludedCategories: "Categorii pe care le refuzi",
    acceptsShippedProducts: "Accept produse trimise de brand",
    canPurchaseProducts: "Pot cumpăra eu produsul (rambursat)",
    travelWillingness: "Cât ești dispus să te deplasezi",
    travel: {
      None: "Fără deplasare",
      SameCounty: "În județul meu",
      Nationwide: "În toată țara",
      OutOfCountry: "În străinătate",
    },
    contentLanguages: "Limbi de conținut",
    preferredFormats: "Formate preferate",
    allowsAlcohol: "Accept campanii cu alcool",
    allowsGambling: "Accept campanii cu jocuri de noroc",
    allowsPolitical: "Accept campanii politice",
    excludedBrands: "Branduri pe care le refuzi",
    goals: "Obiectivele tale",
    selfDescribedAudience: "Cine te urmărește, în cuvintele tale",
    audiencePlaceholder: "Ex.: tineri 18–24 din orașe mari, pasionați de fashion accesibil…",
    priorSponsorships: "Cu ce branduri ai mai lucrat",
    brandNamePlaceholder: "Numele brandului",
    addSponsorship: "Adaugă colaborare",
    addHint: "Scrie și apasă Enter",
    submit: "Finalizează",
    saving: "Se salvează…",
    error: "Nu am putut salva. Încearcă din nou.",
  },
  earnings: {
    title: "Câștiguri",
    thisMonth: "Luna aceasta",
    pendingValidation: "În validare",
    pendingNote: "Vizualizările mai noi de 72 de ore nu sunt încă plătibile.",
    reserve: "Rezervă 20%",
    reserveNote: (date: string) => `Se eliberează pe ${date}`,
    available: "Disponibil de retras",
    availableNote: "Se virează în contul tău în 1–2 zile lucrătoare.",
    breakdown: "Cum se împarte",
    withdraw: "Retrage fondurile",
    timeline: "Evoluție pe 30 de zile",
    recentCampaigns: "Campanii recente",
    table: {
      campaign: "Campanie",
      views: "Vizualizări validate",
      amount: "Sumă",
      status: "Status",
    },
    status: {
      paid: "Plătit",
      scheduledDay7: "Programat — ziua 7",
      scheduledDay14: "Programat — ziua 14",
      reserved: "În rezervă",
      underReview: "În verificare",
    },
  },
  assistant: {
    title: "Asistent de conținut",
    subtitle: "Cunoaște stilul tău și brief-ul campaniei.",
    campaignContext: (brand: string) => `Despre campania ${brand}`,
    campaignQuestion: (hook: string) => `Cum aș filma un clip pentru „${hook}”?`,
    clearContext: "Renunță la context",
    placeholder: "Întreabă orice despre o campanie sau despre un clip…",
    send: "Trimite",
    basedOn: (date: string) => `pe baza clipului tău din ${date}`,
    suggestions: [
      "Idei de început pentru clip",
      "Ce campanii mi se potrivesc?",
      "Verifică-mi planul",
    ],
  },
  brand: {
    welcome: (name: string) => `Bun venit, ${name}`,
    subtitle: "Performanța campaniilor tale, în timp real.",
    newCampaign: "Campanie nouă",
    activeCampaigns: "Campanii active",
    totalReach: "Reach total",
    totalSpent: "Buget cheltuit",
    totalViews: "Vizualizări totale",
    activeCreators: "Creatori activi",
    verifiedActive: "Verificați și activi",
    campaignPerformance: "Performanța campaniilor",
    viewAll: "Vezi tot",
    budgetUsed: "Buget consumat",
    effectiveCpm: "CPM efectiv realizat",
    leaderboard: "Clasamentul creatorilor",
    totalBudget: "Buget total angajat",
    metricPending: "Disponibil după măsurare",
    noCampaignsTitle: "Nicio campanie încă",
    noCampaignsText: "Creează prima ta campanie ca să apară aici.",
    table: {
      campaign: "Campanie",
      status: "Status",
      budget: "Buget",
      views: "Vizualizări",
      creator: "Creator",
      earned: "Încasat",
    },
    status: { active: "Activă", draft: "Ciornă", closed: "Închisă" },
  },
  newCampaign: {
    title: "Campanie nouă",
    subtitle: "Patru pași. Fără brief și fără agenție la mijloc.",
    stepLabel: (current: number, total: number) => `Pasul ${current} din ${total}`,
    steps: {
      objective: "Obiectiv",
      budget: "Buget",
      requirements: "Cerințe",
      review: "Sumar",
    },
    back: "Înapoi",
    next: "Continuă",
    cancel: "Renunță",

    objectiveTitle: "Ce vrei să se întâmple?",
    objectiveSubtitle: "Alege un singur lucru. Rata și cerințele pornesc de la el.",
    objectives: {
      awareness: {
        title: "Să afle lumea de mine",
        text: "Vrei să te știe cartierul sau orașul. Cel mai ieftin pe vizualizare.",
      },
      visits: {
        title: "Să vină lume la mine",
        text: "Ai un local sau un cabinet și vrei oameni pe ușă, nu doar like-uri.",
      },
      offer: {
        title: "Să promovez o ofertă",
        text: "Ai o reducere sau o promoție cu termen și vrei să se ducă vestea repede.",
      },
      launch: {
        title: "Să lansez ceva nou",
        text: "Produs, serviciu sau meniu nou. Cere ca produsul să apară în clip.",
      },
      community: {
        title: "Să-mi cresc contul",
        text: "Vrei urmăritori pe contul tău, nu doar vizualizări pe clipul altcuiva.",
      },
    },
    ratePerMille: "Rata plătită creatorilor",

    budgetTitle: "Cât vrei să investești?",
    budgetSubtitle: "Plătești doar vizualizările verificate. Ce nu se consumă se întoarce.",
    budgetLabel: "Buget campanie",
    budgetFloor: (amount: string) => `Minimum ${amount} pe campanie.`,
    estimateTitle: "Ce cumperi cu bugetul ăsta",
    estimatedViews: "Vizualizări verificate",
    estimatedCreators: "Creatori",
    estimated: "estimat",
    estimateNote:
      "Estimare pe baza ratei campaniei și a mediei platformei. Plata se face pe vizualizările măsurate prin API-ul oficial TikTok, nu pe estimarea asta.",
    refundNote: "Bugetul neconsumat se restituie automat la închiderea campaniei.",

    requirementsTitle: "Ce trebuie să conțină clipul",
    requirementsSubtitle:
      "Cu cât ceri mai puțin, cu atât filmează mai natural — și cu atât aplică mai mulți.",
    nameLabel: "Numele campaniei",
    namePlaceholder: "Ex.: Ofertă de toamnă",
    nameRequired: "Dă-i un nume campaniei ca să poți continua.",
    hashtagsLabel: "Hashtag-uri obligatorii",
    hashtagPlaceholder: "Scrie un hashtag și apasă Enter",
    add: "Adaugă",
    remove: (value: string) => `Elimină ${value}`,
    mentionLabel: "Cont menționat",
    mentionPlaceholder: "@numeleafacerii",
    categoryLabel: "Nișă",
    categoryHint: "Ajută creatorii potriviți să-ți găsească campania. Opțional.",
    deadlineFieldLabel: "Termen limită",
    deadlineHint: "Până când primești clipuri. Lasă gol pentru fără termen.",
    durationLabel: "Durata clipului",
    extraRequirements: "Cerințe din obiectiv",
    productPlacementLabel: "Produsul trebuie cumpărat și arătat de creator",
    productPlacementNote:
      "Restrânge mult numărul de aplicanți — creatorul plătește produsul din buzunar. Cere-o doar dacă e esențială.",

    reviewTitle: "Verifică și creează",
    reviewSubtitle: "Campania pleacă drept ciornă. O pornești când ești gata.",
    reviewRequirements: "Cerințe",
    reviewNoRequirements: "Fără cerințe suplimentare",
    productPlacementChip: "produsul cumpărat de creator",
    create: "Creează campania",
    creating: "Se creează…",
    createError: "Campania nu a putut fi creată. Încearcă din nou.",
    created: (name: string) => `„${name}” a fost creată ca ciornă.`,
  },
  valueProof: {
    title: "Plătești rezultatul, nu promisiunea",
    subtitle:
      "Aceleași cifre de mai sus, citite altfel: ce te-ar fi costat modelul vechi și ce ai plătit de fapt.",

    beforeTitle: "Cum se plătea până acum",
    before: [
      "Tarif fix, negociat pe DM, plătit înainte să știi dacă merge",
      "Alegi omul după numărul de urmăritori și speri că se traduce în vizionări",
      "Agenția își oprește partea din bugetul tău, indiferent de rezultat",
      "Raportul vine în capturi de ecran, la final",
    ],

    afterTitle: "Cum plătești aici",
    after: [
      "Plătești vizualizarea verificată. Dacă nu se vede, nu se plătește.",
      "Alegi după ce a mers, nu după cine e cunoscut",
      "Bugetul se duce în vizualizări, nu în comision de intermediar",
      "Cifrele vin din API-ul oficial TikTok, în timp ce campania rulează",
    ],

    unspentLabel: "Neconsumat, încă al tău",
    unspentNote: "Se consumă doar pe vizualizări măsurate; restul se întoarce la închidere.",

    smallCreatorsLabel: (ceiling: string) => `Vizualizări de la creatori sub ${ceiling} urmăritori`,
    smallCreatorsNote:
      "Oameni pe care o agenție nu ți i-ar fi propus. Aici au intrat pentru că au livrat.",

    measuredLabel: "Citiri reușite din API",
    measuredNote: "Măsurat, nu estimat. Ce nu s-a putut citi e marcat ca atare.",

    closing:
      "Nu contează cine are cei mai mulți urmăritori. Contează al cui clip a mers — iar asta se vede în cifre, nu în argumente.",
  },
  analytics: {
    title: "Analize",
    subtitle: "Cum se mișcă vizualizările și cât te costă, pe fiecare campanie.",
    viewsOverTime: "Vizualizări validate, 30 de zile",
    cpmByCampaign: "Cost pe campanie",
    coverageTitle: "Acoperirea măsurătorii",
    coverageValue: (succeeded: string, expected: string) => `${succeeded} din ${expected}`,
    coverageHint: "citiri reușite din API",
    coverageNote:
      "Citirile eșuate sunt înregistrate ca atare, nu completate prin estimare. Dacă o citire lipsește, vezi că lipsește — nu o interpolăm.",
    table: {
      campaign: "Campanie",
      views: "Vizualizări validate",
      spent: "Cheltuit",
      cpm: "Cost / 1.000",
    },
    noCpm: "—",
    noCpmNote: "Campanie fără vizualizări măsurate încă.",
    pendingTitle: "Măsurarea nu a început încă",
    pendingText:
      "Vizualizările, cheltuiala și CPM-ul apar aici după ce începe măsurarea prin API-ul oficial TikTok.",
  },
  creators: {
    title: "Creatori",
    subtitle: "Cine ți-a filmat campaniile și cât a fost plătit pentru vizualizări validate.",
    search: "Caută după nume sau cont",
    noResults: "Niciun creator care să se potrivească.",
    emptyTitle: "Niciun creator încă",
    emptyText: "Creatorii apar aici după ce se alătură campaniilor tale și încep să livreze vizualizări.",
    totalCreators: "Creatori",
    totalValidatedViews: "Vizualizări validate",
    totalPaid: "Plătit către creatori",
    table: {
      creator: "Creator",
      campaigns: "Campanii",
      views: "Vizualizări validate",
      earned: "Încasat",
    },
    campaignsCount: (n: number) => (n === 1 ? "1 campanie" : `${n} campanii`),
  },
  approvals: {
    navLabel: "Aprobări",
    title: "Clipuri de aprobat",
    subtitle:
      "Creatorul urcă aici clipul înainte să-l posteze pe TikTok. Tu spui da sau nu — next10 nu publică nimic în locul lui.",
    pendingCount: (n: number) => (n === 1 ? "1 clip așteaptă" : `${n} clipuri așteaptă`),
    emptyTitle: "Nimic de aprobat",
    emptyText: "Când un creator urcă un clip, apare aici.",
    selectPrompt: "Alege un clip din listă.",
    backToList: "Înapoi la listă",

    submitted: "Trimis",
    duration: (seconds: number) => `${seconds} sec`,
    followers: "urmăritori",
    caption: "Descrierea propusă",
    checksTitle: "Verificări automate",
    checksNote:
      "Verificările sunt un ajutor, nu o decizie. Ce nu se poate verifica automat e marcat ca atare, nu trecut cu vederea.",
    checkStatus: { pass: "Trecut", warn: "De verificat", fail: "Picat" },

    approve: "Aprobă clipul",
    reject: "Respinge",
    rejectTitle: "De ce respingi clipul",
    rejectSubtitle:
      "Creatorul vede exact ce scrii aici. Un motiv concret îi spune ce să schimbe; „nu-mi place” nu.",
    reasonLabel: "Motiv",
    reasons: {
      "missing-requirement": "Lipsește o cerință din campanie",
      "misleading-claim": "Afirmație care induce în eroare",
      legal: "Problemă legală sau de drepturi",
      "off-brand": "Nu se potrivește cu brandul",
    },
    noteLabel: "Ce anume trebuie schimbat",
    notePlaceholder: "Ex.: lipsește #KaffaRoasters și clipul are 14 sec, minimul e 20.",
    noteRequired: "Scrie motivul concret — fără el nu poți respinge.",
    confirmReject: "Trimite respingerea",
    cancelReject: "Renunță",

    decidedTitle: "Decizii recente",
    decision: { approved: "Aprobat", rejected: "Respins" },
    approvedToast: (handle: string) => `Clipul lui ${handle} a fost aprobat. Poate posta.`,
    rejectedToast: (handle: string) => `Clipul lui ${handle} a fost respins, cu motiv.`,
  },
  common: {
    demoData: "date demo",
    vsLastMonth: "față de luna trecută",
    notifications: "Notificări",
    search: "Caută",
    loading: "Se încarcă…",
  },
} as const;

export type Dictionary = typeof ro;

/** Single access point for copy. Swap the locale here when a second one lands. */
export const t: Dictionary = ro;
