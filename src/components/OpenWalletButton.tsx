import { useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { ApiController } from '@reown/appkit-controllers';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  style?: CSSProperties;
  children: ReactNode;
}

export default function OpenWalletButton({ style, children }: Props) {
  const { open } = useAppKit();

  useEffect(() => {
    ApiController.prefetch().then(() => {
      setTimeout(() => {
        (ApiController.state as any).recommended = [];
        (ApiController.state as any).featured    = [];
      }, 300);
    });
  }, []);

  return <button onClick={() => open()} style={style}>{children}</button>;
}
