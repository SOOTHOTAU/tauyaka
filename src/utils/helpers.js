export function prettyCategory(cat) { 
  switch (cat) { 
    case "alert": return "Alert"; 
    case "opportunity": return "Opportunity"; 
    case "event": return "Event"; 
    case "lostfound": return "Lost & Found"; 
    case "community": return "Community"; 
    case "ad": return "Sponsored";
    case "market": return "Marketplace";
    default: return "Post"; 
  } 
}

export function prettyRole(role) {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function demoTranslateMessage(item) {
  switch (item.category) {
    case "alert": return "Tsebiso: Ho tla ba le ho khaoloa ha metsi hosane 09:00–14:00. Ka kōpo bolokang metsi.";
    case "opportunity": return "Monyetla: Thupello e lefang — romela kopo pele ho 30 Oct.";
    case "event": return "Ketsahalo: Kopano ea sechaba Labohlano 17:00 Holong ea Toropo. Le amohelehile.";
    case "lostfound": return "Tahlehelo/Kfumano: Ka kōpo ikopanye haeba u tseba mong’a ntho ena.";
    case "community": return "Sechaba: Tlisa thuso kapa inehele; re haha hammoho.";
    case "ad": return "Setsebi: Litheolelo tse khethehileng bekeng ena. Ditlhoko di a sebetsa.";
    default: return "Phetolelo ea mohlala (demo).";
  }
}

export const maskSensitive = (txt) => {
  if (!txt) return txt;
  let out = txt.replace(/([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*)(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, (_, a, b, d) => `${a}${b ? "***" : ""}${"@***"}${d.split(".").pop()}`);
  out = out.replace(/(?:\+27|0)\s?\d{2}\s?[- ]?\d{3}\s?[- ]?\d{4}/g, (m)=> m.slice(0,3) + "*** ****");
  return out;
};

export const VERIFIED_AUTHORS = new Set([
  "Nala Council",
  "Municipality",
  "Traffic Dept",
  "Community Council",
  "Library",
  "Librarian",
  "Judge",
]);
export const isVerifiedAuthor = (name) => !!name && VERIFIED_AUTHORS.has(name);