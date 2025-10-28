// src/navigation/goToThread.js

// Navigates into: Main (tabs) -> Messages stack -> ChatThread
export function goToThread(navigation, threadId, params = {}) {
  if (!navigation || !threadId) return;
  navigation.navigate('Main', {
    screen: 'Messages',
    params: {
      screen: 'ChatThread',
      params: { threadId, ...params },
    },
  });
}
