import { useAppKit } from '@reown/appkit/react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  style?: CSSProperties;
  children: ReactNode;
}

export default function OpenWalletButton({ style, children }: Props) {
  const { open } = useAppKit();
  return <button onClick={() => open()} style={style}>{children}</button>;
}
