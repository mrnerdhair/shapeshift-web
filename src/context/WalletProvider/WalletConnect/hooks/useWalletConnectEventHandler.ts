import { Events } from '@shapeshiftoss/hdwallet-core'
import type { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import type { Dispatch } from 'react'
import { useCallback, useEffect, useState } from 'react'
// import { useTranslate } from 'react-polyglot'
import type { ActionTypes } from 'context/WalletProvider/actions'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { logger } from 'lib/logger'

import { clearLocalWallet } from '../../local-wallet'
import { WalletConnectConfig } from '../config'
import { WalletNotFoundError } from '../Error'

const moduleLogger = logger.child({
  namespace: ['WalletConnect', 'Hooks', 'EventHandler'],
})

export const useWalletConnectEventHandler = (
  state: InitialState,
  dispatch: Dispatch<ActionTypes>,
) => {
  const { keyring, walletInfo, adapters } = state
  const [initialized, setInitialized] = useState(false)

  const pairDevice = useCallback(async () => {
    if (!(state.provider && 'connector' in state.provider)) {
      throw new Error('walletProvider.walletconnect.errors.connectFailure')
    }

    try {
      if (adapters && adapters?.has(KeyManager.WalletConnect)) {
        moduleLogger.info({ fn: 'pairDevice' }, 'pairDevice invoked, calling hdwallet pairDevice')
        const wallet = (await adapters
          .get(KeyManager.WalletConnect)
          ?.pairDevice()) as WalletConnectHDWallet
        if (!wallet) {
          throw new WalletNotFoundError()
        }
        const wc = localStorage.getItem('walletconnect')
        if (!wc) {
          moduleLogger.error(
            null,
            { fn: 'pairDevice' },
            'no walletconnect localstorage key defined',
          )
          throw new WalletNotFoundError()
        }

        const { name, icon } = WalletConnectConfig
        const deviceId = await wallet.getDeviceID()
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        setLocalWalletTypeAndDeviceId(KeyManager.WalletConnect, deviceId)
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      }
    } catch (e: unknown) {
      moduleLogger.error(e, { fn: 'pairDevice' }, 'error pairing')
      if (e instanceof WalletNotFoundError) {
        moduleLogger.error(
          e,
          { fn: 'pairDevice' },
          'WalletConnect Connect: There was an error initializing the wallet',
        )
      }
    }
  }, [adapters, dispatch, state])

  const handleConnect = useCallback(
    async (deviceId: string, payload: any) => {
      moduleLogger.info({ fn: 'handleConnect', deviceId, payload }, 'handleConnect')
      await pairDevice()
      moduleLogger.info({ fn: 'handleConnect' }, 'device paired')
    },
    [pairDevice],
  )

  // listen for walletconnect session ending on server side
  const handleDisconnect = useCallback(
    (deviceId: string, payload: any) => {
      moduleLogger.info(
        { payload, deviceId, walletDeviceId: walletInfo?.deviceId, fn: 'WC: handleDisconnect' },
        'Device Disconnected',
      )
      try {
        moduleLogger.info({ deviceId, fn: 'WC: handleDisconnect' }, 'using device id')
        // if (useDeviceId === state.walletInfo?.deviceId) {
        moduleLogger.info(
          { deviceId, fn: 'WC: handleDisconnect' },
          'Dispatching SET_IS_CONNECTED false',
        )
        dispatch({ type: WalletActions.RESET_STATE })
        clearLocalWallet()
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      } catch (e) {
        moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Device Disconnected Error')
      }
    },
    [dispatch, walletInfo?.deviceId],
  )

  useEffect(() => {
    if (!state.provider) {
      return
    }
    if (initialized) {
      return
    }
    setInitialized(true)
    moduleLogger.info({ fn: 'subscribeevents' }, 'registering handlers for CONNECT and DISCONNECT')
    keyring.on(['*', '*', Events.CONNECT], handleConnect)
    keyring.on(['*', '*', Events.DISCONNECT], handleDisconnect)
    return () => {
      // moduleLogger.info({ fn: 'subscribeevents destructor' }, 'destroying stuff')
      // keyring.off(['*', '*', Events.CONNECT], handleConnect)
      // keyring.off(['*', '*', Events.DISCONNECT], handleDisconnect)
    }
  }, [state.provider, handleConnect, handleDisconnect, keyring, initialized])

  return { pairDevice }
}
