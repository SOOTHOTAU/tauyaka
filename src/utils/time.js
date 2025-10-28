export const expiresInLabel = (expiryTs, nowTs = Date.now()) => {
  if (!expiryTs || expiryTs <= nowTs) return "Expired";
  const diff = expiryTs - nowTs;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.ceil(hrs / 24);
  return `${days}d left`;
};

export const relTime = (ts) => { 
  const diff = Date.now() - ts; 
  if (diff < 60000) return "Just now"; 
  const m = Math.floor(diff/60000); 
  if (m<60) return `${m}m`; 
  const h=Math.floor(m/60); 
  if(h<24)return`${h}h`; 
  const d=Math.floor(h/24); 
  return`${d}d`; 
};

export const isToday = (ts) => { 
  const d = new Date(ts); 
  const n = new Date(); 
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); 
};

export const getDaysRemaining = (expiryDate)=> Math.ceil((expiryDate - Date.now())/(24*60*60*1000));

export const fmtDateTime = (ts, lang = 'en') => {
  const localeFor = (l) => { if (l === "af") return "af-ZA"; if (l === "st") return "st-ZA"; return "en-ZA"; };
  try { return new Intl.DateTimeFormat(localeFor(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts)); }
  catch { return new Date(ts).toLocaleString(); }
};
