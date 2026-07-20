import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import type { CvVersion } from '../types/cv';

const HISTORY_LIMIT = 50;
const TEXT_COMMIT_DEBOUNCE_MS = 500;

type EditHistoryState = {
  present: CvVersion | null;
  past: CvVersion[];
  future: CvVersion[];
};

type EditHistoryAction =
  | { type: 'reset'; version: CvVersion }
  | { type: 'clear' }
  | { type: 'setPresent'; version: CvVersion }
  | {
    type: 'commitBaseline';
    baseline: CvVersion;
  }
  | {
    type: 'structural';
    updater: (version: CvVersion) => CvVersion;
  }
  | { type: 'undo' }
  | { type: 'redo' };

function cloneVersion(version: CvVersion): CvVersion {
  return structuredClone(version);
}

function versionsEqual(
  left: CvVersion,
  right: CvVersion,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pushPast(
  past: CvVersion[],
  version: CvVersion,
): CvVersion[] {
  return [...past, cloneVersion(version)].slice(-HISTORY_LIMIT);
}

function editHistoryReducer(
  state: EditHistoryState,
  action: EditHistoryAction,
): EditHistoryState {
  switch (action.type) {
    case 'reset':
      return {
        present: cloneVersion(action.version),
        past: [],
        future: [],
      };
    case 'clear':
      return {
        present: null,
        past: [],
        future: [],
      };
    case 'setPresent':
      return {
        ...state,
        present: action.version,
      };
    case 'commitBaseline': {
      if (!state.present) {
        return state;
      }

      if (versionsEqual(action.baseline, state.present)) {
        return state;
      }

      return {
        present: state.present,
        past: pushPast(state.past, action.baseline),
        future: [],
      };
    }
    case 'structural': {
      if (!state.present) {
        return state;
      }

      const next = action.updater(state.present);

      if (versionsEqual(state.present, next)) {
        return state;
      }

      return {
        present: next,
        past: pushPast(state.past, state.present),
        future: [],
      };
    }
    case 'undo': {
      if (!state.present || state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1];

      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [cloneVersion(state.present), ...state.future],
      };
    }
    case 'redo': {
      if (!state.present || state.future.length === 0) {
        return state;
      }

      const [next, ...rest] = state.future;

      return {
        present: next,
        past: pushPast(state.past, state.present),
        future: rest,
      };
    }
    default:
      return state;
  }
}

const INITIAL_STATE: EditHistoryState = {
  present: null,
  past: [],
  future: [],
};

export function useEditHistory() {
  const [state, dispatch] = useReducer(editHistoryReducer, INITIAL_STATE);
  const textBaselineRef = useRef<CvVersion | null>(null);
  const presentRef = useRef<CvVersion | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    presentRef.current = state.present;
  }, [state.present]);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushTextCommit = useCallback(() => {
    clearDebounce();
    const baseline = textBaselineRef.current;

    if (!baseline) {
      return;
    }

    textBaselineRef.current = null;
    dispatch({
      type: 'commitBaseline',
      baseline,
    });
  }, [clearDebounce]);

  const reset = useCallback((version: CvVersion) => {
    clearDebounce();
    textBaselineRef.current = null;
    dispatch({
      type: 'reset',
      version,
    });
  }, [clearDebounce]);

  const clear = useCallback(() => {
    clearDebounce();
    textBaselineRef.current = null;
    dispatch({ type: 'clear' });
  }, [clearDebounce]);

  const applyStructural = useCallback((
    updater: (version: CvVersion) => CvVersion,
  ) => {
    flushTextCommit();
    dispatch({
      type: 'structural',
      updater,
    });
  }, [flushTextCommit]);

  const applyText = useCallback((
    updater: (version: CvVersion) => CvVersion,
  ) => {
    const current = presentRef.current;

    if (!current) {
      return;
    }

    if (!textBaselineRef.current) {
      textBaselineRef.current = cloneVersion(current);
    }

    const next = updater(current);
    presentRef.current = next;
    dispatch({
      type: 'setPresent',
      version: next,
    });

    clearDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      flushTextCommit();
    }, TEXT_COMMIT_DEBOUNCE_MS);
  }, [clearDebounce, flushTextCommit]);

  const undo = useCallback(() => {
    flushTextCommit();
    dispatch({ type: 'undo' });
  }, [flushTextCommit]);

  const redo = useCallback(() => {
    flushTextCommit();
    dispatch({ type: 'redo' });
  }, [flushTextCommit]);

  useEffect(() => {
    return () => {
      clearDebounce();
    };
  }, [clearDebounce]);

  return {
    draftVersion: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    reset,
    clear,
    applyStructural,
    applyText,
    commitText: flushTextCommit,
    undo,
    redo,
  };
}
