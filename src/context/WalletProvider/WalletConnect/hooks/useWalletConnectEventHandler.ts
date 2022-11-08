import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Events } from '@shapeshiftoss/hdwallet-core'
// import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import type { Dispatch } from 'react'
import { useCallback, useEffect, useState } from 'react'
// import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
// import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'

import { clearLocalWallet } from '../../local-wallet'
// import { WalletConnectConfig } from '../config'
import { WalletNotFoundError } from '../Error'

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Hooks', 'EventHandler'],
})

export const useWalletConnectEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
  load: () => void,
) => {
  const { keyring, walletInfo, adapters } = state
  // const [initialized] = useState(false)
  const [wallet, setWallet] = useState<HDWallet | null>(null)
  const pairDevice = useCallback(async () => {
    const log = moduleLogger.child({ name: 'connectWalletConnect' })
    if (!(state.provider && 'connector' in state.provider)) {
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      if (adapters && adapters?.has(KeyManager.WalletConnect)) {
        log.info('pairDevice invoked, calling load...')
        let localWalletDeviceId = 'unknown'
        const wc = localStorage.getItem('walletconnect')
        if (wc) {
          log.info(`existing walletconnect storage item: ${wc}`)
          try {
            const parsed = JSON.parse(wc)
            if (parsed?.accounts[0]) {
              log.info({ parsed }, 'parsed walletconnect storage item')
              localWalletDeviceId = parsed?.accounts[0]
            }
          } catch (e) {
            log.error(e, `error parsing walletconnect storage item: ${wc}`)
            localStorage.removeItem('walletconnect')
          }
        }

        localStorage.setItem('localWalletType', KeyManager.WalletConnect)
        localStorage.setItem('localWalletDeviceId', localWalletDeviceId)
        load()
        log.info('returning true')
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        return true
      }
    } catch (e: unknown) {
      log.error(e, { fn: 'pairDevice' }, 'error pairing')
      if (e instanceof WalletNotFoundError) {
        log.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
      }
      log.info('returning false')
      return false
    }
  }, [adapters, dispatch, state, load])

  const handleConnect = useCallback(async (deviceId: string, payload: any) => {
    moduleLogger.info({ fn: 'handleConnect', deviceId, payload }, 'handleConnect')
    // await pairDevice()
    moduleLogger.info({ fn: 'handleConnect' }, 'device paired')
  }, [])

  // listen for walletconnect session ending on server side
  const handleDisconnect = useCallback(
    (deviceId: string, payload: any) => {
      const log = moduleLogger.child({ name: 'handleDisconnect' })
      log.info(
        {
          payload,
          deviceId,
          walletDeviceID: wallet?.getDeviceID(),
          walletInfoDeviceId: walletInfo?.deviceId,
          fn: 'handleDisconnect',
        },
        'Device Disconnected',
      )

      if ((!wallet && !walletInfo) || wallet?.getDeviceID() !== walletInfo?.deviceId) {
        log.info('we out')
        return
      }

      try {
        log.info({ deviceId, fn: 'WC: handleDisconnect' }, 'using device id')
        log.info({ deviceId, fn: 'WC: handleDisconnect' }, 'Dispatching RESET_STATE false')
        dispatch({ type: WalletActions.RESET_STATE })
        clearLocalWallet()
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      } catch (e) {
        moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Device Disconnected Error')
      }
    },
    [dispatch, wallet, walletInfo],
  )

  useEffect(() => {
    if (!state.provider) {
      return
    }
    if (!wallet) {
      return
    }

    moduleLogger.info({ fn: 'subscribeevents' }, 'registering handlers for CONNECT and DISCONNECT')
    keyring.off(['WalletConnect', '*', Events.CONNECT], handleConnect)
    keyring.off(['WalletConnect', '*', Events.DISCONNECT], handleDisconnect)
    keyring.on(['WalletConnect', '*', Events.CONNECT], handleConnect)
    keyring.on(['WalletConnect', '*', Events.DISCONNECT], handleDisconnect)
    return () => {
      // moduleLogger.info({ fn: 'subscribeevents destructor' }, 'destroying stuff')
      // keyring.off(['*', '*', Events.CONNECT], handleConnect)
      // keyring.off(['*', '*', Events.DISCONNECT], handleDisconnect)
    }
  }, [wallet, state.provider, handleConnect, handleDisconnect, keyring])

  // const setLocalWallet = useCallback((w: HDWallet) => {
  //   moduleLogger.info({ w, fn: 'setLocalWallet' }, 'Device Disconnected')
  //   setWallet(w)
  // }, [])
  return { pairDevice, setWallet }
}
