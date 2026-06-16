'use client';

import { useState } from 'react';
import { Copy, Check, LogOut, Wallet } from 'lucide-react';
import { CONTRACT_ADDRESS, EXPLORER } from '@/lib/contract';
import { shortAddr, explorerAddr } from '@/lib/format';
import type { WalletState } from '@/hooks/useWallet';

interface HeaderProps {
  wallet: WalletState & { onRightChain: boolean };
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ wallet, onConnect, onDisconnect }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="hdr">
      <div className="wrap hdr-row">
        <div className="brand">
          <span className="dot" aria-hidden />
          Steelman
          <small className="hide-sm">debate gauntlet</small>
        </div>

        <div className="statusline">
          <span className="hide-sm">
            <span className={`netdot ${wallet.onRightChain ? 'live' : ''}`} aria-hidden />
            Bradbury
          </span>
          <span className="sep hide-sm">/</span>
          <a
            className="hide-sm"
            href={explorerAddr(EXPLORER, CONTRACT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            title="Contract on explorer"
          >
            {shortAddr(CONTRACT_ADDRESS)}
          </a>

          {wallet.address ? (
            <div style={{ position: 'relative' }}>
              <button className="wallet-chip" onClick={() => setOpen((v) => !v)}>
                <span className={`wdot ${wallet.onRightChain ? 'on' : ''}`} aria-hidden />
                {shortAddr(wallet.address)}
              </button>
              {open && (
                <div
                  className="panel"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: 240,
                    padding: 14,
                    zIndex: 60,
                  }}
                >
                  <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--bone-faint)' }}>
                    {wallet.onRightChain ? 'Connected to chain 4221' : 'Wrong network (switch to Bradbury)'}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '0.74rem', margin: '8px 0 12px', wordBreak: 'break-all' }}
                  >
                    {wallet.address}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => copy(wallet.address as string)}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        onDisconnect();
                        setOpen(false);
                      }}
                    >
                      <LogOut size={14} /> Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onConnect} disabled={wallet.connecting}>
              <Wallet size={15} />
              {wallet.connecting ? 'Connecting' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
