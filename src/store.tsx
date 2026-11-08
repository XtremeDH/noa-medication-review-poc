import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { Resolution } from './domain/extraction';
import type { Trace } from './domain/trace';

export type View =
  | { name: 'patients' }
  | { name: 'patient'; id: string }
  | { name: 'rules' }
  | { name: 'eval' }
  | { name: 'audit' }
  | { name: 'architecture' };

export type ActionKind = 'accepted' | 'modified' | 'dismissed';

export interface DoctorAction {
  kind: ActionKind;
  hash: string;
  at: string;
  reason?: string;
  note?: string;
}

export interface LabRequest {
  input: string;
  tests: string[];
  status: 'draft' | 'sent' | 'upload_requested';
}

export interface QueueItem {
  patientId: string;
  findingKey: string;
  title: string;
  reason: string;
  note?: string;
  at: string;
}

interface Store {
  view: View;
  go(v: View): void;
  resolutions: Record<string, Record<string, Resolution>>;
  resolve(pid: string, key: string, r: Resolution | null): void;
  disabledRules: Set<string>;
  toggleRule(id: string): void;
  actions: Record<string, Record<string, DoctorAction>>;
  act(pid: string, findingKey: string, a: DoctorAction | null): void;
  labs: Record<string, Record<string, LabRequest>>;
  setLab(pid: string, req: LabRequest): void;
  queue: QueueItem[];
  enqueue(q: QueueItem): void;
  traces: Trace[];
  addTrace(t: Trace): void;
  toast: string | null;
  notify(msg: string): void;
  /** Patient id whose review panel is open. */
  review: string | null;
  setReview(pid: string | null): void;
  tour: boolean;
  setTour(open: boolean): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, go] = useState<View>({ name: 'patients' });
  const [resolutions, setRes] = useState<Store['resolutions']>({});
  const [disabledRules, setDisabled] = useState<Set<string>>(new Set());
  const [actions, setActions] = useState<Store['actions']>({});
  const [labs, setLabs] = useState<Store['labs']>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [tour, setTour] = useState(false);
  const timer = useRef<number>(undefined);

  const resolve = useCallback((pid: string, key: string, r: Resolution | null) => {
    setRes((s) => {
      const next = { ...(s[pid] ?? {}) };
      if (r) next[key] = r;
      else delete next[key];
      return { ...s, [pid]: next };
    });
  }, []);

  const toggleRule = useCallback((id: string) => {
    setDisabled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const act = useCallback((pid: string, findingKey: string, a: DoctorAction | null) => {
    setActions((s) => {
      const next = { ...(s[pid] ?? {}) };
      if (a) next[findingKey] = a;
      else delete next[findingKey];
      return { ...s, [pid]: next };
    });
    setTraces((ts) => {
      const i = ts.findIndex((t) => t.patientId === pid);
      if (i < 0) return ts;
      const t = ts[i];
      const entry = { findingKey, kind: a?.kind ?? 'undone', reason: a?.reason, at: new Date().toISOString() };
      return [...ts.slice(0, i), { ...t, actions: [...t.actions, entry] }, ...ts.slice(i + 1)];
    });
  }, []);

  const setLab = useCallback((pid: string, req: LabRequest) => {
    setLabs((s) => ({ ...s, [pid]: { ...(s[pid] ?? {}), [req.input]: req } }));
  }, []);

  const enqueue = useCallback((q: QueueItem) => setQueue((s) => [q, ...s]), []);
  const addTrace = useCallback((t: Trace) => setTraces((s) => [t, ...s]), []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <Ctx.Provider
      value={{
        view, go, resolutions, resolve, disabledRules, toggleRule, actions, act, labs, setLab,
        queue, enqueue, traces, addTrace, toast, notify, review, setReview, tour, setTour,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
