import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const ActionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type ActionType = typeof ActionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

type Toast = Omit<ToasterToast, "id">;

let idCounter = 0;
let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function generateId(): string {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
  return idCounter.toString();
}

function scheduleToastRemoval(toastId: string): void {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: ActionTypes.REMOVE_TOAST, toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function handleAddToast(state: State, toast: ToasterToast): State {
  return {
    ...state,
    toasts: [toast, ...state.toasts].slice(0, TOAST_LIMIT),
  };
}

function handleUpdateToast(state: State, toast: Partial<ToasterToast>): State {
  return {
    ...state,
    toasts: state.toasts.map((t) =>
      t.id === toast.id ? { ...t, ...toast } : t
    ),
  };
}

function handleDismissToast(state: State, toastId?: string): State {
  if (toastId) {
    scheduleToastRemoval(toastId);
  } else {
    state.toasts.forEach((toast) => scheduleToastRemoval(toast.id));
  }

  return {
    ...state,
    toasts: state.toasts.map((t) =>
      t.id === toastId || toastId === undefined ? { ...t, open: false } : t
    ),
  };
}

function handleRemoveToast(state: State, toastId?: string): State {
  if (toastId === undefined) {
    return { ...state, toasts: [] };
  }
  return {
    ...state,
    toasts: state.toasts.filter((t) => t.id !== toastId),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionTypes.ADD_TOAST:
      return handleAddToast(state, action.toast);
    case ActionTypes.UPDATE_TOAST:
      return handleUpdateToast(state, action.toast);
    case ActionTypes.DISMISS_TOAST:
      return handleDismissToast(state, action.toastId);
    case ActionTypes.REMOVE_TOAST:
      return handleRemoveToast(state, action.toastId);
  }
}

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function toast({ ...props }: Toast) {
  const id = generateId();

  const update = (props: ToasterToast) =>
    dispatch({ type: ActionTypes.UPDATE_TOAST, toast: { ...props, id } });

  const dismiss = () =>
    dispatch({ type: ActionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: ActionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: ActionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
