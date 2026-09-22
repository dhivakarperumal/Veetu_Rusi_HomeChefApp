export type AppDialogButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

export type AppDialogOptions = {
  title: string;
  message?: string;
  buttons?: AppDialogButton[];
};

type DialogListener = (dialog: AppDialogOptions) => void;

let listener: DialogListener | null = null;

export function subscribeToAppDialog(nextListener: DialogListener) {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
}

export function showAppDialog(
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
) {
  listener?.({
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: "Done" }],
  });
}
