export type ToastPayload = {
  title: string;
  description?: string;
};

export function useToast() {
  return {
    toast: (_payload: ToastPayload) => undefined,
  };
}
