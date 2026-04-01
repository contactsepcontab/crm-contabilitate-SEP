import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Loading, Badge } from "../components/UI";

// ============================================================
// HELPER — construieste adresa completa
// ============================================================
const adresaCompleta = (obj) => {
  const parts = [
    obj?.strada && obj?.numar ? `${obj.strada} nr. ${obj.numar}` : obj?.strada,
    obj?.bloc ? `Bl. ${obj.bloc}${obj?.scara ? `, Sc. ${obj.scara}` : ""}${obj?.apartament ? `, Ap. ${obj.apartament}` : ""}` : null,
    obj?.localitate,
    obj?.judet,
    obj?.cod_postal,
  ].filter(Boolean);
  return parts.join(", ") || "_______________";
};

// ============================================================
// CONSTRUCTIA DATELOR COMPLETE DIN FIREBASE
// ============================================================
const construiesteDate = (contract, firma, client) => {
  const adresaFirma = adresaCompleta(firma);
  const adresaClient = adresaCompleta(client);

  return {
    // — CONTRACT —
    numar_contract:    contract?.numar_contract   || "_______________",
    data_contract:     contract?.data_contract    || "_______________",
    data_start:        contract?.data_start       || "_______________",
    data_sfarsit:      contract?.data_sfarsit     || "_______________",
    tarif:             contract?.tarif            || "_______________",
    tarif_bilant:      contract?.tarif_bilant     || "_______________",
    moneda:            contract?.moneda           || "RON",
    periodicitate:     contract?.periodicitate_facturare || "lunar",
    termen_plata:      contract?.termen_plata     || "15",
    prima_luna:        contract?.prima_luna_lucrata     || "_______________",
    prima_luna_contabil: contract?.prima_luna_contabil  || "_______________",
    ultima_luna:       contract?.ultima_luna_lucrata    || "_______________",
    servicii:          contract?.servicii_incluse || "",
    tip_contract:      contract?.tip_contract     || "",
    nr_salariati:      client?.nr_salariati       || "_______________",

    // — PRESTATOR (firma de contabilitate) —
    prestator_denumire:    firma?.denumire        || "_______________",
    prestator_cui:         firma?.cui             || "_______________",
    prestator_j:           firma?.nr_reg_com      || "_______________",
    prestator_adresa:      adresaFirma,
    prestator_telefon:     firma?.telefon         || "_______________",
    prestator_email:       firma?.email           || "_______________",
    prestator_administrator: firma?.administrator || "_______________",

    // — BENEFICIAR (client) —
    beneficiar_denumire:   client?.denumire       || "_______________",
    beneficiar_cui:        client?.cui            || "_______________",
    beneficiar_j:          client?.nr_reg_com     || "_______________",
    beneficiar_adresa:     adresaClient,
    beneficiar_telefon:    client?.persoana_contact_telefon || client?.administrator_telefon || "_______________",
    beneficiar_email:      client?.persoana_contact_email  || client?.administrator_email   || "_______________",
    beneficiar_administrator: client?.administrator_nume   || "_______________",
  };
};

// ============================================================
// GENERATOARE DOCUMENTE
// ============================================================
const BLOCURI = {

  antet_prestator: (d) =>
`PRESTATOR: ${d.prestator_denumire}
  CUI: ${d.prestator_cui} | Nr. Reg. Com.: ${d.prestator_j}
  Sediu: ${d.prestator_adresa}
  Tel: ${d.prestator_telefon} | Email: ${d.prestator_email}
  Reprezentată de: ${d.prestator_administrator}, în calitate de Administrator`,

  antet_beneficiar: (d) =>
`BENEFICIAR: ${d.beneficiar_denumire}
  CUI: ${d.beneficiar_cui} | Nr. Reg. Com.: ${d.beneficiar_j}
  Sediu: ${d.beneficiar_adresa}
  Tel: ${d.beneficiar_telefon} | Email: ${d.beneficiar_email}
  Reprezentată de: ${d.beneficiar_administrator}, în calitate de Administrator`,

  semnaturi: (d) =>
`PRESTATOR                                    BENEFICIAR
${d.prestator_denumire}                       ${d.beneficiar_denumire}
${d.prestator_administrator}                  ${d.beneficiar_administrator}

Semnătură _______________                     Semnătură _______________
Ștampilă                                      Ștampilă`,
};

const SABLOANE = [
  // ────────────────────────────────────────────
  // CONTRACTE
  // ────────────────────────────────────────────
  {
    id: "c1",
    denumire: "Contract de Contabilitate",
    categorie: "Contract",
    culoare: "blue",
    campuri_extra: [],
    gen: (d, e) => `CONTRACT DE PRESTĂRI SERVICII CONTABILE
Nr. ${d.numar_contract} / ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

denumite în continuare „Părțile", au convenit încheierea prezentului contract:

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să presteze Beneficiarului următoarele servicii de contabilitate:
  - Organizarea și conducerea contabilității financiare conform Legii nr. 82/1991
  - Întocmirea și depunerea declarațiilor fiscale lunare/trimestriale
  - Întocmirea situațiilor financiare periodice
  - Consultanță contabilă și fiscală curentă${d.servicii ? "\n  - " + d.servicii : ""}

Art. 2. DURATA CONTRACTULUI
Contractul intră în vigoare la data de ${d.data_start}${d.data_sfarsit ? ` și este valabil până la ${d.data_sfarsit}` : ""}.
Prima lună tarifată: ${d.prima_luna}.
Prima lună lucrată din punct de vedere contabil: ${d.prima_luna_contabil}.

Art. 3. PREȚUL CONTRACTULUI ȘI MODALITATEA DE PLATĂ
3.1. Pentru serviciile prestate, Beneficiarul va achita suma de ${d.tarif} ${d.moneda}/lună.
3.2. Facturarea se realizează ${d.periodicitate}, cu termen de plată de ${d.termen_plata} zile calendaristice de la data emiterii facturii.
3.3. Plata se efectuează prin virament bancar sau numerar, conform facturii emise.

Art. 4. OBLIGAȚIILE PRESTATORULUI
4.1. Să presteze serviciile contractate cu profesionalism și în termenele agreate.
4.2. Să păstreze confidențialitatea tuturor informațiilor și documentelor primite.
4.3. Să informeze Beneficiarul cu privire la modificările legislative relevante.
4.4. Să transmită declarațiile fiscale în termenele legale.

Art. 5. OBLIGAȚIILE BENEFICIARULUI
5.1. Să pună la dispoziția Prestatorului toate documentele contabile (facturi, chitanțe, extrase bancare etc.) până cel târziu în data de 5 a lunii următoare perioadei de raportare.
5.2. Să achite contravaloarea serviciilor în termenul stabilit la Art. 3.
5.3. Să notifice Prestatorul cu privire la orice modificare a situației economice sau juridice.

Art. 6. RĂSPUNDERE
6.1. Prestatorul nu răspunde pentru consecințele generate de documentele incomplete sau incorecte furnizate de Beneficiar.
6.2. Beneficiarul răspunde pentru veridicitatea și completitudinea documentelor puse la dispoziție.

Art. 7. CONFIDENȚIALITATE
Ambele Părți se obligă să păstreze confidențialitatea tuturor informațiilor obținute în baza prezentului contract și să nu le divulge terților fără acordul scris al celeilalte Părți.

Art. 8. FORȚĂ MAJORĂ
Niciuna dintre Părți nu răspunde pentru neexecutarea obligațiilor contractuale ca urmare a unui eveniment de forță majoră, notificat în scris în termen de 5 zile de la producere.

Art. 9. ÎNCETAREA CONTRACTULUI
9.1. Contractul încetează prin acordul scris al Părților.
9.2. Oricare dintre Părți poate rezilia contractul prin notificare scrisă cu minimum 30 de zile calendaristice înainte.
9.3. Neachitarea facturii în termen de 60 de zile dă dreptul Prestatorului de a suspenda/rezilia contractul.

Art. 10. LITIGII
Eventualele litigii se vor soluționa pe cale amiabilă. În caz contrar, sunt de competența instanțelor judecătorești de la sediul Prestatorului.

Art. 11. DISPOZIȚII FINALE
Prezentul contract a fost încheiat în 2 (două) exemplare originale, câte unul pentru fiecare Parte.

Semnat astăzi, ${d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "c2",
    denumire: "Contract de Resurse Umane",
    categorie: "Contract",
    culoare: "orange",
    campuri_extra: [],
    gen: (d, e) => `CONTRACT DE PRESTĂRI SERVICII RESURSE UMANE
Nr. ${d.numar_contract} / ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să presteze Beneficiarului următoarele servicii de resurse umane:
  - Întocmirea și transmiterea Declarației 112 (salarii și contribuții)
  - Întocmirea statelor de plată lunare
  - Întocmirea și înregistrarea contractelor individuale de muncă
  - Gestionarea Registrului de Evidență a Salariaților (Revisal)
  - Calculul concediilor medicale, de odihnă și al altor tipuri de absențe
  - Întocmirea documentelor de angajare/încetare a raporturilor de muncă
  - Consultanță în domeniul legislației muncii

Art. 2. DURATA CONTRACTULUI
Contractul intră în vigoare la data de ${d.data_start}${d.data_sfarsit ? ` și este valabil până la ${d.data_sfarsit}` : ""}.
Prima lună tarifată: ${d.prima_luna}.
Număr salariați la data semnării: ${d.nr_salariati}.

Art. 3. PREȚUL CONTRACTULUI
3.1. Tariful lunar este de ${d.tarif} ${d.moneda} (pentru ${d.nr_salariati} salariați).
3.2. Orice modificare a numărului de salariați poate genera ajustarea tarifului, cu notificare prealabilă.
3.3. Facturarea se realizează ${d.periodicitate}, termen de plată ${d.termen_plata} zile.

Art. 4. OBLIGAȚIILE BENEFICIARULUI
4.1. Să transmită documentele salariale (pontaj, concedii medicale, modificări contract) până pe data de 25 a lunii curente.
4.2. Să notifice orice angajare sau încetare a raportului de muncă în termen de 24 ore.

Art. 5. CONFIDENȚIALITATE ȘI GDPR
Prestatorul se obligă să respecte legislația privind protecția datelor cu caracter personal (GDPR) pentru toate datele salariaților Beneficiarului.

Art. 6. ÎNCETAREA CONTRACTULUI
Prin notificare scrisă cu 30 de zile înainte sau prin acordul Părților.

Semnat astăzi, ${d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "c3",
    denumire: "Contract Doar Bilanț",
    categorie: "Contract",
    culoare: "green",
    campuri_extra: ["an_bilant"],
    gen: (d, e) => `CONTRACT PRESTĂRI SERVICII ÎNTOCMIRE BILANȚ CONTABIL
Nr. ${d.numar_contract} / ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să întocmească situațiile financiare anuale (bilanț contabil) aferente exercițiului financiar ${e.an_bilant || "___"}, conform reglementărilor contabile în vigoare (OMFP 1802/2014 sau echivalent).

Servicii incluse:
  - Întocmirea Bilanțului contabil
  - Întocmirea Contului de profit și pierdere
  - Întocmirea notelor explicative
  - Depunerea la Ministerul Finanțelor în termenul legal

Art. 2. TARIFUL
2.1. Beneficiarul va achita suma fixă de ${d.tarif_bilant || d.tarif} ${d.moneda} pentru serviciile de bilanț anual.
2.2. Plata se efectuează în termen de ${d.termen_plata} zile de la emiterea facturii.

Art. 3. DOCUMENTE NECESARE
Beneficiarul va pune la dispoziție toate documentele contabile aferente exercițiului ${e.an_bilant || "___"} în termen de 15 zile de la solicitare.

Art. 4. RĂSPUNDERE
Beneficiarul răspunde pentru corectitudinea documentelor furnizate.

Semnat astăzi, ${d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "c4",
    denumire: "Contract Contabilitate + Resurse Umane",
    categorie: "Contract",
    culoare: "indigo",
    campuri_extra: ["tarif_contabilitate", "tarif_hr"],
    gen: (d, e) => `CONTRACT DE PRESTĂRI SERVICII CONTABILE ȘI RESURSE UMANE
Nr. ${d.numar_contract} / ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să presteze Beneficiarului servicii integrate de contabilitate și resurse umane:

  CONTABILITATE:
  - Conducerea contabilității financiare conform Legii nr. 82/1991
  - Întocmirea și depunerea declarațiilor fiscale
  - Consultanță contabilă și fiscală curentă

  RESURSE UMANE:
  - Declarația 112, state de plată, contracte de muncă
  - Gestionarea Revisalului
  - Consultanță în legislația muncii

Art. 2. DURATA
Intră în vigoare la ${d.data_start}. Prima lună tarifată: ${d.prima_luna}.
Prima lună lucrată din punct de vedere contabil: ${d.prima_luna_contabil}.

Art. 3. PREȚUL CONTRACTULUI
  - Tarif contabilitate: ${e.tarif_contabilitate || d.tarif} ${d.moneda}/lună
  - Tarif resurse umane: ${e.tarif_hr || "___"} ${d.moneda}/lună (${d.nr_salariati} salariați)
  - TOTAL: ${d.tarif} ${d.moneda}/lună
  - Facturare ${d.periodicitate}, termen plată ${d.termen_plata} zile.

Art. 4. OBLIGAȚII BENEFICIAR
  - Documente contabile: până pe 5 a lunii următoare
  - Documente salariale: până pe 25 a lunii curente

Art. 5. ÎNCETARE
Prin notificare scrisă cu 30 de zile înainte.

Semnat astăzi, ${d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "c5",
    denumire: "Contract Refacere Contabilitate Ani Anteriori",
    categorie: "Contract",
    culoare: "purple",
    campuri_extra: ["ani_refacere", "termen_finalizare"],
    gen: (d, e) => `CONTRACT SERVICII REFACERE CONTABILITATE ANI ANTERIORI
Nr. ${d.numar_contract} / ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Art. 1. OBIECTUL CONTRACTULUI
Refacerea și regularizarea înregistrărilor contabile aferente perioadei: ${e.ani_refacere || "___"}.

Servicii incluse:
  - Analiza documentelor existente și identificarea discrepanțelor
  - Reînregistrarea operațiunilor contabile conform legislației în vigoare
  - Întocmirea declarațiilor rectificative necesare
  - Regularizarea situațiilor față de organele fiscale

Art. 2. TARIFUL
Suma fixă de ${d.tarif} ${d.moneda} pentru întreaga perioadă ${e.ani_refacere || "___"}.

Art. 3. TERMENUL DE EXECUȚIE
Lucrările vor fi finalizate până la: ${e.termen_finalizare || "___"}, în funcție de disponibilitatea documentelor.

Art. 4. OBLIGAȚII BENEFICIAR
Beneficiarul va pune la dispoziție TOATE documentele originale în 10 zile de la semnare.
Prestatorul nu răspunde pentru consecințe fiscale cauzate de documente incomplete.

Semnat astăzi, ${d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  // ────────────────────────────────────────────
  // ACTE ADIȚIONALE
  // ────────────────────────────────────────────
  {
    id: "aa1",
    denumire: "Act Adițional Majorare Tarif",
    categorie: "Act Adițional",
    culoare: "green",
    campuri_extra: ["numar_act", "data_act", "data_intrare_vigoare", "tarif_vechi", "motiv"],
    gen: (d, e) => `ACT ADIȚIONAL NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul de Prestări Servicii nr. ${d.numar_contract} din ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Convin modificarea contractului după cum urmează:

Art. 1. Începând cu data de ${e.data_intrare_vigoare || "___"}, tariful lunar pentru serviciile
prestate de ${d.prestator_denumire} către ${d.beneficiar_denumire}
se majorează de la ${e.tarif_vechi || "___"} ${d.moneda} la ${d.tarif} ${d.moneda}/lună.

Art. 2. Motivul majorării: ${e.motiv || "___"}.

Art. 3. Toate celelalte clauze ale contractului rămân neschimbate.

Prezentul act adițional face parte integrantă din contractul nr. ${d.numar_contract}.
Semnat astăzi, ${e.data_act || d.data_contract}, în 2 exemplare originale.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "aa2",
    denumire: "Act Adițional Micșorare Tarif",
    categorie: "Act Adițional",
    culoare: "yellow",
    campuri_extra: ["numar_act", "data_act", "data_intrare_vigoare", "tarif_vechi", "motiv"],
    gen: (d, e) => `ACT ADIȚIONAL NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul de Prestări Servicii nr. ${d.numar_contract} din ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Convin modificarea contractului după cum urmează:

Art. 1. Începând cu data de ${e.data_intrare_vigoare || "___"}, tariful lunar se reduce
de la ${e.tarif_vechi || "___"} ${d.moneda} la ${d.tarif} ${d.moneda}/lună.

Art. 2. Motivul reducerii: ${e.motiv || "___"}.

Art. 3. Toate celelalte clauze ale contractului rămân neschimbate.

Semnat astăzi, ${e.data_act || d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "aa3",
    denumire: "Act Adițional Doar Bilanț",
    categorie: "Act Adițional",
    culoare: "green",
    campuri_extra: ["numar_act", "data_act", "an_bilant"],
    gen: (d, e) => `ACT ADIȚIONAL NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul de Prestări Servicii nr. ${d.numar_contract} din ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Convin adăugarea următorului serviciu la contractul existent:

Art. 1. Se adaugă serviciul de întocmire bilanț anual
pentru exercițiul financiar ${e.an_bilant || "___"}.

Art. 2. Tarif bilanț anual: ${d.tarif_bilant || d.tarif} ${d.moneda} (tarif fix anual).

Art. 3. Toate celelalte clauze ale contractului rămân neschimbate.

Semnat astăzi, ${e.data_act || d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "aa4",
    denumire: "Act Adițional Reziliere Contract Contabilitate",
    categorie: "Act Adițional",
    culoare: "red",
    campuri_extra: ["numar_act", "data_act", "data_reziliere", "ultima_luna", "motiv"],
    gen: (d, e) => `ACT ADIȚIONAL DE REZILIERE NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul de Contabilitate nr. ${d.numar_contract} din ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Convin încetarea contractului după cum urmează:

Art. 1. Contractul de prestări servicii contabile nr. ${d.numar_contract} încetează
la data de ${e.data_reziliere || "___"}, de comun acord.

Art. 2. Ultima lună lucrată: ${e.ultima_luna || d.ultima_luna || "___"}.

Art. 3. La data încetării, Prestatorul va transmite Beneficiarului toate documentele
contabile și datele aferente perioadei lucrate, în format electronic și/sau fizic.

Art. 4. Motivul rezilierii: ${e.motiv || "___"}.

Art. 5. Părțile declară că nu au pretenții reciproce, cu excepția sumelor
neachitate conform facturilor emise până la data rezilierii.

Semnat astăzi, ${e.data_act || d.data_contract}, în 2 exemplare originale.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "aa5",
    denumire: "Act Adițional Reziliere Contract Resurse Umane",
    categorie: "Act Adițional",
    culoare: "red",
    campuri_extra: ["numar_act", "data_act", "data_reziliere", "ultima_luna", "motiv"],
    gen: (d, e) => `ACT ADIȚIONAL DE REZILIERE NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul de Resurse Umane nr. ${d.numar_contract} din ${d.data_contract}

Încheiat între:

${BLOCURI.antet_prestator(d)}

și

${BLOCURI.antet_beneficiar(d)}

Art. 1. Contractul de prestări servicii resurse umane nr. ${d.numar_contract}
încetează la data de ${e.data_reziliere || "___"}.

Art. 2. Ultima lună lucrată: ${e.ultima_luna || d.ultima_luna || "___"}.

Art. 3. La data încetării, Prestatorul va transmite:
  - Revisal actualizat la zi
  - State de plată aferente perioadei lucrate
  - Dosarele salariaților în format electronic

Art. 4. Motivul rezilierii: ${e.motiv || "___"}.

Art. 5. Beneficiarul rămâne responsabil pentru obligațiile legale HR
aferente perioadei anterioare contractului.

Semnat astăzi, ${e.data_act || d.data_contract}.

${BLOCURI.semnaturi(d)}`,
  },

  {
    id: "aa6",
    denumire: "Act Adițional Reziliere Unilaterală",
    categorie: "Act Adițional",
    culoare: "red",
    campuri_extra: ["numar_act", "data_act", "data_notificare", "data_reziliere", "ultima_luna", "motiv"],
    gen: (d, e) => `NOTIFICARE DE REZILIERE UNILATERALĂ NR. ${e.numar_act || "___"} / ${e.data_act || d.data_contract}
la Contractul nr. ${d.numar_contract} din ${d.data_contract}

DE LA:
${BLOCURI.antet_prestator(d)}

CĂTRE:
${BLOCURI.antet_beneficiar(d)}

Prin prezenta, ${d.prestator_denumire}, reprezentată de ${d.prestator_administrator},
notifică rezilierea unilaterală a Contractului nr. ${d.numar_contract},
în conformitate cu clauzele contractuale (Art. 9.2 din contract).

Data notificării: ${e.data_notificare || "___"}
Data efectivă a încetării: ${e.data_reziliere || "___"} (30 zile de la notificare)
Ultima lună lucrată: ${e.ultima_luna || d.ultima_luna || "___"}

Motivul rezilierii: ${e.motiv || "___"}

Beneficiarul este rugat să achite toate facturile restante până la data de ${e.data_reziliere || "___"}.
Documentele contabile vor fi predate în termen de 10 zile de la data încetării.

Cu stimă,
${d.prestator_denumire}
${d.prestator_administrator}
Data: ${e.data_act || d.data_contract}`,
  },

  // ────────────────────────────────────────────
  // NOTIFICĂRI
  // ────────────────────────────────────────────
  {
    id: "n1",
    denumire: "Notificare Neplată Servicii Contabile",
    categorie: "Notificare",
    culoare: "orange",
    campuri_extra: ["numar_notificare", "data_notificare", "suma_restanta", "nr_facturi", "termen_plata_final"],
    gen: (d, e) => `NOTIFICARE NR. ${e.numar_notificare || "___"} din ${e.data_notificare || "___"}
Privind: Neplata serviciilor contabile aferente Contractului nr. ${d.numar_contract}

DE LA:
${BLOCURI.antet_prestator(d)}

CĂTRE:
${BLOCURI.antet_beneficiar(d)}

Stimate/Stimată ${d.beneficiar_administrator},

Prin prezenta vă notificăm că societatea ${d.beneficiar_denumire} înregistrează
restanțe la plata serviciilor de contabilitate prestate în baza Contractului
nr. ${d.numar_contract} / ${d.data_contract}.

Suma totală restantă: ${e.suma_restanta || "___"} ${d.moneda}
Număr facturi neachitate: ${e.nr_facturi || "___"}

Vă solicităm achitarea sumei restante până cel târziu la data de: ${e.termen_plata_final || "___"}

În caz de neachitare în termenul menționat, ${d.prestator_denumire} va proceda la:
  - Suspendarea imediată a prestării serviciilor de contabilitate
  - Inițierea procedurilor legale de recuperare a creanței

Vă rugăm să contactați biroul nostru pentru orice clarificări sau pentru a stabili
un plan de eșalonare a plăților.

Cu stimă,
${d.prestator_denumire}
${d.prestator_administrator}
Tel: ${d.prestator_telefon}
Email: ${d.prestator_email}
Data: ${e.data_notificare || "___"}`,
  },
];

// ============================================================
// LABELS pentru câmpuri extra
// ============================================================
const LABELS_EXTRA = {
  numar_act:          "Număr act adițional (ex: AA-001/2025)",
  data_act:           "Data actului adițional (ex: 15.04.2025)",
  data_intrare_vigoare: "Data intrare în vigoare",
  tarif_vechi:        "Tarif vechi (RON)",
  tarif_contabilitate:"Tarif contabilitate (RON/lună)",
  tarif_hr:           "Tarif HR (RON/lună)",
  motiv:              "Motivul modificării",
  an_bilant:          "Anul bilanțului (ex: 2024)",
  ani_refacere:       "Perioada refacere (ex: 2022-2023)",
  termen_finalizare:  "Termen finalizare (ex: 30.06.2025)",
  data_reziliere:     "Data rezilierii",
  ultima_luna:        "Ultima lună lucrată (ex: Martie 2025)",
  numar_notificare:   "Număr notificare (ex: NP-001/2025)",
  data_notificare:    "Data notificării",
  suma_restanta:      "Suma restantă (RON)",
  nr_facturi:         "Număr facturi neachitate",
  termen_plata_final: "Termen limită plată",
};

const CAT_COLOR = { "Contract":"blue","Act Adițional":"orange","Notificare":"red" };
const CULORI = {
  blue:"bg-blue-100 text-blue-800 border-blue-200",
  orange:"bg-orange-100 text-orange-800 border-orange-200",
  green:"bg-green-100 text-green-800 border-green-200",
  red:"bg-red-100 text-red-800 border-red-200",
  indigo:"bg-indigo-100 text-indigo-800 border-indigo-200",
  yellow:"bg-yellow-100 text-yellow-800 border-yellow-200",
  purple:"bg-purple-100 text-purple-800 border-purple-200",
};

// ============================================================
// COMPONENTA PRINCIPALĂ
// ============================================================
export default function Sabloane() {
  const [firme, setFirme] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [contracte, setContracte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFiltru, setCatFiltru] = useState("Toate");

  // Modal state
  const [modal, setModal] = useState(false);
  const [sablon, setSablon] = useState(null);
  const [step, setStep] = useState(1); // 1=selectie sursa, 2=campuri extra, 3=document

  // Selectie date
  const [modSelectie, setModSelectie] = useState("contract"); // "contract" | "manual"
  const [contractId, setContractId] = useState("");
  const [firmaId, setFirmaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [campuriExtra, setCampuriExtra] = useState({});
  const [textGenerat, setTextGenerat] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [fs, cs, ctrS] = await Promise.all([
          getDocs(collection(db, "firme_contabilitate")),
          getDocs(collection(db, "clienti")),
          getDocs(collection(db, "contracte")),
        ]);
        setFirme(fs.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
        setClienti(cs.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.denumire?.localeCompare(b.denumire)));
        setContracte(ctrS.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => (b.created_at?.seconds||0)-(a.created_at?.seconds||0)));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const contractSelectat = contracte.find(c => c.id === contractId);
  const firmaSelectata = firme.find(f => f.id === (modSelectie === "contract" ? contractSelectat?.firma_contabilitate_id : firmaId));
  const clientSelectat = clienti.find(c => c.id === (modSelectie === "contract" ? contractSelectat?.client_id : clientId));

  const deschide = (s) => {
    setSablon(s);
    setStep(1);
    setContractId(""); setFirmaId(""); setClientId("");
    setCampuriExtra({});
    setTextGenerat("");
    setModSelectie("contract");
    setModal(true);
  };

  const genereaza = () => {
    const date = construiesteDate(
      modSelectie === "contract" ? contractSelectat : {},
      firmaSelectata,
      clientSelectat
    );
    const text = sablon.gen(date, campuriExtra);
    setTextGenerat(text);
    setStep(3);
  };

  const descarca = () => {
    const blob = new Blob([textGenerat], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sablon.denumire} - ${clientSelectat?.denumire || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiaza = () => {
    navigator.clipboard.writeText(textGenerat).then(() => alert("Text copiat în clipboard!"));
  };

  const poateContinua = () => {
    if (modSelectie === "contract") return !!contractId;
    return !!firmaId && !!clientId;
  };

  const sabloaneFiltrate = SABLOANE.filter(s => catFiltru === "Toate" || s.categorie === catFiltru);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Șabloane & Drafturi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Selectezi un contract din Contracte Emise → generezi documentul cu toate datele completate automat
          </p>
        </div>
      </div>

      {/* Info flow */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-indigo-800 mb-2">Fluxul de lucru recomandat</p>
        <div className="flex items-center gap-2 text-xs text-indigo-700 flex-wrap">
          <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 font-medium">1. Adaugi contractul în Contracte Emise (Draft)</div>
          <span className="text-indigo-400">→</span>
          <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 font-medium">2. Vii aici și selectezi acel contract</div>
          <span className="text-indigo-400">→</span>
          <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 font-medium">3. Toate datele se completează automat</div>
          <span className="text-indigo-400">→</span>
          <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 font-medium">4. Descarci .txt → deschizi în Word → semnezi</div>
        </div>
      </div>

      {/* Filtre categorii */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["Toate","Contract","Act Adițional","Notificare"].map(c => (
          <button key={c} onClick={() => setCatFiltru(c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${catFiltru===c ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {c} {c !== "Toate" && `(${SABLOANE.filter(s=>s.categorie===c).length})`}
          </button>
        ))}
      </div>

      {/* Grid șabloane */}
      {loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sabloaneFiltrate.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
              <div className="mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CULORI[s.culoare]}`}>
                  {s.categorie}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-2 flex-1">{s.denumire}</h3>
              <div className="text-xs text-gray-400 mb-4">
                Date completate automat: firmă, client, contract
                {s.campuri_extra.length > 0 && ` · ${s.campuri_extra.length} câmpuri suplimentare`}
              </div>
              <button onClick={() => deschide(s)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                Generează Document
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          MODAL GENERARE
          ============================================================ */}
      {modal && sablon && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CULORI[sablon.culoare]} mr-2`}>
                  {sablon.categorie}
                </span>
                <span className="text-base font-bold text-gray-900">{sablon.denumire}</span>
              </div>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>

            <div className="px-6 py-5">

              {/* Steps indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[{n:1,l:"Sursa date"},{n:2,l:"Date suplimentare"},{n:3,l:"Document final"}].map((st, i) => (
                  <div key={st.n} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step>=st.n ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {step > st.n ? "✓" : st.n}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${step>=st.n ? "text-indigo-700" : "text-gray-400"}`}>{st.l}</span>
                    {i < 2 && <div className={`w-6 h-0.5 flex-shrink-0 ${step>st.n ? "bg-indigo-400" : "bg-gray-100"}`} />}
                  </div>
                ))}
              </div>

              {/* ── STEP 1: Selectare sursa de date ── */}
              {step === 1 && (
                <div className="space-y-4">

                  {/* Toggle mod selectie */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setModSelectie("contract")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${modSelectie==="contract" ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}>
                      Din Contracte Emise
                    </button>
                    <button
                      onClick={() => setModSelectie("manual")}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${modSelectie==="manual" ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}>
                      Selectare manuală
                    </button>
                  </div>

                  {/* Mod: din contracte emise */}
                  {modSelectie === "contract" && (
                    <div>
                      <p className="text-xs text-gray-500 mb-3">
                        Selectează un contract din lista ta. Toate datele (firmă, client, tarif, nr. contract, dată) se iau automat.
                      </p>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Contract <span className="text-red-500">*</span></label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                        value={contractId}
                        onChange={e => setContractId(e.target.value)}
                      >
                        <option value="">— Selectează contractul —</option>
                        {contracte.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.numar_contract} | {c.client_denumire} | {c.tip_contract} | {c.status_contract}
                          </option>
                        ))}
                      </select>

                      {/* Preview date contract */}
                      {contractSelectat && firmaSelectata && clientSelectat && (
                        <div className="mt-3 space-y-2">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                            <p className="font-bold mb-1.5">Prestator (firma ta de contabilitate)</p>
                            <p><strong>{firmaSelectata.denumire}</strong></p>
                            <p>CUI: {firmaSelectata.cui} | J: {firmaSelectata.nr_reg_com || "—"}</p>
                            <p>Adresă: {adresaCompleta(firmaSelectata)}</p>
                            <p>Tel: {firmaSelectata.telefon || "—"} | Email: {firmaSelectata.email || "—"}</p>
                            <p>Administrator: <strong>{firmaSelectata.administrator || "⚠️ necompletat"}</strong></p>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                            <p className="font-bold mb-1.5">Beneficiar (clientul)</p>
                            <p><strong>{clientSelectat.denumire}</strong></p>
                            <p>CUI: {clientSelectat.cui} | J: {clientSelectat.nr_reg_com || "—"}</p>
                            <p>Adresă: {adresaCompleta(clientSelectat)}</p>
                            <p>Tel: {clientSelectat.persoana_contact_telefon || clientSelectat.administrator_telefon || "—"}</p>
                            <p>Email: {clientSelectat.persoana_contact_email || clientSelectat.administrator_email || "—"}</p>
                            <p>Administrator: <strong>{clientSelectat.administrator_nume || "⚠️ necompletat"}</strong></p>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
                            <p className="font-bold mb-1">Date contract</p>
                            <p>Nr: <strong>{contractSelectat.numar_contract}</strong> | Data: {contractSelectat.data_contract} | Tarif: {contractSelectat.tarif} {contractSelectat.moneda}</p>
                            {contractSelectat.prima_luna_lucrata && <p>Prima lună: {contractSelectat.prima_luna_lucrata}</p>}
                            {contractSelectat.prima_luna_contabil && <p>Prima lună contabil: {contractSelectat.prima_luna_contabil}</p>}
                          </div>
                        </div>
                      )}
                      {contractId && (!firmaSelectata || !clientSelectat) && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                          ⚠️ Nu s-au putut găsi datele firmei sau clientului. Verifică că firma și clientul sunt completate în contractul selectat.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mod: selectare manuala */}
                  {modSelectie === "manual" && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">Selectează firma și clientul direct, fără contract.</p>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Firma de contabilitate (Prestator) <span className="text-red-500">*</span></label>
                        <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={firmaId} onChange={e => setFirmaId(e.target.value)}>
                          <option value="">— Selectează firma —</option>
                          {firme.map(f => <option key={f.id} value={f.id}>{f.denumire_scurta||f.denumire}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Client (Beneficiar) <span className="text-red-500">*</span></label>
                        <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={clientId} onChange={e => setClientId(e.target.value)}>
                          <option value="">— Selectează clientul —</option>
                          {clienti.map(c => <option key={c.id} value={c.id}>{c.denumire} — {c.cui}</option>)}
                        </select>
                      </div>
                      {firmaSelectata && !firmaSelectata.administrator && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                          ⚠️ Administratorul firmei lipsește. Mergi la Firme Contabilitate și completează câmpul Administrator.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">Anulează</button>
                    <button
                      disabled={!poateContinua()}
                      className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        if (!poateContinua()) return;
                        if (sablon.campuri_extra.length > 0) { setStep(2); }
                        else { genereaza(); }
                      }}
                    >
                      {sablon.campuri_extra.length > 0 ? "Continuă →" : "Generează Document"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Câmpuri suplimentare ── */}
              {step === 2 && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Completează câmpurile suplimentare specifice acestui document.
                    Datele firmei, clientului și contractului sunt deja preluate automat.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sablon.campuri_extra.map(camp => (
                      <div key={camp}>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">
                          {LABELS_EXTRA[camp] || camp}
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                          value={campuriExtra[camp] || ""}
                          onChange={e => setCampuriExtra(p => ({...p, [camp]: e.target.value}))}
                          placeholder={camp.includes("data") || camp.includes("luna") ? "Ex: 01.04.2025" : camp.includes("tarif") || camp.includes("suma") ? "0" : ""}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-100">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">← Înapoi</button>
                    <button onClick={genereaza} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Generează Documentul</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Document generat ── */}
              {step === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Document generat</p>
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Gata de descărcat</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-[50vh] overflow-y-auto leading-relaxed">
                    {textGenerat}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Descarcă ca .txt → deschizi în Word → adaugi antet/logo → semnezi și ștampilezi.
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => setStep(sablon.campuri_extra.length > 0 ? 2 : 1)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">← Modifică</button>
                    <div className="flex gap-2">
                      <button onClick={copiaza} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Copiază text</button>
                      <button onClick={descarca} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Descarcă .txt</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
