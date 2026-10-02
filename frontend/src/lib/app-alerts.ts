import Swal, { type SweetAlertOptions, type SweetAlertResult } from 'sweetalert2';
import { toast } from 'sonner';
import './app-alerts.css';

const confirmationClasses = {
  popup: 'app-confirm-popup',
  title: 'app-confirm-title',
  htmlContainer: 'app-confirm-content',
  actions: 'app-confirm-actions',
  confirmButton: 'app-confirm-button',
  cancelButton: 'app-cancel-button',
};

export function appAlert(options: SweetAlertOptions): Promise<SweetAlertResult> {
  if (options.icon === 'success') {
    const title = typeof options.title === 'string' ? options.title : 'Success';
    const description = typeof options.text === 'string' ? options.text : undefined;
    toast.success(title, { description, duration: 4000 });
    return Promise.resolve({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
      value: undefined,
    } as SweetAlertResult);
  }

  const isConfirmation = Boolean(options.showCancelButton || options.showDenyButton);
  if (!isConfirmation) {
    return Swal.fire(options);
  }

  const existingClasses =
    typeof options.customClass === 'object' && options.customClass !== null
      ? options.customClass
      : {};

  return Swal.fire({
    ...options,
    width: 'min(24rem, calc(100vw - 2rem))',
    padding: '1.25rem',
    customClass: { ...existingClasses, ...confirmationClasses },
  });
}
