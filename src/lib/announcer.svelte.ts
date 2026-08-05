// Screen-reader announcer. Hidden aria-live region in App.svelte renders
// `msg`; mutators call `say()` to announce actions (rename, delete, undo…).
//
// We always write then clear + re-write on the next microtask so the same
// text twice in a row still re-announces.

function createAnnouncer() {
  let msg = $state('');

  function say(text: string) {
    if (text === msg) {
      msg = '';
      queueMicrotask(() => {
        msg = text;
      });
    } else {
      msg = text;
    }
  }

  return {
    get msg() {
      return msg;
    },
    say
  };
}

export const announcer = createAnnouncer();