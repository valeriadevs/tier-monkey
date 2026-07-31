import { db, type ListRecord } from './db';
import { deleteListCascade } from './db';
import type { ListSummary } from './types';

function createDashboardStore() {
  let lists = $state<ListSummary[]>([]);
  let loading = $state(false);
  let loaded = $state(false);

  async function load() {
    loading = true;
    try {
      const allLists: ListRecord[] = await db.lists.orderBy('updatedAt').reverse().toArray();
      const allItems = await db.items.toArray();
      const counts = new Map<string, number>();
      for (const it of allItems) {
        counts.set(it.listId, (counts.get(it.listId) ?? 0) + 1);
      }
      lists.splice(
        0,
        lists.length,
        ...allLists.map((l) => ({
          id: l.id,
          title: l.title,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          itemCount: counts.get(l.id) ?? 0
        }))
      );
      loaded = true;
    } finally {
      loading = false;
    }
  }

  async function deleteList(id: string) {
    await deleteListCascade(id);
    const idx = lists.findIndex((l) => l.id === id);
    if (idx !== -1) lists.splice(idx, 1);
  }

  return {
    get lists() {
      return lists;
    },
    get loading() {
      return loading;
    },
    get loaded() {
      return loaded;
    },
    load,
    deleteList
  };
}

export type DashboardStore = ReturnType<typeof createDashboardStore>;
export const dashboardStore = createDashboardStore();

export function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
