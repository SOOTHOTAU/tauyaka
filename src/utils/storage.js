/** --- Safe AsyncStorage import with fallback --- **/
let AsyncStorage;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    async setItem(k, v) { mem[k] = v; },
    async removeItem(k) { delete mem[k]; },
    async clear() { Object.keys(mem).forEach(k=>delete mem[k]); },
  };
  console.warn("[Yaka] Using in-memory storage fallback. Install @react-native-async-storage/async-storage for persistence.");
}
export default AsyncStorage;


export const STORAGE_KEYS = {
  POSTS: "yaka_posts_v1",
  BOOKMARKS: "yaka_bookmarks_v2",
  COMMENTS: "yaka_comments_v1",
  USER: "yaka_user_v1",
  LAST_SEEN_ALERT_TS: "yaka_last_seen_alert_ts_v1",
  PREFS: "yaka_prefs_v1",
  REPORTS: "yaka_reports_v1",
  PUSH_TOKEN: "yaka_push_token_v1",
  OFFERS: "yaka_offers_v1",
  DISMISSED_ALERTS: "yaka_dismissed_alerts_v1",
  ARCHIVE: "yaka_archive_v1",
  TOWN: "yaka_town_v1",
  DIGEST_LAST: "yaka_digest_last_v1",
  MEDIA_LOADED: "yaka_media_loaded_v1",
};
