"use client";

import { createContext, FC, ReactNode, useContext, useState } from "react";
import { WalletModal } from "./WalletModal";

interface WalletModalContextState {
  visible: boolean;
  setVisible: (open: boolean) => void;
}

const WalletModalContext = createContext<WalletModalContextState>(
  {} as WalletModalContextState
);

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext);
}

export const WalletModalProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      <WalletModal />
      {children}
    </WalletModalContext.Provider>
  );
};
