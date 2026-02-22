import { ToastProvider } from '@/components/ui/toast';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className='h-full'>
        {children}
      </div>
    </ToastProvider>
  );
}
